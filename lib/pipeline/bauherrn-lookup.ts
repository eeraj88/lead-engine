import { normalizeCompanyName } from './lead-validation'

export interface LookupLead {
  id: string
  title: string
  description: string | null
  hebel_type: string | null
  architekt_name: string | null
  location: string | null
  source_url: string | null
}

export interface LookupSearchResult {
  title: string
  url: string
  content: string
}

export interface LookupAnalysis {
  bauherr_name: string | null
  bauherr_type: string | null
  project_title: string | null
  confidence: 'verified' | 'inferred' | 'missing'
  reason: string
  source_urls: string[]
}

export interface DirectLeadDraft {
  title: string
  bauherrName: string
  bauherrType: string | null
  sourceUrls: string[]
  confidence: 'verified' | 'inferred'
  reason: string
  sourceOpenerLeadId: string
}

export class NonOpenerLeadError extends Error {
  constructor(leadId: string) {
    super(`Bauherrn-Lookup requires an OPENER lead. Lead ${leadId} is not OPENER.`)
    this.name = 'NonOpenerLeadError'
  }
}

export async function performBauherrnLookup({
  lead,
  search,
  analyze,
}: {
  lead: LookupLead
  search: (query: string) => Promise<LookupSearchResult[]>
  analyze: (input: { lead: LookupLead; results: LookupSearchResult[] }) => Promise<LookupAnalysis>
}): Promise<DirectLeadDraft | null> {
  if (lead.hebel_type !== 'opener') {
    throw new NonOpenerLeadError(lead.id)
  }

  const results = await search(buildBauherrnLookupQuery(lead))
  const analysis = await analyze({ lead, results })
  const bauherrName = normalizeCompanyName(analysis.bauherr_name)

  if (!bauherrName || analysis.confidence === 'missing') {
    return null
  }

  return {
    title: analysis.project_title || `${bauherrName} - ${lead.title}`,
    bauherrName,
    bauherrType: analysis.bauherr_type,
    sourceUrls: analysis.source_urls,
    confidence: analysis.confidence,
    reason: analysis.reason,
    sourceOpenerLeadId: lead.id,
  }
}

export function buildBauherrnLookupQuery(lead: LookupLead): string {
  return [
    lead.title,
    lead.architekt_name,
    lead.location,
    'Bauherr Auftraggeber Wettbewerb',
  ]
    .filter(Boolean)
    .join(' ')
}
