export const LEAD_ENGINE_V2_COLUMNS = [
  'lead_class',
  'persona',
  'hebel_type',
  'hebel_multiplier',
  'project_phase',
  'project_date',
  'sales_strategy',
  'bauherr_name',
  'architekt_name',
  'score_breakdown',
  'basis_score',
  'final_score',
  'data_quality',
  'decision_makers',
  'opener_lead_id',
]

export const PROCUREMENT_COLUMNS = [
  'deadline',
  'notice_type',
  'procedure_type',
  'procurement_stage',
  'sales_window',
  'cpv_codes',
  'buyer_name',
  'buyer_city',
  'estimated_value',
  'documents_url',
  'external_notice_id',
  'source_kind',
  'raw_notice',
]

export class MigrationRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MigrationRequiredError'
  }
}

interface SupabaseLike {
  from(table: string): {
    select(columns: string): {
      limit(count: number): Promise<{ error: { code?: string; message: string } | null }>
    }
  }
}

export async function assertLeadEngineV2Schema(supabase: SupabaseLike): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .select(LEAD_ENGINE_V2_COLUMNS.join(','))
    .limit(1)

  if (!error) return

  if (error.code === '42703' || error.message.includes('column')) {
    throw new MigrationRequiredError(
      `Lead Engine v2 schema missing. Run migrations/004_lead_engine_v2.sql in Supabase SQL Editor. Supabase error: ${error.message}`
    )
  }

  throw new Error(`Unable to verify Lead Engine v2 schema: ${error.message}`)
}

export async function assertProcurementSchema(supabase: SupabaseLike): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .select(PROCUREMENT_COLUMNS.join(','))
    .limit(1)

  if (!error) return

  if (error.code === '42703' || error.message.includes('column')) {
    throw new MigrationRequiredError(
      `Procurement schema missing. Run migrations/007_procurement_sources.sql in Supabase SQL Editor. Supabase error: ${error.message}`
    )
  }

  throw new Error(`Unable to verify procurement schema: ${error.message}`)
}
