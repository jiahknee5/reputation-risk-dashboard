import { useMemo } from 'react'
import RiskGauge from '../components/RiskGauge'
import DemoBanner from '../components/DemoBanner'
import { getDashboardOverview, getRiskHistory } from '../data/demo'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function DriverBar({ name, score }: { name: string; score: number }) {
  const width = Math.max(0, Math.min(100, score))
  const color =
    score < 30 ? 'bg-green-500' : score < 50 ? 'bg-yellow-500' : score < 70 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-36 text-gray-400 truncate">{name}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 text-right text-gray-400">{Math.round(score)}</span>
    </div>
  )
}

export default function Dashboard() {
  const overview = useMemo(() => getDashboardOverview(), [])
  const topBank = overview[0]
  const history = useMemo(() => getRiskHistory(topBank.bank.id), [topBank.bank.id])

  // Find USB (primary bank)
  const primaryBank = overview.find((b) => b.bank.ticker === 'USB') || overview[0]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Executive Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Composite Reputation Risk Overview</p>
      </div>

      <DemoBanner />

      {/* Primary bank score + peer scores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary score card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center gap-4">
          <h3 className="text-sm font-medium text-gray-400">
            {primaryBank.bank.name} ({primaryBank.bank.ticker})
          </h3>
          <RiskGauge score={primaryBank.composite_score} label="Composite Risk Score" />
          <div className="w-full space-y-2 mt-2">
            {primaryBank.top_drivers.map((d) => (
              <DriverBar key={d.name} name={d.name} score={d.score} />
            ))}
          </div>
        </div>

        {/* Peer ranking */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Peer Risk Ranking</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {overview.map((b) => (
              <RiskGauge key={b.bank.id} score={b.composite_score} label={b.bank.ticker} size="sm" />
            ))}
          </div>
        </div>

        {/* Trend chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            60-Day Trend: {topBank.bank.ticker}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line
                type="monotone"
                dataKey="composite_score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bank detail cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">All Banks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {overview.map((b) => (
            <div key={b.bank.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium text-white">{b.bank.name}</span>
                  <span className="text-gray-500 text-sm ml-2">({b.bank.ticker})</span>
                </div>
                <RiskGauge score={b.composite_score} label="" size="sm" />
              </div>
              <div className="space-y-1.5">
                <DriverBar name="Media Sentiment" score={b.media_sentiment_score} />
                <DriverBar name="Customer Complaints" score={b.complaint_score} />
                <DriverBar name="Market Signal" score={b.market_score} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
