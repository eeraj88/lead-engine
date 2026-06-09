import { describe, expect, test, vi } from 'vitest'
import { StreamEmitter, type StreamEvent } from '@/lib/pipeline/stream'

const mocks = vi.hoisted(() => ({
  callAI: vi.fn(),
}))

vi.mock('@/lib/ai', () => ({
  callAI: mocks.callAI,
  ClassificationScoringSchema: {},
}))

describe('runPass2', () => {
  test('maps v2 scoring fields onto scored leads and keeps hot or warm leads for pass 3', async () => {
    const { runPass2 } = await import('@/lib/pipeline/pass2-deep')
    mocks.callAI
      .mockResolvedValueOnce({
        project_type: 'tender',
        project_category: 'hospital',
        score: 97,
        score_reasoning: 'Klarer Bauherr',
        project_value_estimate: 85000000,
        location: 'Stuttgart',
        companies: ['Klinikum Stuttgart gGmbH'],
        persona: 'bauherr_public',
        hebel_type: 'direct',
        hebel_multiplier: 1,
        basis_score: 97,
        final_score: 97,
        lead_class: 'hot',
        score_breakdown: {
          recency: 25,
          volume: 25,
          phase: 20,
          persona: 15,
          complexity: 12,
        },
        data_quality: 'verified',
      })
      .mockResolvedValueOnce({
        project_type: 'competition',
        project_category: 'cultural',
        score: 34,
        score_reasoning: 'Schwacher indirekter Hebel',
        project_value_estimate: null,
        location: 'Aachen',
        companies: ['Planungsbuero Beispiel'],
        persona: 'planer',
        hebel_type: 'indirect',
        hebel_multiplier: 0.4,
        basis_score: 84,
        final_score: 34,
        lead_class: 'not',
        score_breakdown: {
          recency: 25,
          volume: 20,
          phase: 15,
          persona: 10,
          complexity: 14,
        },
        data_quality: 'inferred',
      })
    const events: StreamEvent[] = []

    const result = await runPass2(
      [
        {
          sourceId: 'source-a',
          sourceUrl: 'https://example.test/hot',
          title: 'Klinikum Stuttgart Neubau',
          description: 'VgV-Verfahren fuer Bettenhaus',
          publishedAt: '2026-03-15',
        },
        {
          sourceId: 'source-b',
          sourceUrl: 'https://example.test/not',
          title: 'Kleiner Wettbewerb',
          description: 'Schwacher Lead',
        },
      ],
      new StreamEmitter((event) => events.push(event))
    )

    expect(result.scoredLeads[0]).toMatchObject({
      basisScore: 97,
      finalScore: 97,
      leadClass: 'hot',
      persona: 'bauherr_public',
      hebelType: 'direct',
      hebelMultiplier: 1,
      dataQuality: 'verified',
    })
    expect(result.scoredLeads[1]).toMatchObject({
      basisScore: 84,
      finalScore: 34,
      leadClass: 'not',
      hebelType: 'indirect',
    })
    expect(result.topLeads).toHaveLength(1)
    expect(result.topLeads[0].title).toBe('Klinikum Stuttgart Neubau')
    expect(events).toContainEqual({ type: 'lead_scored', title: 'Klinikum Stuttgart Neubau', score: 97 })
  })

  test('persists Pass 1 persona and Hebel context in pass1Data', async () => {
    const { runPass2 } = await import('@/lib/pipeline/pass2-deep')
    mocks.callAI.mockResolvedValueOnce({
      project_type: 'competition',
      project_category: 'hospital',
      score: 59,
      score_reasoning: 'Opener mit Bauherrn-Potenzial',
      project_value_estimate: 18000000,
      location: 'Aachen',
      companies: ['Wulf Architekten'],
      persona: 'planer',
      hebel_type: 'opener',
      hebel_multiplier: 0.7,
      basis_score: 84,
      final_score: 59,
      lead_class: 'cold',
      score_breakdown: {
        recency: 25,
        volume: 20,
        phase: 15,
        persona: 10,
        complexity: 14,
      },
      data_quality: 'inferred',
    })

    const result = await runPass2(
      [
        {
          sourceId: 'source-a',
          sourceUrl: 'https://example.test/opener',
          title: 'Wulf Architekten gewinnen Klinik-Wettbewerb',
          description: 'Architekturbüro als Türöffner zum Bauherrn',
          publishedAt: '2026-03-15',
          isLead: true,
          persona: 'planer',
          hebelType: 'opener',
          pass1Reason: 'Planer-Lead mit Bauherrn-Potenzial',
        },
      ],
      new StreamEmitter()
    )

    expect(result.scoredLeads[0].pass1Data).toMatchObject({
      publishedAt: '2026-03-15',
      isLead: true,
      persona: 'planer',
      hebelType: 'opener',
      reason: 'Planer-Lead mit Bauherrn-Potenzial',
    })
  })

  test('forces projects already in execution to NOT even when the AI scores them hot', async () => {
    const { runPass2 } = await import('@/lib/pipeline/pass2-deep')
    mocks.callAI.mockResolvedValueOnce({
      project_type: 'tender',
      project_category: 'infrastructure',
      score: 97,
      score_reasoning: 'Grosses, komplexes Projekt',
      project_value_estimate: 50,
      project_date: '2025-12-01',
      project_phase: 'LP5+ (Ausfuehrung laeuft)',
      location: 'Berlin',
      companies: ['DEGES', 'STRABAG'],
      persona: 'bauherr_public',
      hebel_type: 'direct',
      hebel_multiplier: 1,
      basis_score: 97,
      final_score: 97,
      lead_class: 'hot',
      score_breakdown: {
        recency: 25,
        volume: 25,
        phase: 20,
        persona: 15,
        complexity: 12,
      },
      data_quality: 'verified',
    })
    const events: StreamEvent[] = []

    const result = await runPass2(
      [{
        sourceId: 'deges',
        sourceUrl: 'https://example.test/westendbruecke',
        title: 'Auftrag fuer Neubau der Westendbruecke vergeben',
        description: 'Baubeginn im Dezember 2025. Die Arbeiten laufen.',
        publishedAt: '2025-11-06',
      }],
      new StreamEmitter((event) => events.push(event))
    )

    expect(result.scoredLeads[0]).toMatchObject({
      finalScore: 72,
      leadClass: 'not',
    })
    expect(result.scoredLeads[0].scoreBreakdown).toMatchObject({ phase: 0 })
    expect(result.topLeads).toHaveLength(0)
    expect(events).toContainEqual(expect.objectContaining({
      type: 'warning',
      message: expect.stringContaining('Ausfuehrung bereits gestartet'),
    }))
  })
})
