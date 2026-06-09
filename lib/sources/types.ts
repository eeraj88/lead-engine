export type SourcePersona = 'bauherr_public' | 'bauherr_private' | 'gu' | 'projektsteuerer' | 'planer' | 'mixed'
export type SourcePriority = 1 | 2 | 3

export interface Source {
  id: string
  name: string
  type: 'rss' | 'tavily' | 'api'
  config: Record<string, unknown>
  enabled: boolean
  persona: SourcePersona
  priority: SourcePriority
  description: string | null
  last_run_at: string | null
  last_results_count: number
  created_at: string
}

/** Structured procurement metadata attached to TED/Open-Data leads. */
export interface ProcurementMeta {
  externalId: string
  sourceKind: 'ted' | 'procurement_open_data'
  deadline: string | null
  noticeType: string
  procurementStage: string
  salesWindow: string
  cpvCodes: string[]
  nutsCodes: string[]
  buyerName: string | null
  buyerCity: string | null
  estimatedValue: number | null
  documentsUrl: string | null
  rawNotice: Record<string, unknown>
}

export interface RawLead {
  sourceId: string
  sourceUrl: string
  title: string
  description: string
  publishedAt?: string
  isLead?: boolean
  persona?: 'bauherr_public' | 'bauherr_private' | 'gu' | 'projektsteuerer' | 'planer' | 'unknown'
  hebelType?: 'direct' | 'opener' | 'indirect'
  pass1Reason?: string
  /** Extra context injected into PASS_2_PROMPT — e.g. structured procurement fields. */
  additionalContext?: string
  /** Present only for TED/Open-Data leads that skipped Pass 1 AI filter. */
  procurement?: ProcurementMeta
}

export interface SourceAdapter {
  fetch(source: Source): Promise<RawLead[]>
}
