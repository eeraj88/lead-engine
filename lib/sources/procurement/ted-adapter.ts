import type {
  NoticeType,
  ProcurementNotice,
} from './types'

const TED_SEARCH_URL = 'https://api.ted.europa.eu/v3/notices/search'

const TED_FIELDS = [
  'publication-number',
  'notice-title',
  'description-proc',
  'buyer-name',
  'buyer-city',
  'buyer-country',
  'publication-date',
  'deadline',
  'form-type',
  'notice-type',
  'procedure-type',
  'classification-cpv',
  'place-of-performance',
  'estimated-value-proc',
  'estimated-value-cur-proc',
] as const

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export interface TedSearchOptions {
  since: Date
  limit?: number
  page?: number
}

export interface FetchTedNoticesOptions extends TedSearchOptions {
  fetchImpl?: FetchLike
  fetchedAt?: Date
}

export interface TedSearchRequest {
  query: string
  fields: string[]
  page: number
  limit: number
  paginationMode: 'PAGE_NUMBER'
}

interface TedSearchResponse {
  notices?: unknown[]
}

export function buildTedSearchRequest({
  since,
  limit = 50,
  page = 1,
}: TedSearchOptions): TedSearchRequest {
  return {
    query: [
      'buyer-country = DEU',
      `publication-date >= ${formatTedDate(since)}`,
      'classification-cpv = 71000000',
      '(form-type = planning OR form-type = competition)',
    ].join(' AND '),
    fields: [...TED_FIELDS],
    page,
    limit,
    paginationMode: 'PAGE_NUMBER',
  }
}

export async function fetchTedNotices({
  fetchImpl = fetch,
  fetchedAt = new Date(),
  ...searchOptions
}: FetchTedNoticesOptions): Promise<ProcurementNotice[]> {
  const response = await fetchImpl(TED_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildTedSearchRequest(searchOptions)),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`TED search failed with HTTP ${response.status}: ${details}`)
  }

  const payload = await response.json() as TedSearchResponse
  return (payload.notices ?? []).map((notice) =>
    normalizeTedNotice(notice, fetchedAt)
  )
}

export class TedAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  fetch(options: TedSearchOptions): Promise<ProcurementNotice[]> {
    return fetchTedNotices({
      ...options,
      fetchImpl: this.fetchImpl,
    })
  }
}

export function normalizeTedNotice(
  input: unknown,
  fetchedAt = new Date()
): ProcurementNotice {
  const raw = isRecord(input) ? input : {}
  const externalId = scalarString(raw['publication-number']) ?? ''
  const sourceUrl = localizedLink(raw.links, 'html')
    ?? `https://ted.europa.eu/de/notice/-/detail/${externalId}`
  const buyerCity = localizedText(raw['buyer-city'])
  const placeOfPerformance = stringArray(raw['place-of-performance'])

  return {
    source_id: 'ted',
    source_name: 'TED',
    source_url: sourceUrl,
    external_id: externalId,
    title: localizedText(raw['notice-title']) ?? externalId,
    description: localizedText(raw['description-proc']) ?? '',
    buyer_name: localizedText(raw['buyer-name']),
    buyer_city: buyerCity,
    buyer_country: firstString(raw['buyer-country']),
    publication_date: scalarString(raw['publication-date']),
    deadline: firstString(raw.deadline),
    notice_type: mapTedNoticeType(
      scalarString(raw['form-type']),
      scalarString(raw['notice-type'])
    ),
    procedure_type: scalarString(raw['procedure-type']),
    cpv_codes: uniqueStrings(stringArray(raw['classification-cpv'])),
    nuts_codes: uniqueStrings([
      ...stringArray(raw['nuts-code']),
      ...placeOfPerformance.filter(isNutsCode),
    ]),
    project_location: localizedText(raw['place-performance']) ?? buyerCity,
    estimated_value: numberValue(raw['estimated-value-proc']),
    currency: scalarString(raw['estimated-value-cur-proc']),
    documents_url: localizedLink(raw.links, 'pdf'),
    raw,
    fetched_at: fetchedAt.toISOString(),
  }
}

function mapTedNoticeType(
  formType: string | null,
  noticeType: string | null
): NoticeType {
  const form = formType?.toLowerCase() ?? ''
  const notice = noticeType?.toLowerCase() ?? ''

  if (form === 'result' || notice.includes('award') || notice.startsWith('can-')) {
    return 'result'
  }
  if (form === 'planning' || notice.includes('pin')) return 'prior_information'
  if (form === 'competition') return 'contract_notice'
  return 'unknown'
}

function localizedText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (!isRecord(value)) return null

  for (const language of ['deu', 'DEU', 'eng', 'ENG']) {
    const text = firstString(value[language])
    if (text) return text
  }

  for (const candidate of Object.values(value)) {
    const text = firstString(candidate)
    if (text) return text
  }

  return null
}

function localizedLink(links: unknown, format: string): string | null {
  if (!isRecord(links) || !isRecord(links[format])) return null
  const values = links[format]

  for (const language of ['DEU', 'deu', 'ENG', 'eng']) {
    const url = scalarString(values[language])
    if (url) return url
  }

  return firstString(Object.values(values))
}

function scalarString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

function firstString(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const stringValue = scalarString(item)
      if (stringValue) return stringValue
    }
    return null
  }
  return scalarString(value)
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => scalarString(item))
      .filter((item): item is string => item !== null)
  }
  const single = scalarString(value)
  return single ? [single] : []
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

function isNutsCode(value: string): boolean {
  return /^DE[A-Z0-9]{2,3}$/i.test(value) && value.toUpperCase() !== 'DEU'
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatTedDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
