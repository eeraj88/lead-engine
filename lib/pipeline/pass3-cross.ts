import { callAI, CrossReferenceSchema, DeepResearchSchema } from '@/lib/ai'
import { PASS_3_PROMPT, PASS_3_DEEP_PROMPT } from '@/lib/ai/prompts'
import { tavily } from '@tavily/core'
import { sanitizeDecisionMakers, type DecisionMaker } from './lead-validation'
import type { ScoredLead } from './pass2-deep'
import type { InvolvedParty } from '@/lib/ai/schemas'
import type { StreamEmitter } from './stream'

export interface EnrichedLead extends ScoredLead {
  validatedScore: number
  additionalContacts: DecisionMaker[]
  decisionMakers: DecisionMaker[]
  enrichmentNotes: string
  salesStrategy: string
  killerArguments: string[]
  bestTiming: string | null
  estimatedCloseProbability: number | null
  // Step 3+4: Deep Research results
  contactPerson: string | null
  contactRole: string | null
  contactSource: string | null
  salesTrigger: string
  deepResearchDone: boolean
  deepInvolvedParties: InvolvedParty[]
  pass3Data: Record<string, unknown>
}

// ── Tavily client (reused across calls) ──────────────────────────────────────
function getTavilyClient() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY })
}

/**
 * Deep Research für HOT-Leads:
 * 1. Tavily-Suche: Bauherr + Projekttitel + Pressemitteilung
 * 2. Tavily-Fetch: Top-3 relevant_links aus Pass 2
 * 3. KI-Analyse aller Ergebnisse → echte Kontakte + Sales-Trigger
 */
async function runDeepResearch(
  lead: ScoredLead,
  stream: StreamEmitter
): Promise<{
  contactPerson: string | null
  contactRole: string | null
  contactSource: string | null
  salesTrigger: string
  salesStrategy: string
  deepInvolvedParties: InvolvedParty[]
  decisionMakers: DecisionMaker[]
}> {
  const client = getTavilyClient()
  const webResults: Array<{ url: string; title: string; content: string }> = []

  // ── 1. Tavily-Suche: Bauherr + Projekt ─────────────────────────────────
  try {
    const searchQuery = [
      lead.bauherrName,
      lead.title.slice(0, 60),
      lead.location,
      'Kontakt Pressemitteilung 2024 2025 2026',
    ].filter(Boolean).join(' ')

    const searchResult = await client.search(searchQuery, {
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    })

    for (const r of searchResult.results || []) {
      webResults.push({ url: r.url, title: r.title, content: r.content || '' })
    }
  } catch (err) {
    stream.send({ type: 'warning', message: `Deep Research Suche fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}` })
  }

  // ── 2. Relevante Links aus Pass 2 fetchen (max 3) ──────────────────────
  const linksToFetch = lead.relevantLinks.slice(0, 3)
  for (const link of linksToFetch) {
    try {
      const fetched = await client.extract([link.url])
      const result = fetched.results?.[0]
      if (result?.rawContent) {
        webResults.push({
          url: link.url,
          title: link.title || result.url || link.url,
          content: result.rawContent.slice(0, 2000),
        })
      }
    } catch {
      // Link nicht erreichbar — ignorieren, weiter
    }
  }

  // ── 3. KI-Analyse der Web-Daten ────────────────────────────────────────
  if (webResults.length === 0) {
    return {
      contactPerson:       null,
      contactRole:         null,
      contactSource:       null,
      salesTrigger:        '',
      salesStrategy:       '',
      deepInvolvedParties: [],
      decisionMakers:      [],
    }
  }

  try {
    const deepResult = await callAI({
      model: 'openai/gpt-4o-mini',
      prompt: PASS_3_DEEP_PROMPT({
        lead: {
          title:           lead.title,
          bauherrName:     lead.bauherrName,
          location:        lead.location,
          projectCategory: lead.projectCategory,
          aiSummary:       lead.aiSummary,
          score:           lead.score,
        },
        webResults,
      }),
      schema: DeepResearchSchema,
    })

    return {
      contactPerson:       deepResult.contact_person,
      contactRole:         deepResult.contact_role,
      contactSource:       deepResult.contact_source,
      salesTrigger:        deepResult.sales_trigger,
      salesStrategy:       deepResult.sales_strategy,
      deepInvolvedParties: deepResult.involved_parties,
      decisionMakers:      sanitizeDecisionMakers(deepResult.decision_makers),
    }
  } catch (err) {
    stream.send({ type: 'warning', message: `Deep Research KI-Analyse fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}` })
    return {
      contactPerson:       null,
      contactRole:         null,
      contactSource:       null,
      salesTrigger:        '',
      salesStrategy:       '',
      deepInvolvedParties: [],
      decisionMakers:      [],
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function runPass3(
  topLeads: ScoredLead[],
  stream: StreamEmitter
): Promise<EnrichedLead[]> {
  stream.send({ type: 'pass_started', pass: 3 })

  const enrichedLeads: EnrichedLead[] = []

  for (const lead of topLeads) {
    try {
      // ── Basis-Enrichment (alle topLeads) ──────────────────────────────
      const crossRef = await callAI({
        model: 'openai/gpt-4o-mini',
        prompt: PASS_3_PROMPT({
          title:       lead.title,
          projectType: lead.projectType,
          companies:   lead.companies,
          score:       lead.score,
          location:    lead.location || 'Unbekannt',
          persona:     lead.persona,
          hebelType:   lead.hebelType,
        }),
        schema: CrossReferenceSchema,
      })

      const decisionMakers   = sanitizeDecisionMakers(crossRef.decision_makers)
      const additionalContacts = sanitizeDecisionMakers(crossRef.additional_contacts)

      // ── Deep Research nur für HOT-Leads ───────────────────────────────
      let contactPerson:       string | null = null
      let contactRole:         string | null = null
      let contactSource:       string | null = null
      let salesTrigger:        string        = ''
      let deepSalesStrategy:   string        = crossRef.sales_strategy
      let deepInvolvedParties: InvolvedParty[] = []
      let deepDecisionMakers:  DecisionMaker[] = decisionMakers
      let deepResearchDone = false

      if (lead.leadClass === 'hot') {
        stream.send({ type: 'warning', message: `🔍 Deep Research für HOT-Lead: "${lead.title}"` })
        try {
          const deep = await runDeepResearch(lead, stream)
          contactPerson       = deep.contactPerson
          contactRole         = deep.contactRole
          contactSource       = deep.contactSource
          salesTrigger        = deep.salesTrigger
          deepInvolvedParties = deep.deepInvolvedParties
          deepResearchDone    = true
          // Deep Research überschreibt Basis wenn konkretere Daten gefunden
          if (deep.salesStrategy) deepSalesStrategy = deep.salesStrategy
          if (deep.decisionMakers.length > 0) deepDecisionMakers = deep.decisionMakers
        } catch (deepErr) {
          stream.send({ type: 'warning', message: `Deep Research Error für "${lead.title}": ${deepErr instanceof Error ? deepErr.message : 'Unbekannt'}` })
        }
      }

      const enrichedLead: EnrichedLead = {
        ...lead,
        validatedScore:          crossRef.validated_score,
        additionalContacts,
        decisionMakers:          deepDecisionMakers,
        enrichmentNotes:         crossRef.enrichment_notes,
        salesStrategy:           deepSalesStrategy,
        killerArguments:         crossRef.killer_arguments,
        bestTiming:              crossRef.best_timing,
        estimatedCloseProbability: crossRef.estimated_close_probability,
        // Deep Research
        contactPerson,
        contactRole,
        contactSource,
        salesTrigger,
        deepResearchDone,
        deepInvolvedParties,
        pass3Data: {
          crossReferencedAt:   new Date().toISOString(),
          originalScore:       lead.score,
          rawAIResponse:       crossRef,
          deepResearchDone,
          deepResearchSources: lead.relevantLinks.length,
        },
      }

      enrichedLeads.push(enrichedLead)

      stream.send({ type: 'lead_enriched', title: lead.title })
    } catch (error) {
      stream.send({
        type:    'error',
        message: `Enrichment failed for ${lead.title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  stream.send({ type: 'pass_complete', pass: 3, count: enrichedLeads.length })

  return enrichedLeads
}
