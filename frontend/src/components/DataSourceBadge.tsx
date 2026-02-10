import { Database, FileText, Globe, MessageCircle, TestTube } from 'lucide-react'

type DataSource = 'cfpb' | 'news' | 'gdelt' | 'demo' | 'derived' | 'x'

interface DataSourceBadgeProps {
  source: DataSource
  tooltip?: string
  className?: string
}

const SOURCE_CONFIG: Record<DataSource, {
  icon: typeof Database
  label: string
  color: string
  defaultTooltip: string
}> = {
  cfpb: {
    icon: Database,
    label: 'CFPB',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    defaultTooltip: 'CFPB Consumer Complaints (live data, 90 days)'
  },
  news: {
    icon: Globe,
    label: 'NewsAPI',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    defaultTooltip: 'NewsAPI (live news, 7 days)'
  },
  gdelt: {
    icon: Globe,
    label: 'GDELT',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    defaultTooltip: 'GDELT Global News (150K+ sources, real-time)'
  },
  demo: {
    icon: TestTube,
    label: 'Demo',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    defaultTooltip: 'Demo/Synthetic Data'
  },
  derived: {
    icon: FileText,
    label: 'Derived',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    defaultTooltip: 'Derived from CFPB + News sentiment'
  },
  x: {
    icon: MessageCircle,
    label: 'X',
    color: 'bg-gray-800/30 text-gray-200 border-gray-600/30',
    defaultTooltip: 'X/Twitter social signals (scraped, updated every 15 min)'
  }
}

export default function DataSourceBadge({ source, tooltip, className = '' }: DataSourceBadgeProps) {
  const config = SOURCE_CONFIG[source]
  const Icon = config.icon
  const tooltipText = tooltip || config.defaultTooltip

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.color} ${className}`}
      title={tooltipText}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  )
}
