import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Trash2, Sparkles, Loader2, Plus, History, ChevronDown, X } from 'lucide-react'
import {
  getDashboardOverview, getRiskDetail, getPeerBenchmarking,
  getRegulatoryIntel, getCrisisSimulation, getStakeholderImpact,
  getBoardReport, getComplaintSummary, type DashboardOverview,
} from '../services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

interface ChatSession {
  id: string
  name: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'reprisk-chat-sessions'
const CURRENT_SESSION_KEY = 'reprisk-current-session'

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function loadSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

function getCurrentSessionId(): string | null {
  return localStorage.getItem(CURRENT_SESSION_KEY)
}

function setCurrentSessionId(id: string): void {
  localStorage.setItem(CURRENT_SESSION_KEY, id)
}

const BASE_SYSTEM_PROMPT = `You are a Risk Analyst for a Reputation Risk Intelligence Platform.

## Scoring
Composite = Media (25%) + Regulatory (25%) + Complaints (20%) + Market (15%) + Peer (15%)
Scale: 0-100. <30=Low, 30-50=Moderate, 50-70=Elevated, >70=High

## Response Style
- **Be concise.** Use bullet points, not paragraphs. Get to the point fast.
- **Cite sources.** Every claim must have a bracketed source tag, e.g. [CFPB], [SEC 10-K], [FinBERT], [OCC], [FDIC]
- **Use numbers.** "WFC score: 67 [Dashboard]" not "Wells Fargo has elevated risk"
- **Format for scanning.** Headers, bullets, bold key terms. No walls of text.
- **Max 150 words** unless user asks for detail.

## Source Tags (use these)
- [CFPB] — Consumer complaint data
- [SEC] — SEC filings, 10-K risk factors
- [FinBERT] — NLP sentiment from news/filings
- [OCC/FDIC/Fed] — Enforcement actions, consent orders
- [Dashboard] — Platform composite scores
- [Monte Carlo] — Crisis simulation projections
- [Peer Benchmark] — Relative to peer group avg

If data isn't available, say "[No data]" — don't guess.`

function buildDataContext(
  overview: DashboardOverview[],
  peerData: ReturnType<typeof getPeerBenchmarking>,
  regulatory: ReturnType<typeof getRegulatoryIntel>,
  complaints: { product: string; count: number }[],
  crisisData: Record<number, ReturnType<typeof getCrisisSimulation>>,
  stakeholders: ReturnType<typeof getStakeholderImpact>,
  boardReport: ReturnType<typeof getBoardReport>,
  riskDetails: Record<number, ReturnType<typeof getRiskDetail>>,
): string {
  const today = new Date().toISOString().slice(0, 10)

  let ctx = `\n\n## DATA (${today})\n\n`

  // Compact scores table
  ctx += `### Scores [Dashboard]\n`
  ctx += `Ticker|Composite|Media|Complaints|Market|Regulatory|vs Peer\n`
  for (const b of overview) {
    const peerDev = peerData.banks.find(p => p.bank.ticker === b.bank.ticker)?.deviation_from_peer ?? 0
    ctx += `${b.bank.ticker}|${Math.round(b.composite_score)}|${Math.round(b.media_sentiment_score)}|${Math.round(b.complaint_score)}|${Math.round(b.market_score)}|${Math.round(b.regulatory_score)}|${peerDev > 0 ? '+' : ''}${peerDev}\n`
  }

  // ESG flags - compact
  const banksWithESG = overview.filter(b => b.esg_flags.length > 0)
  if (banksWithESG.length > 0) {
    ctx += `\n### ESG Flags [CFPB]\n`
    for (const b of banksWithESG) {
      ctx += `${b.bank.ticker}: ${b.esg_flags.map(f => `${f.theme}(${f.count})`).join(', ')}\n`
    }
  }

  // Top drivers - compact
  ctx += `\n### Risk Drivers [Dashboard]\n`
  for (const b of overview) {
    ctx += `${b.bank.ticker}: ${b.top_drivers.slice(0, 3).map(d => `${d.name}=${Math.round(d.score)}`).join(', ')}\n`
  }

  // Peer benchmarking - compact
  ctx += `\n### Peer Avg [Peer Benchmark]\n`
  ctx += `Group avg: ${peerData.peer_average} | Media: ${peerData.component_averages.media_sentiment} | Complaints: ${peerData.component_averages.complaints} | Market: ${peerData.component_averages.market}\n`

  // Risk details - compact with alerts
  ctx += `\n### Alerts [Dashboard]\n`
  for (const [, detail] of Object.entries(riskDetails)) {
    if (detail.alerts.length > 0) {
      for (const a of detail.alerts) {
        ctx += `${detail.bank.ticker} [${a.severity.toUpperCase()}]: ${a.message} (${a.date})\n`
      }
    }
  }

  // CFPB complaints - compact
  if (complaints.length > 0) {
    ctx += `\n### Complaints [CFPB] (90d)\n`
    ctx += complaints.slice(0, 8).map(c => `${c.product}: ${c.count}`).join(' | ') + '\n'
  }

  // Regulatory intel - compact
  ctx += `\n### Enforcement [OCC/FDIC/Fed]\n`
  const highSev = regulatory.enforcementActions.filter(a => a.severity >= 4)
  const totalPenalties = regulatory.enforcementActions.reduce((s, a) => s + (a.penalty_amount || 0), 0)
  ctx += `Total: ${regulatory.enforcementActions.length} | High-sev: ${highSev.length} | Penalties: $${(totalPenalties / 1_000_000).toFixed(0)}M\n`
  for (const a of regulatory.enforcementActions.slice(0, 4)) {
    ctx += `${a.action_date} ${a.bank.ticker}: ${a.agency} ${a.action_type}${a.penalty_amount ? ` $${(a.penalty_amount / 1_000_000).toFixed(1)}M` : ''} (sev ${a.severity}/5)\n`
  }

  // SEC filings
  ctx += `\n### SEC Filings [SEC]\n`
  ctx += `Analyzed: ${regulatory.secFilings.length} filings\n`

  // Crisis scenarios - compact
  if (overview.length > 0) {
    const topBankId = overview[0].bank.id
    const crisis = crisisData[topBankId]
    if (crisis) {
      ctx += `\n### Crisis Sim [Monte Carlo] — ${crisis.bank.ticker}\n`
      for (const s of crisis.scenarios) {
        ctx += `${s.name}: ${(s.probability * 100)}% prob, score→${s.projected_score}, ${s.recovery_days}d recovery, ${s.financial_impact}\n`
      }
    }
  }

  // Stakeholder impact - compact
  ctx += `\n### Stakeholders [Dashboard]\n`
  for (const bankData of stakeholders) {
    ctx += `${bankData.bank.ticker}: ${bankData.stakeholders.map(s => `${s.group}=${s.impact_level}`).join(', ')}\n`
  }

  // Board report - compact
  ctx += `\n### Board Summary [Dashboard]\n`
  ctx += `${boardReport.period}: ${boardReport.executive_summary.slice(0, 200)}...\n`
  ctx += `Findings: ${boardReport.key_findings.slice(0, 3).join('; ')}\n`
  ctx += `Actions: ${boardReport.recommendations.slice(0, 3).map(r => `[${r.priority}] ${r.action.slice(0, 50)}`).join('; ')}\n`

  return ctx
}

const SUGGESTED_PROMPTS = [
  'Highest risk bank and top 3 drivers?',
  'WFC vs JPM: key differences?',
  'Top CFPB complaint categories?',
  'Crisis scenarios for top-risk bank?',
  'Board report summary',
  'Banks with ESG flags?',
]

function renderMarkdown(text: string) {
  return text
    // Source tags - style as small colored badges
    .replace(/\[(CFPB|SEC|FinBERT|OCC|FDIC|Fed|Dashboard|Monte Carlo|Peer Benchmark|No data)\]/g, 
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 ml-1">$1</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-50 px-1 rounded text-xs">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold text-gray-900 mt-2 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold text-gray-900 mt-2 mb-1">$1</h2>')
    .replace(/^- (.*$)/gm, '<li class="ml-3 text-gray-700 text-sm">• $1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-3 text-gray-700 text-sm">$1</li>')
    .replace(/\n\n/g, '<br/>')
    .replace(/\n/g, '<br/>')
}

export default function ClawdChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  // Load sessions from localStorage on mount
  useEffect(() => {
    const loadedSessions = loadSessions()
    setSessions(loadedSessions)
    
    const savedCurrentId = getCurrentSessionId()
    if (savedCurrentId && loadedSessions.find(s => s.id === savedCurrentId)) {
      setCurrentSessionIdState(savedCurrentId)
      const session = loadedSessions.find(s => s.id === savedCurrentId)
      if (session) {
        setMessages(session.messages)
      }
    }
  }, [])

  // Save messages to current session whenever they change
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return
    
    setSessions(prev => {
      const updated = prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages, updatedAt: Date.now(), name: s.name || getSessionName(messages) }
          : s
      )
      saveSessions(updated)
      return updated
    })
  }, [messages, currentSessionId])

  // Close history dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function getSessionName(msgs: Message[]): string {
    const firstUserMsg = msgs.find(m => m.role === 'user')
    if (firstUserMsg) {
      return firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '')
    }
    return 'New conversation'
  }

  function startNewSession() {
    const newSession: ChatSession = {
      id: generateSessionId(),
      name: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setSessions(prev => {
      const updated = [newSession, ...prev]
      saveSessions(updated)
      return updated
    })
    setCurrentSessionIdState(newSession.id)
    setCurrentSessionId(newSession.id)
    setMessages([])
    setShowHistory(false)
  }

  function switchToSession(sessionId: string) {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionIdState(sessionId)
      setCurrentSessionId(sessionId)
      setMessages(session.messages)
    }
    setShowHistory(false)
  }

  function deleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId)
      saveSessions(updated)
      return updated
    })
    if (currentSessionId === sessionId) {
      setCurrentSessionIdState(null)
      setMessages([])
    }
  }

  function clearAllHistory() {
    if (confirm('Delete all conversation history? This cannot be undone.')) {
      setSessions([])
      saveSessions([])
      setCurrentSessionIdState(null)
      setMessages([])
      setShowHistory(false)
    }
  }

  // Load all app data into system prompt on mount
  useEffect(() => {
    async function loadContext() {
      try {
        const [overview, peerData, regulatory, complaints, stakeholders, boardReport] = await Promise.all([
          getDashboardOverview(),
          Promise.resolve(getPeerBenchmarking()),
          Promise.resolve(getRegulatoryIntel()),
          getComplaintSummary(),
          Promise.resolve(getStakeholderImpact()),
          Promise.resolve(getBoardReport()),
        ])

        // Load risk details for all banks
        const banks = overview.map(b => b.bank)
        const riskDetails: Record<number, ReturnType<typeof getRiskDetail>> = {}
        for (const bank of banks) {
          riskDetails[bank.id] = getRiskDetail(bank.id)
        }

        // Load crisis simulation for top risk bank
        const crisisData: Record<number, ReturnType<typeof getCrisisSimulation>> = {}
        if (overview.length > 0) {
          crisisData[overview[0].bank.id] = getCrisisSimulation(overview[0].bank.id)
        }

        const dataContext = buildDataContext(
          overview, peerData, regulatory, complaints,
          crisisData, stakeholders, boardReport, riskDetails,
        )

        setSystemPrompt(BASE_SYSTEM_PROMPT + dataContext)
      } catch {
        // Fallback to base prompt if data load fails
        setSystemPrompt(BASE_SYSTEM_PROMPT + '\n\n(Note: Live data could not be loaded. Answering based on general knowledge.)')
      } finally {
        setDataLoading(false)
      }
    }
    loadContext()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !systemPrompt) return

    // Create a new session if we don't have one
    let activeSessionId = currentSessionId
    if (!activeSessionId) {
      const newSession: ChatSession = {
        id: generateSessionId(),
        name: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setSessions(prev => {
        const updated = [newSession, ...prev]
        saveSessions(updated)
        return updated
      })
      activeSessionId = newSession.id
      setCurrentSessionIdState(newSession.id)
      setCurrentSessionId(newSession.id)
    }

    const userMessage: Message = { role: 'user', content: content.trim(), timestamp: Date.now() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // Use backend proxy instead of direct Anthropic API call
      const resp = await fetch('/api/reprisk/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.error || `API error ${resp.status}`)
      }

      const data = await resp.json()
      const assistantContent = data.content?.[0]?.text || 'No response'
      setMessages([...newMessages, { role: 'assistant', content: assistantContent, timestamp: Date.now() }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get response')
    } finally {
      setLoading(false)
    }
  }, [messages, systemPrompt, currentSessionId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot size={24} className="text-blue-400" />
            Ask the Risk Analyst
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {dataLoading
              ? 'Loading dashboard data into context...'
              : `AI-powered insights — loaded ${systemPrompt ? Math.round(systemPrompt.length / 1000) + 'K chars' : '0'} of live data`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* History dropdown */}
          <div className="relative" ref={historyRef}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg transition-colors"
            >
              <History size={14} />
              History
              {sessions.length > 0 && (
                <span className="bg-blue-600 text-gray-900 dark:text-white text-xs px-1.5 py-0.5 rounded-full">
                  {sessions.length}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            
            {showHistory && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conversation History</span>
                  {sessions.length > 0 && (
                    <button
                      onClick={clearAllHistory}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No conversations yet
                    </div>
                  ) : (
                    sessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => switchToSession(session.id)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-200 last:border-0 flex items-start justify-between group ${
                          session.id === currentSessionId ? 'bg-gray-50/50' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-200 truncate">{session.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {session.messages.length} messages · {new Date(session.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New chat button */}
          <button
            onClick={startNewSession}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {dataLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 size={32} className="text-blue-400 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading live dashboard data into analyst memory...</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Fetching scores, complaints, regulatory actions, crisis scenarios...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={48} className="text-gray-700 dark:text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">Ask anything about reputation risk</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                The analyst has full context of all dashboard data — scores, complaints, regulatory actions, peer benchmarks, crisis scenarios, and board report.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="flex items-center gap-2 text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50/50 border border-gray-300 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:bg-gray-800 hover:text-gray-200 transition-colors"
                  >
                    <Sparkles size={12} className="text-blue-500 shrink-0" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-gray-900'
                    : 'bg-gray-50 text-gray-700'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <User size={14} className="text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-blue-400" />
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-50 dark:bg-gray-8000 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-50 dark:bg-gray-8000 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-50 dark:bg-gray-8000 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-800 p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about risk scores, peer comparisons, regulatory trends..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
            disabled={loading || dataLoading}
          />
          <button
            type="submit"
            disabled={loading || dataLoading || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 text-gray-900 dark:text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
