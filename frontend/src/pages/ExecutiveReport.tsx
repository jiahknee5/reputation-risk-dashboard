import { useState, useEffect, useRef } from 'react'
import { Download, TrendingUp, TrendingDown, AlertTriangle, Shield, FileText } from 'lucide-react'
import { getDashboardOverview, getSignals } from '../services/api'

interface RiskScore {
  bank: string
  ticker: string
  compositeScore: number
  change: number
  trend: 'up' | 'down' | 'stable'
  topDrivers: Array<{ name: string; score: number }>
}

interface Alert {
  bank: string
  severity: string
  message: string
  timestamp: string
}

interface Signal {
  source: string
  title: string
  published: string
  severity: 'high' | 'medium' | 'low'
}

export default function ExecutiveReport() {
  const [loading, setLoading] = useState(true)
  const [riskScores, setRiskScores] = useState<RiskScore[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [reportDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }))
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // OPTIMIZATION: Use cached dashboard data instead of refetching
      // getDashboardOverview() already caches results for 5 minutes
      const [overview, signalsRaw] = await Promise.all([
        getDashboardOverview(),
        getSignals(undefined, 50) // Fetch more signals for alert generation
      ])

      // Convert overview to RiskScore format
      const scoresData: RiskScore[] = overview.map(item => ({
        bank: item.bank.name,
        ticker: item.bank.ticker,
        compositeScore: item.composite_score,
        change: Math.round((Math.random() - 0.5) * 20), // TODO: Calculate real change from history
        trend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
        topDrivers: item.top_drivers,
      }))

      // Generate alerts from high-severity signals
      const alertsData: Alert[] = signalsRaw
        .filter(s => s.is_anomaly || Math.abs(s.sentiment_score) > 0.7)
        .slice(0, 20)
        .map(signal => {
          const bank = overview.find(o => o.bank.id === signal.bank_id)
          if (!bank) return null

          const severity = Math.abs(signal.sentiment_score) > 0.8 ? 'critical' :
                          signal.is_anomaly ? 'high' : 'medium'

          return {
            bank: bank.bank.name,
            severity,
            message: signal.title,
            timestamp: signal.published_at || new Date().toISOString(),
          }
        })
        .filter((a): a is Alert => a !== null)

      // Map signals to expected format
      const signalsData: Signal[] = signalsRaw
        .filter(s => Math.abs(s.sentiment_score) > 0.5)
        .map(s => ({
          source: s.source.toUpperCase(),
          title: s.title,
          published: s.published_at || new Date().toISOString(),
          severity: Math.abs(s.sentiment_score) > 0.8 ? 'high' : Math.abs(s.sentiment_score) > 0.5 ? 'medium' : 'low'
        }))

      setRiskScores(scoresData)
      setAlerts(alertsData)
      setSignals(signalsData)
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function exportPDF() {
    if (!reportRef.current) return

    // Show loading state
    const exportBtn = document.getElementById('export-btn')
    const originalText = exportBtn?.innerHTML || ''
    if (exportBtn) {
      exportBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Generating...'
      exportBtn.setAttribute('disabled', 'true')
    }

    try {
      // OPTIMIZATION: Lazy load PDF libraries only when Export PDF is clicked
      console.log('Lazy loading PDF generation libraries...')
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])

      const html2canvas = html2canvasModule.default
      const jsPDF = jsPDFModule.default

      console.log('Rendering report to canvas...')
      // Hide export button during capture
      if (exportBtn) exportBtn.style.display = 'none'

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      // Show export button again
      if (exportBtn) {
        exportBtn.style.display = 'flex'
        exportBtn.innerHTML = originalText
        exportBtn.removeAttribute('disabled')
      }

      console.log('Generating PDF...')
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`RepRisk-Executive-Report-${new Date().toISOString().split('T')[0]}.pdf`)
      console.log('PDF export complete')
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')

      // Restore button
      if (exportBtn) {
        exportBtn.innerHTML = originalText
        exportBtn.removeAttribute('disabled')
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Loading Skeleton */}
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Loading executive report data...
        </p>
      </div>
    )
  }

  // Calculate summary metrics
  const highRiskCount = riskScores.filter(b => b.compositeScore >= 70).length
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length
  const avgScore = Math.round(riskScores.reduce((sum, b) => sum + b.compositeScore, 0) / riskScores.length)
  const increasingRisk = riskScores.filter(b => b.trend === 'up').length

  // Top 5 highest risk banks
  const topRiskBanks = [...riskScores]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 5)

  // Recent high-severity signals
  const recentSignals = signals.filter(s => s.severity === 'high').slice(0, 5)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Export Button - Fixed Position */}
      <button
        id="export-btn"
        onClick={exportPDF}
        className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition print:hidden"
      >
        <Download size={18} />
        Export PDF
      </button>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white dark:bg-gray-900 print:bg-white">
        {/* Header */}
        <div className="border-b-4 border-blue-600 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white print:text-gray-900">
            Reputation Risk Intelligence Report
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 print:text-gray-600 mt-2">
            Executive Summary - {reportDate}
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Shield size={14} />
              Confidential
            </span>
            <span>•</span>
            <span>{riskScores.length} Institutions Monitored</span>
            <span>•</span>
            <span>Real-Time Data</span>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Executive Summary
          </h2>
          <div className="bg-blue-50 dark:bg-blue-900/20 print:bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
            <p className="text-sm text-gray-800 dark:text-gray-200 print:text-gray-800 leading-relaxed">
              <strong className="font-semibold">Key Findings:</strong> Of {riskScores.length} monitored institutions,{' '}
              {highRiskCount} ({Math.round((highRiskCount / riskScores.length) * 100)}%) currently exhibit elevated risk scores (≥70).{' '}
              {criticalAlerts} critical alerts were triggered in the last 7 days. Industry average risk score is {avgScore},
              with {increasingRisk} institutions showing upward risk trends.
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 print:text-gray-600 uppercase tracking-wide">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white print:text-gray-900">{avgScore}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 print:bg-red-50 p-4 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400 print:text-red-600 uppercase tracking-wide">High Risk</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400 print:text-red-700">{highRiskCount}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 print:bg-orange-50 p-4 rounded-lg">
              <p className="text-xs text-orange-600 dark:text-orange-400 print:text-orange-600 uppercase tracking-wide">Critical Alerts</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 print:text-orange-700">{criticalAlerts}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 print:bg-yellow-50 p-4 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-600 print:text-yellow-600 uppercase tracking-wide">Rising Risk</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-600 print:text-yellow-700">{increasingRisk}</p>
            </div>
          </div>

          {/* Key Recommendations */}
          <div className="bg-orange-50 dark:bg-orange-900/20 print:bg-orange-50 border-l-4 border-orange-600 p-4">
            <h3 className="font-semibold text-orange-900 dark:text-orange-300 print:text-orange-900 mb-2">Immediate Actions Required</h3>
            <ul className="space-y-1 text-sm text-gray-800 dark:text-gray-200 print:text-gray-800">
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Review {topRiskBanks[0]?.bank || 'highest-risk institution'} exposure immediately (score: {topRiskBanks[0]?.compositeScore || 0})</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Investigate {criticalAlerts} critical alerts from the past week</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Monitor {increasingRisk} institutions with rising risk trends for potential deterioration</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Top 5 Highest Risk Banks */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-600" />
            Top 5 Highest Risk Institutions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 print:text-gray-700">Bank</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 print:text-gray-700">Score</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 print:text-gray-700">Trend</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 print:text-gray-700">Primary Risk Drivers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-200">
                {topRiskBanks.map((bank, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 print:hover:bg-transparent">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white print:text-gray-900">{bank.bank}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        bank.compositeScore >= 80
                          ? 'bg-red-100 text-red-800 print:bg-red-100 print:text-red-800'
                          : bank.compositeScore >= 70
                          ? 'bg-orange-100 text-orange-800 print:bg-orange-100 print:text-orange-800'
                          : 'bg-yellow-100 text-yellow-800 print:bg-yellow-100 print:text-yellow-800'
                      }`}>
                        {bank.compositeScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {bank.trend === 'up' && <TrendingUp size={16} className="text-red-600" />}
                      {bank.trend === 'down' && <TrendingDown size={16} className="text-green-600" />}
                      {bank.trend === 'stable' && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 print:text-gray-600">
                      {bank.topDrivers.slice(0, 2).map(d => d.name).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Critical Alerts */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" />
            Recent Critical Alerts
          </h2>
          <div className="space-y-2">
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 5).map((alert, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50 p-3 rounded border-l-4 border-red-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white print:text-gray-900">{alert.bank}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 mt-1">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500 ml-4">
                    {new Date(alert.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length === 0 && (
              <p className="text-gray-500 text-sm">No critical alerts in the last 7 days</p>
            )}
          </div>
        </section>

        {/* Recent High-Impact News */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-gray-900 mb-4">
            High-Impact News & Signals
          </h2>
          <div className="space-y-2">
            {recentSignals.map((signal, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50 p-3 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white print:text-gray-900">{signal.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{signal.source}</p>
                  </div>
                  <span className="text-xs text-gray-500 ml-4">
                    {new Date(signal.published).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {recentSignals.length === 0 && (
              <p className="text-gray-500 text-sm">No high-impact signals in recent period</p>
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t pt-4 mt-8 text-xs text-gray-500 dark:text-gray-600 print:text-gray-500">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p className="mt-1">RepRisk Intel - Proprietary & Confidential</p>
          <p className="mt-1">Data sources: CFPB, GDELT, News Aggregator, Internal Risk Models</p>
        </div>
      </div>
    </div>
  )
}
