import { Link } from 'react-router-dom'
import { SOCKET_URL } from '../utils/chat'

const PREFIX = 'contact-share:'

export function parseContactShare(content) {
  if (!content?.startsWith(PREFIX)) return null
  try {
    return JSON.parse(content.slice(PREFIX.length))
  } catch {
    return null
  }
}

export function serializeContactShare(contact) {
  return PREFIX + JSON.stringify({
    id: contact.id,
    username: contact.username,
    avatar: contact.avatar || '',
  })
}

export function ContactCard({ data, isOwn }) {
  const avatarUrl = data.avatar ? `${SOCKET_URL}${data.avatar}` : null

  return (
    <Link to={`/social/user/${data.username}`} className={`flex items-center gap-3 min-w-[180px] rounded-2xl px-3 py-2.5 hover:opacity-80 transition-opacity ${isOwn
        ? 'bg-white/15 backdrop-blur-sm'
        : 'bg-white dark:bg-slate-600/60 border border-gray-200 dark:border-slate-600 shadow-sm'
      }`}>
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-white/30 dark:ring-slate-500/30">
        {avatarUrl ? (
          <img src={avatarUrl} alt={data.username} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isOwn
              ? 'bg-white/25 text-white'
              : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
            }`}>
            {data.username?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-medium mb-0.5 uppercase tracking-wide ${isOwn ? 'text-white/55' : 'text-gray-400 dark:text-slate-400'
          }`}>
          Contact partagé
        </p>
        <p className={`text-sm font-semibold truncate ${isOwn ? 'text-white' : 'text-gray-800 dark:text-white'
          }`}>
          {data.username}
        </p>
      </div>
    </Link>
  )
}
