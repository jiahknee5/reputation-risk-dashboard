import { useState, useMemo } from 'react'
import { getBanks, getCrisisSimulation } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

function impactBadge(impact: string) {
  const colors: Record<string, string> = {
    Severe: 'bg-red-500/20 text-red-400 border-red-500/30',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[impact] || colors.Moderate}`}>
      {impact}
    </span>
  )
}

export default function CrisisSimulation() {
  const banks = useMemo(() => getBanks(), [])
  const [selectedBank, setSelectedBank] = useState(banks[0].id)
  const data = useMemo(() => getCrisisSimulation(selectedBank), [selectedBank])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Crisis Simulation</h2>
          <p className="text-sm text-gray-500 mt-1">Scenario analysis and stress testing for reputation risk events</p>
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

      {/* Monte Carlo projection */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-1">90-Day Risk Score Projection</h3>
        <p className="text-xs text-gray-600 mb-4">Monte Carlo simulation showing baseline, stressed, and severe scenarios for {data.bank.name}</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.projections}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} label={{ value: 'Days Forward', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} labelStyle={{ color: '#9ca3af' }} labelFormatter={(v) => `Day ${v}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="baseline" stroke="#22c55e" strokeWidth={2} dot={false} name="Baseline" />
            <Line type="monotone" dataKey="stressed" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Stressed" />
            <Line type="monotone" dataKey="severe" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="3 3" name="Severe" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Scenario Analysis</h3>
        <div className="space-y-4">
          {data.scenarios.map((scenario, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white">{scenario.name}</h4>
                    {impactBadge(scenario.impact)}
                  </div>
                  <p className="text-xs text-gray-500 max-w-2xl">{scenario.description}</p>
                </div>
                <div className="text-right ml-6">
                  <p className={`text-2xl font-bold ${
                    scenario.projected_score >= 70 ? 'text-red-400' : scenario.projected_score >= 50 ? 'text-orange-400' : 'text-yellow-400'
                  }`}>{scenario.projected_score}</p>
                  <p className="text-xs text-gray-500">Projected Score</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
                <div>
                  <p className="text-xs text-gray-500">Probability</p>
                  <p className="text-sm font-medium text-gray-300">{(scenario.probability * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Recovery Timeline</p>
                  <p className="text-sm font-medium text-gray-300">{scenario.recovery_days} days</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Est. Financial Impact</p>
                  <p className="text-sm font-medium text-red-400">{scenario.financial_impact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
