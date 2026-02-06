import { MessageSquarePlus } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function FeedbackButton() {
  const navigate = useNavigate()
  const location = useLocation()

  // Hide on the feedback page itself
  if (location.pathname === '/feedback') return null

  return (
    <button
      onClick={() => navigate('/feedback')}
      className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-gray-900 text-sm font-medium rounded-full shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-colors z-50"
    >
      <MessageSquarePlus size={16} />
      Feedback
    </button>
  )
}
