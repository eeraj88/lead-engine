import Parser from 'rss-parser'
import type { Source, RawLead, SourceAdapter } from './types'

export class RSSAdapter implements SourceAdapter {
  private parser = new Parser({
    timeout: 10000,
    headers: {
      'User-Agent': 'ORCA-Lead-Engine/1.0',
    },
  })

  async fetch(source: Source): Promise<RawLead[]> {
    const url = source.config.url as string
    if (!url) {
      throw new Error(`RSS source ${source.name} missing URL in config`)
    }

    try {
      const feed = await this.parser.parseURL(url)
      const items = feed.items || []

      return items.map((item) => ({
        sourceId: source.id,
        sourceUrl: item.link || item.guid || '',
        title: item.title || 'Ohne Titel',
        description: item.contentSnippet || item.content || item.summary || '',
        publishedAt: item.pubDate || item.isoDate,
      }))
    } catch (error) {
      console.error(`RSS fetch failed for ${source.name}:`, error)
      // Return empty array - don't crash pipeline
      return []
    }
  }
}
