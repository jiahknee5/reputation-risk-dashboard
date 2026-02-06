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

// Fed Category I: $700B+ assets OR $75B+ cross-jurisdictional (8 GSIBs)
// Fed Category II: $250B-$700B assets
// Fed Category III: $100B-$250B assets

export const BANKS: BankInfo[] = [
  // Category I (8 GSIBs)
  { id: 2, name: 'JPMorgan Chase', ticker: 'JPM' },
  { id: 4, name: 'Bank of America', ticker: 'BAC' },
  { id: 7, name: 'Citigroup', ticker: 'C' },
  { id: 3, name: 'Wells Fargo', ticker: 'WFC' },
  { id: 8, name: 'Goldman Sachs', ticker: 'GS' },
  { id: 9, name: 'Morgan Stanley', ticker: 'MS' },
  { id: 10, name: 'BNY Mellon', ticker: 'BK' },
  { id: 11, name: 'State Street', ticker: 'STT' },

  // Category II
  { id: 1, name: 'US Bancorp', ticker: 'USB' },
  { id: 5, name: 'PNC Financial', ticker: 'PNC' },
  { id: 6, name: 'Truist Financial', ticker: 'TFC' },
  { id: 12, name: 'Capital One', ticker: 'COF' },
  { id: 13, name: 'TD Bank', ticker: 'TD' },
  { id: 14, name: 'Fifth Third', ticker: 'FITB' },
  { id: 15, name: 'BMO Harris', ticker: 'BMO' },
  { id: 16, name: 'Citizens Financial', ticker: 'CFG' },

  // Category III
  { id: 17, name: 'M&T Bank', ticker: 'MTB' },
  { id: 18, name: 'KeyCorp', ticker: 'KEY' },
  { id: 19, name: 'Huntington', ticker: 'HBAN' },
  { id: 20, name: 'Regions Financial', ticker: 'RF' },
  { id: 21, name: 'Ally Financial', ticker: 'ALLY' },
  { id: 22, name: 'American Express', ticker: 'AXP' },
  { id: 23, name: 'Discover', ticker: 'DFS' },
]

const RISK_PROFILES: Record<string, { base: number; vol: number }> = {
  // Category I
  'JPMorgan Chase': { base: 30, vol: 10 },
  'Bank of America': { base: 38, vol: 9 },
  'Citigroup': { base: 45, vol: 11 },
  'Wells Fargo': { base: 55, vol: 12 },
  'Goldman Sachs': { base: 28, vol: 8 },
  'Morgan Stanley': { base: 32, vol: 9 },
  'BNY Mellon': { base: 25, vol: 6 },
  'State Street': { base: 27, vol: 7 },

  // Category II
  'US Bancorp': { base: 35, vol: 8 },
  'PNC Financial': { base: 32, vol: 7 },
  'Truist Financial': { base: 40, vol: 9 },
  'Capital One': { base: 42, vol: 10 },
  'TD Bank': { base: 36, vol: 8 },
  'Fifth Third': { base: 38, vol: 9 },
  'BMO Harris': { base: 34, vol: 7 },
  'Citizens Financial': { base: 37, vol: 8 },

  // Category III
  'M&T Bank': { base: 33, vol: 7 },
  'KeyCorp': { base: 39, vol: 8 },
  'Huntington': { base: 35, vol: 7 },
  'Regions Financial': { base: 41, vol: 9 },
  'Ally Financial': { base: 44, vol: 10 },
  'American Express': { base: 31, vol: 8 },
  'Discover': { base: 43, vol: 9 },
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

// ---- Risk Detail Data ----

export function getRiskDetail(bankId: number) {
  const bank = BANKS.find((b) => b.id === bankId) || BANKS[0]
  const history = HISTORIES[bankId] || HISTORIES[1]
  const latest = history[history.length - 1]
  const profile = RISK_PROFILES[bank.name]

  const regulatory = Math.max(0, Math.min(100, profile.base + gaussRand(5, 10)))
  const peerRelative = Math.max(0, Math.min(100, profile.base + gaussRand(-5, 8)))

  return {
    bank,
    composite_score: latest.composite_score,
    components: [
      { name: 'Media Sentiment', score: latest.media_sentiment_score, weight: 0.25, description: 'FinBERT NLP analysis of news coverage sentiment across major financial outlets and wire services.' },
      { name: 'Regulatory Risk', score: Math.round(regulatory * 10) / 10, weight: 0.25, description: 'SEC filing sentiment analysis combined with OCC/FDIC enforcement action severity and recency.' },
      { name: 'Consumer Complaints', score: latest.complaint_score, weight: 0.20, description: 'CFPB complaint volume normalized against peer group, weighted by narrative sentiment analysis.' },
      { name: 'Market Signal', score: latest.market_score, weight: 0.15, description: '30-day equity return and rolling volatility relative to banking sector index.' },
      { name: 'Peer Relative', score: Math.round(peerRelative * 10) / 10, weight: 0.15, description: 'Deviation of composite score from peer group average, identifying outlier positioning.' },
    ],
    history: history.map((h) => ({
      ...h,
      regulatory_score: Math.max(0, Math.min(100, h.composite_score + gaussRand(3, 6))),
      peer_relative_score: Math.max(0, Math.min(100, h.composite_score + gaussRand(-3, 5))),
    })),
    alerts: [
      { date: dateStr(2), severity: 'high' as const, message: `Elevated media negativity detected for ${bank.name} — 3x normal volume of adverse coverage.` },
      { date: dateStr(5), severity: 'medium' as const, message: `CFPB complaint volume increased 18% week-over-week for ${bank.ticker}.` },
      { date: dateStr(12), severity: 'low' as const, message: `${bank.ticker} 30-day volatility trending above peer median.` },
    ],
  }
}

// ---- Peer Benchmarking Data ----

export function getPeerBenchmarking() {
  const overview = getDashboardOverview()
  const peerAvg = overview.reduce((sum, b) => sum + b.composite_score, 0) / overview.length

  return {
    banks: overview.map((b) => ({
      ...b,
      regulatory_score: Math.round(Math.max(0, Math.min(100, b.composite_score + gaussRand(3, 8))) * 10) / 10,
      peer_relative_score: Math.round(Math.max(0, Math.min(100, b.composite_score + gaussRand(-5, 6))) * 10) / 10,
      deviation_from_peer: Math.round((b.composite_score - peerAvg) * 10) / 10,
    })),
    peer_average: Math.round(peerAvg * 10) / 10,
    component_averages: {
      media_sentiment: Math.round(overview.reduce((s, b) => s + b.media_sentiment_score, 0) / overview.length * 10) / 10,
      complaints: Math.round(overview.reduce((s, b) => s + b.complaint_score, 0) / overview.length * 10) / 10,
      market: Math.round(overview.reduce((s, b) => s + b.market_score, 0) / overview.length * 10) / 10,
    },
  }
}

// ---- Regulatory Intel Data ----

const ENFORCEMENT_TYPES = [
  'Consent Order',
  'Civil Money Penalty',
  'Cease and Desist',
  'Formal Agreement',
  'Safety and Soundness Order',
  'Memorandum of Understanding',
]

const AGENCIES = ['OCC', 'FDIC', 'Federal Reserve', 'SEC', 'CFPB']

const SEC_FILING_TYPES = ['10-K', '10-Q', '8-K']

const RISK_KEYWORDS_LIST = [
  'material weakness', 'litigation', 'regulatory action', 'consent order',
  'cybersecurity incident', 'compliance failure', 'credit loss', 'impairment',
  'class action', 'settlement', 'investigation',
]

export function getRegulatoryIntel() {
  const enforcementActions: {
    id: number; bank: BankInfo; agency: string; action_date: string;
    action_type: string; description: string; penalty_amount: number | null; severity: number;
  }[] = []

  let id = 1
  for (const bank of BANKS) {
    const numActions = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < numActions; i++) {
      const actionType = ENFORCEMENT_TYPES[Math.floor(rand() * ENFORCEMENT_TYPES.length)]
      const agency = AGENCIES[Math.floor(rand() * AGENCIES.length)]
      const hasPenalty = rand() > 0.4
      const severity = actionType.includes('Consent') ? 4 : actionType.includes('Cease') ? 5 : actionType.includes('Civil') ? 4 : 2 + Math.floor(rand() * 2)

      enforcementActions.push({
        id: id++,
        bank,
        agency,
        action_date: dateStr(Math.floor(rand() * 365)),
        action_type: actionType,
        description: `${agency} issued ${actionType.toLowerCase()} against ${bank.name} related to ${['BSA/AML compliance', 'consumer protection', 'risk management', 'capital adequacy', 'lending practices'][Math.floor(rand() * 5)]}.`,
        penalty_amount: hasPenalty ? Math.round(rand() * 50 + 1) * 1000000 : null,
        severity,
      })
    }
  }

  enforcementActions.sort((a, b) => b.action_date.localeCompare(a.action_date))

  const secFilings: {
    bank: BankInfo; filing_type: string; filed_date: string;
    risk_keywords: string[]; sentiment_score: number;
  }[] = []

  for (const bank of BANKS) {
    for (let i = 0; i < 4; i++) {
      const numKeywords = Math.floor(rand() * 4)
      const keywords: string[] = []
      for (let k = 0; k < numKeywords; k++) {
        const kw = RISK_KEYWORDS_LIST[Math.floor(rand() * RISK_KEYWORDS_LIST.length)]
        if (!keywords.includes(kw)) keywords.push(kw)
      }
      secFilings.push({
        bank,
        filing_type: SEC_FILING_TYPES[Math.floor(rand() * SEC_FILING_TYPES.length)],
        filed_date: dateStr(Math.floor(rand() * 180)),
        risk_keywords: keywords,
        sentiment_score: Math.round(gaussRand(-0.1, 0.3) * 100) / 100,
      })
    }
  }

  secFilings.sort((a, b) => b.filed_date.localeCompare(a.filed_date))

  return { enforcementActions, secFilings }
}

// ---- Crisis Simulation Data ----

export function getCrisisSimulation(bankId: number) {
  const bank = BANKS.find((b) => b.id === bankId) || BANKS[0]
  const profile = RISK_PROFILES[bank.name]
  const baseScore = profile.base

  const scenarios = [
    {
      name: 'Data Breach (Critical)',
      probability: 0.08,
      impact: 'Severe',
      description: 'Large-scale customer data breach affecting 1M+ accounts. Triggers regulatory investigation, class action litigation, and sustained media coverage.',
      projected_score: Math.min(95, baseScore + 35 + Math.round(gaussRand(0, 5))),
      recovery_days: 180,
      financial_impact: '$200M - $500M',
    },
    {
      name: 'Regulatory Enforcement (High)',
      probability: 0.15,
      impact: 'High',
      description: 'Major consent order from OCC/FDIC for compliance failures. Restricts business activities and requires remediation program.',
      projected_score: Math.min(90, baseScore + 25 + Math.round(gaussRand(0, 4))),
      recovery_days: 120,
      financial_impact: '$50M - $200M',
    },
    {
      name: 'Executive Misconduct (High)',
      probability: 0.05,
      impact: 'High',
      description: 'C-suite executive faces allegations of fraud or misconduct. Board-level crisis requiring immediate leadership change.',
      projected_score: Math.min(92, baseScore + 30 + Math.round(gaussRand(0, 5))),
      recovery_days: 150,
      financial_impact: '$100M - $300M',
    },
    {
      name: 'Market Downturn (Moderate)',
      probability: 0.25,
      impact: 'Moderate',
      description: 'Broad market correction with 20%+ decline in bank equities. Credit quality deterioration in CRE and consumer portfolios.',
      projected_score: Math.min(80, baseScore + 18 + Math.round(gaussRand(0, 4))),
      recovery_days: 90,
      financial_impact: '$1B - $3B (unrealized)',
    },
    {
      name: 'Social Media Crisis (Moderate)',
      probability: 0.20,
      impact: 'Moderate',
      description: 'Viral customer complaint or employee video generates sustained negative attention. Drives complaint volume spike and deposit outflows.',
      projected_score: Math.min(75, baseScore + 15 + Math.round(gaussRand(0, 3))),
      recovery_days: 45,
      financial_impact: '$10M - $50M',
    },
  ]

  // Monte Carlo projection (simplified)
  const projections: { day: number; baseline: number; stressed: number; severe: number }[] = []
  let baseline = baseScore
  let stressed = baseScore + 15
  let severe = baseScore + 30

  for (let day = 0; day <= 90; day++) {
    baseline += gaussRand(0, 0.5)
    stressed += gaussRand(-0.3, 0.8)
    severe += gaussRand(-0.5, 1.0)
    baseline = Math.max(5, Math.min(95, baseline))
    stressed = Math.max(5, Math.min(95, stressed))
    severe = Math.max(5, Math.min(95, severe))
    projections.push({
      day,
      baseline: Math.round(baseline * 10) / 10,
      stressed: Math.round(stressed * 10) / 10,
      severe: Math.round(severe * 10) / 10,
    })
  }

  return { bank, scenarios, projections }
}

// ---- Stakeholder Impact Data ----

export function getStakeholderImpact() {
  return BANKS.map((bank) => {
    const profile = RISK_PROFILES[bank.name]
    return {
      bank,
      stakeholders: [
        {
          group: 'Shareholders',
          impact_level: profile.base > 45 ? 'High' : profile.base > 35 ? 'Moderate' : 'Low',
          metrics: {
            'Stock Price Impact': `${profile.base > 45 ? '-' : ''}${(gaussRand(profile.base * 0.1, 2)).toFixed(1)}%`,
            'Market Cap at Risk': `$${(profile.base * 0.5 + gaussRand(0, 5)).toFixed(1)}B`,
            'Analyst Downgrades': `${Math.floor(rand() * 3)}`,
          },
        },
        {
          group: 'Customers',
          impact_level: profile.base > 50 ? 'High' : profile.base > 35 ? 'Moderate' : 'Low',
          metrics: {
            'NPS Change': `${profile.base > 40 ? '-' : '+'}${Math.floor(gaussRand(profile.base * 0.2, 3))} pts`,
            'Deposit Outflow Risk': `$${(profile.base * 0.02 + gaussRand(0, 0.5)).toFixed(1)}B`,
            'Complaint Volume': `${Math.floor(profile.base * 8 + gaussRand(0, 50))}/month`,
          },
        },
        {
          group: 'Regulators',
          impact_level: profile.base > 45 ? 'High' : profile.base > 30 ? 'Moderate' : 'Low',
          metrics: {
            'Exam Priority': profile.base > 45 ? 'Elevated' : 'Normal',
            'Open MRAs': `${Math.floor(profile.base * 0.1 + gaussRand(0, 2))}`,
            'Enforcement Risk': profile.base > 50 ? 'High' : profile.base > 35 ? 'Medium' : 'Low',
          },
        },
        {
          group: 'Employees',
          impact_level: profile.base > 50 ? 'High' : profile.base > 40 ? 'Moderate' : 'Low',
          metrics: {
            'Glassdoor Trend': profile.base > 45 ? 'Declining' : 'Stable',
            'Attrition Risk': `${(profile.base * 0.3 + gaussRand(0, 3)).toFixed(0)}%`,
            'Open Roles Unfilled': `${Math.floor(profile.base * 5 + gaussRand(0, 50))}`,
          },
        },
      ],
    }
  })
}

// ---- Board Report Data ----

export function getBoardReport() {
  const overview = getDashboardOverview()
  const peerAvg = overview.reduce((s, b) => s + b.composite_score, 0) / overview.length

  const highRiskBanks = overview.filter((b) => b.composite_score >= 50)
  const elevatedBanks = overview.filter((b) => b.composite_score >= 30 && b.composite_score < 50)

  return {
    report_date: dateStr(0),
    period: `${dateStr(30)} to ${dateStr(0)}`,
    executive_summary: `The reputation risk profile across the monitored peer group remains ${peerAvg > 50 ? 'elevated' : peerAvg > 35 ? 'moderate' : 'stable'} with a composite peer average of ${Math.round(peerAvg)}. ${highRiskBanks.length > 0 ? `${highRiskBanks.length} institution(s) are in the high-risk category, requiring immediate attention.` : 'No institutions currently in the high-risk category.'} ${elevatedBanks.length > 0 ? `${elevatedBanks.length} institution(s) show elevated risk warranting continued monitoring.` : ''}`,
    key_findings: [
      `Media sentiment analysis processed ${Math.floor(rand() * 500 + 800)} articles across ${BANKS.length} institutions over the reporting period.`,
      `CFPB complaint volumes ${rand() > 0.5 ? 'increased' : 'decreased'} ${Math.floor(rand() * 15 + 3)}% relative to the prior 30-day period.`,
      `${highRiskBanks.length > 0 ? highRiskBanks[0].bank.name : overview[0].bank.name} showed the most significant risk movement, driven primarily by ${overview[0].top_drivers[0].name.toLowerCase()}.`,
      `Regulatory environment remains active with ${Math.floor(rand() * 5 + 2)} new enforcement actions across the peer group.`,
    ],
    recommendations: [
      { priority: 'High' as const, action: 'Increase monitoring frequency for institutions with composite scores above 50.' },
      { priority: 'High' as const, action: 'Review media sentiment triggers and ensure crisis communication protocols are current.' },
      { priority: 'Medium' as const, action: 'Evaluate CFPB complaint root causes for institutions showing upward trend.' },
      { priority: 'Medium' as const, action: 'Assess market signal correlation with credit quality indicators.' },
      { priority: 'Low' as const, action: 'Schedule quarterly peer benchmarking review with risk committee.' },
    ],
    banks: overview,
    peer_average: Math.round(peerAvg * 10) / 10,
  }
}
