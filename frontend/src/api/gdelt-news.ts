// GDELT Project News API Integration
// Source: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
// 150,000+ news sources globally, real-time event database

export interface GDELTArticle {
  url: string
  urlMobile: string
  title: string
  seenDate: string // YYYYMMDDHHMMSS format
  socialImage: string
  domain: string
  language: string
  sourcecountry: string
}

export interface GDELTResponse {
  articles: GDELTArticle[]
}

export interface NewsArticle {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  sentiment: number // -1 to 1
  sentimentLabel: 'negative' | 'neutral' | 'positive'
  excerpt?: string
  imageUrl?: string
}

/**
 * Fetch news articles from GDELT for a specific bank
 * @param bankName - Full bank name (e.g., "JPMorgan Chase", "Bank of America")
 * @param maxRecords - Maximum number of articles to return (default 25)
 */
export async function fetchGDELTNews(bankName: string, maxRecords = 25): Promise<GDELTArticle[]> {
  const params = new URLSearchParams({
    query: bankName,
    maxrecords: String(maxRecords),
    timespan: '7d',
  })

  const url = `/api/reprisk/gdelt?${params}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`GDELT Proxy returned ${response.status}`)
    }

    const data: GDELTResponse = await response.json()
    return data.articles || []
  } catch (error) {
    console.error(`Failed to fetch GDELT news for ${bankName}:`, error)
    return []
  }
}

/**
 * Fetch news for multiple banks in parallel
 */
export async function fetchMultiBankNews(bankNames: string[]): Promise<Map<string, GDELTArticle[]>> {
  const results = new Map<string, GDELTArticle[]>()

  const promises = bankNames.map(async (name) => {
    const articles = await fetchGDELTNews(name, 10)
    results.set(name, articles)
  })

  await Promise.all(promises)
  return results
}

/**
 * Convert GDELT article to standardized NewsArticle format
 */
export function normalizeGDELTArticle(article: GDELTArticle): NewsArticle {
  // Parse GDELT date format (YYYYMMDDHHMMSS) to ISO
  const dateStr = article.seenDate
  const isoDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${dateStr.slice(8, 10)}:${dateStr.slice(10, 12)}:${dateStr.slice(12, 14)}Z`

  return {
    id: article.url,
    title: article.title,
    url: article.url,
    source: article.domain,
    publishedAt: isoDate,
    sentiment: 0, // GDELT doesn't provide sentiment - would need separate NLP
    sentimentLabel: 'neutral',
    excerpt: undefined,
    imageUrl: article.socialImage || undefined,
  }
}

/**
 * Estimate sentiment from article title (mock implementation)
 * Real implementation would use FinBERT or similar NLP model
 */
export function estimateSentiment(title: string): { score: number; label: 'negative' | 'neutral' | 'positive' } {
  const lowerTitle = title.toLowerCase()

  // Negative keywords
  const negativeKeywords = [
    'crisis', 'scandal', 'fraud', 'lawsuit', 'investigation', 'fine', 'penalty',
    'breach', 'hack', 'fail', 'collapse', 'cut', 'loss', 'plunge', 'decline',
    'warning', 'risk', 'concern', 'issue', 'problem', 'trouble', 'allegation'
  ]

  // Positive keywords
  const positiveKeywords = [
    'profit', 'growth', 'gain', 'success', 'award', 'innovation', 'launch',
    'expansion', 'rise', 'surge', 'win', 'achieve', 'milestone', 'record',
    'strong', 'robust', 'improve', 'boost', 'lead', 'pioneer'
  ]

  let score = 0
  let negCount = 0
  let posCount = 0

  for (const keyword of negativeKeywords) {
    if (lowerTitle.includes(keyword)) {
      negCount++
      score -= 0.2
    }
  }

  for (const keyword of positiveKeywords) {
    if (lowerTitle.includes(keyword)) {
      posCount++
      score += 0.2
    }
  }

  // Clamp between -1 and 1
  score = Math.max(-1, Math.min(1, score))

  let label: 'negative' | 'neutral' | 'positive' = 'neutral'
  if (score < -0.1) label = 'negative'
  else if (score > 0.1) label = 'positive'

  return { score, label }
}

/**
 * Add sentiment analysis to GDELT articles
 */
export function enrichWithSentiment(articles: GDELTArticle[]): NewsArticle[] {
  return articles.map(article => {
    const normalized = normalizeGDELTArticle(article)
    const sentiment = estimateSentiment(article.title)

    return {
      ...normalized,
      sentiment: sentiment.score,
      sentimentLabel: sentiment.label,
    }
  })
}

/**
 * Filter articles by date range
 */
export function filterByDateRange(articles: NewsArticle[], startDate: Date, endDate: Date): NewsArticle[] {
  return articles.filter(article => {
    const articleDate = new Date(article.publishedAt)
    return articleDate >= startDate && articleDate <= endDate
  })
}

/**
 * Group articles by sentiment
 */
export function groupBySentiment(articles: NewsArticle[]): {
  negative: NewsArticle[]
  neutral: NewsArticle[]
  positive: NewsArticle[]
} {
  return {
    negative: articles.filter(a => a.sentimentLabel === 'negative'),
    neutral: articles.filter(a => a.sentimentLabel === 'neutral'),
    positive: articles.filter(a => a.sentimentLabel === 'positive'),
  }
}

/**
 * Calculate aggregate sentiment score for a bank
 */
export function calculateAggregateSentiment(articles: NewsArticle[]): number {
  if (articles.length === 0) return 0

  const total = articles.reduce((sum, article) => sum + article.sentiment, 0)
  return total / articles.length
}

/**
 * Detect volume anomalies (unusual spikes in news coverage)
 */
export function detectVolumeAnomaly(currentVolume: number, historicalAverage: number, threshold = 2.0): boolean {
  return currentVolume > historicalAverage * threshold
}
