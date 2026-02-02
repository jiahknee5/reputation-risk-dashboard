import { useState, useMemo } from 'react'
import RiskGauge from '../components/RiskGauge'
import { getBanks, getRiskDetail } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

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
  const banks = useMemo(() => getBanks(), [])
  const [selectedBank, setSelectedBank] = useState(banks[0].id)
  const detail = useMemo(() => getRiskDetail(selectedBank), [selectedBank])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Risk Score Detail</h2>
          <p className="text-sm text-gray-500 mt-1">Component-level risk decomposition and trend analysis</p>
        </div>
        <select
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm"
          value={selectedBank}
          onChange={(e) => setSelectedBank(Number(e.target.value))}
        >
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.ticker})</option>
          ))}
        </select>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center">
          <RiskGauge score={detail.composite_score} label="Composite Score" />
        </div>

        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Risk Component Breakdown</h3>
          <div className="space-y-4">
            {detail.components.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-200">{c.name}</span>
                    <span className="text-xs text-gray-500">Weight: {(c.weight * 100).toFixed(0)}%</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    c.score < 30 ? 'text-green-400' : c.score < 50 ? 'text-yellow-400' : c.score < 70 ? 'text-orange-400' : 'text-red-400'
                  }`}>{Math.round(c.score)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-800 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        c.score < 30 ? 'bg-green-500' : c.score < 50 ? 'bg-yellow-500' : c.score < 70 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, c.score)}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Component trend chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">60-Day Component Trend</h3>
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Active Risk Alerts</h3>
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
              <p className="text-sm text-gray-300 mt-2">{alert.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
