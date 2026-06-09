import { describe, expect, test, vi } from 'vitest'
import {
  assertLeadEngineV2Schema,
  LEAD_ENGINE_V2_COLUMNS,
  MigrationRequiredError,
  assertProcurementSchema,
  PROCUREMENT_COLUMNS,
} from '@/lib/supabase/schema-check'

describe('Supabase schema check', () => {
  test('queries all required Lead Engine v2 columns', async () => {
    const limit = vi.fn().mockResolvedValue({ error: null })
    const select = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ select }))

    await assertLeadEngineV2Schema({ from })

    expect(from).toHaveBeenCalledWith('leads')
    expect(select).toHaveBeenCalledWith(LEAD_ENGINE_V2_COLUMNS.join(','))
    expect(limit).toHaveBeenCalledWith(1)
  })

  test('throws a migration error when a required column is missing', async () => {
    const limit = vi.fn().mockResolvedValue({
      error: {
        code: '42703',
        message: 'column leads.lead_class does not exist',
      },
    })
    const select = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ select }))

    await expect(assertLeadEngineV2Schema({ from })).rejects.toThrow(MigrationRequiredError)
    await expect(assertLeadEngineV2Schema({ from })).rejects.toThrow('004_lead_engine_v2.sql')
  })
})

describe('Procurement schema check', () => {
  test('queries all required migration 007 columns', async () => {
    const limit = vi.fn().mockResolvedValue({ error: null })
    const select = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ select }))

    await assertProcurementSchema({ from })

    expect(from).toHaveBeenCalledWith('leads')
    expect(select).toHaveBeenCalledWith(PROCUREMENT_COLUMNS.join(','))
    expect(limit).toHaveBeenCalledWith(1)
  })

  test('points to migration 007 when a procurement column is missing', async () => {
    const limit = vi.fn().mockResolvedValue({
      error: {
        code: '42703',
        message: 'column leads.sales_window does not exist',
      },
    })
    const select = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ select }))

    await expect(assertProcurementSchema({ from })).rejects.toThrow(MigrationRequiredError)
    await expect(assertProcurementSchema({ from })).rejects.toThrow('007_procurement_sources.sql')
  })
})
