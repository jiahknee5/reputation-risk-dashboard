import { useState, useMemo, useEffect } from 'react'
import RiskGauge from '../components/RiskGauge'
import ExportButton from '../components/ExportButton'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import { getBanks, getBoardReport } from '../services/api'

interface PeerGroup {
  id: string
  name: string
  description: string
  bankIds: number[]
  createdAt: number
  updatedAt: number
}

function loadPeerGroups(): PeerGroup[] {
  try {
    const stored = localStorage.getItem('reprisk-peer-groups')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function priorityBadge(priority: string) {
  const colors: Record<string, string> = {
    High: 'bg-red-500/20 text-red-400 border-red-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[priority] || colors.Medium}`}>
      {priority}
    </span>
  )
}

export default function BoardReports() {
  const allBanks = useMemo(() => getBanks(), [])
  const allReport = useMemo(() => getBoardReport(), [])
  const [peerGroups, setPeerGroups] = useState<PeerGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  useEffect(() => {
    setPeerGroups(loadPeerGroups())
  }, [])

  // Filter report by peer group
  const report = useMemo(() => {
    if (!selectedGroupId) return allReport

    const group = peerGroups.find(g => g.id === selectedGroupId)
    if (!group) return allReport

    // Filter banks to only those in the peer group
    const filteredBanks = allReport.banks.filter(b => group.bankIds.includes(b.bank.id))

    // Recalculate peer average for this group
    const peerAverage = filteredBanks.length > 0
      ? Math.round(filteredBanks.reduce((sum, b) => sum + b.composite_score, 0) / filteredBanks.length)
      : allReport.peer_average

    return {
      ...allReport,
      banks: filteredBanks,
      peer_average: peerAverage,
    }
  }, [allReport, selectedGroupId, peerGroups])

  const selectedGroup = peerGroups.find(g => g.id === selectedGroupId)

  // Generate insight based on report data
  const highPriority = report.recommendations.filter(r => r.priority === 'High').length
  const avgScore = report.banks.length > 0
    ? Math.round(report.banks.reduce((sum, b) => sum + b.composite_score, 0) / report.banks.length)
    : 0
  const abovePeer = report.banks.filter(b => b.composite_score > report.peer_average).length

  const groupName = selectedGroup ? selectedGroup.name : 'All institutions'
  const insight = highPriority > 0 ? {
    type: 'action' as const,
    title: `${highPriority} high-priority recommendation${highPriority !== 1 ? 's' : ''} requiring immediate board attention`,
    message: `Board report includes ${highPriority} high-priority action item${highPriority !== 1 ? 's' : ''}. ${groupName} average: ${avgScore}.`,
    detail: `${abovePeer} institution${abovePeer !== 1 ? 's' : ''} above peer average (${report.peer_average}). ${report.key_findings.length} key findings identified.`
  } : avgScore >= 50 ? {
    type: 'warning' as const,
    title: 'Portfolio risk elevated above board tolerance',
    message: `${groupName} average ${avgScore} in elevated range. ${report.key_findings.length} key findings for board review.`,
    detail: `${abovePeer} institution${abovePeer !== 1 ? 's' : ''} above peer average (${report.peer_average}). Monitor closely.`
  } : {
    type: 'positive' as const,
    title: 'Reputation risk within board-approved tolerances',
    message: `${groupName} average ${avgScore} within acceptable range. ${report.banks.length} institution${report.banks.length !== 1 ? 's' : ''} monitored.`,
    detail: `${report.recommendations.length} recommendation${report.recommendations.length !== 1 ? 's' : ''} for continuous improvement. ${report.key_findings.length} key findings noted.`
  }

  return (
    <div className="space-y-4">
      <PageObjective
        title="Board Risk Reports"
        objective="Provide board-ready summary with recommendations"
        description={`Executive reputation risk summary for board and risk committee review${selectedGroup ? ` — ${selectedGroup.name} peer group` : ' — all monitored institutions'}. Aggregated scores, key findings, priority recommendations, and detailed component breakdowns.`}
      >
        <select
          className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">All Institutions ({allBanks.length})</option>
          {peerGroups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name} ({allBanks.filter(b => group.bankIds.includes(b.id)).length} banks)
            </option>
          ))}
        </select>
      </PageObjective>

      <InsightBox {...insight} />

      {/* Report header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reputation Risk Assessment</h3>
            <p className="text-xs text-gray-500 mt-1">Reporting Period: {report.period}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              data={report.banks.map(b => ({
                Institution: b.bank.name,
                Ticker: b.bank.ticker,
                Composite: b.composite_score,
                Media: b.media_sentiment_score,
                Complaints: b.complaint_score,
                Market: b.market_score,
                TopDriver: b.top_drivers[0]?.name,
              }))}
              filename={`board-report-${report.report_date}`}
              format="csv"
              label="Export CSV"
            />
            <ExportButton
              data={JSON.stringify(report)}
              filename={`board-report-${report.report_date}`}
              format="json"
              label="Export JSON"
            />
            <div className="text-right ml-2">
              <p className="text-xs text-gray-500">Report Generated</p>
              <p className="text-sm text-gray-600">{report.report_date}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50/50 rounded-lg p-4">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Executive Summary</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {selectedGroup ? `${selectedGroup.name}: ` : ''}{report.executive_summary}
          </p>
          {selectedGroup && (
            <p className="text-xs text-blue-400 mt-2">
              📊 Filtered to {selectedGroup.name} — {report.banks.length} institution{report.banks.length !== 1 ? 's' : ''} ({selectedGroup.description})
            </p>
          )}
        </div>
      </div>

      {/* Peer group overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">Peer Group Risk Snapshot</h3>
          <div className="text-right">
            <span className="text-xs text-gray-500">Peer Average: </span>
            <span className={`text-sm font-bold ${
              report.peer_average >= 50 ? 'text-red-400' : report.peer_average >= 30 ? 'text-yellow-400' : 'text-green-400'
            }`}>{report.peer_average}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {report.banks.map((b) => (
            <div key={b.bank.id} className="text-center">
              <RiskGauge score={b.composite_score} label={b.bank.ticker} size="sm" />
              <p className="text-xs text-gray-600 mt-1">{b.bank.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key findings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Key Findings</h3>
          <div className="space-y-3">
            {report.key_findings.map((finding, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-blue-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                <p className="text-sm text-gray-700">{finding}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Recommendations</h3>
          <div className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/30">
                {priorityBadge(rec.priority)}
                <p className="text-sm text-gray-700 flex-1">{rec.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed scores table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Detailed Risk Scores</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-200">
                <th className="text-left p-3">Institution</th>
                <th className="text-right p-3">Composite</th>
                <th className="text-right p-3">Media Sentiment</th>
                <th className="text-right p-3">Consumer Complaints</th>
                <th className="text-right p-3">Market Signal</th>
                <th className="text-left p-3">Top Risk Driver</th>
              </tr>
            </thead>
            <tbody>
              {report.banks.map((b) => (
                <tr key={b.bank.id} className="border-b border-gray-200/50">
                  <td className="p-3 text-gray-200 font-medium">{b.bank.name} <span className="text-gray-500">({b.bank.ticker})</span></td>
                  <td className={`p-3 text-right font-bold ${
                    b.composite_score >= 50 ? 'text-red-400' : b.composite_score >= 30 ? 'text-yellow-400' : 'text-green-400'
                  }`}>{b.composite_score}</td>
                  <td className="p-3 text-right text-gray-600">{b.media_sentiment_score}</td>
                  <td className="p-3 text-right text-gray-600">{b.complaint_score}</td>
                  <td className="p-3 text-right text-gray-600">{b.market_score}</td>
                  <td className="p-3 text-gray-600 text-xs">{b.top_drivers[0]?.name} ({Math.round(b.top_drivers[0]?.score)})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology note */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Methodology</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Composite reputation risk scores are calculated using a weighted combination of five components:
          Media Sentiment (25%) via FinBERT NLP analysis, Regulatory Risk (25%) from SEC filings and enforcement actions,
          Consumer Complaints (20%) from CFPB data with narrative sentiment, Market Signal (15%) from equity returns and volatility,
          and Peer Relative positioning (15%). Scores range from 0 (lowest risk) to 100 (highest risk).
          Data sources are refreshed on automated schedules: news and complaints every 6 hours, market data daily,
          regulatory filings weekly.
        </p>
      </div>
    </div>
  )
}
