import { tavily } from '@tavily/core'
import type { Source, RawLead, SourceAdapter } from './types'
import { scrapeWithFirecrawl } from './firecrawl-client'

const MIN_USEFUL_CONTENT_LENGTH = 1000

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

    try {
      const response = await this.client.search(query, {
        search_depth: 'advanced',         // liefert mehr Inhalt
        max_results: maxResults,
        include_answer: false,
        include_raw_content: true,        // Volltext statt Snippet
      })

      return Promise.all((response.results || []).map(async (result) => {
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
    } catch (error) {
      console.error(`Tavily fetch failed for ${source.name}:`, error)
      // Return empty array - don't crash pipeline
      return []
    }
  }
}
