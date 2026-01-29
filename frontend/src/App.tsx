import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Monitoring from './pages/Monitoring'
import RiskDetail from './pages/RiskDetail'
import PeerBenchmarking from './pages/PeerBenchmarking'
import RegulatoryIntel from './pages/RegulatoryIntel'
import CrisisSimulation from './pages/CrisisSimulation'
import StakeholderImpact from './pages/StakeholderImpact'
import BoardReports from './pages/BoardReports'

export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/risk-detail" element={<RiskDetail />} />
          <Route path="/peers" element={<PeerBenchmarking />} />
          <Route path="/regulatory" element={<RegulatoryIntel />} />
          <Route path="/crisis" element={<CrisisSimulation />} />
          <Route path="/stakeholders" element={<StakeholderImpact />} />
          <Route path="/reports" element={<BoardReports />} />
        </Routes>
      </main>
    </div>
  )
}
