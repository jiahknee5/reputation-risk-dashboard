import { useMemo } from 'react'
import { getRegulatoryIntel } from '../services/api'

function severityDots(severity: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= severity
              ? severity >= 4 ? 'bg-red-500' : severity >= 3 ? 'bg-orange-500' : 'bg-yellow-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  )
}

function agencyBadge(agency: string) {
  const colors: Record<string, string> = {
    OCC: 'bg-blue-500/20 text-blue-400',
    FDIC: 'bg-green-500/20 text-green-400',
    'Federal Reserve': 'bg-purple-500/20 text-purple-400',
    SEC: 'bg-red-500/20 text-red-400',
    CFPB: 'bg-orange-500/20 text-orange-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[agency] || 'bg-gray-500/20 text-gray-400'}`}>
      {agency}
    </span>
  )
}

export default function RegulatoryIntel() {
  const data = useMemo(() => getRegulatoryIntel(), [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Regulatory Intelligence</h2>
        <p className="text-sm text-gray-500 mt-1">Enforcement actions, SEC filings, and regulatory risk indicators</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Enforcement Actions</p>
          <p className="text-2xl font-bold text-white mt-1">{data.enforcementActions.length}</p>
          <p className="text-xs text-gray-600 mt-1">Across all monitored institutions</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">High Severity (4-5)</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{data.enforcementActions.filter((a) => a.severity >= 4).length}</p>
          <p className="text-xs text-gray-600 mt-1">Consent orders, CMPs, C&D</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Penalties</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">
            ${(data.enforcementActions.reduce((s, a) => s + (a.penalty_amount || 0), 0) / 1000000).toFixed(0)}M
          </p>
          <p className="text-xs text-gray-600 mt-1">Aggregate civil money penalties</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">SEC Filings Analyzed</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{data.secFilings.length}</p>
          <p className="text-xs text-gray-600 mt-1">10-K, 10-Q, 8-K filings</p>
        </div>
      </div>

      {/* Enforcement actions timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-400">Enforcement Action Timeline</h3>
        </div>
        <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
          {data.enforcementActions.map((action) => (
            <div key={action.id} className={`p-4 hover:bg-gray-800/30 ${action.severity >= 4 ? 'border-l-2 border-red-500' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {agencyBadge(action.agency)}
                    <span className="text-xs text-gray-500">{action.action_type}</span>
                    {severityDots(action.severity)}
                  </div>
                  <p className="text-sm text-gray-200 font-medium">{action.bank.name} ({action.bank.ticker})</p>
                  <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  {action.penalty_amount && (
                    <p className="text-xs text-red-400 mt-1 font-medium">
                      Penalty: ${(action.penalty_amount / 1000000).toFixed(1)}M
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">{action.action_date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEC Filings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-400">SEC Filing Risk Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left p-3">Institution</th>
                <th className="text-left p-3">Filing</th>
                <th className="text-left p-3">Filed</th>
                <th className="text-left p-3">Risk Keywords</th>
                <th className="text-right p-3">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {data.secFilings.map((filing, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 text-gray-200">{filing.bank.name}</td>
                  <td className="p-3">
                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs font-mono">{filing.filing_type}</span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{filing.filed_date}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {filing.risk_keywords.length > 0 ? filing.risk_keywords.map((kw, j) => (
                        <span key={j} className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-xs">{kw}</span>
                      )) : <span className="text-gray-600 text-xs">None detected</span>}
                    </div>
                  </td>
                  <td className={`p-3 text-right text-xs font-medium ${
                    filing.sentiment_score > 0.1 ? 'text-green-400' : filing.sentiment_score < -0.1 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {filing.sentiment_score.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
