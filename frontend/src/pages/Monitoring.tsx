import { useState, useMemo, useEffect } from 'react'
import { getBanks, getSignals, getSignalVolume } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import SectionObjective from '../components/SectionObjective'

interface PeerGroup {
  id: string
  name: string
  description: string
  bankIds: number[]
  createdAt: number
  updatedAt: number
}

// Default peer categories based on Federal Reserve bank classifications
const DEFAULT_PEER_GROUPS: PeerGroup[] = [
  {
    id: 'cat1-gsibs',
    name: 'Category I – G-SIBs',
    description: 'Global Systemically Important Banks',
    bankIds: [2, 4, 7, 3, 8, 9, 10, 11], // JPM, BAC, C, WFC, GS, MS, BK, STT
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'cat2-large',
    name: 'Category II – Large Regional',
    description: 'Large Banking Organizations',
    bankIds: [1, 5, 6, 12, 13, 14, 15, 16], // USB, PNC, TFC, COF, TD, FITB, BMO, CFG
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'cat3-regional',
    name: 'Category III – Regional',
    description: 'Regional Banking Organizations',
    bankIds: [17, 18, 19, 20, 21, 22, 23], // MTB, KEY, HBAN, RF, ALLY, AXP, DFS
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

function loadPeerGroups(): PeerGroup[] {
  try {
    const stored = localStorage.getItem('reprisk-peer-groups')
    if (stored) {
      return JSON.parse(stored)
    }
    // Initialize with defaults if empty
    localStorage.setItem('reprisk-peer-groups', JSON.stringify(DEFAULT_PEER_GROUPS))
    return DEFAULT_PEER_GROUPS
  } catch {
    return DEFAULT_PEER_GROUPS
  }
}

function sentimentBadge(label: string | null, score: number | null) {
  if (!label) return null
  const colors: Record<string, string> = {
    positive: 'bg-green-500/20 text-green-400',
    negative: 'bg-red-500/20 text-red-400',
    neutral: 'bg-gray-500/20 text-gray-600',
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
    <span className={`px-2 py-0.5 rounded-full text-xs ${colors[source] || 'bg-gray-500/20 text-gray-600'}`}>
      {source}
    </span>
  )
}

export default function Monitoring() {
  const allBanks = useMemo(() => getBanks(), [])
  // Default to US Bancorp (USB) on initial load to avoid fetching all 23 banks
  const defaultBank = allBanks.find(b => b.ticker === 'USB')?.id || allBanks[0]?.id
  const [selectedBank, setSelectedBank] = useState<number | undefined>(defaultBank)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [selectedSource, setSelectedSource] = useState<string | undefined>(undefined)
  const [peerGroups, setPeerGroups] = useState<PeerGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [allSignals, setAllSignals] = useState<Awaited<ReturnType<typeof getSignals>>>([])
  const [expandedSignals, setExpandedSignals] = useState<Set<number>>(new Set())
  const [volume, setVolume] = useState<Awaited<ReturnType<typeof getSignalVolume>>>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSignals(selectedBank, 100),
      getSignalVolume(selectedBank)
    ]).then(([signals, vol]) => {
      setAllSignals(signals)
      setVolume(vol)
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load signals:', err)
      setLoading(false)
    })
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

  const selectedGroup = peerGroups.find(g => g.id === selectedGroupId)
  const anomalyCount = signals.filter(s => s.is_anomaly).length

  const insight = {
    type: 'finding' as const,
    title: `${signals.length} signal${signals.length !== 1 ? 's' : ''} detected${selectedGroup ? ` in ${selectedGroup.name}` : ''}`,
    message: `Monitoring ${selectedGroup ? selectedGroup.name : `all ${allBanks.length} institutions`}. ${anomalyCount} anomal${anomalyCount !== 1 ? 'ies' : 'y'} flagged.`,
    detail: selectedBank ? `Filtered to ${banks.find(b => b.id === selectedBank)?.ticker || 'selected bank'}` : `Showing ${banks.length} institution${banks.length !== 1 ? 's' : ''}`
  }

  return (
    <div className="space-y-4">
      <PageObjective
        title="Real-Time Monitoring"
        objective="Detect emerging signals before they impact scores"
        description={`Real-time signal aggregation${selectedGroup ? ` for ${selectedGroup.name}` : ' across all institutions'} — news, CFPB complaints, regulatory filings, and market signals.`}
      >
        <div className="flex items-center gap-2">
          <select
            className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value)
              // When changing groups, select the first bank in the new group instead of undefined
              const newBanks = e.target.value
                ? allBanks.filter(b => peerGroups.find(g => g.id === e.target.value)?.bankIds.includes(b.id))
                : allBanks
              setSelectedBank(newBanks[0]?.id || defaultBank)
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
              <option key={b.id} value={b.id}>
                {b.name} ({b.ticker})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Showing signals for selected institution</p>
        </div>
      </PageObjective>

      <InsightBox {...insight} />

      <SectionObjective
        title="Volume Spike Detection"
        objective="Stacked daily volume by source identifies unusual activity patterns. Click any bar to drill into that day's signals — volume spikes often precede material events."
        type={anomalyCount > 5 ? 'watch' : 'info'}
      />

      {/* Volume chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
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
              className="text-xs text-gray-500 hover:text-gray-700"
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
              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
              labelStyle={{ color: '#374b5' }}
              cursor={{ fill: '#f3f4f6', opacity: 0.5 }}
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
            <span className="text-gray-600">News</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }} />
            <span className="text-gray-600">Social</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }} />
            <span className="text-gray-600">CFPB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-gray-600">Regulatory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#06b6d4' }} />
            <span className="text-gray-600">Market</span>
          </div>
        </div>
      </div>

      <SectionObjective
        title="Live Signal Stream"
        objective="Real-time CFPB complaints and news articles flow in as they're published. Anomalies flagged with red border indicate unusual patterns requiring investigation."
        type={anomalyCount > 0 ? 'action' : 'info'}
      />

      {/* Signal feed */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Signal Feed
              <span className="ml-2 text-xs text-gray-500">({signals.length} signals)</span>
            </h3>
            <p className="text-[10px] text-gray-500">Live CFPB complaints + news sentiment</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-2 py-1 text-xs"
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
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-sm">Loading signals from CFPB and GDELT...</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No signals found. Try adjusting filters.</p>
            </div>
          ) : null}
          {!loading && signals.map((s) => {
            const isExpanded = expandedSignals.has(s.id)
            const toggleExpanded = (e: React.MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()
              setExpandedSignals(prev => {
                const next = new Set(prev)
                if (next.has(s.id)) {
                  next.delete(s.id)
                } else {
                  next.add(s.id)
                }
                return next
              })
            }

            const content = (
              <div className={`p-3 hover:bg-gray-100/50 transition-colors ${
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
                      {s.content && (
                        <button
                          onClick={toggleExpanded}
                          className="text-xs text-blue-400 hover:text-blue-300 ml-auto"
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      )}
                    </div>
                    <p className={`text-sm ${s.url ? 'text-blue-400 hover:text-blue-300' : 'text-gray-200'} ${!isExpanded && 'truncate'}`}>
                      {s.title}
                    </p>
                    {s.content && (
                      <p className={`text-xs text-gray-500 mt-1 ${!isExpanded && 'truncate'}`}>{s.content}</p>
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
