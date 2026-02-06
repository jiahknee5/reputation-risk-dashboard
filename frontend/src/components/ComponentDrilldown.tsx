import { useState, useEffect } from 'react'
import { getBanks } from '../services/api'

// CFPB Complaint type (matches api.ts interface)
interface CfpbComplaint {
  complaint_id: string
  date_received: string
  product: string
  sub_product?: string
  issue: string
  company_response: string
  timely?: string
  consumer_disputed?: string
  complaint_what_happened?: string
}

// Fetch CFPB complaints (copied from api.ts since not exported)
async function fetchAllBankComplaints(bankName: string, daysBack = 90): Promise<CfpbComplaint[]> {
  try {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    const dateFilter = cutoffDate.toISOString().split('T')[0]

    const url = `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?` +
      `company=${encodeURIComponent(bankName)}&date_received_min=${dateFilter}&size=1000`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`CFPB API returned ${res.status}`)

    const json = await res.json()
    return json.hits?.hits?.map((hit: any) => hit._source) || []
  } catch (error) {
    console.error(`Failed to fetch CFPB complaints for ${bankName}:`, error)
    return []
  }
}

interface ComponentDrilldownProps {
  isOpen: boolean
  onClose: () => void
  bankId: number
  componentName: string
}

export default function ComponentDrilldown({ isOpen, onClose, bankId, componentName }: ComponentDrilldownProps) {
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<{
    totalCount: number
    byProduct: Record<string, number>
    byIssue: Record<string, number>
    byResolution: Record<string, number>
    recentComplaints: Array<{
      date: string
      product: string
      issue: string
      narrative: string
      disputed: string
      timely: string
    }>
  } | null>(null)

  useEffect(() => {
    if (!isOpen || componentName !== 'Consumer Complaints') {
      setAnalysis(null)
      return
    }

    const bank = getBanks().find(b => b.id === bankId)
    if (!bank) return

    setLoading(true)
    fetchAllBankComplaints(bank.name, 90).then((complaints: CfpbComplaint[]) => {
      // Aggregate by product
      const byProduct: Record<string, number> = {}
      const byIssue: Record<string, number> = {}
      const byResolution: Record<string, number> = {}

      complaints.forEach((c: CfpbComplaint) => {
        byProduct[c.product] = (byProduct[c.product] || 0) + 1
        byIssue[c.issue] = (byIssue[c.issue] || 0) + 1
        byResolution[c.company_response] = (byResolution[c.company_response] || 0) + 1
      })

      // Top 10 most recent with narratives
      const withNarratives = complaints
        .filter((c: CfpbComplaint) => c.complaint_what_happened && c.complaint_what_happened.length > 20)
        .slice(0, 10)

      setAnalysis({
        totalCount: complaints.length,
        byProduct,
        byIssue,
        byResolution,
        recentComplaints: withNarratives.map((c: CfpbComplaint) => ({
          date: c.date_received || 'Unknown',
          product: c.product,
          issue: c.issue,
          narrative: c.complaint_what_happened || '',
          disputed: c.consumer_disputed || 'No',
          timely: c.timely || 'No',
        })),
      })
      setLoading(false)
    }).catch((err: Error) => {
      console.error('Failed to load complaint analysis:', err)
      setLoading(false)
    })
  }, [isOpen, bankId, componentName])

  if (!isOpen) return null

  // For non-complaint components, show placeholder
  if (componentName !== 'Consumer Complaints') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-900 rounded-2xl max-w-2xl w-full border border-gray-800 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">{componentName} Analysis</h2>
            <p className="text-sm text-gray-400 mt-1">Detailed drill-down for {componentName}</p>
          </div>
          <div className="p-6">
            <p className="text-gray-400 text-sm">Drill-down analysis coming soon for {componentName}.</p>
            <p className="text-gray-500 text-xs mt-2">Currently available: Consumer Complaints</p>
          </div>
          <div className="p-4 border-t border-gray-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Consumer Complaints drill-down
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl max-w-6xl w-full border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Consumer Complaint Analysis</h2>
              <p className="text-sm text-gray-400 mt-1">90-day CFPB complaint breakdown</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading complaint data from CFPB...</p>
          </div>
        ) : !analysis ? (
          <div className="p-12 text-center text-gray-500">
            <p>No complaint data available</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-white">{analysis.totalCount}</div>
                <div className="text-xs text-gray-400 mt-1">Total Complaints (90d)</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-white">{Object.keys(analysis.byProduct).length}</div>
                <div className="text-xs text-gray-400 mt-1">Product Categories</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-white">{Object.keys(analysis.byIssue).length}</div>
                <div className="text-xs text-gray-400 mt-1">Unique Issues</div>
              </div>
            </div>

            {/* Top complaints by product */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Complaint Products</h3>
              <div className="space-y-2">
                {Object.entries(analysis.byProduct)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([product, count]) => (
                    <div key={product} className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-800 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-8 bg-orange-500/70 flex items-center px-3 text-xs font-medium text-white"
                          style={{ width: `${(count / analysis.totalCount) * 100}%` }}
                        >
                          {product}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400 w-12 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top issues */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Issues</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(analysis.byIssue)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([issue, count]) => (
                    <div key={issue} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-lg font-bold text-white">{count}</div>
                      <div className="text-xs text-gray-400 mt-1">{issue}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Recent complaints with narratives */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Complaint Narratives (Last 10 with details)</h3>
              <div className="space-y-3">
                {analysis.recentComplaints.map((c, i) => (
                  <div key={i} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-blue-400">{c.product}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{c.issue}</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(c.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{c.narrative.slice(0, 300)}{c.narrative.length > 300 ? '...' : ''}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {c.disputed === 'Yes' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                          Consumer Disputed
                        </span>
                      )}
                      {c.timely === 'Yes' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                          Timely Response
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Company Response Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(analysis.byResolution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([resolution, count]) => (
                    <div key={resolution} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-lg font-bold text-white">{count}</div>
                      <div className="text-xs text-gray-400 mt-1">{resolution}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-gray-800 flex justify-end sticky bottom-0 bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white font-medium"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  )
}
