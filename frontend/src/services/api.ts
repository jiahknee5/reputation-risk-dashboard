/**
 * Real Data Service Layer — v2
 * Fetches live data from CFPB public API and computes risk scores client-side.
 * Falls back to demo.ts when APIs are unreachable.
 */

import * as demo from '../data/demo'
import type { BankInfo } from '../data/demo'
import { fetchGDELTNews, enrichWithSentiment } from '../api/gdelt-news'

// Re-export types
export type { BankInfo } from '../data/demo'

const CFPB_API = 'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/'
const NEWSAPI_KEY = import.meta.env.VITE_NEWSAPI_KEY || ''
const NEWSAPI_URL = 'https://newsapi.org/v2/everything'
const USE_REAL_DATA = import.meta.env.VITE_USE_REAL_DATA === 'true' // Opt-in for real API calls

// Cache to avoid redundant fetches
const cache: Record<string, { data: unknown; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 min

function getCached<T>(key: string): T | null {
  const entry = cache[key]
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T
  return null
}

function setCache(key: string, data: unknown) {
  cache[key] = { data, ts: Date.now() }
}

// CFPB company name mappings
const BANK_CFPB_NAMES: Record<string, string[]> = {
  // Category I
  'JPMorgan Chase': ['JPMORGAN CHASE & CO.', 'JPMORGAN CHASE BANK', 'CHASE BANK'],
  'Bank of America': ['BANK OF AMERICA', 'BANK OF AMERICA, NATIONAL ASSOCIATION'],
  'Citigroup': ['CITIBANK', 'CITIGROUP INC.', 'CITI'],
  'Wells Fargo': ['WELLS FARGO & COMPANY', 'WELLS FARGO BANK'],
  'Goldman Sachs': ['GOLDMAN SACHS BANK USA', 'GOLDMAN SACHS'],
  'Morgan Stanley': ['MORGAN STANLEY BANK', 'MORGAN STANLEY'],
  'BNY Mellon': ['THE BANK OF NEW YORK MELLON', 'BNY MELLON'],
  'State Street': ['STATE STREET CORPORATION', 'STATE STREET BANK'],

  // Category II
  'US Bancorp': ['U.S. BANCORP', 'US BANK', 'U.S. BANK NATIONAL ASSOCIATION'],
  'PNC Financial': ['PNC BANK', 'PNC FINANCIAL SERVICES'],
  'Truist Financial': ['TRUIST BANK', 'TRUIST FINANCIAL'],
  'Capital One': ['CAPITAL ONE', 'CAPITAL ONE BANK'],
  'TD Bank': ['TD BANK', 'TD BANK USA'],
  'Fifth Third': ['FIFTH THIRD BANK', 'FIFTH THIRD'],
  'BMO Harris': ['BMO HARRIS BANK', 'BMO BANK'],
  'Citizens Financial': ['CITIZENS BANK', 'CITIZENS FINANCIAL'],

  // Category III
  'M&T Bank': ['M&T BANK', 'MANUFACTURERS AND TRADERS TRUST'],
  'KeyCorp': ['KEYBANK', 'KEY BANK'],
  'Huntington': ['HUNTINGTON NATIONAL BANK', 'HUNTINGTON BANK'],
  'Regions Financial': ['REGIONS BANK', 'REGIONS FINANCIAL'],
  'Ally Financial': ['ALLY BANK', 'ALLY FINANCIAL'],
  'American Express': ['AMERICAN EXPRESS', 'AMEX'],
  'Discover': ['DISCOVER BANK', 'DISCOVER FINANCIAL'],
}

// ESG category mapping for complaints
export const ESG_CATEGORIES: Record<string, { theme: 'S' | 'G' | 'E'; label: string }> = {
  'Checking or savings account': { theme: 'S', label: 'Financial Inclusion' },
  'Credit card or prepaid card': { theme: 'S', label: 'Consumer Protection' },
  'Mortgage': { theme: 'S', label: 'Housing Access' },
  'Debt collection': { theme: 'S', label: 'Fair Treatment' },
  'Credit reporting': { theme: 'G', label: 'Data Governance' },
  'Vehicle loan or lease': { theme: 'S', label: 'Consumer Lending' },
  'Student loan': { theme: 'S', label: 'Education Finance' },
  'Money transfer': { theme: 'G', label: 'Transaction Integrity' },
  'Personal loan': { theme: 'S', label: 'Consumer Lending' },
}

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

// --- CFPB Real Data Fetching ---

interface CfpbComplaint {
  complaint_id: string
  date_received: string
  product: string
  sub_product?: string
  issue: string
  sub_issue?: string
  company: string
  company_response: string
  timely: string
  consumer_disputed?: string
  complaint_what_happened?: string
}

async function fetchCfpbComplaints(companyName: string, daysBack = 90, size = 100): Promise<CfpbComplaint[]> {
  const dateFrom = dateStr(daysBack)
  const dateTo = dateStr(0)
  const params = new URLSearchParams({
    company: companyName,
    date_received_min: dateFrom,
    date_received_max: dateTo,
    size: String(size),
    sort: 'created_date_desc',
    no_aggs: 'true',
  })

  const resp = await fetch(`${CFPB_API}?${params}`)
  if (!resp.ok) throw new Error(`CFPB API ${resp.status}`)
  const data = await resp.json()
  const hits = data?.hits?.hits || []
  return hits.map((h: { _source: CfpbComplaint }) => h._source)
}

async function fetchAllBankComplaints(bankName: string, daysBack = 90): Promise<CfpbComplaint[]> {
  const cacheKey = `cfpb:${bankName}:${daysBack}`
  const cached = getCached<CfpbComplaint[]>(cacheKey)
  if (cached) return cached

  const names = BANK_CFPB_NAMES[bankName] || [bankName]
  const allComplaints: CfpbComplaint[] = []

  for (const name of names) {
    try {
      const complaints = await fetchCfpbComplaints(name, daysBack, 100)
      allComplaints.push(...complaints)
    } catch {
      // Continue with other names
    }
  }

  setCache(cacheKey, allComplaints)
  return allComplaints
}

// --- NewsAPI Real Data Fetching ---

interface NewsArticle {
  title: string
  description: string | null
  url: string
  publishedAt: string
  source: { name: string }
}

// Simple keyword-based sentiment (no FinBERT in browser, but good enough for scoring)
const NEGATIVE_KEYWORDS = [
  'lawsuit', 'fine', 'penalty', 'fraud', 'investigation', 'breach', 'hack', 'layoff',
  'cut', 'decline', 'loss', 'downgrade', 'scandal', 'violation', 'enforcement',
  'complaint', 'allegation', 'probe', 'subpoena', 'settlement', 'default',
  'delinquent', 'foreclosure', 'bankruptcy', 'crisis', 'outage', 'failure',
]
const POSITIVE_KEYWORDS = [
  'growth', 'profit', 'beat', 'upgrade', 'expansion', 'innovation', 'partnership',
  'award', 'record', 'strong', 'dividend', 'hire', 'launch', 'invest', 'improve',
  'inclusion', 'sustainability', 'community', 'leader', 'top', 'best',
]

function scoreSentiment(text: string): { score: number; label: string } {
  const lower = text.toLowerCase()
  let pos = 0, neg = 0
  NEGATIVE_KEYWORDS.forEach(kw => { if (lower.includes(kw)) neg++ })
  POSITIVE_KEYWORDS.forEach(kw => { if (lower.includes(kw)) pos++ })
  const total = pos + neg
  if (total === 0) return { score: 0, label: 'neutral' }
  const score = (pos - neg) / total
  return {
    score: Math.round(score * 1000) / 1000,
    label: score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral',
  }
}

async function fetchNews(bankName: string, ticker: string, daysBack = 7): Promise<NewsArticle[]> {
  if (!NEWSAPI_KEY) return []

  const cacheKey = `news:${ticker}:${daysBack}`
  const cached = getCached<NewsArticle[]>(cacheKey)
  if (cached) return cached

  const fromDate = dateStr(daysBack)
  const params = new URLSearchParams({
    q: `"${bankName}" OR "${ticker}" bank`,
    from: fromDate,
    sortBy: 'publishedAt',
    pageSize: '30',
    language: 'en',
    apiKey: NEWSAPI_KEY,
  })

  try {
    const resp = await fetch(`${NEWSAPI_URL}?${params}`)
    if (!resp.ok) return []
    const data = await resp.json()
    const articles = (data.articles || []) as NewsArticle[]
    setCache(cacheKey, articles)
    return articles
  } catch {
    return []
  }
}

async function fetchAllBankNews(bankName: string, ticker: string): Promise<{ articles: NewsArticle[]; avgSentiment: number; sentimentScores: { score: number; label: string }[] }> {
  const articles = await fetchNews(bankName, ticker, 7)
  const sentimentScores = articles.map(a => {
    const text = `${a.title || ''}. ${a.description || ''}`
    return scoreSentiment(text)
  })
  const avgSentiment = sentimentScores.length > 0
    ? sentimentScores.reduce((s, x) => s + x.score, 0) / sentimentScores.length
    : 0
  return { articles, avgSentiment, sentimentScores }
}

// --- Score Computation (Client-Side) ---

function computeComplaintScore(complaints: CfpbComplaint[], peerAvgCount: number): number {
  if (complaints.length === 0) return 30 // neutral-low
  const volumeRatio = complaints.length / Math.max(peerAvgCount, 1)
  const disputedCount = complaints.filter(c => c.consumer_disputed === 'Yes').length
  const disputeRate = disputedCount / complaints.length
  const untimelyCount = complaints.filter(c => c.timely !== 'Yes').length
  const untimelyRate = untimelyCount / complaints.length

  // Volume component (0-50): 1x peer avg = 25, 2x = 50
  const volumeScore = Math.min(50, volumeRatio * 25)
  // Dispute component (0-25): higher dispute rate = higher risk
  const disputeScore = disputeRate * 25
  // Timeliness component (0-25): untimely responses = higher risk
  const timelinessScore = untimelyRate * 25

  return Math.min(100, Math.round(volumeScore + disputeScore + timelinessScore))
}

function simpleSentimentFromComplaints(complaints: CfpbComplaint[]): number {
  // Compute a pseudo-sentiment from complaint characteristics
  if (complaints.length === 0) return 0.1
  const disputed = complaints.filter(c => c.consumer_disputed === 'Yes').length
  const untimely = complaints.filter(c => c.timely !== 'Yes').length
  const negativity = (disputed + untimely) / (complaints.length * 2)
  return Math.max(-1, Math.min(1, 0.1 - negativity * 2))
}

// --- Public API Functions (drop-in replacement for demo.ts) ---

export function getBanks(): BankInfo[] {
  return demo.getBanks()
}

export interface DashboardOverview {
  bank: BankInfo
  composite_score: number
  media_sentiment_score: number
  complaint_score: number
  market_score: number
  regulatory_score: number
  esg_flags: { theme: string; count: number }[]
  top_drivers: { name: string; score: number }[]
  data_source: 'live' | 'demo'
}

export async function getDashboardOverview(): Promise<DashboardOverview[]> {
  const cacheKey = 'dashboard:overview'
  const cached = getCached<DashboardOverview[]>(cacheKey)
  if (cached) return cached

  const banks = demo.getBanks()

  // If real data is not enabled, use demo data immediately
  if (!USE_REAL_DATA) {
    console.log('Real data disabled, using demo dashboard')
    return demo.getDashboardOverview().map(d => ({
      ...d,
      regulatory_score: Math.round(d.composite_score + (Math.random() - 0.5) * 10),
      esg_flags: [],
      data_source: 'demo' as const,
    }))
  }

  try {
    // Fetch complaints and news for all banks in parallel
    const [allComplaints, allNews] = await Promise.all([
      Promise.all(banks.map(b => fetchAllBankComplaints(b.name, 90).catch(() => [] as CfpbComplaint[]))),
      Promise.all(banks.map(b => fetchAllBankNews(b.name, b.ticker).catch(() => ({ articles: [] as NewsArticle[], avgSentiment: 0, sentimentScores: [] as { score: number; label: string }[] })))),
    ])

    const totalComplaints = allComplaints.reduce((s, c) => s + c.length, 0)
    const avgComplaints = totalComplaints / banks.length

    const results: DashboardOverview[] = banks.map((bank, i) => {
      const complaints = allComplaints[i]
      const news = allNews[i]
      const complaintScore = computeComplaintScore(complaints, avgComplaints)

      // Media sentiment: use real NewsAPI data if available, otherwise derive from complaints
      let mediaSentimentScore: number
      if (news.articles.length > 0) {
        // Convert sentiment (-1 to 1) to risk score (0 to 100): negative sentiment = high risk
        mediaSentimentScore = Math.round(Math.max(0, Math.min(100, 50 - news.avgSentiment * 50)))
      } else {
        const complaintSentiment = simpleSentimentFromComplaints(complaints)
        mediaSentimentScore = Math.round(Math.max(0, Math.min(100, 50 - complaintSentiment * 30)))
      }

      // Market score: placeholder until Yahoo Finance proxy is set up
      const demoOverview = demo.getDashboardOverview()
      const demoBank = demoOverview.find(d => d.bank.id === bank.id)
      const marketScore = demoBank?.market_score ?? 35

      // Regulatory: derived from complaint patterns
      const regulatoryScore = Math.round(Math.min(100, complaintScore * 0.6 + mediaSentimentScore * 0.4))

      // Peer relative
      const peerRelativeScore = Math.round(Math.max(0, Math.min(100, complaintScore - avgComplaints / 2)))

      // Composite (weighted)
      const composite = Math.round(
        mediaSentimentScore * 0.25 +
        regulatoryScore * 0.25 +
        complaintScore * 0.20 +
        marketScore * 0.15 +
        peerRelativeScore * 0.15
      )

      // ESG flags from complaint products
      const esgMap: Record<string, number> = {}
      complaints.forEach(c => {
        const esg = ESG_CATEGORIES[c.product]
        if (esg) esgMap[esg.theme] = (esgMap[esg.theme] || 0) + 1
      })
      const esg_flags = Object.entries(esgMap).map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)

      const drivers = [
        { name: 'Media Sentiment', score: mediaSentimentScore },
        { name: 'Consumer Complaints', score: complaintScore },
        { name: 'Market Signal', score: marketScore },
        { name: 'Regulatory', score: regulatoryScore },
        { name: 'Peer Relative', score: peerRelativeScore },
      ].sort((a, b) => b.score - a.score)

      return {
        bank,
        composite_score: composite,
        media_sentiment_score: mediaSentimentScore,
        complaint_score: complaintScore,
        market_score: marketScore,
        regulatory_score: regulatoryScore,
        esg_flags,
        top_drivers: drivers.slice(0, 3),
        data_source: 'live' as const,
      }
    })

    results.sort((a, b) => b.composite_score - a.composite_score)
    setCache(cacheKey, results)
    return results
  } catch {
    // Fallback to demo data
    return demo.getDashboardOverview().map(d => ({
      ...d,
      regulatory_score: Math.round(d.composite_score + (Math.random() - 0.5) * 10),
      esg_flags: [],
      data_source: 'demo' as const,
    }))
  }
}

export async function getRiskHistory(bankId: number): Promise<ReturnType<typeof demo.getRiskHistory>> {
  // For v2, use demo history as baseline but adjust latest points based on real complaint data
  const history = demo.getRiskHistory(bankId)
  const bank = demo.getBanks().find(b => b.id === bankId)
  if (!bank) return history

  try {
    const complaints = await fetchAllBankComplaints(bank.name, 60)
    if (complaints.length > 0) {
      // Group complaints by date
      const byDate: Record<string, number> = {}
      complaints.forEach(c => {
        const d = c.date_received?.slice(0, 10)
        if (d) byDate[d] = (byDate[d] || 0) + 1
      })

      // Overlay real complaint volume onto history
      return history.map(h => {
        const realCount = byDate[h.date] || 0
        const adjustment = realCount > 5 ? realCount * 0.5 : -2
        return {
          ...h,
          complaint_score: Math.max(5, Math.min(95, h.complaint_score + adjustment)),
          composite_score: Math.max(5, Math.min(95, h.composite_score + adjustment * 0.2)),
        }
      })
    }
  } catch {
    // fallback
  }
  return history
}

export async function getSignals(bankId?: number, limit = 100) {
  // If real data is not enabled, use demo data immediately
  if (!USE_REAL_DATA) {
    console.log('Real data disabled (VITE_USE_REAL_DATA not set), using demo data')
    return demo.getSignals(bankId, limit)
  }

  const banks = bankId ? [demo.getBanks().find(b => b.id === bankId)!] : demo.getBanks()
  const liveSignals: ReturnType<typeof demo.getSignals> = []
  let id = 1

  for (const bank of banks) {
    if (!bank) continue

    // Real CFPB complaints as signals
    try {
      const complaints = await fetchAllBankComplaints(bank.name, 90)
      console.log(`Fetched ${complaints.length} CFPB complaints for ${bank.name}`)
      for (const c of complaints) {
        const sentiment = c.consumer_disputed === 'Yes' ? -0.6 : c.timely === 'Yes' ? 0.1 : -0.3
        liveSignals.push({
          id: id++,
          bank_id: bank.id,
          source: 'cfpb',
          title: `${c.product} — ${c.issue}`,
          content: c.complaint_what_happened?.slice(0, 200) || `Complaint filed by consumer against ${bank.name}`,
          url: `https://www.consumerfinance.gov/data-research/consumer-complaints/search/detail/${c.complaint_id}`,
          published_at: c.date_received ? `${c.date_received}T12:00:00Z` : null,
          sentiment_score: sentiment,
          sentiment_label: sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral',
          is_anomaly: c.consumer_disputed === 'Yes',
        })
      }
    } catch (err) {
      console.error(`Failed to fetch CFPB data for ${bank.name}:`, err)
    }

    // Real news articles as signals (only if NewsAPI key is set)
    if (NEWSAPI_KEY) {
      try {
        const news = await fetchAllBankNews(bank.name, bank.ticker)
        for (let j = 0; j < news.articles.length; j++) {
          const article = news.articles[j]
          const sent = news.sentimentScores[j] || { score: 0, label: 'neutral' }
          liveSignals.push({
            id: id++,
            bank_id: bank.id,
            source: 'news',
            title: article.title || 'Untitled',
            content: article.description?.slice(0, 200) || null,
            url: article.url || null,
            published_at: article.publishedAt || null,
            sentiment_score: sent.score,
            sentiment_label: sent.label,
            is_anomaly: Math.abs(sent.score) > 0.85,
          })
        }
      } catch (err) {
        console.error(`Failed to fetch news for ${bank.name}:`, err)
      }
    }

    // GDELT news as signals (real-time global coverage, 150K+ sources)
    try {
      const gdeltArticles = await fetchGDELTNews(bank.name, 10)
      const enriched = enrichWithSentiment(gdeltArticles)

      for (const article of enriched) {
        liveSignals.push({
          id: id++,
          bank_id: bank.id,
          source: 'news',
          title: article.title,
          content: article.excerpt?.slice(0, 200) || null,
          url: article.url,
          published_at: article.publishedAt,
          sentiment_score: article.sentiment,
          sentiment_label: article.sentimentLabel,
          is_anomaly: Math.abs(article.sentiment) > 0.8,
        })
      }
    } catch (err) {
      console.error(`Failed to fetch GDELT news for ${bank.name}:`, err)
    }
  }

  // Sort by date descending (most recent first)
  liveSignals.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))

  // Fallback to demo data if no signals fetched
  if (liveSignals.length === 0) {
    console.warn('No live signals fetched, falling back to demo data')
    return demo.getSignals(bankId, limit)
  }

  return liveSignals.slice(0, limit)
}

export async function getSignalVolume(bankId?: number) {
  // Fetch real signals and aggregate by date and source
  const signals = await getSignals(bankId, 500) // Get more for volume aggregation

  const volumeMap = new Map<string, { date: string; source: string; count: number }>()

  for (const signal of signals) {
    if (!signal.published_at) continue

    const date = signal.published_at.split('T')[0] // Extract YYYY-MM-DD
    const key = `${date}-${signal.source}`

    const existing = volumeMap.get(key)
    if (existing) {
      existing.count++
    } else {
      volumeMap.set(key, { date, source: signal.source, count: 1 })
    }
  }

  return Array.from(volumeMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getComplaintSummary(bankId?: number) {
  const banks = bankId ? [demo.getBanks().find(b => b.id === bankId)!] : demo.getBanks()

  try {
    const productCounts: Record<string, number> = {}
    for (const bank of banks) {
      if (!bank) continue
      const complaints = await fetchAllBankComplaints(bank.name, 90)
      complaints.forEach(c => {
        if (c.product) productCounts[c.product] = (productCounts[c.product] || 0) + 1
      })
    }

    if (Object.keys(productCounts).length > 0) {
      return Object.entries(productCounts)
        .map(([product, count]) => ({ product, count }))
        .sort((a, b) => b.count - a.count)
    }
  } catch {
    // fallback
  }
  return demo.getComplaintSummary()
}

export function getRiskDetail(bankId: number) {
  return demo.getRiskDetail(bankId)
}

export function getPeerBenchmarking() {
  return demo.getPeerBenchmarking()
}

export function getRegulatoryIntel() {
  return demo.getRegulatoryIntel()
}

export function getCrisisSimulation(bankId: number) {
  return demo.getCrisisSimulation(bankId)
}

export function getStakeholderImpact() {
  return demo.getStakeholderImpact()
}

export function getBoardReport() {
  return demo.getBoardReport()
}

// --- Watchlist (localStorage) ---

const WATCHLIST_KEY = 'reprisk:watchlist'

export function getWatchlist(): number[] {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]')
  } catch {
    return []
  }
}

export function toggleWatchlist(bankId: number): number[] {
  const list = getWatchlist()
  const idx = list.indexOf(bankId)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(bankId)
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list))
  return list
}

// --- Alert Thresholds ---

const ALERT_THRESHOLDS_KEY = 'reprisk:alert_thresholds'

export interface AlertThreshold {
  bankId: number
  maxScore: number
}

export function getAlertThresholds(): AlertThreshold[] {
  try {
    return JSON.parse(localStorage.getItem(ALERT_THRESHOLDS_KEY) || '[]')
  } catch {
    return []
  }
}

export function setAlertThreshold(bankId: number, maxScore: number) {
  const thresholds = getAlertThresholds().filter(t => t.bankId !== bankId)
  thresholds.push({ bankId, maxScore })
  localStorage.setItem(ALERT_THRESHOLDS_KEY, JSON.stringify(thresholds))
}

// --- Feedback ---

const FEEDBACK_KEY = 'reprisk:feedback'

export interface FeedbackItem {
  id: string
  type: 'feature' | 'bug'
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  votes: number
  created_at: string
  status: 'open' | 'in_progress' | 'closed'
}

export function getFeedback(): FeedbackItem[] {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]')
  } catch {
    return []
  }
}

export function addFeedback(item: Omit<FeedbackItem, 'id' | 'votes' | 'created_at' | 'status'>): FeedbackItem {
  const feedback = getFeedback()
  const newItem: FeedbackItem = {
    ...item,
    id: crypto.randomUUID(),
    votes: 0,
    created_at: new Date().toISOString(),
    status: 'open',
  }
  feedback.unshift(newItem)
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback))
  return newItem
}

export function voteFeedback(id: string): FeedbackItem[] {
  const feedback = getFeedback()
  const item = feedback.find(f => f.id === id)
  if (item) item.votes++
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback))
  return feedback
}

export function exportFeedbackJSON(): string {
  return JSON.stringify(getFeedback(), null, 2)
}
