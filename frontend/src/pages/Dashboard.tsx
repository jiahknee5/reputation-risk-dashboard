import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import RiskGauge from '../components/RiskGauge'
import InsightBox from '../components/InsightBox'
import DetailModal from '../components/DetailModal'
import {
  getDashboardOverview, getDataSourceCounts,
  type DashboardOverview, type DataSourceCounts,
} from '../services/api'
import { CATEGORY_I_IDS, CATEGORY_II_IDS } from '../data/demo'
import { Twitter, Newspaper, FileWarning, Send, Bot, User, Loader2 } from 'lucide-react'

// Reuse the chat logic from ClawdChat
import {
  getDashboardOverview as getDashOverview, getRiskDetail, getPeerBenchmarking,
  getRegulatoryIntel, getCrisisSimulation, getStakeholderImpact,
  getBoardReport, getComplaintSummary,
} from '../services/api'

function DriverBar({ name, score }: { name: string; score: number }) {
  const width = Math.max(0, Math.min(100, score))
  const color =
    score < 30 ? 'bg-green-500' : score < 50 ? 'bg-yellow-500' : score < 70 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-700 dark:text-gray-300 truncate text-[11px]">{name}</span>
      <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-7 text-right text-gray-700 dark:text-gray-300 text-[11px]">{Math.round(score)}</span>
    </div>
  )
}

function DataSourceCard({
  icon: Icon,
  label,
  count,
  sublabel,
  color,
  onClick,
}: {
  icon: React.ElementType
  label: string
  count: number
  sublabel: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-left hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{count.toLocaleString()}</div>
      <div className="text-[10px] text-gray-500 mt-1">{sublabel}</div>
    </button>
  )
}

function CategoryGroup({
  title,
  subtitle,
  banks,
  primaryTicker,
  onBankClick,
}: {
  title: string
  subtitle: string
  banks: DashboardOverview[]
  primaryTicker?: string
  onBankClick: (bank: DashboardOverview) => void
}) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-[10px] text-gray-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {banks.map(b => (
          <button
            key={b.bank.id}
            onClick={() => onBankClick(b)}
            className={`flex flex-col items-center p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${
              b.bank.ticker === primaryTicker
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : ''
            }`}
          >
            <RiskGauge score={b.composite_score} label={b.bank.ticker} size="sm" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [dataCounts, setDataCounts] = useState<DataSourceCounts | null>(null)
  const [selectedBankForModal, setSelectedBankForModal] = useState<DashboardOverview | null>(null)

  // Inline chat state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDashboardOverview().then(data => {
      setOverview(data)
      setLoading(false)
    })
    getDataSourceCounts('USB').then(setDataCounts)
  }, [])

  // Load chat context
  useEffect(() => {
    async function loadChatContext() {
      try {
        const [overviewData, peerData, regulatory, complaints, stakeholders, boardReport] = await Promise.all([
          getDashOverview(),
          Promise.resolve(getPeerBenchmarking()),
          Promise.resolve(getRegulatoryIntel()),
          getComplaintSummary(),
          getStakeholderImpact(),
          Promise.resolve(getBoardReport()),
        ])

        let ctx = `You are a Risk Analyst. Be concise (max 100 words). Use bullet points. Cite sources with [CFPB], [Dashboard], etc.\n\n## DATA\n`
        ctx += `Ticker|Composite|Media|Complaints|Market|Regulatory\n`
        for (const b of overviewData) {
          ctx += `${b.bank.ticker}|${Math.round(b.composite_score)}|${Math.round(b.media_sentiment_score)}|${Math.round(b.complaint_score)}|${Math.round(b.market_score)}|${Math.round(b.regulatory_score)}\n`
        }
        ctx += `\nPeer avg: ${peerData.peer_average}\n`
        ctx += `Enforcement actions: ${regulatory.enforcementActions.length}\n`
        ctx += `Board summary: ${boardReport.executive_summary.slice(0, 200)}\n`

        setSystemPrompt(ctx)
      } catch {
        setSystemPrompt('You are a Risk Analyst. Be concise. Use bullet points.')
      }
    }
    loadChatContext()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const sendChat = useCallback(async (content: string) => {
    if (!content.trim() || !systemPrompt) return
    const userMsg = { role: 'user' as const, content: content.trim() }
    const newMsgs = [...chatMessages, userMsg]
    setChatMessages(newMsgs)
    setChatInput('')
    setChatLoading(true)

    try {
      const resp = await fetch('/api/reprisk/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!resp.ok) throw new Error(`API error ${resp.status}`)
      const data = await resp.json()
      const assistantContent = data.content?.[0]?.text || 'No response'
      setChatMessages([...newMsgs, { role: 'assistant', content: assistantContent }])
    } catch {
      setChatMessages([...newMsgs, { role: 'assistant', content: 'Unable to reach the analyst. Try the full chat page.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatMessages, systemPrompt])

  // Derived data
  const primaryBank = overview.find(b => b.bank.ticker === 'USB') || overview[0]
  const catIBanks = overview.filter(b => CATEGORY_I_IDS.includes(b.bank.id))
  const catIIBanks = overview.filter(b => CATEGORY_II_IDS.includes(b.bank.id))
  const peerAvg = overview.length > 0
    ? Math.round(overview.reduce((sum, b) => sum + b.composite_score, 0) / overview.length)
    : 0

  // Generate insight
  const usbInsight = primaryBank ? (() => {
    const score = primaryBank.composite_score
    const topDriver = primaryBank.top_drivers[0]
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
        title: `${primaryBank.bank.name} shows elevated risk`,
        message: `Composite score ${Math.round(score)} above peer average (${peerAvg}). Key driver: ${topDriver.name}.`,
      }
    } else if (score <= 30) {
      return {
        type: 'positive' as const,
        title: `${primaryBank.bank.name} positioned favorably`,
        message: `Composite score ${Math.round(score)} below peer average (${peerAvg}). Strong reputation positioning.`,
      }
    }
    return {
      type: 'finding' as const,
      title: `${primaryBank.bank.name} within normal range`,
      message: `Composite score ${Math.round(score)} aligned with peer average (${peerAvg}). Top driver: ${topDriver.name} (${Math.round(topDriver.score)}).`,
    }
  })() : null

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Summary</h2>
          <p className="text-sm text-gray-500 mt-1">Loading real-time data...</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Summary</h2>
        <p className="text-sm text-gray-500 mt-1">US Bancorp (USB) — Reputation Risk Intelligence</p>
      </div>

      {/* Section A: What We Measure */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">What We Measure</h3>
        <div className="grid grid-cols-3 gap-3">
          <DataSourceCard
            icon={Twitter}
            label="X / Twitter"
            count={dataCounts?.x.count ?? 0}
            sublabel="Social signals tracked"
            color="bg-gray-800"
            onClick={() => navigate('/monitoring?source=x')}
          />
          <DataSourceCard
            icon={Newspaper}
            label="News Articles"
            count={dataCounts?.news.count ?? 0}
            sublabel="RSS + GDELT sources"
            color="bg-blue-600"
            onClick={() => navigate('/monitoring?source=news')}
          />
          <DataSourceCard
            icon={FileWarning}
            label="CFPB Complaints"
            count={dataCounts?.cfpb.count ?? 0}
            sublabel="Consumer complaints (90 days)"
            color="bg-orange-500"
            onClick={() => navigate('/monitoring?source=cfpb')}
          />
        </div>
      </div>

      {/* Section B: What's at Risk */}
      {primaryBank && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">What's at Risk</h3>
          {usbInsight && <InsightBox {...usbInsight} />}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
            {/* Composite Score */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center gap-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">{primaryBank.bank.name}</h4>
              <RiskGauge score={primaryBank.composite_score} label="Composite" />
              <p className="text-[10px] text-gray-500">vs peer avg: {peerAvg}</p>
            </div>

            {/* Risk Drivers */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 lg:col-span-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Risk Drivers</h4>
              <div className="space-y-2">
                <DriverBar name="Media Sentiment" score={primaryBank.media_sentiment_score} />
                <DriverBar name="Consumer Complaints" score={primaryBank.complaint_score} />
                <DriverBar name="Market Signal" score={primaryBank.market_score} />
                <DriverBar name="Regulatory" score={primaryBank.regulatory_score} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section C: Peer Groups */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">Peer Comparison</h3>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <CategoryGroup
              title="Category I — G-SIBs"
              subtitle="Global Systemically Important Banks"
              banks={catIBanks}
              onBankClick={setSelectedBankForModal}
            />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <CategoryGroup
              title="Category II — Large Regional"
              subtitle="$250B+ assets"
              banks={catIIBanks}
              primaryTicker="USB"
              onBankClick={setSelectedBankForModal}
            />
          </div>
        </div>
      </div>

      {/* Section D: Quick Ask */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Quick Ask</h3>
          <button
            onClick={() => navigate('/chat')}
            className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            Open full chat &rarr;
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {/* Recent messages (show last 2) */}
          {chatMessages.length > 0 && (
            <div className="max-h-48 overflow-y-auto p-3 space-y-2 border-b border-gray-200 dark:border-gray-800">
              {chatMessages.slice(-4).map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-blue-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <User size={12} className="text-gray-500" />
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                  </div>
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(chatInput) }}
            className="flex gap-2 p-3"
          >
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask about USB risk, peer comparison, CFPB trends..."
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-600"
              disabled={chatLoading || !systemPrompt}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim() || !systemPrompt}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Bank Detail Modal */}
      {selectedBankForModal && (
        <DetailModal
          isOpen={!!selectedBankForModal}
          onClose={() => setSelectedBankForModal(null)}
          title={selectedBankForModal.bank.name}
          subtitle={`${selectedBankForModal.bank.ticker} — Detailed Risk Breakdown`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <RiskGauge score={selectedBankForModal.composite_score} label="Composite Score" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Risk Component Scores</h4>
              <div className="space-y-3">
                <DriverBar name="Media Sentiment" score={selectedBankForModal.media_sentiment_score} />
                <DriverBar name="Consumer Complaints" score={selectedBankForModal.complaint_score} />
                <DriverBar name="Market Signal" score={selectedBankForModal.market_score} />
                <DriverBar name="Regulatory" score={selectedBankForModal.regulatory_score} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Top Risk Drivers</h4>
              <div className="space-y-2">
                {selectedBankForModal.top_drivers.map((driver, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{driver.name}</span>
                    <span className={`text-sm font-semibold ${
                      driver.score >= 70 ? 'text-red-400' : driver.score >= 50 ? 'text-orange-400' : 'text-yellow-400'
                    }`}>{Math.round(driver.score)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DetailModal>
      )}
    </div>
  )
}
