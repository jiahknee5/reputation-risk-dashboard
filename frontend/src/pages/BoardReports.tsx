import { useMemo } from 'react'
import RiskGauge from '../components/RiskGauge'
import DemoBanner from '../components/DemoBanner'
import { getBoardReport } from '../data/demo'

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
  const report = useMemo(() => getBoardReport(), [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Board Risk Report</h2>
        <p className="text-sm text-gray-500 mt-1">Executive summary for board and risk committee review</p>
      </div>

      <DemoBanner />

      {/* Report header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Reputation Risk Assessment</h3>
            <p className="text-xs text-gray-500 mt-1">Reporting Period: {report.period}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Report Generated</p>
            <p className="text-sm text-gray-400">{report.report_date}</p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Executive Summary</h4>
          <p className="text-sm text-gray-300 leading-relaxed">{report.executive_summary}</p>
        </div>
      </div>

      {/* Peer group overview */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400">Peer Group Risk Snapshot</h3>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Key Findings</h3>
          <div className="space-y-3">
            {report.key_findings.map((finding, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-blue-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                <p className="text-sm text-gray-300">{finding}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Recommendations</h3>
          <div className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30">
                {priorityBadge(rec.priority)}
                <p className="text-sm text-gray-300 flex-1">{rec.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed scores table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-400">Detailed Risk Scores</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
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
                <tr key={b.bank.id} className="border-b border-gray-800/50">
                  <td className="p-3 text-gray-200 font-medium">{b.bank.name} <span className="text-gray-500">({b.bank.ticker})</span></td>
                  <td className={`p-3 text-right font-bold ${
                    b.composite_score >= 50 ? 'text-red-400' : b.composite_score >= 30 ? 'text-yellow-400' : 'text-green-400'
                  }`}>{b.composite_score}</td>
                  <td className="p-3 text-right text-gray-400">{b.media_sentiment_score}</td>
                  <td className="p-3 text-right text-gray-400">{b.complaint_score}</td>
                  <td className="p-3 text-right text-gray-400">{b.market_score}</td>
                  <td className="p-3 text-gray-400 text-xs">{b.top_drivers[0]?.name} ({Math.round(b.top_drivers[0]?.score)})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology note */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
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
