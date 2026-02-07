import { useState, useEffect } from 'react'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import SectionObjective from '../components/SectionObjective'
import DataSourceBadge from '../components/DataSourceBadge'
import { getStakeholderImpact } from '../services/api'

function impactBadge(level: string) {
  const colors: Record<string, string> = {
    High: 'bg-red-500/20 text-red-400',
    Moderate: 'bg-yellow-500/20 text-yellow-400',
    Low: 'bg-green-500/20 text-green-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] || 'bg-gray-500/20 text-gray-600'}`}>
      {level}
    </span>
  )
}

const STAKEHOLDER_ICONS: Record<string, string> = {
  Shareholders: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Customers: 'bg-green-500/20 text-green-400 border-green-500/30',
  Regulators: 'bg-red-500/20 text-red-400 border-red-500/30',
  Employees: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function StakeholderImpact() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getStakeholderImpact()
        setData(result)
      } catch (err) {
        console.error('Failed to load stakeholder data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading stakeholder data...</p>
        </div>
      </div>
    )
  }

  // Generate insight
  const allStakeholders = data.flatMap(b => b.stakeholders)
  const highImpact = allStakeholders.filter((s: any) => s.impact_level === 'High')
  const mostAffectedGroup = highImpact.reduce((acc: Record<string, number>, s: any) => {
    acc[s.group] = (acc[s.group] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topGroup = Object.entries(mostAffectedGroup).sort((a, b) => b[1] - a[1])[0]

  const insight = highImpact.length > 0 ? {
    type: 'warning' as const,
    title: `${highImpact.length} high-impact stakeholder exposures`,
    message: `${highImpact.length} stakeholder group${highImpact.length !== 1 ? 's' : ''} showing high reputation risk impact across ${data.length} institutions.`,
    detail: topGroup ? `Most affected: ${topGroup[0]} (${topGroup[1]} institution${topGroup[1] !== 1 ? 's' : ''} with high impact)` : 'Monitor stakeholder sentiment closely.'
  } : {
    type: 'positive' as const,
    title: 'Stakeholder impact within normal range',
    message: `Analyzing ${allStakeholders.length} stakeholder groups across ${data.length} institutions. No high-impact exposures detected.`,
    detail: 'Continue monitoring for emerging stakeholder concerns.'
  }

  return (
    <div className="space-y-4">
      <PageObjective
        title="Stakeholder Impact Analysis"
        objective="Map risk to stakeholder consequences"
        description="Reputation risk impact across 4 key stakeholder groups (Shareholders, Customers, Regulators, Employees) with group-specific metrics and exposure levels."
      />

      <InsightBox {...insight} />

      <SectionObjective
        title="Four-Stakeholder Framework"
        objective="Impact mapping across Shareholders, Customers, Regulators, and Employees translates reputation risk into stakeholder-specific consequences. High-impact exposures signal relationship risks requiring proactive management."
        type={highImpact.length > 0 ? 'action' : 'info'}
      />

      {data.map((bankData) => (
        <div key={bankData.bank.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {bankData.bank.name} <span className="text-gray-500">({bankData.bank.ticker})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800">
            {bankData.stakeholders.map((stakeholder: any) => (
              <div key={stakeholder.group} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      stakeholder.impact_level === 'High' ? 'bg-red-500' :
                      stakeholder.impact_level === 'Moderate' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stakeholder.group}</span>
                  </div>
                  {impactBadge(stakeholder.impact_level)}
                </div>
                {'source' in stakeholder && stakeholder.source && (
                  <div className="mb-3">
                    <DataSourceBadge source={stakeholder.source} />
                  </div>
                )}
                <div className="space-y-2">
                  {Object.entries(stakeholder.metrics).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">{key}</span>
                      <span className={`font-medium ${
                        String(value).startsWith('-') || ['High', 'Elevated', 'Declining', 'Negative', 'Monitor', 'Concerning'].includes(String(value))
                          ? 'text-red-400 dark:text-red-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h4 className="text-xs font-medium text-gray-500 mb-3">Impact Level Definitions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
            <div>
              <span className="text-red-400 font-medium">High Impact</span>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5">Material risk to stakeholder relationship. Requires active mitigation and executive attention.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1 shrink-0" />
            <div>
              <span className="text-yellow-400 font-medium">Moderate Impact</span>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5">Emerging risk that warrants monitoring. Potential for escalation if conditions deteriorate.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
            <div>
              <span className="text-green-400 font-medium">Low Impact</span>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5">Within normal operating parameters. Standard monitoring protocols sufficient.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
