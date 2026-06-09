import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { Database } from '@/lib/supabase/types'

const migration = readFileSync(
  new URL('../migrations/007_procurement_sources.sql', import.meta.url),
  'utf8'
)

type LeadRow = Database['public']['Tables']['leads']['Row']
type LeadInsert = Database['public']['Tables']['leads']['Insert']
type LeadUpdate = Database['public']['Tables']['leads']['Update']

describe('procurement schema migration', () => {
  test.each([
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
  ])('adds leads.%s', (column) => {
    expect(migration).toMatch(
      new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`, 'i')
    )
  })

  test('defines enum-like checks and query indexes', () => {
    expect(migration).toContain("sales_window IN ('open', 'closing_soon', 'too_late', 'unknown')")
    expect(migration).toContain("source_kind IN ('procurement_open_data', 'ted', 'tavily', 'rss', 'firecrawl')")
    expect(migration).toContain('idx_leads_deadline')
    expect(migration).toContain('idx_leads_sales_window')
    expect(migration).toContain('idx_leads_external_notice_id')
    expect(migration).toContain('USING GIN (cpv_codes)')
  })

  test('keeps Row, Insert and Update procurement fields synchronized', () => {
    const row = {} as LeadRow
    const insert = {} as LeadInsert
    const update = {} as LeadUpdate

    expectType<string | null>(row.deadline)
    expectType<string | null>(row.notice_type)
    expectType<string | null>(row.procedure_type)
    expectType<'prior_information' | 'market_exploration' | 'competition' | 'tender' | 'planning_procurement' | 'award' | 'execution' | 'unknown' | null>(row.procurement_stage)
    expectType<'open' | 'closing_soon' | 'too_late' | 'unknown' | null>(row.sales_window)
    expectType<Database['public']['Tables']['leads']['Row']['cpv_codes']>(row.cpv_codes)
    expectType<string | null>(row.source_kind)
    expectType<Database['public']['Tables']['leads']['Row']['raw_notice']>(row.raw_notice)

    expectType<string | null | undefined>(insert.deadline)
    expectType<string | null | undefined>(update.deadline)
  })
})

function expectType<T>(_value: T): void {
  // Compile-time assertion only.
}
