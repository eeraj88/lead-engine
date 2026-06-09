import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Source, RawLead } from '@/lib/sources/types'
import { getAdapter } from '@/lib/sources'

// Mock @tavily/core at module level (ESM-safe)
const mockSearch = vi.fn()
const mockFetch = vi.fn()
vi.mock('@tavily/core', () => ({
  tavily: () => ({ search: mockSearch }),
}))

// Minimal valid Source factory
function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'test-id',
    name: 'Test Source',
    type: 'rss',
    config: { url: 'https://example.com/feed.rss' },
    enabled: true,
    persona: 'mixed',
    priority: 2,
    description: null,
    last_run_at: null,
    last_results_count: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// Required fields every RawLead must have
function assertRawLeadShape(lead: RawLead, sourceId: string) {
  expect(typeof lead.sourceId).toBe('string')
  expect(lead.sourceId).toBe(sourceId)
  expect(typeof lead.sourceUrl).toBe('string')
  expect(lead.sourceUrl.length).toBeGreaterThan(0)
  expect(typeof lead.title).toBe('string')
  expect(lead.title.length).toBeGreaterThan(0)
  expect(typeof lead.description).toBe('string')
}

describe('Source normalization — RSSAdapter', () => {
  it('maps RSS items to RawLead with required fields', async () => {
    const Parser = await import('rss-parser')
    vi.spyOn(Parser.default.prototype, 'parseURL').mockResolvedValueOnce({
      items: [
        {
          title: 'Neubau Rathaus',
          link: 'https://example.com/item/1',
          contentSnippet: 'Stadt baut neues Rathaus',
          pubDate: '2025-01-01T00:00:00Z',
        },
        {
          title: 'Schulneubau Muster',
          guid: 'https://example.com/item/2',
          content: 'Schule wird neu gebaut',
        },
      ],
    } as any)

    const source = makeSource({ id: 'rss-1', type: 'rss' })
    const adapter = getAdapter(source)
    const leads = await adapter.fetch(source)

    expect(leads).toHaveLength(2)
    for (const lead of leads) {
      assertRawLeadShape(lead, 'rss-1')
    }
    expect(leads[0].publishedAt).toBe('2025-01-01T00:00:00Z')
    // item without link falls back to guid
    expect(leads[1].sourceUrl).toBe('https://example.com/item/2')
  })

  it('returns empty array on fetch error without crashing', async () => {
    const Parser = await import('rss-parser')
    vi.spyOn(Parser.default.prototype, 'parseURL').mockRejectedValueOnce(new Error('network'))

    const source = makeSource({ type: 'rss' })
    const adapter = getAdapter(source)
    const leads = await adapter.fetch(source)

    expect(leads).toEqual([])
  })

  it('throws if RSS config has no url', async () => {
    const source = makeSource({ type: 'rss', config: {} })
    const adapter = getAdapter(source)
    await expect(adapter.fetch(source)).rejects.toThrow('missing URL')
  })
})

describe('Source normalization — TavilyAdapter', () => {
  beforeEach(() => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key')
    vi.stubEnv('FIRECRAWL_API_KEY', 'firecrawl-test-key')
    mockSearch.mockReset()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('maps Tavily results to RawLead with required fields', async () => {
    mockSearch.mockResolvedValueOnce({
      results: [
        {
          title: 'Wettbewerb Buergerhaus',
          url: 'https://competitionline.com/item/1',
          content: 'Ergebnis des Wettbewerbs',
          publishedDate: '2025-03-15',
        },
        {
          title: 'Preis Schulbau',
          url: 'https://competitionline.com/item/2',
          content: '',
        },
      ],
    })

    const source = makeSource({
      id: 'tav-1',
      type: 'tavily',
      config: { query: 'Wettbewerb Bau 2025', max_results: 5 },
    })
    const adapter = getAdapter(source)
    const leads = await adapter.fetch(source)

    expect(leads).toHaveLength(2)
    for (const lead of leads) {
      assertRawLeadShape(lead, 'tav-1')
    }
    expect(leads[0].publishedAt).toBe('2025-03-15')
    // empty content → empty string, not undefined
    expect(leads[1].description).toBe('')
  })

  it('returns empty array on Tavily error without crashing', async () => {
    mockSearch.mockRejectedValueOnce(new Error('quota'))

    const source = makeSource({ type: 'tavily', config: { query: 'test' } })
    const adapter = getAdapter(source)
    const leads = await adapter.fetch(source)

    expect(leads).toEqual([])
  })

  it('throws if Tavily config has no query', async () => {
    const source = makeSource({ type: 'tavily', config: {} })
    const adapter = getAdapter(source)
    await expect(adapter.fetch(source)).rejects.toThrow('missing query')
  })

  it('uses Firecrawl when Tavily returns too little page content', async () => {
    mockSearch.mockResolvedValueOnce({
      results: [{
        title: 'Neubau Klinik',
        url: 'https://example.com/klinik',
        content: 'Kurzer Suchtreffer',
        rawContent: '',
        publishedDate: '2026-05-01',
      }],
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          markdown: 'Vollstaendiger Projektinhalt '.repeat(80),
        },
      }),
    })

    const source = makeSource({
      id: 'tav-firecrawl',
      type: 'tavily',
      config: { query: 'Klinik Neubau' },
    })
    const leads = await getAdapter(source).fetch(source)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.firecrawl.dev/v2/scrape',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer firecrawl-test-key',
        }),
      })
    )
    expect(leads[0].description).toContain('Vollstaendiger Projektinhalt')
  })

  it('does not call Firecrawl when Tavily already returned enough content', async () => {
    mockSearch.mockResolvedValueOnce({
      results: [{
        title: 'Neubau Schule',
        url: 'https://example.com/schule',
        rawContent: 'Ausfuehrlicher Tavily-Volltext '.repeat(80),
      }],
    })

    const source = makeSource({
      type: 'tavily',
      config: { query: 'Schule Neubau' },
    })
    const leads = await getAdapter(source).fetch(source)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(leads[0].description).toContain('Ausfuehrlicher Tavily-Volltext')
  })

  it('keeps Tavily content when Firecrawl fails', async () => {
    mockSearch.mockResolvedValueOnce({
      results: [{
        title: 'Rathaus Umbau',
        url: 'https://example.com/rathaus',
        content: 'Kurzer, aber nutzbarer Tavily-Text',
      }],
    })
    mockFetch.mockRejectedValueOnce(new Error('Firecrawl unavailable'))

    const source = makeSource({
      type: 'tavily',
      config: { query: 'Rathaus Umbau' },
    })
    const leads = await getAdapter(source).fetch(source)

    expect(leads[0].description).toBe('Kurzer, aber nutzbarer Tavily-Text')
  })
})

describe('Source persona metadata', () => {
  it('Source interface accepts all valid personas', () => {
    const personas: Source['persona'][] = [
      'bauherr_public', 'bauherr_private', 'gu', 'projektsteuerer', 'planer', 'mixed',
    ]
    for (const persona of personas) {
      const s = makeSource({ persona })
      expect(s.persona).toBe(persona)
    }
  })

  it('Source interface accepts all valid priorities', () => {
    const priorities: Source['priority'][] = [1, 2, 3]
    for (const priority of priorities) {
      const s = makeSource({ priority })
      expect(s.priority).toBe(priority)
    }
  })

  it('getAdapter throws for unknown source type', () => {
    const source = makeSource({ type: 'api' })
    expect(() => getAdapter(source)).toThrow('not implemented')
  })
})
