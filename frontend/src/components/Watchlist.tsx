import { Star } from 'lucide-react'
import { getWatchlist, toggleWatchlist, getBanks } from '../services/api'
import { useState } from 'react'

interface WatchlistProps {
  onBankClick?: (bankId: number) => void
}

export default function Watchlist({ onBankClick }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState(() => getWatchlist())
  const banks = getBanks()
  const watched = banks.filter(b => watchlist.includes(b.id))

  if (watched.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
          <Star size={14} /> Watchlist
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Click the star on any bank card to add it to your watchlist.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
        <Star size={14} className="text-yellow-500" /> Watchlist
      </h3>
      <div className="space-y-2">
        {watched.map(bank => (
          <div
            key={bank.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50/50 hover:bg-gray-50 dark:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => onBankClick?.(bank.id)}
          >
            <span className="text-sm text-gray-200">{bank.name} ({bank.ticker})</span>
            <button
              onClick={e => {
                e.stopPropagation()
                setWatchlist(toggleWatchlist(bank.id))
              }}
              className="text-yellow-500 hover:text-yellow-400"
            >
              <Star size={14} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WatchlistToggle({ bankId }: { bankId: number }) {
  const [watchlist, setWatchlist] = useState(() => getWatchlist())
  const isWatched = watchlist.includes(bankId)

  return (
    <button
      onClick={() => setWatchlist(toggleWatchlist(bankId))}
      className={`transition-colors ${isWatched ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-500'}`}
      title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Star size={14} fill={isWatched ? 'currentColor' : 'none'} />
    </button>
  )
}
