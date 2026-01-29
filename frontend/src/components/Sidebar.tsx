import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Activity, Shield, Users, BarChart3, AlertTriangle, FileText, Gauge } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
  { to: '/monitoring', label: 'Real-Time Monitoring', icon: Activity },
  { to: '/risk-detail', label: 'Risk Score Detail', icon: Gauge, disabled: true },
  { to: '/peers', label: 'Peer Benchmarking', icon: Users, disabled: true },
  { to: '/regulatory', label: 'Regulatory Intel', icon: Shield, disabled: true },
  { to: '/crisis', label: 'Crisis Simulation', icon: AlertTriangle, disabled: true },
  { to: '/stakeholders', label: 'Stakeholder Impact', icon: BarChart3, disabled: true },
  { to: '/reports', label: 'Board Reports', icon: FileText, disabled: true },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">RepRisk Intel</h1>
        <p className="text-xs text-gray-500 mt-1">Reputation Risk Platform</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.disabled ? '#' : item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                item.disabled
                  ? 'text-gray-600 cursor-not-allowed'
                  : isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.disabled && <span className="ml-auto text-[10px] text-gray-600">P2+</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        Phase 1 MVP
      </div>
    </aside>
  )
}
