import { useState, useMemo, useEffect } from 'react'
import { getBanks, getSignals, getSignalVolume } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

function sentimentBadge(label: string | null, score: number | null) {
  if (!label) return null
  const colors: Record<string, string> = {
    positive: 'bg-green-500/20 text-green-400',
    negative: 'bg-red-500/20 text-red-400',
    neutral: 'bg-gray-500/20 text-gray-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${colors[label] || colors.neutral}`}>
      {label} {score !== null ? `(${score.toFixed(2)})` : ''}
    </span>
  )
}

function sourceBadge(source: string) {
  const colors: Record<string, string> = {
    news: 'bg-blue-500/20 text-blue-400',
    social: 'bg-purple-500/20 text-purple-400',
    cfpb: 'bg-orange-500/20 text-orange-400',
    regulatory: 'bg-red-500/20 text-red-400',
    market: 'bg-cyan-500/20 text-cyan-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${colors[source] || 'bg-gray-500/20 text-gray-400'}`}>
      {source}
    </span>
  )
}

export default function Monitoring() {
  const [selectedBank, setSelectedBank] = useState<number | undefined>(undefined)
  const banks = useMemo(() => getBanks(), [])
  const [signals, setSignals] = useState<Awaited<ReturnType<typeof getSignals>>>([])
  const volume = useMemo(() => getSignalVolume(selectedBank), [selectedBank])

  useEffect(() => {
    getSignals(selectedBank, 100).then(setSignals)
  }, [selectedBank])

  // Aggregate volume by date for chart
  const volumeByDate = useMemo(() => {
    return Object.values(
      volume.reduce<Record<string, { date: string; count: number; avg_sentiment: number }>>((acc, v) => {
        if (!acc[v.date]) acc[v.date] = { date: v.date, count: 0, avg_sentiment: 0 }
        acc[v.date].count += v.count
        acc[v.date].avg_sentiment = v.avg_sentiment
        return acc
      }, {}),
    ).sort((a, b) => a.date.localeCompare(b.date))
  }, [volume])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Real-Time Monitoring</h2>
          <p className="text-sm text-gray-500 mt-1">Live signal feed and volume tracking</p>
        </div>
        <select
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm"
          value={selectedBank ?? ''}
          onChange={(e) => setSelectedBank(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.ticker})
            </option>
          ))}
        </select>
      </div>

      {/* Volume chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Signal Volume (30 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={volumeByDate}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {volumeByDate.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.avg_sentiment > 0.1 ? '#22c55e' : entry.avg_sentiment < -0.1 ? '#ef4444' : '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Signal feed */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-400">
            Signal Feed
            <span className="ml-2 text-xs text-gray-600">({signals.length} signals)</span>
          </h3>
        </div>
        <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
          {signals.map((s) => (
            <div
              key={s.id}
              className={`p-4 hover:bg-gray-800/50 transition-colors ${
                s.is_anomaly ? 'border-l-2 border-red-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {sourceBadge(s.source)}
                    {s.is_anomaly && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                        Anomaly
                      </span>
                    )}
                    {sentimentBadge(s.sentiment_label, s.sentiment_score)}
                  </div>
                  <p className="text-sm text-gray-200 truncate">{s.title}</p>
                  {s.content && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{s.content}</p>
                  )}
                </div>
                <div className="text-xs text-gray-600 whitespace-nowrap">
                  {s.published_at ? new Date(s.published_at).toLocaleDateString() : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
