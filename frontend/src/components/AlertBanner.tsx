import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

interface Alert {
  id: string
  severity: 'critical' | 'high' | 'medium'
  message: string
  bank?: string
}

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  const colors = {
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
    high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  }

  return (
    <div className="space-y-2">
      {visible.map(alert => (
        <div key={alert.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[alert.severity]}`}>
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1 text-sm">{alert.message}</span>
          <button
            onClick={() => setDismissed(prev => new Set(prev).add(alert.id))}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
