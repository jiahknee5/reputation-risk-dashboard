import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Trash2, Sparkles, Loader2 } from 'lucide-react'
import {
  getDashboardOverview, getRiskDetail, getPeerBenchmarking,
  getRegulatoryIntel, getCrisisSimulation, getStakeholderImpact,
  getBoardReport, getComplaintSummary, type DashboardOverview,
} from '../services/api'

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const BASE_SYSTEM_PROMPT = `You are the Risk Analyst, an AI assistant embedded in a Reputation Risk Intelligence Platform for banking institutions.

## Your Expertise
- Reputation risk scoring methodology (composite scores 0-100)
- CFPB consumer complaint analysis
- FinBERT NLP sentiment analysis on financial news
- SEC filing risk keyword extraction
- Banking regulatory frameworks (Basel, OCC, FDIC enforcement actions)
- ESG risk mapping from complaint categories
- Peer benchmarking across US banks
- Crisis simulation and Monte Carlo projections
- Stakeholder impact analysis

## Scoring Methodology
Composite Score = Media Sentiment (25%) + Regulatory Risk (25%) + Consumer Complaints (20%) + Market Signal (15%) + Peer Relative (15%)
Scale: 0 = lowest risk, 100 = highest risk
Thresholds: <30 = Low (green), 30-50 = Moderate (yellow), 50-70 = Elevated (orange), >70 = High (red)

## Instructions
- Reference the LIVE DATA below when answering questions — cite specific numbers
- Keep responses concise, data-driven, and actionable
- When comparing banks, use the actual scores from the data
- Format with markdown for readability
- If asked about something not in the data, say so clearly`

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

  let ctx = `\n\n## LIVE DASHBOARD DATA (as of ${today})\n\n`

  // Overview scores
  ctx += `### Current Composite Risk Scores (ranked highest to lowest)\n`
  ctx += `| Bank | Ticker | Composite | Media | Complaints | Market | Regulatory | Peer Rel. | Data Source |\n`
  ctx += `|------|--------|-----------|-------|------------|--------|------------|-----------|-------------|\n`
  for (const b of overview) {
    ctx += `| ${b.bank.name} | ${b.bank.ticker} | ${Math.round(b.composite_score)} | ${Math.round(b.media_sentiment_score)} | ${Math.round(b.complaint_score)} | ${Math.round(b.market_score)} | ${Math.round(b.regulatory_score)} | ${Math.round(b.top_drivers.find(d => d.name === 'Peer Relative')?.score ?? 0)} | ${b.data_source} |\n`
  }

  // ESG flags
  const banksWithESG = overview.filter(b => b.esg_flags.length > 0)
  if (banksWithESG.length > 0) {
    ctx += `\n### ESG Risk Flags\n`
    for (const b of banksWithESG) {
      ctx += `- **${b.bank.name}**: ${b.esg_flags.map(f => `${f.theme === 'S' ? 'Social' : f.theme === 'G' ? 'Governance' : 'Environmental'} (${f.count} complaints)`).join(', ')}\n`
    }
  }

  // Top drivers per bank
  ctx += `\n### Top Risk Drivers by Bank\n`
  for (const b of overview) {
    ctx += `- **${b.bank.ticker}**: ${b.top_drivers.map(d => `${d.name} (${Math.round(d.score)})`).join(', ')}\n`
  }

  // Peer benchmarking
  ctx += `\n### Peer Benchmarking\n`
  ctx += `- Peer Group Average: ${peerData.peer_average}\n`
  ctx += `- Component Averages: Media ${peerData.component_averages.media_sentiment}, Complaints ${peerData.component_averages.complaints}, Market ${peerData.component_averages.market}\n`
  ctx += `- Deviations from peer: ${peerData.banks.map(b => `${b.bank.ticker} ${b.deviation_from_peer > 0 ? '+' : ''}${b.deviation_from_peer}`).join(', ')}\n`

  // Risk detail components
  ctx += `\n### Detailed Risk Components (5-factor breakdown)\n`
  for (const [bankId, detail] of Object.entries(riskDetails)) {
    ctx += `\n**${detail.bank.name} (${detail.bank.ticker})** — Composite: ${Math.round(detail.composite_score)}\n`
    for (const c of detail.components) {
      ctx += `  - ${c.name}: ${Math.round(c.score)} (weight: ${(c.weight * 100)}%) — ${c.description}\n`
    }
    if (detail.alerts.length > 0) {
      ctx += `  Active Alerts:\n`
      for (const a of detail.alerts) {
        ctx += `  - [${a.severity.toUpperCase()}] ${a.message} (${a.date})\n`
      }
    }
  }

  // CFPB complaints
  if (complaints.length > 0) {
    ctx += `\n### CFPB Complaint Summary (last 90 days)\n`
    ctx += `Total complaint categories: ${complaints.length}\n`
    for (const c of complaints.slice(0, 10)) {
      ctx += `- ${c.product}: ${c.count} complaints\n`
    }
  }

  // Regulatory intel
  ctx += `\n### Regulatory Intelligence\n`
  ctx += `- Total enforcement actions: ${regulatory.enforcementActions.length}\n`
  ctx += `- High severity (4-5): ${regulatory.enforcementActions.filter(a => a.severity >= 4).length}\n`
  const totalPenalties = regulatory.enforcementActions.reduce((s, a) => s + (a.penalty_amount || 0), 0)
  ctx += `- Total penalties: $${(totalPenalties / 1_000_000).toFixed(0)}M\n`
  ctx += `- SEC filings analyzed: ${regulatory.secFilings.length}\n`
  ctx += `\nRecent enforcement actions:\n`
  for (const a of regulatory.enforcementActions.slice(0, 5)) {
    ctx += `- ${a.action_date}: ${a.bank.ticker} — ${a.agency} ${a.action_type}${a.penalty_amount ? ` ($${(a.penalty_amount / 1_000_000).toFixed(1)}M)` : ''} [severity: ${a.severity}/5]\n`
  }

  // Crisis scenarios (for highest risk bank)
  if (overview.length > 0) {
    const topBankId = overview[0].bank.id
    const crisis = crisisData[topBankId]
    if (crisis) {
      ctx += `\n### Crisis Scenarios for ${crisis.bank.name} (highest risk)\n`
      for (const s of crisis.scenarios) {
        ctx += `- **${s.name}**: probability ${(s.probability * 100)}%, projected score ${s.projected_score}, recovery ${s.recovery_days} days, impact ${s.financial_impact}\n`
      }
    }
  }

  // Stakeholder impact
  ctx += `\n### Stakeholder Impact Summary\n`
  for (const bankData of stakeholders) {
    ctx += `**${bankData.bank.ticker}**: `
    ctx += bankData.stakeholders.map(s => `${s.group}=${s.impact_level}`).join(', ')
    ctx += '\n'
  }

  // Board report summary
  ctx += `\n### Board Report Executive Summary\n`
  ctx += `Period: ${boardReport.period}\n`
  ctx += boardReport.executive_summary + '\n'
  ctx += `\nKey Findings:\n`
  for (const f of boardReport.key_findings) {
    ctx += `- ${f}\n`
  }
  ctx += `\nRecommendations:\n`
  for (const r of boardReport.recommendations) {
    ctx += `- [${r.priority}] ${r.action}\n`
  }

  return ctx
}

const SUGGESTED_PROMPTS = [
  'Which bank has the highest risk right now and why?',
  'Compare Wells Fargo vs JPMorgan — what are the key differences?',
  'What CFPB complaint categories are driving the most risk?',
  'What crisis scenarios should we prepare for?',
  'Summarize the board report for me',
  'Which banks have ESG risk flags?',
]

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-sm">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-white mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-white mt-3 mb-1">$1</h2>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 text-gray-300">• $1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 text-gray-300">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export default function ClawdChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

    if (!ANTHROPIC_KEY) {
      setError('Anthropic API key not configured. Set VITE_ANTHROPIC_KEY in .env')
      return
    }

    const userMessage: Message = { role: 'user', content: content.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.error?.message || `API error ${resp.status}`)
      }

      const data = await resp.json()
      const assistantContent = data.content?.[0]?.text || 'No response'
      setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get response')
    } finally {
      setLoading(false)
    }
  }, [messages, systemPrompt])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
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
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {dataLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 size={32} className="text-blue-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading live dashboard data into analyst memory...</p>
              <p className="text-xs text-gray-600 mt-2">Fetching scores, complaints, regulatory actions, crisis scenarios...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={48} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Ask anything about reputation risk</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md">
                The analyst has full context of all dashboard data — scores, complaints, regulatory actions, peer benchmarks, crisis scenarios, and board report.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="flex items-center gap-2 text-left px-3 py-2 text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800 hover:text-gray-200 transition-colors"
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                    <User size={14} className="text-gray-400" />
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
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
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
        <form onSubmit={handleSubmit} className="border-t border-gray-800 p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about risk scores, peer comparisons, regulatory trends..."
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
            disabled={loading || dataLoading}
          />
          <button
            type="submit"
            disabled={loading || dataLoading || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
