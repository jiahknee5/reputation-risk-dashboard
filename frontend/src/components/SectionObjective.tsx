interface SectionObjectiveProps {
  title: string
  objective: string
  type?: 'info' | 'watch' | 'action'
}

export default function SectionObjective({ title, objective, type = 'info' }: SectionObjectiveProps) {
  const colors = {
    info: 'border-blue-500/30 bg-blue-500/5',
    watch: 'border-yellow-500/30 bg-yellow-500/5',
    action: 'border-red-500/30 bg-red-500/5',
  }

  const icons = {
    info: '📊',
    watch: '👀',
    action: '⚡',
  }

  return (
    <div className={`border-l-2 ${colors[type]} px-3 py-2 rounded-r`}>
      <div className="flex items-start gap-2">
        <span className="text-sm">{icons[type]}</span>
        <div>
          <h4 className="text-xs font-semibold text-gray-200">{title}</h4>
          <p className="text-[10px] text-gray-600 mt-0.5">{objective}</p>
        </div>
      </div>
    </div>
  )
}
