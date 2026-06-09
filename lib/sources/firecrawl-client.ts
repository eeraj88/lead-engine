const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape'

interface FirecrawlResponse {
  success?: boolean
  data?: {
    markdown?: string
  }
}

export async function scrapeWithFirecrawl(
  url: string,
  apiKey = process.env.FIRECRAWL_API_KEY
): Promise<string | null> {
  if (!apiKey) return null

  const response = await fetch(FIRECRAWL_SCRAPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      onlyCleanContent: true,
      parsers: ['pdf'],
      timeout: 30000,
    }),
    signal: AbortSignal.timeout(35000),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed with HTTP ${response.status}`)
  }

  const payload = await response.json() as FirecrawlResponse
  const markdown = payload.data?.markdown?.trim()
  return payload.success && markdown ? markdown : null
}
