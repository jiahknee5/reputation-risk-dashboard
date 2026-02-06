import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

type InsightType = 'action' | 'finding' | 'positive' | 'warning'

interface InsightBoxProps {
  type: InsightType
  title: string
  message: string
  detail?: string
  linkText?: string
  linkHref?: string
}

export default function InsightBox({ type, title, message, detail, linkText, linkHref }: InsightBoxProps) {
  const config = {
    action: {
      icon: AlertTriangle,
      bg: 'bg-orange-500/5',
      border: 'border-orange-500/30',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-400',
      titleColor: 'text-orange-400',
      label: 'PRIORITY ACTION',
    },
    finding: {
      icon: Lightbulb,
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-400',
      label: 'KEY FINDING',
    },
    positive: {
      icon: TrendingDown,
      bg: 'bg-green-500/5',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-400',
      titleColor: 'text-green-400',
      label: 'POSITIVE SIGNAL',
    },
    warning: {
      icon: TrendingUp,
      bg: 'bg-red-500/5',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      titleColor: 'text-red-400',
      label: 'WARNING',
    },
  }

  const { icon: Icon, bg, border, iconBg, iconColor, titleColor, label } = config[type]

  return (
    <div className={`${bg} border ${border} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 ${iconBg} rounded-lg shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${titleColor} uppercase tracking-wide mb-1`}>{label}</p>
          <p className="text-base text-gray-900 font-medium">{title}</p>
          <p className="text-sm text-gray-700 mt-1">{message}</p>
          {detail && (
            <p className="text-xs text-gray-500 mt-2">{detail}</p>
          )}
          {linkText && linkHref && (
            <a
              href={linkHref}
              className={`inline-flex items-center gap-1 text-sm ${titleColor} mt-3 hover:underline`}
            >
              {linkText}
              <ArrowRight size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// Compound component for multiple insights
export function InsightStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>
}
