// Regulatory Enforcement API Integration
// OCC, FDIC, Federal Reserve enforcement action feeds

export interface EnforcementAction {
  id: string
  agency: 'OCC' | 'FDIC' | 'Federal Reserve' | 'SEC' | 'CFPB'
  actionType: string // Consent Order, CMP, C&D, Written Agreement
  institution: string
  date: string
  description: string
  penaltyAmount?: number // In dollars
  severity: 1 | 2 | 3 | 4 | 5 // 1=low, 5=critical
  documentUrl?: string
  docketNumber?: string
}

/**
 * OCC Enforcement Actions
 * Source: https://www.occ.gov/topics/supervision-and-examination/enforcement-actions/index-enforcement-actions.html
 * Format: XML/RSS feed
 */
export async function fetchOCCEnforcement(): Promise<EnforcementAction[]> {
  const url = 'https://www.occ.gov/rss-feeds/occ-enforcement-actions.xml'

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RepRisk Dashboard research@reprisk.ai'
      }
    })

    if (!response.ok) throw new Error(`OCC API returned ${response.status}`)

    const xmlText = await response.text()
    // Parse XML to extract enforcement actions
    // Real implementation would use DOMParser or xml2js
    return parseOCCEnforcementXML(xmlText)
  } catch (error) {
    console.error('Failed to fetch OCC enforcement actions:', error)
    return []
  }
}

function parseOCCEnforcementXML(xml: string): EnforcementAction[] {
  // Mock parser - real implementation would parse XML properly
  // XML structure: <item><title>Bank Name - Action Type</title><pubDate>...</pubDate><link>...</link></item>
  return []
}

/**
 * FDIC Enforcement Decisions and Orders
 * Source: https://www.fdic.gov/resources/resolutions/bank-failures/enforcement-decisions-and-orders
 * Format: HTML table scraping (no API)
 */
export async function fetchFDICEnforcement(): Promise<EnforcementAction[]> {
  const url = 'https://www.fdic.gov/resources/resolutions/bank-failures/enforcement-decisions-and-orders'

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RepRisk Dashboard research@reprisk.ai'
      }
    })

    if (!response.ok) throw new Error(`FDIC API returned ${response.status}`)

    const html = await response.text()
    return parseFDICEnforcementHTML(html)
  } catch (error) {
    console.error('Failed to fetch FDIC enforcement actions:', error)
    return []
  }
}

function parseFDICEnforcementHTML(html: string): EnforcementAction[] {
  // Mock parser - real implementation would parse HTML table
  // Table structure: <tr><td>Institution</td><td>Date</td><td>Type</td><td>Document</td></tr>
  return []
}

/**
 * Federal Reserve Enforcement Actions
 * Source: https://www.federalreserve.gov/supervisionreg/enforcement-actions-recent.htm
 * Format: RSS feed + structured HTML
 */
export async function fetchFedEnforcement(): Promise<EnforcementAction[]> {
  const url = 'https://www.federalreserve.gov/feeds/enforcement.xml'

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RepRisk Dashboard research@reprisk.ai'
      }
    })

    if (!response.ok) throw new Error(`Fed API returned ${response.status}`)

    const xmlText = await response.text()
    return parseFedEnforcementXML(xmlText)
  } catch (error) {
    console.error('Failed to fetch Fed enforcement actions:', error)
    return []
  }
}

function parseFedEnforcementXML(xml: string): EnforcementAction[] {
  // Mock parser - real implementation would parse XML/RSS
  return []
}

/**
 * Aggregate enforcement actions from all regulators
 */
export async function fetchAllEnforcementActions(): Promise<EnforcementAction[]> {
  const [occ, fdic, fed] = await Promise.all([
    fetchOCCEnforcement(),
    fetchFDICEnforcement(),
    fetchFedEnforcement(),
  ])

  return [...occ, ...fdic, ...fed].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

/**
 * Calculate severity score based on action type and penalty
 */
export function calculateSeverity(actionType: string, penaltyAmount?: number): 1 | 2 | 3 | 4 | 5 {
  // Consent Order, Civil Money Penalty, Cease & Desist = high severity
  if (actionType.includes('Consent Order') || actionType.includes('Civil Money Penalty')) {
    if (penaltyAmount && penaltyAmount > 10_000_000) return 5 // >$10M
    if (penaltyAmount && penaltyAmount > 1_000_000) return 4  // >$1M
    return 3
  }

  // Cease & Desist
  if (actionType.includes('Cease and Desist') || actionType.includes('C&D')) {
    return 4
  }

  // Written Agreement, MOU
  if (actionType.includes('Written Agreement') || actionType.includes('MOU')) {
    return 2
  }

  // Default
  return 1
}

/**
 * Match enforcement action to bank by institution name
 */
export function matchActionToBank(action: EnforcementAction, bankName: string, ticker: string): boolean {
  const normalizedInstitution = action.institution.toLowerCase()
  const normalizedBank = bankName.toLowerCase()
  const normalizedTicker = ticker.toLowerCase()

  // Direct match
  if (normalizedInstitution.includes(normalizedBank)) return true
  if (normalizedInstitution.includes(normalizedTicker)) return true

  // Handle common variations
  if (bankName === 'JPMorgan Chase' && normalizedInstitution.includes('jpmorgan')) return true
  if (bankName === 'Bank of America' && normalizedInstitution.includes('bank of america')) return true
  if (bankName === 'Wells Fargo' && normalizedInstitution.includes('wells fargo')) return true
  if (bankName === 'Citigroup' && (normalizedInstitution.includes('citibank') || normalizedInstitution.includes('citigroup'))) return true

  return false
}
