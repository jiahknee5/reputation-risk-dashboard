import { useState, useMemo, useEffect } from 'react'
import RiskGauge from '../components/RiskGauge'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import SectionObjective from '../components/SectionObjective'
import ComponentDrilldown from '../components/ComponentDrilldown'
import { getBanks, getRiskDetail } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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

function severityBadge(severity: string) {
  const colors: Record<string, string> = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[severity] || colors.low}`}>
      {severity.toUpperCase()}
    </span>
  )
}

export default function RiskDetail() {
  const allBanks = useMemo(() => getBanks(), [])
  const [peerGroups, setPeerGroups] = useState<PeerGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  useEffect(() => {
    setPeerGroups(loadPeerGroups())
  }, [])

  // Filter banks by peer group
  const banks = useMemo(() => {
    if (!selectedGroupId) return allBanks

    const group = peerGroups.find(g => g.id === selectedGroupId)
    if (!group) return allBanks

    return allBanks.filter(b => group.bankIds.includes(b.id))
  }, [allBanks, selectedGroupId, peerGroups])

  const [selectedBank, setSelectedBank] = useState(banks[0]?.id || allBanks[0]?.id)
  const detail = useMemo(() => getRiskDetail(selectedBank), [selectedBank])
  const [drilldownComponent, setDrilldownComponent] = useState<string | null>(null)

  // Generate dynamic insight
  const insight = useMemo(() => {
    const score = detail.composite_score
    const highAlerts = detail.alerts.filter(a => a.severity === 'high').length
    const mediumAlerts = detail.alerts.filter(a => a.severity === 'medium').length
    const topComponent = detail.components.reduce((max, c) => c.score > max.score ? c : max)

    // Check trend (comparing most recent vs 30 days ago)
    const recent = detail.history[detail.history.length - 1]?.composite_score || score
    const monthAgo = detail.history[Math.max(0, detail.history.length - 30)]?.composite_score || score
    const trendDelta = recent - monthAgo

    if (highAlerts > 0) {
      return {
        type: 'action' as const,
        title: `${detail.bank.ticker} has ${highAlerts} high-severity alert${highAlerts > 1 ? 's' : ''}`,
        message: `Composite score ${Math.round(score)} with ${highAlerts} critical alert${highAlerts > 1 ? 's' : ''} requiring immediate attention.`,
        detail: `Primary driver: ${topComponent.name} (${Math.round(topComponent.score)}). Trend: ${trendDelta > 0 ? 'worsening' : 'improving'} (${trendDelta > 0 ? '+' : ''}${Math.round(trendDelta)} vs 30d ago).`
      }
    } else if (score >= 70) {
      return {
        type: 'warning' as const,
        title: `${detail.bank.ticker} elevated risk requires monitoring`,
        message: `Composite score ${Math.round(score)} in elevated range. ${mediumAlerts} medium alerts pending.`,
        detail: `Top component: ${topComponent.name} (${Math.round(topComponent.score)}). Close monitoring recommended.`
      }
    } else if (trendDelta >= 10) {
      return {
        type: 'warning' as const,
        title: `${detail.bank.ticker} score trending upward`,
        message: `Score increased ${Math.round(trendDelta)} points over 30 days (now ${Math.round(score)}).`,
        detail: `Driver: ${topComponent.name}. Investigate underlying causes before escalation.`
      }
    } else if (score < 30) {
      return {
        type: 'positive' as const,
        title: `${detail.bank.ticker} low risk profile`,
        message: `Composite score ${Math.round(score)} well below threshold. No high-severity alerts.`,
        detail: 'Continue current risk management practices.'
      }
    } else {
      return {
        type: 'finding' as const,
        title: `${detail.bank.ticker} within normal range`,
        message: `Composite score ${Math.round(score)}. ${detail.alerts.length} active alert${detail.alerts.length !== 1 ? 's' : ''}.`,
        detail: `Primary driver: ${topComponent.name} (${Math.round(topComponent.score)}).`
      }
    }
  }, [detail])

  const selectedGroup = peerGroups.find(g => g.id === selectedGroupId)

  return (
    <div className="space-y-4">
      <PageObjective
        title="Risk Score Detail"
        objective="Understand what's driving risk for a specific institution"
        description={`Component-level decomposition, trend analysis, and active alerts${selectedGroup ? ` — ${selectedGroup.name} peer group` : ' for all institutions'}.`}
      >
        <div className="flex items-center gap-2">
          <select
            className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value)
              // Reset to first bank in new group
              const newBanks = e.target.value
                ? allBanks.filter(b => peerGroups.find(g => g.id === e.target.value)?.bankIds.includes(b.id))
                : allBanks
              if (newBanks.length > 0) setSelectedBank(newBanks[0].id)
            }}
          >
            <option value="">All Institutions ({allBanks.length})</option>
            {peerGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({allBanks.filter(b => group.bankIds.includes(b.id)).length} banks)
              </option>
            ))}
          </select>
          <select
            className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            value={selectedBank}
            onChange={(e) => setSelectedBank(Number(e.target.value))}
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.ticker})</option>
            ))}
          </select>
        </div>
      </PageObjective>

      {insight && <InsightBox {...insight} />}

      <SectionObjective
        title="Component Attribution"
        objective="Weighted component breakdown identifies the primary drivers of composite risk. Highest-weighted components (Media 25%, Regulatory 25%) have the greatest impact on overall score."
        type={detail.composite_score >= 70 ? 'action' : 'info'}
      />

      {/* Score overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center">
          <RiskGauge score={detail.composite_score} label="Composite Score" />
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Risk Component Breakdown</h3>
          <div className="space-y-4">
            {detail.components.map((c) => (
              <div key={c.name} className="group cursor-pointer" onClick={() => setDrilldownComponent(c.name)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-200 group-hover:text-blue-400 transition-colors">
                      {c.name}
                    </span>
                    <span className="text-xs text-gray-500">Weight: {(c.weight * 100).toFixed(0)}%</span>
                    <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      → View Details
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${
                    c.score < 30 ? 'text-green-400' : c.score < 50 ? 'text-yellow-400' : c.score < 70 ? 'text-orange-400' : 'text-red-400'
                  }`}>{Math.round(c.score)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 rounded-full h-3 group-hover:bg-gray-100 transition-colors">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        c.score < 30 ? 'bg-green-500 group-hover:bg-green-400' :
                        c.score < 50 ? 'bg-yellow-500 group-hover:bg-yellow-400' :
                        c.score < 70 ? 'bg-orange-500 group-hover:bg-orange-400' :
                        'bg-red-500 group-hover:bg-red-400'
                      }`}
                      style={{ width: `${Math.min(100, c.score)}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-600 transition-colors">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionObjective
        title="Historical Momentum"
        objective="60-day trend lines show whether risk is accelerating, plateauing, or declining. Diverging components signal conflicting narratives that warrant investigation."
        type="watch"
      />

      {/* Component trend chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-4">60-Day Component Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={detail.history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} labelStyle={{ color: '#9ca3af' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Line type="monotone" dataKey="composite_score" stroke="#3b82f6" strokeWidth={2} dot={false} name="Composite" />
            <Line type="monotone" dataKey="media_sentiment_score" stroke="#a855f7" strokeWidth={1} dot={false} name="Media" />
            <Line type="monotone" dataKey="complaint_score" stroke="#f97316" strokeWidth={1} dot={false} name="Complaints" />
            <Line type="monotone" dataKey="market_score" stroke="#06b6d4" strokeWidth={1} dot={false} name="Market" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Active alerts */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-4">Active Risk Alerts</h3>
        <div className="space-y-3">
          {detail.alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-lg border ${
              alert.severity === 'high' ? 'border-red-500/30 bg-red-500/5' :
              alert.severity === 'medium' ? 'border-orange-500/30 bg-orange-500/5' :
              'border-yellow-500/30 bg-yellow-500/5'
            }`}>
              <div className="flex items-center justify-between mb-1">
                {severityBadge(alert.severity)}
                <span className="text-xs text-gray-500">{alert.date}</span>
              </div>
              <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Component drill-down modal */}
      <ComponentDrilldown
        isOpen={drilldownComponent !== null}
        onClose={() => setDrilldownComponent(null)}
        bankId={selectedBank}
        componentName={drilldownComponent || ''}
      />
    </div>
  )
}
