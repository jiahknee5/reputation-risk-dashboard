import { useState, useEffect, useMemo } from 'react'
import RiskGauge from '../components/RiskGauge'
import AlertBanner from '../components/AlertBanner'
import Watchlist from '../components/Watchlist'
import { WatchlistToggle } from '../components/Watchlist'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import { getDashboardOverview, getRiskHistory, getAlertThresholds, type DashboardOverview } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

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

function DriverBar({ name, score }: { name: string; score: number }) {
  const width = Math.max(0, Math.min(100, score))
  const color =
    score < 30 ? 'bg-green-500' : score < 50 ? 'bg-yellow-500' : score < 70 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-gray-300 truncate text-[11px]">{name}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-7 text-right text-gray-300 text-[11px]">{Math.round(score)}</span>
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
  const [allOverview, setAllOverview] = useState<DashboardOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<{ date: string; composite_score: number }[]>([])
  const [peerGroups, setPeerGroups] = useState<PeerGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  useEffect(() => {
    getDashboardOverview().then(data => {
      setAllOverview(data)
      setLoading(false)
      if (data.length > 0) {
        getRiskHistory(data[0].bank.id).then(setHistory)
      }
    })
    setPeerGroups(loadPeerGroups())
  }, [])

  // Filter by peer group
  const overview = useMemo(() => {
    if (!selectedGroupId) return allOverview

    const group = peerGroups.find(g => g.id === selectedGroupId)
    if (!group) return allOverview

    return allOverview.filter(b => group.bankIds.includes(b.bank.id))
  }, [allOverview, selectedGroupId, peerGroups])

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

  // Generate insight for US Bank
  const peerAvg = overview.length > 0 ? Math.round(overview.reduce((sum, b) => sum + b.composite_score, 0) / overview.length) : 0
  const usbInsight = primaryBank ? (() => {
    const score = primaryBank.composite_score
    const drivers = primaryBank.top_drivers
    const topDriver = drivers[0]

    if (score >= 70) {
      return {
        type: 'action' as const,
        title: `${primaryBank.bank.name} requires immediate attention`,
        message: `Composite score ${Math.round(score)} significantly elevated. Primary driver: ${topDriver.name} (${Math.round(topDriver.score)}).`,
        detail: 'Recommend activating crisis response protocol and board escalation.'
      }
    } else if (score >= 50) {
      return {
        type: 'warning' as const,
        title: `${primaryBank.bank.name} shows elevated risk vs peers`,
        message: `Composite score ${Math.round(score)} above peer average (${peerAvg}). Key driver: ${topDriver.name}.`,
        detail: 'Monitor closely for further deterioration.'
      }
    } else if (score <= 30) {
      return {
        type: 'positive' as const,
        title: `${primaryBank.bank.name} positioned favorably`,
        message: `Composite score ${Math.round(score)} well below peer average (${peerAvg}), indicating strong reputation positioning.`,
        detail: 'Continue current risk management practices.'
      }
    } else {
      return {
        type: 'finding' as const,
        title: `${primaryBank.bank.name} within normal range`,
        message: `Composite score ${Math.round(score)} aligned with peer average (${peerAvg}). Top driver: ${topDriver.name} (${Math.round(topDriver.score)}).`
      }
    }
  })() : null

  const selectedGroup = peerGroups.find(g => g.id === selectedGroupId)

  return (
    <div className="space-y-4">
      <PageObjective
        title="Executive Dashboard"
        objective="Identify which institutions require immediate attention"
        description={`Real-time composite reputation risk ${selectedGroup ? `for ${selectedGroup.name}` : 'across all Category I/II/III banks'} with live CFPB complaint data, news sentiment, and regulatory signals.`}
      >
        <div className="flex items-center gap-2">
          <select
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">All Institutions ({allOverview.length})</option>
            {peerGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({allOverview.filter(b => group.bankIds.includes(b.bank.id)).length} banks)
              </option>
            ))}
          </select>
          {topBank && <DataSourceBadge source={topBank.data_source} />}
        </div>
      </PageObjective>

      {usbInsight && <InsightBox {...usbInsight} />}
      <AlertBanner alerts={alerts} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Primary score card - US Bank */}
        {primaryBank && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">
                  {primaryBank.bank.name}
                </h3>
                <p className="text-[10px] text-gray-500">Primary Score</p>
              </div>
              <WatchlistToggle bankId={primaryBank.bank.id} />
            </div>
            <RiskGauge score={primaryBank.composite_score} label="Composite" />
            {primaryBank.esg_flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {primaryBank.esg_flags.slice(0, 3).map(f => (
                  <ESGBadge key={f.theme} theme={f.theme} count={f.count} />
                ))}
              </div>
            )}
            <div className="w-full space-y-1.5 mt-1">
              {primaryBank.top_drivers.map(d => (
                <DriverBar key={d.name} name={d.name} score={d.score} />
              ))}
            </div>
          </div>
        )}

        {/* Peer ranking */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-white">Peer Ranking</h3>
            <p className="text-[10px] text-gray-500">23 Cat I/II/III Banks</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {overview.slice(0, 8).map(b => (
              <RiskGauge key={b.bank.id} score={b.composite_score} label={b.bank.ticker} size="sm" />
            ))}
          </div>
        </div>

        {/* Trend chart */}
        {primaryBank && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-white">
                60-Day Trend
              </h3>
              <p className="text-[10px] text-gray-500">{primaryBank.bank.ticker} Composite Score</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} labelStyle={{ color: '#d1d5db' }} />
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
        <div className="mb-2">
          <h3 className="text-sm font-medium text-white">All Institutions</h3>
          <p className="text-[10px] text-gray-500">Category I/II/III Banks — Sorted by Risk</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {overview.map(b => (
            <div key={b.bank.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <WatchlistToggle bankId={b.bank.id} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-white text-sm block truncate">{b.bank.name}</span>
                    <span className="text-gray-500 text-[10px]">{b.bank.ticker}</span>
                  </div>
                </div>
                <RiskGauge score={b.composite_score} label="" size="sm" />
              </div>
              {b.esg_flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {b.esg_flags.slice(0, 2).map(f => (
                    <ESGBadge key={f.theme} theme={f.theme} count={f.count} />
                  ))}
                </div>
              )}
              <div className="space-y-1">
                <DriverBar name="Media" score={b.media_sentiment_score} />
                <DriverBar name="Complaints" score={b.complaint_score} />
                <DriverBar name="Market" score={b.market_score} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
