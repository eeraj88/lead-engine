import { describe, expect, test } from 'vitest'
import type { ProcurementNotice } from '@/lib/sources/procurement/types'
import { filterProcurementNotice } from '@/lib/pipeline/procurement-filter'

const NOW = new Date('2026-06-08T12:00:00.000Z')

function makeNotice(overrides: Partial<ProcurementNotice> = {}): ProcurementNotice {
  return {
    source_id: 'source-1',
    source_name: 'TED',
    source_url: 'https://example.test/notices/1',
    external_id: 'notice-1',
    title: 'Planungsleistungen fuer einen Schulneubau',
    description: 'Objektplanung Gebaeude LP2 bis LP4',
    buyer_name: 'Stadt Musterstadt',
    buyer_city: 'Musterstadt',
    buyer_country: 'DE',
    publication_date: '2026-06-01',
    deadline: '2026-07-15T12:00:00.000Z',
    notice_type: 'contract_notice',
    procedure_type: 'open',
    cpv_codes: ['71200000'],
    nuts_codes: ['DE123'],
    project_location: 'Musterstadt',
    estimated_value: 12_000_000,
    currency: 'EUR',
    documents_url: 'https://example.test/notices/1/documents',
    raw: {},
    fetched_at: NOW.toISOString(),
    ...overrides,
  }
}

describe('filterProcurementNotice', () => {
  test('rejects award notices before AI scoring', () => {
    const result = filterProcurementNotice(
      makeNotice({ notice_type: 'award', title: 'Zuschlag erteilt' }),
      NOW
    )

    expect(result).toMatchObject({
      relevant: false,
      salesWindow: 'too_late',
      procurementStage: 'award',
    })
    expect(result.reasons).toContain('award_notice')
  })

  test('rejects notices whose deadline was yesterday', () => {
    const result = filterProcurementNotice(
      makeNotice({ deadline: '2026-06-07T12:00:00.000Z' }),
      NOW
    )

    expect(result.relevant).toBe(false)
    expect(result.salesWindow).toBe('too_late')
    expect(result.reasons).toContain('deadline_expired')
  })

  test('accepts an open planning procurement with architecture CPV', () => {
    const result = filterProcurementNotice(makeNotice(), NOW)

    expect(result).toMatchObject({
      relevant: true,
      salesWindow: 'open',
      procurementStage: 'planning_procurement',
    })
    expect(result.reasons).toContain('relevant_cpv')
  })

  test('accepts AHO project management with a future deadline', () => {
    const result = filterProcurementNotice(
      makeNotice({
        title: 'Projektsteuerung nach AHO fuer Klinikneubau',
        description: 'Leistungsstufen 1 bis 5, Projektmanagement im Bauwesen',
        cpv_codes: ['71541000'],
      }),
      NOW
    )

    expect(result.relevant).toBe(true)
    expect(result.procurementStage).toBe('planning_procurement')
    expect(result.reasons).toContain('project_management')
  })

  test('rejects completion and reference announcements', () => {
    const result = filterProcurementNotice(
      makeNotice({
        title: 'Neue Schule feierlich eroeffnet',
        description: 'Das fertiggestellte Projekt dient als Referenz.',
      }),
      NOW
    )

    expect(result.relevant).toBe(false)
    expect(result.salesWindow).toBe('too_late')
    expect(result.reasons).toContain('completion_or_reference')
  })

  test('rejects pure road construction execution', () => {
    const result = filterProcurementNotice(
      makeNotice({
        title: 'Strassenbau und Fahrbahnsanierung',
        description: 'Bauausfuehrung fuer Fahrbahn, Bruecke und Gleisanlagen.',
        cpv_codes: ['45233120'],
      }),
      NOW
    )

    expect(result.relevant).toBe(false)
    expect(result.procurementStage).toBe('execution')
    expect(result.reasons).toContain('pure_infrastructure_execution')
  })

  test('accepts a current CDE and BIM market exploration', () => {
    const result = filterProcurementNotice(
      makeNotice({
        title: 'Markterkundung Common Data Environment',
        description: 'Gesucht wird eine CDE mit BIM-Koordination, IFC-Viewer und Projektraum.',
        notice_type: 'market_exploration',
        cpv_codes: [],
        deadline: '2026-06-18T12:00:00.000Z',
      }),
      NOW
    )

    expect(result).toMatchObject({
      relevant: true,
      salesWindow: 'closing_soon',
      procurementStage: 'market_exploration',
    })
    expect(result.reasons).toContain('cde_bim_signal')
  })
})
