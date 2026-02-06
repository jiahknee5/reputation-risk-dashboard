import { useState, useEffect } from 'react'
import {
  Database, Globe, MessageSquare, TrendingUp, FileText, Shield,
  AlertTriangle, Building2, Scale, Newspaper, CheckCircle2, XCircle,
  RefreshCw, ExternalLink, Lock, Zap
} from 'lucide-react'

interface DataSource {
  id: string
  name: string
  category: 'regulatory' | 'news' | 'social' | 'market' | 'premium'
  description: string
  icon: React.ElementType
  enabled: boolean
  status: 'active' | 'inactive' | 'error' | 'premium'
  lastSync?: string
  recordCount?: number
  updateFrequency: string
  cost: 'free' | 'paid'
  price: string
  apiUrl?: string
}

const INITIAL_SOURCES: DataSource[] = [
  // ============ REGULATORY SOURCES (Federal) ============
  { id: 'cfpb', name: 'CFPB Consumer Complaints', category: 'regulatory', description: 'Consumer complaint database with product categories and company responses', icon: MessageSquare, enabled: true, status: 'active', lastSync: '2h ago', recordCount: 12847, updateFrequency: 'Daily', cost: 'free', price: 'Free', apiUrl: 'https://www.consumerfinance.gov/data-research/consumer-complaints/' },
  { id: 'sec', name: 'SEC EDGAR Filings', category: 'regulatory', description: '10-K, 10-Q, 8-K filings with risk factor extraction', icon: FileText, enabled: true, status: 'active', lastSync: '6h ago', recordCount: 342, updateFrequency: 'Daily', cost: 'free', price: 'Free', apiUrl: 'https://www.sec.gov/edgar/' },
  { id: 'occ', name: 'OCC Enforcement', category: 'regulatory', description: 'Consent orders, cease & desist, civil money penalties', icon: Shield, enabled: true, status: 'active', lastSync: '1d ago', recordCount: 89, updateFrequency: 'Weekly', cost: 'free', price: 'Free', apiUrl: 'https://www.occ.gov/' },
  { id: 'fdic', name: 'FDIC Actions & Failures', category: 'regulatory', description: 'Enforcement actions and bank failure data', icon: Building2, enabled: true, status: 'active', lastSync: '1d ago', recordCount: 156, updateFrequency: 'Weekly', cost: 'free', price: 'Free', apiUrl: 'https://www.fdic.gov/' },
  { id: 'fed', name: 'Federal Reserve', category: 'regulatory', description: 'Fed enforcement actions and press releases', icon: Scale, enabled: true, status: 'active', lastSync: '2d ago', recordCount: 67, updateFrequency: 'Weekly', cost: 'free', price: 'Free', apiUrl: 'https://www.federalreserve.gov/' },
  { id: 'doj', name: 'DOJ Settlements', category: 'regulatory', description: 'Bank settlements, indictments, criminal pleas', icon: Scale, enabled: true, status: 'active', lastSync: '3d ago', recordCount: 23, updateFrequency: 'Weekly', cost: 'free', price: 'Free', apiUrl: 'https://www.justice.gov/' },
  { id: 'finra', name: 'FINRA Disciplinary', category: 'regulatory', description: 'Broker-dealer disciplinary actions', icon: AlertTriangle, enabled: true, status: 'active', lastSync: '1w ago', recordCount: 412, updateFrequency: 'Monthly', cost: 'free', price: 'Free', apiUrl: 'https://www.finra.org/' },
  { id: 'fincen', name: 'FinCEN Enforcement', category: 'regulatory', description: 'BSA/AML enforcement, SAR statistics', icon: Shield, enabled: false, status: 'inactive', updateFrequency: 'Monthly', cost: 'free', price: 'Free' },
  { id: 'ofac', name: 'OFAC Sanctions', category: 'regulatory', description: 'SDN list, sanctions violations, penalties', icon: AlertTriangle, enabled: false, status: 'inactive', updateFrequency: 'Daily', cost: 'free', price: 'Free' },
  { id: 'ftc', name: 'FTC Consumer Protection', category: 'regulatory', description: 'Consumer fraud cases, data breach notifications', icon: Shield, enabled: false, status: 'inactive', updateFrequency: 'Weekly', cost: 'free', price: 'Free' },
  { id: 'epa', name: 'EPA Enforcement', category: 'regulatory', description: 'Environmental violations, Superfund sites', icon: Building2, enabled: false, status: 'inactive', updateFrequency: 'Monthly', cost: 'free', price: 'Free' },
  { id: 'osha', name: 'OSHA Violations', category: 'regulatory', description: 'Workplace safety violations, fatalities', icon: AlertTriangle, enabled: false, status: 'inactive', updateFrequency: 'Weekly', cost: 'free', price: 'Free' },

  // ============ STATE REGULATORY ============
  { id: 'dfs-ny', name: 'NY DFS', category: 'regulatory', description: 'NY banking enforcement, consent orders', icon: Building2, enabled: false, status: 'inactive', updateFrequency: 'Monthly', cost: 'free', price: 'Free' },
  { id: 'dfpi-ca', name: 'CA DFPI', category: 'regulatory', description: 'CA banking/lending enforcement', icon: Scale, enabled: false, status: 'inactive', updateFrequency: 'Monthly', cost: 'free', price: 'Free' },

  // ============ NEWS & MEDIA MONITORING ============
  { id: 'gdelt', name: 'GDELT Global News', category: 'news', description: '150K+ sources, 30 languages, tone analysis', icon: Globe, enabled: true, status: 'active', lastSync: '1h ago', recordCount: 8934, updateFrequency: 'Real-time', cost: 'free', price: 'Free', apiUrl: 'https://www.gdeltproject.org/' },
  { id: 'newsapi', name: 'NewsAPI', category: 'news', description: 'Premium news aggregation, full article text', icon: Newspaper, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$449/mo', apiUrl: 'https://newsapi.org/' },
  { id: 'factiva', name: 'Factiva (Dow Jones)', category: 'news', description: 'Premium news archive, 33K+ sources, 200 years', icon: Newspaper, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$2,500/mo' },
  { id: 'lexisnexis', name: 'LexisNexis', category: 'news', description: 'Legal news, litigation tracking, regulatory filings', icon: FileText, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$3,000/mo' },
  { id: 'meltwater', name: 'Meltwater', category: 'news', description: 'Media monitoring, sentiment analysis, alerts', icon: Globe, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$9K-30K/yr' },
  { id: 'brandwatch', name: 'Brandwatch', category: 'news', description: 'Social listening, brand monitoring, crisis alerts', icon: TrendingUp, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$12K-48K/yr' },
  { id: 'cision', name: 'Cision', category: 'news', description: 'PR monitoring, media database, influencer tracking', icon: Newspaper, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$10K/yr' },

  // ============ SOCIAL MEDIA ============
  { id: 'reddit', name: 'Reddit Sentiment', category: 'social', description: 'r/personalfinance, r/banking customer sentiment', icon: MessageSquare, enabled: true, status: 'active', lastSync: '30m ago', recordCount: 2341, updateFrequency: 'Hourly', cost: 'free', price: 'Free', apiUrl: 'https://www.reddit.com/' },
  { id: 'twitter', name: 'Twitter/X API', category: 'social', description: 'Real-time mentions and viral complaints', icon: MessageSquare, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$5,000/mo', apiUrl: 'https://developer.twitter.com/' },
  { id: 'glassdoor', name: 'Glassdoor Reviews', category: 'social', description: 'Employee sentiment and culture signals', icon: Building2, enabled: false, status: 'inactive', updateFrequency: 'Weekly', cost: 'free', price: 'Scraping only' },
  { id: 'trustpilot', name: 'Trustpilot', category: 'social', description: 'Customer reviews and business ratings', icon: MessageSquare, enabled: false, status: 'premium', updateFrequency: 'Daily', cost: 'paid', price: '$299/mo' },
  { id: 'yelp', name: 'Yelp Reviews', category: 'social', description: 'Business reviews, customer complaints', icon: MessageSquare, enabled: false, status: 'inactive', updateFrequency: 'Daily', cost: 'free', price: 'Scraping only' },
  { id: 'linkedin', name: 'LinkedIn', category: 'social', description: 'Company pages, employee posts, executive changes', icon: Building2, enabled: false, status: 'inactive', updateFrequency: 'Daily', cost: 'free', price: 'Scraping only' },
  { id: 'facebook', name: 'Facebook/Instagram', category: 'social', description: 'Brand pages, customer sentiment, crisis signals', icon: MessageSquare, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$1,000/mo' },
  { id: 'tiktok', name: 'TikTok', category: 'social', description: 'Viral videos, brand mentions, Gen-Z sentiment', icon: TrendingUp, enabled: false, status: 'inactive', updateFrequency: 'Daily', cost: 'free', price: 'Scraping only' },
  { id: 'youtube', name: 'YouTube', category: 'social', description: 'Video content, comments, brand channels', icon: MessageSquare, enabled: false, status: 'inactive', updateFrequency: 'Daily', cost: 'free', price: 'Scraping only' },

  // ============ MARKET & FINANCIAL DATA ============
  { id: 'trends', name: 'Google Trends', category: 'market', description: 'Search interest spikes and crisis keywords', icon: TrendingUp, enabled: true, status: 'active', lastSync: '4h ago', recordCount: 156, updateFrequency: 'Daily', cost: 'free', price: 'Free', apiUrl: 'https://trends.google.com/' },
  { id: 'yahoo', name: 'Yahoo Finance', category: 'market', description: 'Stock prices, volume, volatility metrics', icon: TrendingUp, enabled: true, status: 'active', lastSync: '15m ago', recordCount: 2890, updateFrequency: 'Daily', cost: 'free', price: 'Free', apiUrl: 'https://finance.yahoo.com/' },
  { id: 'alpha-vantage', name: 'Alpha Vantage', category: 'market', description: 'Stock data, technical indicators, fundamentals', icon: TrendingUp, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$49/mo' },
  { id: 'polygon', name: 'Polygon.io', category: 'market', description: 'Real-time stock/options data, Level 2 quotes', icon: Zap, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$199/mo' },

  // ============ LITIGATION & LEGAL ============
  { id: 'pacer', name: 'PACER Federal Courts', category: 'regulatory', description: 'Federal court filings, lawsuits, settlements', icon: Scale, enabled: false, status: 'inactive', updateFrequency: 'Daily', cost: 'free', price: '$0.10/page' },
  { id: 'justia', name: 'Justia Dockets', category: 'regulatory', description: 'Free federal dockets, case law search', icon: FileText, enabled: false, status: 'inactive', updateFrequency: 'Daily', cost: 'free', price: 'Free' },
  { id: 'law360', name: 'Law360', category: 'news', description: 'Legal news, litigation tracking, expert analysis', icon: Scale, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$1,500/yr' },
  { id: 'bloomberglaw', name: 'Bloomberg Law', category: 'news', description: 'Legal research, dockets, litigation analytics', icon: Zap, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$4,200/yr' },

  // ============ PREMIUM ESG & REPUTATION ============
  { id: 'refinitiv', name: 'Refinitiv ESG', category: 'premium', description: 'Enterprise ESG scores and controversy screening', icon: Database, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$50K+/yr' },
  { id: 'bloomberg', name: 'Bloomberg B-PIPE', category: 'premium', description: 'Real-time news, filings, market data', icon: Zap, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$24K/yr' },
  { id: 'reprisk', name: 'RepRisk Platform', category: 'premium', description: 'ESG risk screening, 34 risk factors, 23 languages', icon: Shield, enabled: false, status: 'premium', updateFrequency: 'Daily', cost: 'paid', price: '$50-200K/yr' },
  { id: 'msci-esg', name: 'MSCI ESG Manager', category: 'premium', description: 'ESG ratings, carbon data, climate risk', icon: Database, enabled: false, status: 'premium', updateFrequency: 'Monthly', cost: 'paid', price: '$100K+/yr' },
  { id: 'sustainalytics', name: 'Sustainalytics', category: 'premium', description: 'ESG risk ratings, controversy tracking', icon: AlertTriangle, enabled: false, status: 'premium', updateFrequency: 'Monthly', cost: 'paid', price: '$75K+/yr' },
  { id: 'sp-global-esg', name: 'S&P Global ESG Scores', category: 'premium', description: 'CSA scores, SAM methodology, climate data', icon: TrendingUp, enabled: false, status: 'premium', updateFrequency: 'Annual', cost: 'paid', price: '$50K+/yr' },
  { id: 'truvalue-labs', name: 'TruValue Labs (FactSet)', category: 'premium', description: 'AI-powered ESG insights, sentiment analysis', icon: Zap, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$25K/yr' },
  { id: 'dow-jones-rc', name: 'Dow Jones Risk & Compliance', category: 'premium', description: 'Third-party risk, sanctions screening, PEP lists', icon: Shield, enabled: false, status: 'premium', updateFrequency: 'Real-time', cost: 'paid', price: '$10-50K/yr' },
]

const CATEGORY_COLORS: Record<string, string> = {
  regulatory: 'text-blue-400 bg-blue-500/20',
  news: 'text-purple-400 bg-purple-500/20',
  social: 'text-green-400 bg-green-500/20',
  market: 'text-yellow-400 bg-yellow-500/20',
  premium: 'text-orange-400 bg-orange-500/20',
}

const STORAGE_KEY = 'reprisk-data-sources'

function loadSourceConfig(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch { return {} }
}

function saveSourceConfig(config: Record<string, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>(INITIAL_SOURCES)
  const [filter, setFilter] = useState<string>('all')
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    const config = loadSourceConfig()
    if (Object.keys(config).length > 0) {
      setSources(prev => prev.map(s => ({
        ...s,
        enabled: config[s.id] ?? s.enabled,
        status: config[s.id] === false ? 'inactive' as const : s.status,
      })))
    }
  }, [])

  const toggleSource = (id: string) => {
    setSources(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          if (s.cost === 'paid') {
            alert('Premium data source - contact sales for API access')
            return s
          }
          const newEnabled = !s.enabled
          return { ...s, enabled: newEnabled, status: (newEnabled ? 'active' : 'inactive') as DataSource['status'] }
        }
        return s
      })
      const config: Record<string, boolean> = {}
      updated.forEach(s => { config[s.id] = s.enabled })
      saveSourceConfig(config)
      return updated
    })
  }

  const syncSource = async (id: string) => {
    setSyncing(id)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSources(prev => prev.map(s => s.id === id ? { ...s, lastSync: 'Just now' } : s))
    setSyncing(null)
  }

  const syncAll = async () => {
    for (const source of sources.filter(s => s.enabled && s.status === 'active')) {
      await syncSource(source.id)
    }
  }

  const filteredSources = filter === 'all' ? sources : sources.filter(s => s.category === filter)
  const stats = {
    total: sources.length,
    active: sources.filter(s => s.enabled && s.status === 'active').length,
    records: sources.reduce((sum, s) => sum + (s.recordCount || 0), 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database size={20} className="text-blue-400" />
            Data Sources
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{stats.active}/{stats.total} active • {stats.records.toLocaleString()} records</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
          >
            <option value="all">All Sources</option>
            <option value="regulatory">Regulatory</option>
            <option value="news">News</option>
            <option value="social">Social</option>
            <option value="market">Market</option>
            <option value="premium">Premium</option>
          </select>
          <button
            onClick={syncAll}
            disabled={syncing !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="text-left py-2.5 px-3 text-gray-400 font-medium w-8">On</th>
              <th className="text-left py-2.5 px-3 text-gray-400 font-medium">Source</th>
              <th className="text-left py-2.5 px-3 text-gray-400 font-medium hidden md:table-cell">Description</th>
              <th className="text-left py-2.5 px-3 text-gray-400 font-medium w-20">Category</th>
              <th className="text-right py-2.5 px-3 text-gray-400 font-medium w-24">Price</th>
              <th className="text-left py-2.5 px-3 text-gray-400 font-medium w-20">Frequency</th>
              <th className="text-right py-2.5 px-3 text-gray-400 font-medium w-20">Records</th>
              <th className="text-left py-2.5 px-3 text-gray-400 font-medium w-20">Last Sync</th>
              <th className="text-center py-2.5 px-3 text-gray-400 font-medium w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSources.map((source) => {
              const Icon = source.icon
              const isPremium = source.cost === 'paid'
              
              return (
                <tr 
                  key={source.id} 
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${!source.enabled ? 'opacity-50' : ''}`}
                >
                  {/* Toggle */}
                  <td className="py-2 px-3">
                    <button
                      onClick={() => toggleSource(source.id)}
                      disabled={isPremium}
                      className={`w-8 h-5 rounded-full transition-colors relative ${
                        source.enabled ? 'bg-blue-600' : 'bg-gray-700'
                      } ${isPremium ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        source.enabled ? 'left-3.5' : 'left-0.5'
                      }`} />
                    </button>
                  </td>
                  
                  {/* Source Name */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={source.enabled ? 'text-blue-400' : 'text-gray-500'} />
                      <span className="text-white font-medium">{source.name}</span>
                      {isPremium && (
                        <Lock size={12} className="text-orange-400" />
                      )}
                    </div>
                  </td>
                  
                  {/* Description */}
                  <td className="py-2 px-3 text-gray-400 hidden md:table-cell">
                    <span className="line-clamp-1">{source.description}</span>
                  </td>
                  
                  {/* Category */}
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${CATEGORY_COLORS[source.category]}`}>
                      {source.category}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-2 px-3 text-right">
                    <span className={`text-sm font-medium ${source.cost === 'free' ? 'text-green-400' : 'text-orange-400'}`}>
                      {source.price}
                    </span>
                  </td>

                  {/* Frequency */}
                  <td className="py-2 px-3 text-gray-400">
                    {source.updateFrequency}
                  </td>
                  
                  {/* Records */}
                  <td className="py-2 px-3 text-right text-gray-300 font-mono">
                    {source.recordCount?.toLocaleString() || '—'}
                  </td>
                  
                  {/* Last Sync */}
                  <td className="py-2 px-3">
                    {source.enabled && source.status === 'active' ? (
                      <span className="text-green-400 text-xs">{source.lastSync || '—'}</span>
                    ) : source.status === 'premium' ? (
                      <span className="text-orange-400 text-xs">API Key</span>
                    ) : (
                      <span className="text-gray-500 text-xs">Off</span>
                    )}
                  </td>
                  
                  {/* Actions */}
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-1">
                      {source.apiUrl && (
                        <a
                          href={source.apiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                          title="View source"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {source.enabled && source.status === 'active' && (
                        <button
                          onClick={() => syncSource(source.id)}
                          disabled={syncing === source.id}
                          className="p-1 text-gray-500 hover:text-blue-400 transition-colors disabled:opacity-50"
                          title="Sync now"
                        >
                          <RefreshCw size={14} className={syncing === source.id ? 'animate-spin' : ''} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-400" /> Active</span>
          <span className="flex items-center gap-1"><XCircle size={12} className="text-gray-500" /> Disabled</span>
          <span className="flex items-center gap-1"><Lock size={12} className="text-orange-400" /> Premium (API key required)</span>
        </div>
        <button className="text-blue-400 hover:text-blue-300">+ Request custom integration</button>
      </div>
    </div>
  )
}
