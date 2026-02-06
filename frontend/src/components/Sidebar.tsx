import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Activity, Shield, Users, UserCog, BarChart3, AlertTriangle, FileText, Gauge, MessageSquare, Bot, Database, Sun, Moon } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
  { to: '/monitoring', label: 'Real-Time Monitoring', icon: Activity },
  { to: '/risk-detail', label: 'Risk Score Detail', icon: Gauge },
  { to: '/peers', label: 'Peer Benchmarking', icon: Users },
  { to: '/peer-groups', label: 'Peer Group Manager', icon: UserCog },
  { to: '/regulatory', label: 'Regulatory Intel', icon: Shield },
  { to: '/crisis', label: 'Crisis Simulation', icon: AlertTriangle },
  { to: '/stakeholders', label: 'Stakeholder Impact', icon: BarChart3 },
  { to: '/reports', label: 'Board Reports', icon: FileText },
  { to: '/data-sources', label: 'Data Sources', icon: Database },
  { to: '/chat', label: 'Ask Risk Analyst', icon: Bot },
  { to: '/feedback', label: 'Developer Feedback', icon: MessageSquare },
]

interface SidebarProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export default function Sidebar({ theme, toggleTheme }: SidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">RepRisk Intel</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reputation Risk Platform v2</p>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon size={18} className="text-gray-600 dark:text-gray-400" />
          ) : (
            <Sun size={18} className="text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-600">
        AI-Powered Risk Intelligence
      </div>
    </aside>
  )
}
