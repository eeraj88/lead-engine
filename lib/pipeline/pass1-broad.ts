import { getAdapter, type RawLead } from '@/lib/sources'
import { callAI, RelevanceFilterSchema } from '@/lib/ai'
import { PASS_1_PROMPT } from '@/lib/ai/prompts'
import type { Source } from '@/lib/sources'
import type { StreamEmitter } from './stream'

export interface Pass1Result {
  rawLeads: RawLead[]
  relevantLeads: RawLead[]
  filteredCount: number
}

export interface Pass1Options {
  maxRelevantLeads?: number
}

export async function runPass1(
  sources: Source[],
  stream: StreamEmitter,
  options: Pass1Options = {}
): Promise<Pass1Result> {
  stream.send({ type: 'pass_started', pass: 1 })

  const relevantLeads: RawLead[] = []

  // Fetch all sources in parallel
  // Skip 'api' type sources — handled by Pass 0 (procurement pipeline)
  const pass1Sources = sources.filter((s) => s.type !== 'api')

  const fetchPromises = pass1Sources.map(async (source) => {
    try {
      stream.send({ type: 'source_started', source: source.name })

      const adapter = getAdapter(source)
      const leads = await adapter.fetch(source)

      stream.send({
        type: 'source_complete',
        source: source.name,
        count: leads.length,
      })

      return leads
    } catch (error) {
      stream.send({
        type: 'error',
        message: `Source ${source.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      return []
    }
  })

  const results = await Promise.all(fetchPromises)
  const rawLeads = results.flat()

  // Filter leads with AI — parallel with concurrency cap
  const CONCURRENCY = 8
  const leadsToFilter = options.maxRelevantLeads
    ? rawLeads.slice(0, options.maxRelevantLeads * 4) // only fetch enough to find limit
    : rawLeads

  const filterResults: Array<{ lead: RawLead; filter: { relevant: boolean; is_lead?: boolean; persona?: string; hebel_type?: string; reason: string } | null }> = []

  for (let i = 0; i < leadsToFilter.length; i += CONCURRENCY) {
    const batch = leadsToFilter.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (lead) => {
        try {
          const filter = await callAI({
            model: 'openai/gpt-4o-mini',
            prompt: PASS_1_PROMPT(lead),
            schema: RelevanceFilterSchema,
          })
          return { lead, filter }
        } catch (error) {
          stream.send({
            type: 'error',
            message: `Filter failed for ${lead.title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
          return { lead, filter: null }
        }
      })
    )
    filterResults.push(...batchResults)
  }

  for (const { lead, filter } of filterResults) {
    if (!filter) continue
    if (options.maxRelevantLeads && relevantLeads.length >= options.maxRelevantLeads) break
    if (filter.relevant) {
      relevantLeads.push({
        ...lead,
        isLead: filter.is_lead ?? filter.relevant,
        persona: filter.persona as RawLead['persona'] ?? 'unknown',
        hebelType: filter.hebel_type as RawLead['hebelType'] ?? 'indirect',
        pass1Reason: filter.reason,
      })
      stream.send({
        type: 'lead_filtered',
        title: lead.title,
        reason: filter.reason,
      })
    }
  }

  stream.send({
    type: 'pass_complete',
    pass: 1,
    count: relevantLeads.length,
  })

  return {
    rawLeads,
    relevantLeads,
    filteredCount: relevantLeads.length,
  }
}
