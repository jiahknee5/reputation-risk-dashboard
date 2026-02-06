import { useState, useCallback } from 'react'
import { getFeedback, addFeedback, voteFeedback, exportFeedbackJSON, type FeedbackItem } from '../services/api'
import { ThumbsUp, Download, Plus, Bug, Lightbulb, Filter } from 'lucide-react'

const CATEGORIES = ['Data Sources', 'Scoring Model', 'UI/UX', 'Integrations', 'Reporting', 'Other']
const PRIORITIES: FeedbackItem['priority'][] = ['low', 'medium', 'high', 'critical']

function priorityColor(p: string) {
  const m: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  }
  return m[p] || m.low
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-purple-500/20 text-purple-400',
    closed: 'bg-gray-500/20 text-gray-600',
  }
  return m[s] || m.open
}

export default function Feedback() {
  const [items, setItems] = useState<FeedbackItem[]>(() => getFeedback())
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'feature' | 'bug'>('feature')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [priority, setPriority] = useState<FeedbackItem['priority']>('medium')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'votes' | 'date'>('date')

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    addFeedback({ type: formType, title: title.trim(), description: description.trim(), category, priority })
    setItems(getFeedback())
    setTitle('')
    setDescription('')
    setShowForm(false)
  }, [formType, title, description, category, priority])

  const handleVote = useCallback((id: string) => {
    setItems(voteFeedback(id))
  }, [])

  const handleExport = useCallback(() => {
    const json = exportFeedbackJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const filtered = items
    .filter(i => filterCategory === 'all' || i.category === filterCategory)
    .sort((a, b) => sortBy === 'votes' ? b.votes - a.votes : b.created_at.localeCompare(a.created_at))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Developer Feedback</h2>
          <p className="text-sm text-gray-500 mt-1">Submit feature requests, report bugs, and vote on priorities</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Download size={16} />
            Export JSON
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Plus size={16} />
            New Request
          </button>
        </div>
      </div>

      {/* Submission form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormType('feature')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                formType === 'feature' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-600 hover:text-gray-200'
              }`}
            >
              <Lightbulb size={14} />
              Feature Request
            </button>
            <button
              type="button"
              onClick={() => setFormType('bug')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                formType === 'bug' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-gray-600 hover:text-gray-200'
              }`}
            >
              <Bug size={14} />
              Bug Report
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder={formType === 'feature' ? 'Add social media sentiment tracking...' : 'Risk score not updating when...'}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {formType === 'feature' ? 'Description' : 'Steps to Reproduce / Expected vs Actual'}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-gray-50 border border-gray-300 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder={formType === 'feature' ? 'Describe the feature and its expected value...' : '1. Go to...\n2. Click...\n3. Expected: ...\n4. Actual: ...'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as FeedbackItem['priority'])}
                className="w-full bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-500 transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'votes' | 'date')}
          className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="date">Newest First</option>
          <option value="votes">Most Voted</option>
        </select>
        <span className="text-xs text-gray-600">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Feedback list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Lightbulb size={32} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-600">No feedback yet. Be the first to submit!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start gap-4">
                {/* Vote button */}
                <button
                  onClick={() => handleVote(item.id)}
                  className="flex flex-col items-center gap-1 pt-1 text-gray-500 hover:text-blue-400 transition-colors"
                >
                  <ThumbsUp size={16} />
                  <span className="text-xs font-medium">{item.votes}</span>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      item.type === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {item.type === 'bug' ? 'Bug' : 'Feature'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${priorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100/50 text-gray-600">
                      {item.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-200">{item.title}</h4>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
