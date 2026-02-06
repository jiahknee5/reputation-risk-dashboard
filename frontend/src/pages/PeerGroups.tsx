import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Users } from 'lucide-react'
import PageObjective from '../components/PageObjective'
import InsightBox from '../components/InsightBox'
import { getBanks } from '../services/api'

interface PeerGroup {
  id: string
  name: string
  description: string
  bankIds: number[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'reprisk-peer-groups'

function loadPeerGroups(): PeerGroup[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function savePeerGroups(groups: PeerGroup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
}

export default function PeerGroups() {
  const allBanks = getBanks()
  const [groups, setGroups] = useState<PeerGroup[]>(loadPeerGroups())
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', bankIds: [] as number[] })

  useEffect(() => {
    savePeerGroups(groups)
  }, [groups])

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setFormData({ name: '', description: '', bankIds: [] })
  }

  function startEdit(group: PeerGroup) {
    setEditing(group.id)
    setCreating(false)
    setFormData({ name: group.name, description: group.description, bankIds: group.bankIds })
  }

  function cancelEdit() {
    setCreating(false)
    setEditing(null)
    setFormData({ name: '', description: '', bankIds: [] })
  }

  function saveGroup() {
    if (!formData.name.trim() || formData.bankIds.length === 0) return

    if (creating) {
      const newGroup: PeerGroup = {
        id: `group-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        bankIds: formData.bankIds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setGroups([...groups, newGroup])
    } else if (editing) {
      setGroups(groups.map(g =>
        g.id === editing
          ? { ...g, name: formData.name.trim(), description: formData.description.trim(), bankIds: formData.bankIds, updatedAt: Date.now() }
          : g
      ))
    }

    cancelEdit()
  }

  function deleteGroup(id: string) {
    if (confirm('Delete this peer group? This cannot be undone.')) {
      setGroups(groups.filter(g => g.id !== id))
    }
  }

  function toggleBank(bankId: number) {
    setFormData(prev => ({
      ...prev,
      bankIds: prev.bankIds.includes(bankId)
        ? prev.bankIds.filter(id => id !== bankId)
        : [...prev.bankIds, bankId]
    }))
  }

  // Quick preset groups
  function createPreset(name: string, tickers: string[]) {
    const bankIds = allBanks.filter(b => tickers.includes(b.ticker)).map(b => b.id)
    if (bankIds.length === 0) return

    const preset: PeerGroup = {
      id: `preset-${Date.now()}`,
      name,
      description: `Preset group: ${tickers.join(', ')}`,
      bankIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setGroups([...groups, preset])
  }

  const insight = groups.length > 0 ? {
    type: 'finding' as const,
    title: `${groups.length} custom peer group${groups.length !== 1 ? 's' : ''} defined`,
    message: `You've created ${groups.length} peer group${groups.length !== 1 ? 's' : ''} for targeted benchmarking.`,
    detail: 'Use these groups in Peer Benchmarking to compare institutions within specific cohorts.'
  } : {
    type: 'finding' as const,
    title: 'No peer groups defined yet',
    message: 'Create custom peer groups to benchmark institutions against specific cohorts (regional banks, GSIBs, etc.).',
    detail: 'Try Quick Presets below to get started.'
  }

  return (
    <div className="space-y-4">
      <PageObjective
        title="Peer Group Management"
        objective="Define custom peer groups for targeted benchmarking"
        description="Create cohorts of banks with similar characteristics (asset size, business model, geography) for more meaningful peer comparisons."
      >
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Group
        </button>
      </PageObjective>

      <InsightBox {...insight} />

      {/* Quick Presets */}
      {groups.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Quick Presets</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => createPreset('Top 4 GSIBs', ['JPM', 'BAC', 'C', 'WFC'])}
              className="px-3 py-2 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Top 4 GSIBs
            </button>
            <button
              onClick={() => createPreset('Category II Regional', ['USB', 'PNC', 'TFC', 'COF'])}
              className="px-3 py-2 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Category II Regional
            </button>
            <button
              onClick={() => createPreset('Credit Card Issuers', ['JPM', 'BAC', 'C', 'COF', 'AXP', 'DFS'])}
              className="px-3 py-2 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Credit Card Issuers
            </button>
            <button
              onClick={() => createPreset('Custody Banks', ['BK', 'STT'])}
              className="px-3 py-2 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Custody Banks
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <div className="bg-gray-900 border-2 border-blue-500/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">
              {creating ? 'Create New Peer Group' : 'Edit Peer Group'}
            </h3>
            <button
              onClick={cancelEdit}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Group Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Regional Super-Regionals"
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Select Banks * ({formData.bankIds.length} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-gray-800/50 rounded-lg">
                {allBanks.map(bank => (
                  <label
                    key={bank.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      formData.bankIds.includes(bank.id)
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.bankIds.includes(bank.id)}
                      onChange={() => toggleBank(bank.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-200">{bank.ticker}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveGroup}
                disabled={!formData.name.trim() || formData.bankIds.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                Save Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Peer Groups List */}
      <div className="space-y-3">
        {groups.length === 0 && !creating && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Users size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No peer groups yet. Click "New Group" to create one.</p>
          </div>
        )}

        {groups.map(group => {
          const banks = allBanks.filter(b => group.bankIds.includes(b.id))
          return (
            <div
              key={group.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-white">{group.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600/20 text-blue-400">
                      {banks.length} bank{banks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-400 mb-3">{group.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {banks.map(bank => (
                      <span
                        key={bank.id}
                        className="px-2 py-1 rounded text-xs bg-gray-800 border border-gray-700 text-gray-300"
                      >
                        {bank.ticker}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Last updated: {new Date(group.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => startEdit(group)}
                    className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
                    title="Edit group"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
