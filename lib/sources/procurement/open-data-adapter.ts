import type {
  NoticeType,
  ProcurementNotice,
} from './types'

const OPEN_DATA_EXPORT_URL =
  'https://oeffentlichevergabe.de/api/notice-exports'
const SOURCE_ID = 'procurement-open-data'
const SOURCE_NAME = 'Bekanntmachungsservice Öffentliche Vergabe'

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type OpenDataFormat = 'ocds' | 'eforms' | 'csv'

export interface OpenDataExportOptions {
  publicationDay: string
  format: OpenDataFormat
}

export interface FetchOpenDataExportOptions extends OpenDataExportOptions {
  fetchImpl?: FetchLike
}

export interface CsvRelations {
  classifications?: Array<Record<string, unknown>>
}

export function buildOpenDataExportUrl({
  publicationDay,
  format,
}: OpenDataExportOptions): string {
  const params = new URLSearchParams({
    pubDay: publicationDay,
    format: `${format}.zip`,
  })
  return `${OPEN_DATA_EXPORT_URL}?${params.toString()}`
}

export async function fetchOpenDataExport({
  fetchImpl = fetch,
  ...options
}: FetchOpenDataExportOptions): Promise<ArrayBuffer> {
  const response = await fetchImpl(buildOpenDataExportUrl(options), {
    method: 'GET',
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(
      `Open Data export failed with HTTP ${response.status}: ${details}`
    )
  }

  return response.arrayBuffer()
}

export class OpenDataAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  fetchExport(options: OpenDataExportOptions): Promise<ArrayBuffer> {
    return fetchOpenDataExport({
      ...options,
      fetchImpl: this.fetchImpl,
    })
  }
}

export function normalizeOcdsNotice(
  input: unknown,
  fetchedAt = new Date()
): ProcurementNotice {
  const raw = recordValue(input)
  const tender = recordValue(raw.tender)
  const buyer = recordValue(raw.buyer)
  const buyerAddress = recordValue(buyer.address)
  const tenderPeriod = recordValue(tender.tenderPeriod)
  const classification = recordValue(tender.classification)
  const value = recordValue(tender.value)
  const planning = recordValue(raw.planning)
  const budget = recordValue(planning.budget)
  const projectLocation = recordValue(budget.projectLocation)
  const links = recordValue(raw.links)
  const externalId = stringValue(tender.id)
    ?? stringValue(raw.ocid)
    ?? stringValue(raw.id)
    ?? ''
  const cpvCodes = [
    cpvCode(classification),
    ...arrayValue(tender.additionalClassifications)
      .map(recordValue)
      .map(cpvCode),
  ].filter((code): code is string => code !== null)

  return createNotice({
    raw,
    fetchedAt,
    externalId,
    sourceUrl: stringValue(links.self),
    title: stringValue(tender.title),
    description: stringValue(tender.description),
    buyerName: stringValue(buyer.name),
    buyerCity: stringValue(buyerAddress.locality),
    buyerCountry: stringValue(buyerAddress.countryName),
    publicationDate: stringValue(raw.date),
    deadline: stringValue(tenderPeriod.endDate),
    noticeType: mapOcdsNoticeType(raw.tag),
    procedureType: stringValue(tender.procurementMethodDetails),
    cpvCodes,
    nutsCodes: extractNutsCodes([
      stringValue(projectLocation.uri),
      stringValue(projectLocation.id),
    ]),
    projectLocation: stringValue(projectLocation.description),
    estimatedValue: numberValue(value.amount),
    currency: stringValue(value.currency),
    documentsUrl: findOcdsDocumentUrl(tender.documents),
  })
}

export function normalizeEformsNotice(
  input: unknown,
  fetchedAt = new Date()
): ProcurementNotice {
  const raw = recordValue(input)
  const externalId = firstString(raw['BT-701-notice']) ?? ''

  return createNotice({
    raw,
    fetchedAt,
    externalId,
    sourceUrl: firstString(raw.sourceUrl),
    title: firstString(raw['BT-21-Procedure']),
    description: firstString(raw['BT-24-Procedure']),
    buyerName: firstString(raw['BT-500-Organization-Company']),
    buyerCity: firstString(raw['BT-513-Organization-Company']),
    buyerCountry: firstString(raw['BT-514-Organization-Company']),
    publicationDate: firstString(raw['OPP-012-notice']),
    deadline: firstString(raw['BT-1311-Lot']),
    noticeType: mapEformsNoticeType(firstString(raw['BT-02-notice'])),
    procedureType: firstString(raw['BT-105-Procedure']),
    cpvCodes: uniqueStrings(stringArray(raw['BT-262-Procedure'])),
    nutsCodes: uniqueStrings(stringArray(raw['BT-5071-Procedure'])),
    projectLocation: firstString(raw['BT-22-Procedure']),
    estimatedValue: numberValue(raw['BT-27-Procedure']),
    currency: firstString(raw['BT-27-Procedure-currency']),
    documentsUrl: firstString(raw.documentsUrl),
  })
}

export function normalizeCsvNotice(
  input: unknown,
  relations: CsvRelations = {},
  fetchedAt = new Date()
): ProcurementNotice {
  const raw = recordValue(input)
  const externalId = stringValue(raw.noticeIdentifier) ?? ''
  const noticeVersion = stringValue(raw.noticeVersion)
  const classifications = (relations.classifications ?? []).filter((row) =>
    stringValue(row.noticeIdentifier) === externalId
    && (
      !noticeVersion
      || stringValue(row.noticeVersion) === noticeVersion
    )
    && (
      !stringValue(row.classificationScheme)
      || stringValue(row.classificationScheme)?.toUpperCase() === 'CPV'
    )
  )

  return createNotice({
    raw,
    fetchedAt,
    externalId,
    sourceUrl: stringValue(raw.sourceUrl),
    title: stringValue(raw.noticeTitle),
    description: stringValue(raw.procedureDescription),
    buyerName: stringValue(raw.buyerName),
    buyerCity: stringValue(raw.buyerCity),
    buyerCountry: stringValue(raw.buyerCountry),
    publicationDate: stringValue(raw.publicationDate),
    deadline: stringValue(raw.deadlineReceiptTenders),
    noticeType: mapFormType(
      stringValue(raw.formType),
      stringValue(raw.noticeType)
    ),
    procedureType: stringValue(raw.procedureType),
    cpvCodes: uniqueStrings(
      classifications
        .map((row) => stringValue(row.classificationCode))
        .filter((code): code is string => code !== null)
    ),
    nutsCodes: uniqueStrings(stringArray(raw.nutsCodes)),
    projectLocation: stringValue(raw.projectLocation),
    estimatedValue: numberValue(raw.estimatedValue),
    currency: stringValue(raw.estimatedValueCurrency),
    documentsUrl: stringValue(raw.documentsUrl),
  })
}

interface NoticeFields {
  raw: Record<string, unknown>
  fetchedAt: Date
  externalId: string
  sourceUrl: string | null
  title: string | null
  description: string | null
  buyerName: string | null
  buyerCity: string | null
  buyerCountry: string | null
  publicationDate: string | null
  deadline: string | null
  noticeType: NoticeType
  procedureType: string | null
  cpvCodes: string[]
  nutsCodes: string[]
  projectLocation: string | null
  estimatedValue: number | null
  currency: string | null
  documentsUrl: string | null
}

function createNotice(fields: NoticeFields): ProcurementNotice {
  return {
    source_id: SOURCE_ID,
    source_name: SOURCE_NAME,
    source_url: fields.sourceUrl
      ?? `https://oeffentlichevergabe.de/ui/de/suche?search=${encodeURIComponent(fields.externalId)}`,
    external_id: fields.externalId,
    title: fields.title ?? fields.externalId,
    description: fields.description ?? '',
    buyer_name: fields.buyerName,
    buyer_city: fields.buyerCity,
    buyer_country: fields.buyerCountry,
    publication_date: fields.publicationDate,
    deadline: fields.deadline,
    notice_type: fields.noticeType,
    procedure_type: fields.procedureType,
    cpv_codes: fields.cpvCodes,
    nuts_codes: fields.nutsCodes,
    project_location: fields.projectLocation ?? fields.buyerCity,
    estimated_value: fields.estimatedValue,
    currency: fields.currency,
    documents_url: fields.documentsUrl,
    raw: fields.raw,
    fetched_at: fields.fetchedAt.toISOString(),
  }
}

function mapOcdsNoticeType(tags: unknown): NoticeType {
  const values = stringArray(tags).map((tag) => tag.toLowerCase())
  if (values.some((tag) => tag === 'award' || tag === 'contract')) return 'award'
  if (values.includes('tender')) return 'contract_notice'
  if (values.includes('planning')) return 'prior_information'
  return 'unknown'
}

function mapEformsNoticeType(noticeType: string | null): NoticeType {
  const value = noticeType?.toLowerCase() ?? ''
  if (value === 'e1' || value.includes('consultation')) {
    return 'market_exploration'
  }
  if (/^(29|30|31|32|33|34|35|36|37|e4|e5|e6)$/.test(value)) {
    return 'result'
  }
  if (/^(1|2|3|4|5|6|7|8|9|e2)$/.test(value)) {
    return 'prior_information'
  }
  if (value) return 'contract_notice'
  return 'unknown'
}

function mapFormType(
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
  return mapEformsNoticeType(noticeType)
}

function findOcdsDocumentUrl(value: unknown): string | null {
  for (const item of arrayValue(value)) {
    const document = recordValue(item)
    const url = stringValue(document.url)
    if (url) return url
  }
  return null
}

function cpvCode(value: Record<string, unknown>): string | null {
  const scheme = stringValue(value.scheme)
  if (scheme && scheme.toUpperCase() !== 'CPV') return null
  return stringValue(value.id)
}

function extractNutsCodes(values: Array<string | null>): string[] {
  const codes: string[] = []
  for (const value of values) {
    if (!value) continue
    const matches = value.toUpperCase().match(/\bDE[A-Z0-9]{2,3}\b/g) ?? []
    codes.push(...matches.filter((code) => code !== 'DEU'))
  }
  return uniqueStrings(codes)
}

function firstString(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = stringValue(item)
      if (result) return result
    }
    return null
  }
  return stringValue(value)
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(stringValue)
      .filter((item): item is string => item !== null)
  }
  const item = stringValue(value)
  return item ? [item] : []
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const result = Number(value)
    return Number.isFinite(result) ? result : null
  }
  return null
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}
