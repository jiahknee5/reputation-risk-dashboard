import { useMemo } from 'react'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import SectionObjective from '../components/SectionObjective'
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
              : 'bg-gray-100'
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
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[agency] || 'bg-gray-500/20 text-gray-600'}`}>
      {agency}
    </span>
  )
}

export default function RegulatoryIntel() {
  const data = useMemo(() => getRegulatoryIntel(), [])

  // Generate insight
  const highSeverity = data.enforcementActions.filter(a => a.severity >= 4)
  const totalPenalties = data.enforcementActions.reduce((s, a) => s + (a.penalty_amount || 0), 0)
  const recentActions = data.enforcementActions.filter(a => {
    const actionDate = new Date(a.action_date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return actionDate >= thirtyDaysAgo
  })

  const insight = highSeverity.length > 0 ? {
    type: 'warning' as const,
    title: `${highSeverity.length} high-severity enforcement action${highSeverity.length !== 1 ? 's' : ''}`,
    message: `${highSeverity.length} consent orders, CMPs, or C&D actions across monitored institutions. ${recentActions.length} action${recentActions.length !== 1 ? 's' : ''} in last 30 days.`,
    detail: `Total penalties: $${(totalPenalties / 1_000_000).toFixed(1)}M. ${data.secFilings.length} SEC filings analyzed for risk disclosures.`
  } : {
    type: 'finding' as const,
    title: `${data.enforcementActions.length} enforcement actions monitored`,
    message: `${recentActions.length} action${recentActions.length !== 1 ? 's' : ''} in last 30 days. Total penalties: $${(totalPenalties / 1_000_000).toFixed(1)}M.`,
    detail: `${data.secFilings.length} SEC filings analyzed. Most common agencies: OCC, FDIC, Federal Reserve.`
  }

  return (
    <div className="space-y-4">
      <PageObjective
        title="Regulatory Intelligence"
        objective="Track enforcement actions and SEC filing risk"
        description="Comprehensive view of regulatory actions across OCC, FDIC, Federal Reserve, SEC, and CFPB — enforcement timeline, penalties, and risk disclosure analysis."
      />

      <InsightBox {...insight} />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Enforcement Actions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.enforcementActions.length}</p>
          <p className="text-xs text-gray-600 mt-1">Across all monitored institutions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">High Severity (4-5)</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{data.enforcementActions.filter((a) => a.severity >= 4).length}</p>
          <p className="text-xs text-gray-600 mt-1">Consent orders, CMPs, C&D</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Penalties</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">
            ${(data.enforcementActions.reduce((s, a) => s + (a.penalty_amount || 0), 0) / 1000000).toFixed(0)}M
          </p>
          <p className="text-xs text-gray-600 mt-1">Aggregate civil money penalties</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">SEC Filings Analyzed</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{data.secFilings.length}</p>
          <p className="text-xs text-gray-600 mt-1">10-K, 10-Q, 8-K filings</p>
        </div>
      </div>

      <SectionObjective
        title="Enforcement Timeline"
        objective="Chronological enforcement actions reveal patterns of regulatory scrutiny. High-severity actions (red border) indicate consent orders, CMPs, or C&D letters that carry board-level implications."
        type={highSeverity.length > 0 ? 'action' : 'info'}
      />

      {/* Enforcement actions timeline */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Enforcement Action Timeline</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
          {data.enforcementActions.map((action) => (
            <a
              key={action.id}
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block p-4 hover:bg-gray-50/30 transition-colors cursor-pointer ${action.severity >= 4 ? 'border-l-2 border-red-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {agencyBadge(action.agency)}
                    <span className="text-xs text-gray-500">{action.action_type}</span>
                    {severityDots(action.severity)}
                    <span className="text-xs text-blue-400 ml-auto">View Source →</span>
                  </div>
                  <p className="text-sm text-gray-200 font-medium group-hover:text-blue-400 transition-colors">
                    {action.bank.name} ({action.bank.ticker})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  {action.penalty_amount && (
                    <p className="text-xs text-red-400 mt-1 font-medium">
                      Penalty: ${(action.penalty_amount / 1000000).toFixed(1)}M
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">{action.action_date}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <SectionObjective
        title="Filing Risk Extraction"
        objective="NLP analysis of 10-K/10-Q/8-K filings surfaces material risk disclosures and negative sentiment in MD&A sections before market repricing."
        type="info"
      />

      {/* SEC Filings */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">SEC Filing Risk Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-200">
                <th className="text-left p-3">Institution</th>
                <th className="text-left p-3">Filing</th>
                <th className="text-left p-3">Filed</th>
                <th className="text-left p-3">Risk Keywords</th>
                <th className="text-right p-3">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {data.secFilings.map((filing, i) => (
                <tr key={i} className="border-b border-gray-200/50 hover:bg-gray-50/30 group cursor-pointer">
                  <td className="p-3 text-gray-200">{filing.bank.name}</td>
                  <td className="p-3">
                    <a
                      href={filing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-blue-400 px-2 py-0.5 rounded text-xs font-mono transition-colors"
                    >
                      {filing.filing_type}
                      <span className="text-blue-400 opacity-0 group-hover:opacity-100">→</span>
                    </a>
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
                    filing.sentiment_score > 0.1 ? 'text-green-400' : filing.sentiment_score < -0.1 ? 'text-red-400' : 'text-gray-600'
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
