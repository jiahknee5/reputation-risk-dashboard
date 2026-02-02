import { useState, useEffect } from 'react'
import RiskGauge from '../components/RiskGauge'
import AlertBanner from '../components/AlertBanner'
import Watchlist from '../components/Watchlist'
import { WatchlistToggle } from '../components/Watchlist'
import { getDashboardOverview, getRiskHistory, getAlertThresholds, type DashboardOverview } from '../services/api'
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

function ESGBadge({ theme, count }: { theme: string; count: number }) {
  const colors: Record<string, string> = {
    S: 'bg-blue-500/20 text-blue-400',
    G: 'bg-purple-500/20 text-purple-400',
    E: 'bg-green-500/20 text-green-400',
  }
  const labels: Record<string, string> = { S: 'Social', G: 'Governance', E: 'Environmental' }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[theme] || 'bg-gray-500/20 text-gray-400'}`}>
      {labels[theme] || theme} ({count})
    </span>
  )
}

function DataSourceBadge({ source }: { source: 'live' | 'demo' }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      source === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
    }`}>
      {source === 'live' ? 'Live Data' : 'Demo Data'}
    </span>
  )
}

export default function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<{ date: string; composite_score: number }[]>([])

  useEffect(() => {
    getDashboardOverview().then(data => {
      setOverview(data)
      setLoading(false)
      if (data.length > 0) {
        getRiskHistory(data[0].bank.id).then(setHistory)
      }
    })
  }, [])

  const topBank = overview[0]
  const primaryBank = overview.find(b => b.bank.ticker === 'USB') || overview[0]

  // Generate alerts from thresholds and scores
  const thresholds = getAlertThresholds()
  const alerts = overview
    .filter(b => {
      const t = thresholds.find(th => th.bankId === b.bank.id)
      return b.composite_score >= 70 || (t && b.composite_score >= t.maxScore)
    })
    .map(b => ({
      id: `alert-${b.bank.id}`,
      severity: (b.composite_score >= 70 ? 'critical' : 'high') as 'critical' | 'high',
      message: `${b.bank.name} (${b.bank.ticker}) composite score at ${Math.round(b.composite_score)} — above threshold`,
      bank: b.bank.ticker,
    }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Executive Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Loading real-time data...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Executive Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Composite Reputation Risk Overview</p>
        </div>
        {topBank && <DataSourceBadge source={topBank.data_source} />}
      </div>

      <AlertBanner alerts={alerts} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Primary score card */}
        {primaryBank && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-sm font-medium text-gray-400 flex-1">
                {primaryBank.bank.name} ({primaryBank.bank.ticker})
              </h3>
              <WatchlistToggle bankId={primaryBank.bank.id} />
            </div>
            <RiskGauge score={primaryBank.composite_score} label="Composite Risk Score" />
            {primaryBank.esg_flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {primaryBank.esg_flags.slice(0, 3).map(f => (
                  <ESGBadge key={f.theme} theme={f.theme} count={f.count} />
                ))}
              </div>
            )}
            <div className="w-full space-y-2 mt-2">
              {primaryBank.top_drivers.map(d => (
                <DriverBar key={d.name} name={d.name} score={d.score} />
              ))}
            </div>
          </div>
        )}

        {/* Peer ranking */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Peer Risk Ranking</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {overview.map(b => (
              <RiskGauge key={b.bank.id} score={b.composite_score} label={b.bank.ticker} size="sm" />
            ))}
          </div>
        </div>

        {/* Trend chart */}
        {topBank && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              60-Day Trend: {topBank.bank.ticker}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} labelStyle={{ color: '#9ca3af' }} />
                <Line type="monotone" dataKey="composite_score" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Watchlist */}
        <Watchlist />
      </div>

      {/* Bank detail cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">All Banks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {overview.map(b => (
            <div key={b.bank.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <WatchlistToggle bankId={b.bank.id} />
                  <span className="font-medium text-white">{b.bank.name}</span>
                  <span className="text-gray-500 text-sm">({b.bank.ticker})</span>
                </div>
                <RiskGauge score={b.composite_score} label="" size="sm" />
              </div>
              {b.esg_flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {b.esg_flags.slice(0, 3).map(f => (
                    <ESGBadge key={f.theme} theme={f.theme} count={f.count} />
                  ))}
                </div>
              )}
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
