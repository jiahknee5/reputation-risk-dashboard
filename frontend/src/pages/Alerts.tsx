import { useState, useEffect } from 'react'
import { Bell, BellOff, TrendingUp, TrendingDown, AlertTriangle, Check, X } from 'lucide-react'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'

interface Alert {
  id: string
  bank: string
  type: 'score_spike' | 'score_drop' | 'complaint_surge' | 'news_spike' | 'regulatory'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  acknowledged: boolean
  value?: number
  change?: number
}

interface AlertRule {
  id: string
  name: string
  enabled: boolean
  type: string
  threshold: number
  banks: string[]
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('all')

  useEffect(() => {
    // Load demo alerts
    const demoAlerts: Alert[] = [
      {
        id: '1',
        bank: 'Wells Fargo',
        type: 'complaint_surge',
        severity: 'critical',
        message: 'CFPB complaints increased 87% in last 7 days (453 new complaints)',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        acknowledged: false,
        value: 453,
        change: 87,
      },
      {
        id: '2',
        bank: 'Bank of America',
        type: 'score_spike',
        severity: 'high',
        message: 'Composite risk score increased 23 points to 78',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        acknowledged: false,
        value: 78,
        change: 23,
      },
      {
        id: '3',
        bank: 'JPMorgan Chase',
        type: 'news_spike',
        severity: 'medium',
        message: 'Negative news mentions increased 45% (12 articles in last 24h)',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        acknowledged: true,
        value: 12,
        change: 45,
      },
      {
        id: '4',
        bank: 'Citigroup',
        type: 'regulatory',
        severity: 'high',
        message: 'New regulatory enforcement action filed by OCC',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        acknowledged: false,
      },
      {
        id: '5',
        bank: 'US Bank',
        type: 'score_drop',
        severity: 'low',
        message: 'Composite risk score improved 8 points to 62',
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        acknowledged: true,
        value: 62,
        change: -8,
      },
    ]
    setAlerts(demoAlerts)

    // Load demo rules
    const demoRules: AlertRule[] = [
      { id: 'r1', name: 'Complaint Surge (>50% increase)', enabled: true, type: 'complaint_surge', threshold: 50, banks: ['All'] },
      { id: 'r2', name: 'Score Spike (>15 point increase)', enabled: true, type: 'score_spike', threshold: 15, banks: ['All'] },
      { id: 'r3', name: 'News Spike (>30% increase)', enabled: true, type: 'news_spike', threshold: 30, banks: ['All'] },
      { id: 'r4', name: 'Regulatory Action', enabled: true, type: 'regulatory', threshold: 0, banks: ['All'] },
      { id: 'r5', name: 'Score >80 (Critical)', enabled: true, type: 'score_threshold', threshold: 80, banks: ['All'] },
    ]
    setRules(demoRules)
  }, [])

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unacknowledged') return !alert.acknowledged
    if (filter === 'critical') return alert.severity === 'critical' || alert.severity === 'high'
    return true
  })

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length
  const criticalCount = alerts.filter(a => (a.severity === 'critical' || a.severity === 'high') && !a.acknowledged).length

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/20'
      case 'high': return 'bg-orange-100 dark:bg-orange-900/20'
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/20'
      default: return 'bg-blue-100 dark:bg-blue-900/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'score_spike': return <TrendingUp className="h-4 w-4" />
      case 'score_drop': return <TrendingDown className="h-4 w-4" />
      case 'regulatory': return <AlertTriangle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const acknowledgeAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return `${Math.floor(diffMs / (1000 * 60))} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${Math.floor(diffHours / 24)} days ago`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageObjective
        title="Alerts & Notifications"
        objective="Monitor significant risk changes and regulatory events in real-time"
        description="Configure alert rules and receive notifications when risk metrics breach thresholds or significant events occur."
      />

      {/* Insight Summary */}
      <InsightBox
        type={criticalCount > 0 ? 'action' : 'finding'}
        title={criticalCount > 0 ? `${criticalCount} critical alerts require attention` : 'No critical alerts'}
        message={criticalCount > 0
          ? `Review ${unacknowledgedCount} unacknowledged alert${unacknowledgedCount !== 1 ? 's' : ''}. ${criticalCount > 1 ? `${criticalCount} alerts marked high or critical severity.` : '1 alert marked critical.'}`
          : `All ${alerts.length} alerts reviewed and acknowledged. ${rules.filter(r => r.enabled).length}/${rules.length} alert rules active.`
        }
        detail={criticalCount > 0
          ? 'Consider adjusting alert thresholds if too many false positives'
          : 'System monitoring 23 institutions across 4 risk dimensions'
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{alerts.length}</p>
            </div>
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unacknowledged</p>
              <p className="text-2xl font-semibold text-orange-600">{unacknowledgedCount}</p>
            </div>
            <BellOff className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical/High</p>
              <p className="text-2xl font-semibold text-red-600">{criticalCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Rules</p>
              <p className="text-2xl font-semibold text-green-600">{rules.filter(r => r.enabled).length}</p>
            </div>
            <Check className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All Alerts
        </button>
        <button
          onClick={() => setFilter('unacknowledged')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            filter === 'unacknowledged'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Unacknowledged ({unacknowledgedCount})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            filter === 'critical'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Critical/High ({criticalCount})
        </button>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No alerts match the current filter
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                  alert.acknowledged ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Badge */}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBg(alert.severity)} ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </div>

                  {/* Type Icon */}
                  <div className={getSeverityColor(alert.severity)}>
                    {getTypeIcon(alert.type)}
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{alert.bank}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{formatTimestamp(alert.timestamp)}</p>
                      </div>

                      {/* Acknowledge Button */}
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                        >
                          <Check className="h-3 w-3" />
                          Acknowledge
                        </button>
                      )}

                      {alert.acknowledged && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alert Rules</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure thresholds and conditions for automatic alerting</p>
        </div>
        <div className="divide-y divide-gray-200 dark:border-gray-700">
          {rules.map(rule => (
            <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    rule.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {rule.banks.join(', ')} • Threshold: {rule.threshold > 0 ? `${rule.threshold}%` : 'Any'}
                  </p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                rule.enabled
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {rule.enabled ? 'Active' : 'Disabled'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
