/**
 * Static demo data for Vercel deployment.
 * All data is synthetic — generated for demonstration purposes only.
 */

// Seeded random for reproducibility
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

const rand = seededRandom(42)

function gaussRand(mean: number, std: number) {
  const u1 = rand()
  const u2 = rand()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export interface BankInfo {
  id: number
  name: string
  ticker: string
}

export const BANKS: BankInfo[] = [
  { id: 1, name: 'US Bancorp', ticker: 'USB' },
  { id: 2, name: 'JPMorgan Chase', ticker: 'JPM' },
  { id: 3, name: 'Wells Fargo', ticker: 'WFC' },
  { id: 4, name: 'Bank of America', ticker: 'BAC' },
  { id: 5, name: 'PNC Financial', ticker: 'PNC' },
  { id: 6, name: 'Truist Financial', ticker: 'TFC' },
]

const RISK_PROFILES: Record<string, { base: number; vol: number }> = {
  'US Bancorp': { base: 35, vol: 8 },
  'JPMorgan Chase': { base: 30, vol: 10 },
  'Wells Fargo': { base: 55, vol: 12 },
  'Bank of America': { base: 38, vol: 9 },
  'PNC Financial': { base: 32, vol: 7 },
  'Truist Financial': { base: 40, vol: 9 },
}

const NEWS_TEMPLATES: [string, number][] = [
  ['{bank} reports strong Q4 earnings, beating analyst expectations', 0.7],
  ['{bank} faces regulatory scrutiny over consumer lending practices', -0.6],
  ['{bank} announces $2B technology investment for digital transformation', 0.4],
  ['{bank} settles discrimination lawsuit for $50M', -0.8],
  ['{bank} CEO addresses concerns about commercial real estate exposure', -0.3],
  ['{bank} launches new mobile banking features to compete with fintechs', 0.5],
  ['{bank} cuts 500 jobs as part of efficiency restructuring', -0.4],
  ['{bank} receives upgrade from Moody\'s on improved asset quality', 0.6],
  ['{bank} data breach exposes 100,000 customer records', -0.9],
  ['{bank} partners with local nonprofits for community reinvestment', 0.3],
  ['{bank} reports increase in credit card delinquencies', -0.5],
  ['{bank} named top workplace for diversity and inclusion', 0.5],
  ['{bank} under investigation for BSA/AML compliance failures', -0.7],
  ['{bank} expands wealth management division with key hires', 0.3],
  ['{bank} customers report widespread outage of online banking', -0.6],
]

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function dateTimeStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(Math.floor(rand() * 16) + 6, Math.floor(rand() * 60))
  return d.toISOString()
}

// Generate risk history
function generateRiskHistory(bankName: string, days: number) {
  const profile = RISK_PROFILES[bankName]
  const history: { date: string; composite_score: number; media_sentiment_score: number; complaint_score: number; market_score: number }[] = []
  let score = profile.base

  for (let i = days; i >= 0; i--) {
    score += gaussRand(0, profile.vol * 0.1)
    score = Math.max(5, Math.min(95, score))
    const media = Math.max(0, Math.min(100, score + gaussRand(0, 5)))
    const complaints = Math.max(0, Math.min(100, score + gaussRand(5, 8)))
    const market = Math.max(0, Math.min(100, score + gaussRand(-5, 6)))
    history.push({
      date: dateStr(i),
      composite_score: Math.round(score * 10) / 10,
      media_sentiment_score: Math.round(media * 10) / 10,
      complaint_score: Math.round(complaints * 10) / 10,
      market_score: Math.round(market * 10) / 10,
    })
  }
  return history
}

// Pre-generate all histories
const HISTORIES: Record<number, ReturnType<typeof generateRiskHistory>> = {}
BANKS.forEach((bank) => {
  HISTORIES[bank.id] = generateRiskHistory(bank.name, 60)
})

// Generate signals
function generateSignals() {
  const signals: {
    id: number; bank_id: number; source: string; title: string;
    content: string | null; url: string | null; published_at: string | null;
    sentiment_score: number; sentiment_label: string; is_anomaly: boolean;
  }[] = []
  let id = 1

  for (const bank of BANKS) {
    for (let day = 0; day < 60; day++) {
      const numArticles = 2 + Math.floor(rand() * 4)
      for (let a = 0; a < numArticles; a++) {
        const [template, baseSent] = NEWS_TEMPLATES[Math.floor(rand() * NEWS_TEMPLATES.length)]
        const sentiment = Math.max(-1, Math.min(1, baseSent + gaussRand(0, 0.15)))
        const label = sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral'
        signals.push({
          id: id++,
          bank_id: bank.id,
          source: 'news',
          title: template.replace('{bank}', bank.name),
          content: `Demo article about ${bank.name}.`,
          url: null,
          published_at: dateTimeStr(day),
          sentiment_score: Math.round(sentiment * 1000) / 1000,
          sentiment_label: label,
          is_anomaly: Math.abs(sentiment) > 0.85,
        })
      }
    }
  }

  // Sort by date descending
  signals.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
  return signals
}

const ALL_SIGNALS = generateSignals()

// Generate volume data
function generateVolume() {
  const volume: { date: string; source: string; count: number; avg_sentiment: number }[] = []
  for (let day = 0; day < 30; day++) {
    const d = dateStr(day)
    const daySignals = ALL_SIGNALS.filter((s) => s.published_at?.startsWith(d))
    if (daySignals.length > 0) {
      const avg = daySignals.reduce((sum, s) => sum + s.sentiment_score, 0) / daySignals.length
      volume.push({
        date: d,
        source: 'news',
        count: daySignals.length,
        avg_sentiment: Math.round(avg * 1000) / 1000,
      })
    }
  }
  volume.sort((a, b) => a.date.localeCompare(b.date))
  return volume
}

const ALL_VOLUME = generateVolume()

// Generate complaint summary
const COMPLAINT_PRODUCTS = [
  'Checking or savings account',
  'Credit card or prepaid card',
  'Mortgage',
  'Debt collection',
  'Credit reporting',
  'Vehicle loan or lease',
  'Student loan',
  'Money transfer',
  'Personal loan',
]

function generateComplaintSummary() {
  return COMPLAINT_PRODUCTS.map((product) => ({
    product,
    count: Math.floor(rand() * 200) + 10,
  })).sort((a, b) => b.count - a.count)
}

const COMPLAINT_SUMMARY = generateComplaintSummary()

// ---- Public mock API functions ----

export function getBanks(): BankInfo[] {
  return BANKS
}

export function getDashboardOverview() {
  return BANKS.map((bank) => {
    const history = HISTORIES[bank.id]
    const latest = history[history.length - 1]
    const drivers = [
      { name: 'Media Sentiment', score: latest.media_sentiment_score },
      { name: 'Customer Complaints', score: latest.complaint_score },
      { name: 'Market Signal', score: latest.market_score },
    ].sort((a, b) => b.score - a.score)

    return {
      bank,
      composite_score: latest.composite_score,
      media_sentiment_score: latest.media_sentiment_score,
      complaint_score: latest.complaint_score,
      market_score: latest.market_score,
      top_drivers: drivers,
    }
  }).sort((a, b) => b.composite_score - a.composite_score)
}

export function getRiskHistory(bankId: number) {
  return HISTORIES[bankId] || []
}

export function getSignals(bankId?: number, limit = 100) {
  let filtered = ALL_SIGNALS
  if (bankId) filtered = filtered.filter((s) => s.bank_id === bankId)
  return filtered.slice(0, limit)
}

export function getSignalVolume(bankId?: number) {
  if (!bankId) return ALL_VOLUME
  // Recalculate for specific bank
  const volume: { date: string; source: string; count: number; avg_sentiment: number }[] = []
  for (let day = 0; day < 30; day++) {
    const d = dateStr(day)
    const daySignals = ALL_SIGNALS.filter((s) => s.bank_id === bankId && s.published_at?.startsWith(d))
    if (daySignals.length > 0) {
      const avg = daySignals.reduce((sum, s) => sum + s.sentiment_score, 0) / daySignals.length
      volume.push({ date: d, source: 'news', count: daySignals.length, avg_sentiment: Math.round(avg * 1000) / 1000 })
    }
  }
  volume.sort((a, b) => a.date.localeCompare(b.date))
  return volume
}

export function getComplaintSummary() {
  return COMPLAINT_SUMMARY
}
