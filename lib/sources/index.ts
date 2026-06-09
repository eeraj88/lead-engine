import type { Source, SourceAdapter } from './types'
import { RSSAdapter } from './rss-adapter'
import { TavilyAdapter } from './tavily-adapter'

export function getAdapter(source: Source): SourceAdapter {
  switch (source.type) {
    case 'rss':
      return new RSSAdapter()
    case 'tavily':
      return new TavilyAdapter()
    case 'api':
      throw new Error('API adapter not implemented yet')
    default:
      throw new Error(`Unknown source type: ${source.type}`)
  }
}

export * from './types'
export * from './procurement/types'
export { RSSAdapter } from './rss-adapter'
export { TavilyAdapter } from './tavily-adapter'
export {
  TedAdapter,
  buildTedSearchRequest,
  fetchTedNotices,
  normalizeTedNotice,
} from './procurement/ted-adapter'
export {
  OpenDataAdapter,
  buildOpenDataExportUrl,
  fetchOpenDataExport,
  normalizeCsvNotice,
  normalizeEformsNotice,
  normalizeOcdsNotice,
} from './procurement/open-data-adapter'
