export type NoticeType =
  | 'prior_information'
  | 'market_exploration'
  | 'competition'
  | 'contract_notice'
  | 'award'
  | 'result'
  | 'unknown'

export type ProcurementStage =
  | 'prior_information'
  | 'market_exploration'
  | 'competition'
  | 'tender'
  | 'planning_procurement'
  | 'award'
  | 'execution'
  | 'unknown'

export type SalesWindow =
  | 'open'
  | 'closing_soon'
  | 'too_late'
  | 'unknown'

export type SourceKind =
  | 'procurement_open_data'
  | 'ted'
  | 'tavily'
  | 'rss'
  | 'firecrawl'

export interface ProcurementNotice {
  source_id: string
  source_name: string
  source_url: string
  external_id: string
  title: string
  description: string
  buyer_name: string | null
  buyer_city: string | null
  buyer_country: string | null
  publication_date: string | null
  deadline: string | null
  notice_type: NoticeType
  procedure_type: string | null
  cpv_codes: string[]
  nuts_codes: string[]
  project_location: string | null
  estimated_value: number | null
  currency: string | null
  documents_url: string | null
  raw: Record<string, unknown>
  fetched_at: string
}
