// SEC EDGAR API Integration
// Documentation: https://www.sec.gov/edgar/sec-api-documentation

// CIK (Central Index Key) mapping for all 23 banks
const BANK_CIK_MAP: Record<string, string> = {
  // Category I GSIBs
  'JPM': '0000019617',  // JPMorgan Chase
  'BAC': '0000070858',  // Bank of America
  'C': '0000831001',    // Citigroup
  'WFC': '0000072971',  // Wells Fargo
  'GS': '0000886982',   // Goldman Sachs
  'MS': '0000895421',   // Morgan Stanley
  'BK': '0001390777',   // Bank of New York Mellon
  'STT': '0000093751',  // State Street

  // Category II Super-Regionals
  'USB': '0000036104',  // US Bancorp
  'PNC': '0000713676',  // PNC Financial
  'TFC': '0000092230',  // Truist Financial
  'COF': '0000927628',  // Capital One
  'TD': '0000947263',   // TD Bank (US)
  'FITB': '0000035527', // Fifth Third
  'BMO': '0001275288',  // BMO Harris (US)
  'CFG': '0000759944',  // Citizens Financial

  // Category III Regionals
  'MTB': '0000036270',  // M&T Bank
  'KEY': '0000091576',  // KeyCorp
  'HBAN': '0000049196', // Huntington Bancshares
  'RF': '0001281761',   // Regions Financial
  'ALLY': '0001858681', // Ally Financial
  'AXP': '0000004962',  // American Express
  'DFS': '0001393612',  // Discover Financial
}

export interface SECFiling {
  accessionNumber: string
  filingDate: string
  reportDate: string
  acceptanceDateTime: string
  form: string // 10-K, 10-Q, 8-K
  fileNumber: string
  filmNumber: string
  items: string // For 8-K
  size: number
  isXBRL: boolean
  primaryDocument: string
  primaryDocDescription: string
}

export interface CompanyFilings {
  cik: string
  entityType: string
  sic: string
  sicDescription: string
  name: string
  tickers: string[]
  exchanges: string[]
  filings: {
    recent: {
      accessionNumber: string[]
      filingDate: string[]
      reportDate: string[]
      acceptanceDateTime: string[]
      act: string[]
      form: string[]
      fileNumber: string[]
      filmNumber: string[]
      items: string[]
      size: number[]
      isXBRL: number[]
      primaryDocument: string[]
      primaryDocDescription: string[]
    }
  }
}

/**
 * Fetch company filings from SEC EDGAR
 * SEC requires User-Agent header with contact info
 */
export async function fetchCompanyFilings(ticker: string): Promise<CompanyFilings | null> {
  const cik = BANK_CIK_MAP[ticker]
  if (!cik) {
    console.warn(`No CIK found for ticker: ${ticker}`)
    return null
  }

  const url = `https://data.sec.gov/submissions/CIK${cik}.json`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RepRisk Dashboard research@reprisk.ai',
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'data.sec.gov'
      }
    })

    if (!response.ok) {
      throw new Error(`SEC API returned ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch SEC filings for ${ticker}:`, error)
    return null
  }
}

/**
 * Parse recent 10-K/10-Q/8-K filings from company data
 */
export function parseRecentFilings(data: CompanyFilings, limit = 10): SECFiling[] {
  const { recent } = data.filings
  const filings: SECFiling[] = []

  for (let i = 0; i < Math.min(limit, recent.form.length); i++) {
    const form = recent.form[i]

    // Only include 10-K, 10-Q, 8-K
    if (!['10-K', '10-Q', '8-K'].includes(form)) continue

    filings.push({
      accessionNumber: recent.accessionNumber[i],
      filingDate: recent.filingDate[i],
      reportDate: recent.reportDate[i],
      acceptanceDateTime: recent.acceptanceDateTime[i],
      form,
      fileNumber: recent.fileNumber[i],
      filmNumber: recent.filmNumber[i],
      items: recent.items[i] || '',
      size: recent.size[i],
      isXBRL: recent.isXBRL[i] === 1,
      primaryDocument: recent.primaryDocument[i],
      primaryDocDescription: recent.primaryDocDescription[i],
    })
  }

  return filings
}

/**
 * Generate SEC EDGAR document URL
 */
export function getFilingURL(accessionNumber: string, primaryDocument: string): string {
  const accessionNoHyphens = accessionNumber.replace(/-/g, '')
  return `https://www.sec.gov/Archives/edgar/data/${accessionNoHyphens}/${accessionNumber}/${primaryDocument}`
}

/**
 * Risk keywords to search for in filings
 */
export const RISK_KEYWORDS = [
  'reputation risk',
  'reputational damage',
  'brand damage',
  'customer trust',
  'public perception',
  'regulatory investigation',
  'enforcement action',
  'consent order',
  'civil money penalty',
  'litigation',
  'adverse publicity',
  'social media',
  'cyber incident',
  'data breach',
  'fraud',
  'misconduct',
  'compliance failure',
]

/**
 * Extract risk keywords from filing text (mock implementation)
 * Real implementation would fetch and parse the full document
 */
export function extractRiskKeywords(filingText: string): string[] {
  const found: string[] = []
  const lowerText = filingText.toLowerCase()

  for (const keyword of RISK_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword)
    }
  }

  return found
}
