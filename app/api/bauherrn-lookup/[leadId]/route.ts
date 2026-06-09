import { NextResponse } from 'next/server'
import { tavily } from '@tavily/core'
import { callAI, BauherrnLookupSchema } from '@/lib/ai'
import { createServiceClient } from '@/lib/supabase/server'
import {
  NonOpenerLeadError,
  performBauherrnLookup,
  type LookupSearchResult,
} from '@/lib/pipeline/bauherrn-lookup'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params
  const supabase = await createServiceClient() as any

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  try {
    const draft = await performBauherrnLookup({
      lead,
      search: searchBauherrn,
      analyze: async ({ lead, results }) => callAI({
        model: 'openai/gpt-4o-mini',
        prompt: buildLookupPrompt(lead, results),
        schema: BauherrnLookupSchema,
      }),
    })

    if (!draft) {
      return NextResponse.json({
        status: 'missing',
        message: 'Kein verifizierter Bauherr gefunden.',
      })
    }

    const sourceUrl = draft.sourceUrls[0] || lead.source_url
    const { data: createdLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        source_id: lead.source_id,
        source_url: `${sourceUrl}#bauherrn-lookup-${lead.id}`,
        title: draft.title,
        description: `Aus OPENER-Lead erzeugter DIRECT-Bauherrn-Lead: ${lead.title}`,
        company_name: draft.bauherrName,
        project_type: lead.project_type,
        project_category: lead.project_category,
        project_value_estimate: lead.project_value_estimate,
        location: lead.location,
        score: 80,
        lead_class: 'hot',
        persona: 'bauherr_public',
        hebel_type: 'direct',
        hebel_multiplier: 1,
        project_phase: lead.project_phase,
        project_date: lead.project_date,
        sales_strategy: 'Bauherr direkt ansprechen. Datenqualitaet vor Outreach manuell final pruefen.',
        bauherr_name: draft.bauherrName,
        bauherr_type: draft.bauherrType,
        architekt_name: lead.architekt_name,
        score_breakdown: {
          recency: 20,
          volume: 20,
          phase: 15,
          persona: 15,
          complexity: 10,
        },
        basis_score: 80,
        final_score: 80,
        data_quality: draft.confidence,
        pass_1_data: {
          source: 'bauherrn_lookup',
          openerLeadId: lead.id,
        },
        pass_2_data: {
          source_urls: draft.sourceUrls,
          reason: draft.reason,
        },
        opener_lead_id: lead.id,
        status: 'new',
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'created',
      lead: createdLead,
      lookup: draft,
    })
  } catch (error) {
    if (error instanceof NonOpenerLeadError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lookup failed' },
      { status: 500 }
    )
  }
}

async function searchBauherrn(query: string): Promise<LookupSearchResult[]> {
  const client = tavily({ apiKey: process.env.TAVILY_API_KEY })
  const response = await client.search(query, {
    search_depth: 'basic',
    max_results: 5,
    include_answer: false,
    include_raw_content: false,
  })

  return (response.results || []).map((result) => ({
    title: result.title,
    url: result.url,
    content: result.content || '',
  }))
}

function buildLookupPrompt(lead: any, results: LookupSearchResult[]) {
  return `
Du recherchierst den echten Bauherrn hinter einem OPENER-Lead.

Lead:
Titel: ${lead.title}
Beschreibung: ${lead.description ?? ''}
Architekt: ${lead.architekt_name ?? ''}
Standort: ${lead.location ?? ''}
Quelle: ${lead.source_url ?? ''}

Recherche-Ergebnisse:
${results.map((result, index) => `
${index + 1}. ${result.title}
URL: ${result.url}
Text: ${result.content}
`).join('\n')}

Regeln:
- Niemals Bauherrn erfinden.
- Wenn kein Bauherr eindeutig aus den Quellen hervorgeht: bauherr_name = null, confidence = "missing".
- Nur echte Organisationen nennen, keine Platzhalter.

Antworte ausschliesslich als JSON:
{
  "bauherr_name": string|null,
  "bauherr_type": string|null,
  "project_title": string|null,
  "confidence": "verified|inferred|missing",
  "reason": "kurze Begruendung",
  "source_urls": ["URL der Quelle"]
}
`
}
