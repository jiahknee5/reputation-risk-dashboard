import { useMemo, useState } from 'react'
import RiskGauge from '../components/RiskGauge'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import { getPeerBenchmarking } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts'

export default function PeerBenchmarking() {
  const data = useMemo(() => getPeerBenchmarking(), [])
  const [selectedBank, setSelectedBank] = useState<string | null>(null)

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

  // Generate insight
  const usbData = data.banks.find(b => b.bank.ticker === 'USB')
  const insight = usbData ? (() => {
    const deviation = usbData.deviation_from_peer
    const primaryDriver = usbData.media_sentiment_score > 50 ? 'Media Sentiment' : usbData.complaint_score > 50 ? 'Customer Complaints' : 'Regulatory'

    if (deviation >= 10) {
      return {
        type: 'warning' as const,
        title: 'US Bancorp above peer average',
        message: `Composite score ${usbData.composite_score} is ${deviation} points above peer average (${data.peer_average}).`,
        detail: `Primary driver: ${primaryDriver}. Indicates elevated reputation risk vs peer group.`
      }
    } else if (deviation <= -10) {
      return {
        type: 'positive' as const,
        title: 'US Bancorp below peer average',
        message: `Composite score ${usbData.composite_score} is ${Math.abs(deviation)} points below peer average.`,
        detail: 'Favorable positioning within peer group. Continue current practices.'
      }
    } else {
      return {
        type: 'finding' as const,
        title: 'US Bancorp within normal range',
        message: `Composite score ${usbData.composite_score} aligned with peer average (${data.peer_average}), deviation ${deviation > 0 ? '+' : ''}${deviation}.`,
        detail: 'Peer group includes all Category I/II/III institutions.'
      }
    }
  })() : null

  return (
    <div className="space-y-4">
      <PageObjective
        title="Peer Benchmarking"
        objective="Assess relative positioning vs peer group"
        description="Cross-institution risk comparison across all Category I/II/III banks with component-level breakdowns and deviation analysis."
      />

      {insight && <InsightBox {...insight} />}

      {/* Peer average banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">Peer Group Average</h3>
            <p className="text-2xl font-bold text-white mt-1">{data.peer_average}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Across {data.banks.length} institutions</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Media</p>
              <p className="text-base font-semibold text-purple-400">{data.component_averages.media_sentiment}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Complaints</p>
              <p className="text-base font-semibold text-orange-400">{data.component_averages.complaints}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Market</p>
              <p className="text-base font-semibold text-cyan-400">{data.component_averages.market}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gauges row */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-white">Composite Risk Ranking</h3>
          <p className="text-[10px] text-gray-500">Click any institution to highlight</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {data.banks.map((b) => (
            <div
              key={b.bank.id}
              className={`text-center cursor-pointer transition-all ${
                selectedBank === b.bank.ticker ? 'scale-110 ring-2 ring-blue-500 rounded-lg p-2 -m-2' : 'hover:scale-105'
              }`}
              onClick={() => setSelectedBank(selectedBank === b.bank.ticker ? null : b.bank.ticker)}
            >
              <RiskGauge score={b.composite_score} label={b.bank.ticker} size="sm" />
              <p className={`text-[10px] mt-1 ${b.deviation_from_peer > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {b.deviation_from_peer > 0 ? '+' : ''}{b.deviation_from_peer}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deviation chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-white">Deviation from Peer Average</h3>
            <p className="text-[10px] text-gray-500">Green = below peer avg (lower risk), Red = above peer avg (higher risk)</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 11 }} width={40} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#d1d5db' }} />
              <Bar dataKey="deviation" radius={[0, 4, 4, 0]}>
                {comparisonData.map((entry, i) => (
                  <Cell key={i} fill={entry.deviation > 0 ? '#ef4444' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-white">Component Risk Profile</h3>
            <p className="text-[10px] text-gray-500">Multi-dimensional view of top 3 institutions</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="component" tick={{ fill: '#d1d5db', fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
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
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-white">Detailed Risk Comparison</h3>
          <p className="text-[10px] text-gray-500">All 23 institutions with component scores — Click row to highlight</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left p-2">Institution</th>
                <th className="text-right p-2">Composite</th>
                <th className="text-right p-2">Media</th>
                <th className="text-right p-2">Complaints</th>
                <th className="text-right p-2">Market</th>
                <th className="text-right p-2">Regulatory</th>
                <th className="text-right p-2">Deviation</th>
              </tr>
            </thead>
            <tbody>
              {data.banks.map((b) => (
                <tr
                  key={b.bank.id}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    selectedBank === b.bank.ticker ? 'bg-blue-500/10 border-blue-500/50' : ''
                  }`}
                  onClick={() => setSelectedBank(selectedBank === b.bank.ticker ? null : b.bank.ticker)}
                >
                  <td className="p-2 text-gray-200 font-medium text-xs">{b.bank.name} <span className="text-gray-500">({b.bank.ticker})</span></td>
                  <td className={`p-2 text-right font-bold text-xs ${b.composite_score >= 50 ? 'text-red-400' : b.composite_score >= 30 ? 'text-yellow-400' : 'text-green-400'}`}>{b.composite_score}</td>
                  <td className="p-2 text-right text-gray-300 text-xs">{b.media_sentiment_score}</td>
                  <td className="p-2 text-right text-gray-300 text-xs">{b.complaint_score}</td>
                  <td className="p-2 text-right text-gray-300 text-xs">{b.market_score}</td>
                  <td className="p-2 text-right text-gray-300 text-xs">{b.regulatory_score}</td>
                  <td className={`p-2 text-right font-medium text-xs ${b.deviation_from_peer > 0 ? 'text-red-400' : 'text-green-400'}`}>
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
