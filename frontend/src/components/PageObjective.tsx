import { Target } from 'lucide-react'

interface PageObjectiveProps {
  title: string
  objective: string
  description: string
  children?: React.ReactNode // For right-side controls like selectors
}

export default function PageObjective({ title, objective, description, children }: PageObjectiveProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        {children}
      </div>

      <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
            <Target size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-1">Objective</p>
            <p className="text-base text-gray-900 dark:text-white font-medium">{objective}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
