import { useMemo } from 'react'
import RiskGauge from '../components/RiskGauge'
import DemoBanner from '../components/DemoBanner'
import { getPeerBenchmarking } from '../data/demo'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts'

export default function PeerBenchmarking() {
  const data = useMemo(() => getPeerBenchmarking(), [])

  const comparisonData = data.banks.map((b) => ({
    name: b.bank.ticker,
    composite: b.composite_score,
    deviation: b.deviation_from_peer,
  }))

  const radarData = [
    { component: 'Media', ...Object.fromEntries(data.banks.map((b) => [b.bank.ticker, b.media_sentiment_score])) },
    { component: 'Complaints', ...Object.fromEntries(data.banks.map((b) => [b.bank.ticker, b.complaint_score])) },
    { component: 'Market', ...Object.fromEntries(data.banks.map((b) => [b.bank.ticker, b.market_score])) },
    { component: 'Regulatory', ...Object.fromEntries(data.banks.map((b) => [b.bank.ticker, b.regulatory_score])) },
    { component: 'Peer Rel.', ...Object.fromEntries(data.banks.map((b) => [b.bank.ticker, b.peer_relative_score])) },
  ]

  const radarColors = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7', '#06b6d4']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Peer Benchmarking</h2>
        <p className="text-sm text-gray-500 mt-1">Cross-institution risk comparison and relative positioning</p>
      </div>

      <DemoBanner />

      {/* Peer average banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-400">Peer Group Composite Average</h3>
            <p className="text-3xl font-bold text-white mt-1">{data.peer_average}</p>
            <p className="text-xs text-gray-500 mt-1">Across {data.banks.length} monitored institutions</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500">Media Avg</p>
              <p className="text-lg font-semibold text-purple-400">{data.component_averages.media_sentiment}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Complaint Avg</p>
              <p className="text-lg font-semibold text-orange-400">{data.component_averages.complaints}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Market Avg</p>
              <p className="text-lg font-semibold text-cyan-400">{data.component_averages.market}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gauges row */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Composite Risk Ranking</h3>
        <div className="flex flex-wrap justify-center gap-6">
          {data.banks.map((b) => (
            <div key={b.bank.id} className="text-center">
              <RiskGauge score={b.composite_score} label={b.bank.ticker} size="sm" />
              <p className={`text-xs mt-1 ${b.deviation_from_peer > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {b.deviation_from_peer > 0 ? '+' : ''}{b.deviation_from_peer} vs peer
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deviation chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Deviation from Peer Average</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} width={40} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} labelStyle={{ color: '#9ca3af' }} />
              <Bar dataKey="deviation" radius={[0, 4, 4, 0]}>
                {comparisonData.map((entry, i) => (
                  <Cell key={i} fill={entry.deviation > 0 ? '#ef4444' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Component Risk Profile</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="component" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} />
              {data.banks.slice(0, 3).map((b, i) => (
                <Radar
                  key={b.bank.ticker}
                  name={b.bank.ticker}
                  dataKey={b.bank.ticker}
                  stroke={radarColors[i]}
                  fill={radarColors[i]}
                  fillOpacity={0.1}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-2 text-center">Showing top 3 institutions by risk score</p>
        </div>
      </div>

      {/* Detailed comparison table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-400">Detailed Risk Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left p-3">Institution</th>
                <th className="text-right p-3">Composite</th>
                <th className="text-right p-3">Media</th>
                <th className="text-right p-3">Complaints</th>
                <th className="text-right p-3">Market</th>
                <th className="text-right p-3">Regulatory</th>
                <th className="text-right p-3">Peer Deviation</th>
              </tr>
            </thead>
            <tbody>
              {data.banks.map((b) => (
                <tr key={b.bank.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 text-gray-200 font-medium">{b.bank.name} <span className="text-gray-500">({b.bank.ticker})</span></td>
                  <td className={`p-3 text-right font-bold ${b.composite_score >= 50 ? 'text-red-400' : b.composite_score >= 30 ? 'text-yellow-400' : 'text-green-400'}`}>{b.composite_score}</td>
                  <td className="p-3 text-right text-gray-400">{b.media_sentiment_score}</td>
                  <td className="p-3 text-right text-gray-400">{b.complaint_score}</td>
                  <td className="p-3 text-right text-gray-400">{b.market_score}</td>
                  <td className="p-3 text-right text-gray-400">{b.regulatory_score}</td>
                  <td className={`p-3 text-right font-medium ${b.deviation_from_peer > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {b.deviation_from_peer > 0 ? '+' : ''}{b.deviation_from_peer}
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
