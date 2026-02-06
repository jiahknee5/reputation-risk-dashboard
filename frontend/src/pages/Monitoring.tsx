import { useState, useMemo, useEffect } from 'react'
import { getBanks, getSignals, getSignalVolume } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import PageObjective from '../components/PageObjective'

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
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [selectedSource, setSelectedSource] = useState<string | undefined>(undefined)
  const banks = useMemo(() => getBanks(), [])
  const [allSignals, setAllSignals] = useState<Awaited<ReturnType<typeof getSignals>>>([])
  const volume = useMemo(() => getSignalVolume(selectedBank), [selectedBank])

  useEffect(() => {
    getSignals(selectedBank, 100).then(setAllSignals)
  }, [selectedBank])

  // Filter signals by date and source
  const signals = useMemo(() => {
    return allSignals.filter(s => {
      if (selectedDate && !s.published_at?.startsWith(selectedDate)) return false
      if (selectedSource && s.source !== selectedSource) return false
      return true
    })
  }, [allSignals, selectedDate, selectedSource])

  // Aggregate volume by date AND source for stacked chart
  const volumeByDate = useMemo(() => {
    const byDate: Record<string, { date: string; news: number; social: number; cfpb: number; regulatory: number; market: number }> = {}

    volume.forEach(v => {
      if (!byDate[v.date]) {
        byDate[v.date] = { date: v.date, news: 0, social: 0, cfpb: 0, regulatory: 0, market: 0 }
      }
      if (v.source === 'news') byDate[v.date].news += v.count
      else if (v.source === 'social') byDate[v.date].social += v.count
      else if (v.source === 'cfpb') byDate[v.date].cfpb += v.count
      else if (v.source === 'regulatory') byDate[v.date].regulatory += v.count
      else if (v.source === 'market') byDate[v.date].market += v.count
    })

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [volume])

  return (
    <div className="space-y-6">
      <PageObjective
        title="Real-Time Monitoring"
        objective="Detect emerging signals before they impact scores"
        description="Real-time monitoring aggregates news, social media, regulatory filings, and market signals to identify reputation risks as they develop."
      >
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
      </PageObjective>

      {/* Volume chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-white">
              Signal Volume (30 Days)
              {selectedDate && (
                <span className="ml-2 text-xs text-blue-400">
                  • {selectedDate}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-gray-500">Identify volume spikes by source</p>
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(undefined)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear date filter
            </button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={volumeByDate}
            onClick={(data) => {
              if (data && data.activeLabel) {
                setSelectedDate(data.activeLabel as string)
              }
            }}
          >
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
              cursor={{ fill: '#374151', opacity: 0.3 }}
            />
            <Bar dataKey="news" stackId="a" fill="#3b82f6" />
            <Bar dataKey="social" stackId="a" fill="#a855f7" />
            <Bar dataKey="cfpb" stackId="a" fill="#f97316" />
            <Bar dataKey="regulatory" stackId="a" fill="#ef4444" />
            <Bar dataKey="market" stackId="a" fill="#06b6d4" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-gray-400">News</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }} />
            <span className="text-gray-400">Social</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }} />
            <span className="text-gray-400">CFPB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-gray-400">Regulatory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#06b6d4' }} />
            <span className="text-gray-400">Market</span>
          </div>
        </div>
      </div>

      {/* Signal feed */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">
              Signal Feed
              <span className="ml-2 text-xs text-gray-500">({signals.length} signals)</span>
            </h3>
            <p className="text-[10px] text-gray-500">Live CFPB complaints + news sentiment</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1 text-xs"
              value={selectedSource ?? ''}
              onChange={(e) => setSelectedSource(e.target.value || undefined)}
            >
              <option value="">All Sources</option>
              <option value="news">News</option>
              <option value="social">Social</option>
              <option value="cfpb">CFPB</option>
              <option value="regulatory">Regulatory</option>
              <option value="market">Market</option>
            </select>
            {(selectedDate || selectedSource) && (
              <button
                onClick={() => {
                  setSelectedDate(undefined)
                  setSelectedSource(undefined)
                }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
          {signals.map((s) => {
            const content = (
              <div className={`p-3 hover:bg-gray-800/50 transition-colors ${
                s.is_anomaly ? 'border-l-2 border-red-500' : ''
              } ${s.url ? 'cursor-pointer' : ''}`}>
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
                    <p className={`text-sm ${s.url ? 'text-blue-400 hover:text-blue-300' : 'text-gray-200'} truncate`}>
                      {s.title}
                    </p>
                    {s.content && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{s.content}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {s.published_at ? new Date(s.published_at).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            )

            return s.url ? (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            ) : (
              <div key={s.id}>{content}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
