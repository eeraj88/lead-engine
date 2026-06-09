/**
 * Pass 0 — Structured Procurement Scan
 *
 * Fetches notices from TED Europa (+ future: Open-Data Bekanntmachungsservice),
 * deduplicates against existing DB records, and runs the deterministic hard
 * filter BEFORE any AI call. Only relevant notices reach Pass 2 scoring.
 *
 * Sources:
 *   TED Europa    — JSON API, fully implemented
 *   Open-Data     — TODO: ZIP parsing needed (lib/sources/procurement/open-data-adapter.ts
 *                   normalizes extracted records; add ZIP extraction once fflate/jszip available)
 */

import { fetchTedNotices } from '@/lib/sources/procurement/ted-adapter'
import {
  fetchOpenDataExport,
} from '@/lib/sources/procurement/open-data-adapter'
import { extractZipNotices } from '@/lib/sources/procurement/open-data-zip'
import {
  filterProcurementNotice,
  type ProcurementFilterResult,
} from './procurement-filter'
import type { ProcurementNotice } from '@/lib/sources/procurement/types'
import type { RawLead, ProcurementMeta } from '@/lib/sources/types'
import type { StreamEmitter } from './stream'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────

export interface Pass0Result {
  relevantLeads: RawLead[]
  totalFetched: number
  filteredOut: number
  duplicates: number
}

export async function runPass0(
  stream: StreamEmitter,
  supabase: SupabaseClient,
  options: { sinceDays?: number; tedLimit?: number } = {}
): Promise<Pass0Result> {
  stream.send({ type: 'pass_started', pass: 0 })

  const sinceDays = options.sinceDays ?? 7
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)

  // ── 0. Resolve DB source UUIDs for procurement sources ────────────────────
  // source_id in leads table is a UUID FK → sources.id, not a free string
  const { data: sourcesData } = await supabase
    .from('sources')
    .select('id,name')
    .in('name', ['TED EU', 'TED Europa', 'Bekanntmachungsservice Vergabe'])
  const tedSourceUuid: string | null =
    (sourcesData ?? []).find(
      (s: { id: string; name: string }) => s.name === 'TED EU' || s.name === 'TED Europa'
    )?.id ?? null
  const openDataSourceUuid: string | null =
    (sourcesData ?? []).find(
      (s: { id: string; name: string }) => s.name === 'Bekanntmachungsservice Vergabe'
    )?.id ?? null

  // ── 1. Fetch from all procurement sources ─────────────────────────────────
  const allNotices: ProcurementNotice[] = []

  try {
    stream.send({ type: 'source_started', source: 'TED Europa' })
    const tedNotices = await fetchTedNotices({ since, limit: options.tedLimit ?? 50 })
    allNotices.push(...tedNotices)
    stream.send({ type: 'source_complete', source: 'TED Europa', count: tedNotices.length })
  } catch (err) {
    stream.send({
      type: 'error',
      message: `TED fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  // ── Open-Data (Bekanntmachungsservice Öffentliche Vergabe) ───────────────
  // Fetch CSV ZIP for yesterday and today (today may not be ready yet — handled by error catch)
  const openDataDays = [getIsoDate(-1), getIsoDate(0)]
  for (const pubDay of openDataDays) {
    try {
      stream.send({ type: 'source_started', source: `Open-Data ${pubDay}` })
      const zipBuffer = await fetchOpenDataExport({ publicationDay: pubDay, format: 'csv' })
      const notices = extractZipNotices(zipBuffer, 'csv')
      allNotices.push(...notices.map(n => ({ ...n, source_id: 'procurement-open-data' })))
      stream.send({ type: 'source_complete', source: `Open-Data ${pubDay}`, count: notices.length })
    } catch (err) {
      // Today's export is often unavailable before ~10:00 CET — skip silently
      stream.send({
        type: 'warning',
        message: `Open-Data ${pubDay}: ${err instanceof Error ? err.message.slice(0, 100) : 'unavailable'}`,
      })
    }
  }

  const totalFetched = allNotices.length

  if (totalFetched === 0) {
    stream.send({ type: 'pass0_complete', fetched: 0, relevant: 0, filtered: 0, duplicates: 0 })
    return { relevantLeads: [], totalFetched: 0, filteredOut: 0, duplicates: 0 }
  }

  // ── 2. Dedup against DB (external_notice_id) ──────────────────────────────
  const candidateIds = allNotices.map((n) => n.external_id).filter(Boolean)
  const existingIds = await queryExistingExternalIds(supabase, candidateIds)

  // ── 3. Hard filter + convert to RawLead ───────────────────────────────────
  const relevantLeads: RawLead[] = []
  let filteredOut = 0
  let duplicates = 0
  const seenInBatch = new Set<string>()

  for (const notice of allNotices) {
    // Within-batch dedup
    if (seenInBatch.has(notice.external_id)) {
      duplicates++
      continue
    }
    seenInBatch.add(notice.external_id)

    // DB dedup
    if (existingIds.has(notice.external_id)) {
      duplicates++
      continue
    }

    // Deterministic hard filter — no AI cost for rejected notices
    const filterResult = filterProcurementNotice(notice)

    if (!filterResult.relevant) {
      filteredOut++
      stream.send({
        type: 'lead_filtered',
        title: notice.title.slice(0, 80),
        reason: `procurement:${filterResult.reasons[0] ?? 'no_relevance_signal'}`,
      })
      continue
    }

    const sourceUuid = notice.source_id === 'ted' ? tedSourceUuid : openDataSourceUuid
    relevantLeads.push(noticeToRawLead(notice, filterResult, sourceUuid))
  }

  stream.send({
    type: 'pass0_complete',
    fetched: totalFetched,
    relevant: relevantLeads.length,
    filtered: filteredOut,
    duplicates,
  })

  return { relevantLeads, totalFetched, filteredOut, duplicates }
}

// ─────────────────────────────────────────────────────────────────────────────

/** Returns a Set of external_notice_ids already stored in the leads table. */
async function queryExistingExternalIds(
  supabase: SupabaseClient,
  externalIds: string[]
): Promise<Set<string>> {
  if (externalIds.length === 0) return new Set()
  try {
    const { data } = await supabase
      .from('leads')
      .select('external_notice_id')
      .in('external_notice_id', externalIds)

    return new Set(
      (data ?? [])
        .map((r: { external_notice_id: string | null }) => r.external_notice_id)
        .filter((id): id is string => Boolean(id))
    )
  } catch {
    // If DB is unreachable, skip dedup — DB constraint will catch actual dupes
    return new Set()
  }
}

/** Convert a hard-filtered ProcurementNotice → RawLead (pre-approved for Pass 2). */
function noticeToRawLead(
  notice: ProcurementNotice,
  filterResult: ProcurementFilterResult,
  /** UUID from sources table — must be a valid FK, not a string like 'ted' */
  sourceUuid: string | null
): RawLead {
  const procurement: ProcurementMeta = {
    externalId:       notice.external_id,
    sourceKind:       notice.source_id === 'ted' ? 'ted' : 'procurement_open_data',
    deadline:         notice.deadline,
    noticeType:       notice.notice_type,
    procurementStage: filterResult.procurementStage,
    salesWindow:      filterResult.salesWindow,
    cpvCodes:         notice.cpv_codes,
    nutsCodes:        notice.nuts_codes,
    buyerName:        notice.buyer_name,
    buyerCity:        notice.buyer_city,
    estimatedValue:   notice.estimated_value,
    documentsUrl:     notice.documents_url,
    rawNotice:        notice.raw,
  }

  return {
    // sourceUuid is the real UUID FK — notice.source_id is just a string slug ('ted')
    sourceId:    sourceUuid ?? notice.source_id,
    sourceUrl:   notice.source_url,
    title:       notice.title,
    description: notice.description.slice(0, 4000),
    publishedAt: notice.publication_date ?? undefined,
    // Pre-approved — skips Pass 1 AI filter entirely
    isLead:      true,
    persona:     'bauherr_public',
    hebelType:   'direct',
    pass1Reason: `procurement:${filterResult.reasons.slice(0, 3).join(',')}`,
    // Injected into PASS_2_PROMPT as additionalContext
    additionalContext: buildContext(notice, filterResult),
    procurement,
  }
}

/**
 * Structured procurement context string injected into PASS_2_PROMPT.
 * AI uses this to score the lead without needing to parse raw notice fields.
 */
function buildContext(
  notice: ProcurementNotice,
  filterResult: ProcurementFilterResult
): string {
  const parts: string[] = []
  if (notice.buyer_name)      parts.push(`Auftraggeber: ${notice.buyer_name}`)
  if (notice.buyer_city)      parts.push(`Ort: ${notice.buyer_city}`)
  if (notice.deadline)        parts.push(`Abgabefrist: ${notice.deadline}`)
  if (notice.estimated_value) {
    parts.push(`Geschätzter Wert: ${notice.estimated_value.toLocaleString('de-DE')} EUR`)
  }
  if (notice.cpv_codes.length > 0) {
    parts.push(`CPV-Codes: ${notice.cpv_codes.slice(0, 3).join(', ')}`)
  }
  parts.push(`Vergabe-Phase: ${filterResult.procurementStage}`)
  parts.push(`Sales-Fenster: ${filterResult.salesWindow}`)
  parts.push(`Relevanz-Signale: ${filterResult.reasons.join(', ')}`)
  return parts.join(' | ')
}

/** Returns an ISO date string (YYYY-MM-DD) offset by `deltaDays` from today. */
function getIsoDate(deltaDays: number): string {
  const d = new Date(Date.now() + deltaDays * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}
