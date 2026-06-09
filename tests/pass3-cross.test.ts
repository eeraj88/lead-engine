import { describe, expect, test, vi } from 'vitest'
import type { ScoredLead } from '@/lib/pipeline/pass2-deep'
import { StreamEmitter, type StreamEvent } from '@/lib/pipeline/stream'

const mocks = vi.hoisted(() => ({
  callAI: vi.fn(),
}))

vi.mock('@/lib/ai', () => ({
  callAI: mocks.callAI,
  CrossReferenceSchema: {},
}))

describe('runPass3', () => {
  test('adds sales strategy fields and removes hallucinated decision makers', async () => {
    const { runPass3 } = await import('@/lib/pipeline/pass3-cross')
    mocks.callAI.mockResolvedValueOnce({
      validated_score: 91,
      additional_contacts: [],
      decision_makers: [
        { name: 'Max Mustermann', role: 'CEO', company: 'Architektur AG' },
        { name: 'Carla Weber', role: 'Bauamtsleitung', company: 'Stadt Aachen' },
      ],
      enrichment_notes: 'Ein Kontakt verifiziert.',
      sales_strategy: 'Bauherr direkt ansprechen. ISO 27001 und deutsches Hosting betonen.',
      killer_arguments: ['ISO 27001', 'Deutsches Hosting'],
      best_timing: 'Nach VgV vor LP3',
      estimated_close_probability: 72,
    })
    const events: StreamEvent[] = []

    const result = await runPass3([makeScoredLead()], new StreamEmitter((event) => events.push(event)))

    expect(result[0]).toMatchObject({
      validatedScore: 91,
      salesStrategy: 'Bauherr direkt ansprechen. ISO 27001 und deutsches Hosting betonen.',
      killerArguments: ['ISO 27001', 'Deutsches Hosting'],
      bestTiming: 'Nach VgV vor LP3',
      estimatedCloseProbability: 72,
      decisionMakers: [
        { name: 'Carla Weber', role: 'Bauamtsleitung', company: 'Stadt Aachen' },
      ],
    })
    expect(events).toContainEqual({ type: 'lead_enriched', title: 'Klinikum Stuttgart Neubau' })
  })
})

function makeScoredLead(): ScoredLead {
  return {
    sourceId: 'source-a',
    sourceUrl: 'https://example.test/hot',
    title: 'Klinikum Stuttgart Neubau',
    description: 'VgV-Verfahren fuer Bettenhaus',
    projectType: 'tender',
    projectCategory: 'hospital',
    score: 97,
    basisScore: 97,
    finalScore: 97,
    leadClass: 'hot',
    persona: 'bauherr_public',
    hebelType: 'direct',
    hebelMultiplier: 1,
    scoreBreakdown: { recency: 25, volume: 25, phase: 20, persona: 15, complexity: 12 },
    scoreReasoning: 'Klarer Bauherr',
    projectValueEstimate: 85000000,
    projectDate: '2026-03-15',
    projectPhase: 'LP3',
    location: 'Stuttgart',
    companies: ['Klinikum Stuttgart gGmbH'],
    bauherrName: 'Klinikum Stuttgart gGmbH',
    bauherrType: 'clinic',
    architektName: 'Wulf Architekten',
    guName: null,
    psName: null,
    dataQuality: 'verified',
    // Step 2+3 new fields
    aiSummary: 'Klinikum Stuttgart plant Neubau Bettenhaus in Stuttgart. Volumen 85 Mio EUR. LP3.',
    involvedParties: [],
    plannedCompletion: null,
    relevantLinks: [],
    pass1Data: {},
    pass2Data: {},
  }
}
