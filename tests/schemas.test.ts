import { describe, expect, test } from 'vitest'
import {
  CrossReferenceSchema,
  ClassificationScoringSchema,
  RelevanceFilterSchema,
} from '@/lib/ai/schemas'

describe('AI schemas', () => {
  test('validates Pass 1 persona and Hebel classification output', () => {
    const result = RelevanceFilterSchema.parse({
      is_lead: true,
      relevant: true,
      persona: 'bauherr_public',
      hebel_type: 'direct',
      reason: 'Klinik-Neubau mit oeffentlichem Bauherrn',
    })

    expect(result.persona).toBe('bauherr_public')
    expect(result.hebel_type).toBe('direct')
  })

  test('validates Pass 2 structured extraction with final scoring fields', () => {
    const result = ClassificationScoringSchema.parse({
      project_type: 'tender',
      project_category: 'hospital',
      bauherr_name: 'Klinikum Stuttgart gGmbH',
      bauherr_type: 'clinic',
      architekt_name: 'Wulf Architekten',
      gu_name: null,
      ps_name: null,
      project_value: 85000000,
      project_value_estimate: 85000000,
      project_date: '2026-03-15',
      project_phase: 'LP3',
      location: 'Stuttgart',
      persona: 'bauherr_public',
      hebel_type: 'direct',
      hebel_multiplier: 1,
      basis_score: 97,
      final_score: 97,
      score: 97,
      score_reasoning: 'Klarer Bauherr, hohes Volumen, fruehe Phase',
      score_breakdown: {
        recency: 25,
        volume: 25,
        phase: 20,
        persona: 15,
        complexity: 12,
      },
      lead_class: 'hot',
      data_quality: 'verified',
      companies: ['Klinikum Stuttgart gGmbH', 'Wulf Architekten'],
    })

    expect(result.final_score).toBe(97)
    expect(result.lead_class).toBe('hot')
  })

  test('rounds fractional AI score values before enforcing score limits', () => {
    const result = ClassificationScoringSchema.parse({
      project_type: 'competition',
      project_category: 'cultural',
      score_reasoning: 'Floating point output from model',
      basis_score: 84.999999999,
      final_score: 59.499999999,
      score: 59.499999999,
      score_breakdown: {
        recency: 10.2,
        volume: 24.8,
        phase: 20,
        persona: 15,
        complexity: 15.4,
      },
    })

    expect(result.basis_score).toBe(85)
    expect(result.final_score).toBe(59)
    expect(result.score).toBe(59)
    expect(result.score_breakdown).toEqual({
      recency: 10,
      volume: 25,
      phase: 20,
      persona: 15,
      complexity: 15,
    })
  })

  test('validates Pass 3 enrichment and sales strategy without requiring contacts', () => {
    const result = CrossReferenceSchema.parse({
      sales_strategy: 'Bauherr direkt ansprechen. ISO 27001 und deutsches Hosting betonen.',
      decision_makers: [],
      killer_arguments: ['ISO 27001', 'Deutsches Hosting', 'FM-Integration'],
      best_timing: 'Nach VgV vor LP3',
      estimated_close_probability: 72,
      additional_contacts: [],
      enrichment_notes: 'Keine verifizierten Kontakte gefunden.',
      validated_score: 91,
    })

    expect(result.decision_makers).toEqual([])
    expect(result.sales_strategy).toContain('Bauherr')
  })
})
