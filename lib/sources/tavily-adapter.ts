import { tavily } from '@tavily/core'
import { createClient } from '@supabase/supabase-js'
import type { Source, RawLead, SourceAdapter } from './types'
import { scrapeWithFirecrawl } from './firecrawl-client'

const MIN_USEFUL_CONTENT_LENGTH = 1000
const CACHE_TTL_HOURS = 24

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export class TavilyAdapter implements SourceAdapter {
  private client: ReturnType<typeof tavily>

  constructor() {
    const apiKey = process.env.TAVILY_API_KEY
    this.client = tavily({ apiKey })
  }

  async fetch(source: Source): Promise<RawLead[]> {
    const query = source.config.query as string
    const maxResults = (source.config.max_results as number) || 10

    if (!query) {
      throw new Error(`Tavily source ${source.name} missing query in config`)
    }

    const cacheKey = query.trim().toLowerCase()
    const supabase = getSupabase()

    // Cache-Check: Ergebnis aus letzten 24h verwenden → spart Tavily-Credits
    try {
      const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()
      const { data: cached } = await supabase
        .from('tavily_search_cache')
        .select('results')
        .eq('query_key', cacheKey)
        .gte('cached_at', cutoff)
        .maybeSingle()

      if (cached) {
        console.log(`[TavilyAdapter] Cache HIT: "${query.slice(0, 60)}" — 0 Credits`)
        return cached.results as RawLead[]
      }
    } catch (err) {
      console.warn('[TavilyAdapter] Cache read failed, proceeding without cache:', err)
    }

    // Cache MISS → Tavily API aufrufen
    try {
      const response = await this.client.search(query, {
        search_depth: 'advanced',
        max_results: maxResults,
        include_answer: false,
        include_raw_content: true,
      })

      const leads = await Promise.all((response.results || []).map(async (result) => {
        const tavilyContent = result.rawContent || result.content || ''
        let description = tavilyContent

        if (tavilyContent.trim().length < MIN_USEFUL_CONTENT_LENGTH) {
          try {
            description = await scrapeWithFirecrawl(result.url) || tavilyContent
          } catch (error) {
            console.warn(
              `Firecrawl fallback failed for ${result.url}:`,
              error instanceof Error ? error.message : error
            )
          }
        }

        return {
          sourceId: source.id,
          sourceUrl: result.url,
          title: result.title,
          description: description.slice(0, 12000),
          publishedAt: result.publishedDate,
        }
      }))

      // Ergebnis cachen
      try {
        await supabase.from('tavily_search_cache').upsert({
          query_key: cacheKey,
          results: leads,
          cached_at: new Date().toISOString(),
        })
        console.log(`[TavilyAdapter] Cache WRITE: "${query.slice(0, 60)}"`)
      } catch (err) {
        console.warn('[TavilyAdapter] Cache write failed:', err)
      }

      return leads
    } catch (error) {
      console.error(`Tavily fetch failed for ${source.name}:`, error)
      return []
    }
  }
}
