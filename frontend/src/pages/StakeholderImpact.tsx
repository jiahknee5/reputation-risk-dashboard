import { useMemo } from 'react'
import DemoBanner from '../components/DemoBanner'
import { getStakeholderImpact } from '../data/demo'

function impactBadge(level: string) {
  const colors: Record<string, string> = {
    High: 'bg-red-500/20 text-red-400',
    Moderate: 'bg-yellow-500/20 text-yellow-400',
    Low: 'bg-green-500/20 text-green-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] || 'bg-gray-500/20 text-gray-400'}`}>
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
  const data = useMemo(() => getStakeholderImpact(), [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Stakeholder Impact Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">Reputation risk exposure across key stakeholder groups by institution</p>
      </div>

      <DemoBanner />

      {data.map((bankData) => (
        <div key={bankData.bank.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">
              {bankData.bank.name} <span className="text-gray-500">({bankData.bank.ticker})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-800">
            {bankData.stakeholders.map((stakeholder) => (
              <div key={stakeholder.group} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      stakeholder.impact_level === 'High' ? 'bg-red-500' :
                      stakeholder.impact_level === 'Moderate' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-300">{stakeholder.group}</span>
                  </div>
                  {impactBadge(stakeholder.impact_level)}
                </div>
                <div className="space-y-2">
                  {Object.entries(stakeholder.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500">{key}</span>
                      <span className={`font-medium ${
                        String(value).startsWith('-') || ['High', 'Elevated', 'Declining'].includes(String(value))
                          ? 'text-red-400'
                          : 'text-gray-300'
                      }`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h4 className="text-xs font-medium text-gray-500 mb-3">Impact Level Definitions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
            <div>
              <span className="text-red-400 font-medium">High Impact</span>
              <p className="text-gray-600 mt-0.5">Material risk to stakeholder relationship. Requires active mitigation and executive attention.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1 shrink-0" />
            <div>
              <span className="text-yellow-400 font-medium">Moderate Impact</span>
              <p className="text-gray-600 mt-0.5">Emerging risk that warrants monitoring. Potential for escalation if conditions deteriorate.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
            <div>
              <span className="text-green-400 font-medium">Low Impact</span>
              <p className="text-gray-600 mt-0.5">Within normal operating parameters. Standard monitoring protocols sufficient.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
