import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Source } from '@/lib/sources'
import { StreamEmitter, type StreamEvent } from '@/lib/pipeline/stream'

const mocks = vi.hoisted(() => {
  const fetchBySourceId = new Map<string, unknown[]>()
  return {
    fetchBySourceId,
    getAdapter: vi.fn((source: Source) => ({
      fetch: vi.fn(() => Promise.resolve(fetchBySourceId.get(source.id) ?? [])),
    })),
    callAI: vi.fn(),
  }
})

vi.mock('@/lib/sources', () => ({
  getAdapter: mocks.getAdapter,
}))

vi.mock('@/lib/ai', () => ({
  callAI: mocks.callAI,
  RelevanceFilterSchema: {},
}))

describe('runPass1', () => {
  beforeEach(() => {
    mocks.fetchBySourceId.clear()
    mocks.getAdapter.mockClear()
    mocks.callAI.mockReset()
  })

  test('returns all raw leads and the AI-filtered relevant leads', async () => {
    const { runPass1 } = await import('@/lib/pipeline/pass1-broad')
    const sources = [
      makeSource('source-a', 'RSS A'),
      makeSource('source-b', 'RSS B'),
    ]
    const rawLeadA = {
      sourceId: 'source-a',
      sourceUrl: 'https://example.test/a',
      title: 'Klinikum Stuttgart Neubau',
      description: 'Relevantes Hochbauprojekt',
    }
    const rawLeadB = {
      sourceId: 'source-a',
      sourceUrl: 'https://example.test/b',
      title: 'Irrelevante Dienstleistung',
      description: 'Kein Bauprojekt',
    }
    const rawLeadC = {
      sourceId: 'source-b',
      sourceUrl: 'https://example.test/c',
      title: 'Schulbau Ausschreibung',
      description: 'Relevante Ausschreibung',
    }
    mocks.fetchBySourceId.set('source-a', [rawLeadA, rawLeadB])
    mocks.fetchBySourceId.set('source-b', [rawLeadC])
    mocks.callAI
      .mockResolvedValueOnce({ relevant: true, reason: 'Hochbau' })
      .mockResolvedValueOnce({ relevant: false, reason: 'Keine CDE-Relevanz' })
      .mockResolvedValueOnce({ relevant: true, reason: 'Ausschreibung' })
    const events: StreamEvent[] = []

    const stream = new StreamEmitter((event) => events.push(event))
    const result = await runPass1(sources, stream)

    expect(result.rawLeads).toEqual([rawLeadA, rawLeadB, rawLeadC])
    expect(result.relevantLeads).toEqual([
      {
        ...rawLeadA,
        isLead: true,
        persona: 'unknown',
        hebelType: 'indirect',
        pass1Reason: 'Hochbau',
      },
      {
        ...rawLeadC,
        isLead: true,
        persona: 'unknown',
        hebelType: 'indirect',
        pass1Reason: 'Ausschreibung',
      },
    ])
    expect(result.filteredCount).toBe(2)
    expect(events).toContainEqual({ type: 'pass_complete', pass: 1, count: 2 })
  })

  test('attaches persona and Hebel classification to relevant leads', async () => {
    const { runPass1 } = await import('@/lib/pipeline/pass1-broad')
    const source = makeSource('source-a', 'RSS A')
    const rawLead = {
      sourceId: 'source-a',
      sourceUrl: 'https://example.test/a',
      title: 'Wulf Architekten gewinnen Klinik-Wettbewerb',
      description: 'Architekturbüro als Türöffner zum Bauherrn',
    }
    mocks.fetchBySourceId.set('source-a', [rawLead])
    mocks.callAI.mockResolvedValueOnce({
      relevant: true,
      is_lead: true,
      persona: 'planer',
      hebel_type: 'opener',
      reason: 'Planer-Lead mit Bauherrn-Potenzial',
    })

    const result = await runPass1([source], new StreamEmitter())

    expect(result.relevantLeads).toEqual([
      {
        ...rawLead,
        isLead: true,
        persona: 'planer',
        hebelType: 'opener',
        pass1Reason: 'Planer-Lead mit Bauherrn-Potenzial',
      },
    ])
  })

  test('stops AI filtering after the requested relevant lead limit', async () => {
    const { runPass1 } = await import('@/lib/pipeline/pass1-broad')
    const source = makeSource('source-a', 'RSS A')
    mocks.fetchBySourceId.set('source-a', [
      {
        sourceId: 'source-a',
        sourceUrl: 'https://example.test/a',
        title: 'Lead A',
        description: 'Relevant',
      },
      {
        sourceId: 'source-a',
        sourceUrl: 'https://example.test/b',
        title: 'Lead B',
        description: 'Relevant',
      },
    ])
    mocks.callAI.mockResolvedValue({
      relevant: true,
      is_lead: true,
      persona: 'bauherr_public',
      hebel_type: 'direct',
      reason: 'Relevant',
    })

    const result = await runPass1([source], new StreamEmitter(), { maxRelevantLeads: 1 })

    // Batch-parallel implementation filters up to maxRelevantLeads*4 leads concurrently,
    // then truncates. With 2 leads in the batch both get filtered — result is still capped at 1.
    expect(result.relevantLeads).toHaveLength(1)
    expect(mocks.callAI).toHaveBeenCalledTimes(2) // both in same batch, then truncated
  })
})

function makeSource(id: string, name: string): Source {
  return {
    id,
    name,
    type: 'rss',
    config: {},
    enabled: true,
    last_run_at: null,
    last_results_count: 0,
    created_at: '2026-06-07T00:00:00.000Z',
    persona: 'unknown' as any,
    priority: 2,
    description: 'Test Source',
  }
}
