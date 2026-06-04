import { useState } from 'react'
import { X, Search, Users } from 'lucide-react'
import { SOCKET_URL } from '../utils/chat'

export function ForwardModal({ message, conversations, customGroups, currentUserId, onForward, onClose }) {
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()

  const contacts = conversations
    .map(conv => {
      const other = conv.participants?.find(p => p.id !== currentUserId)
      return other ? { ...other } : null
    })
    .filter(Boolean)
    .filter(c => !q || c.username.toLowerCase().includes(q))

  const groups = customGroups.filter(g => !q || g.name.toLowerCase().includes(q))
  const showClassroom = !q || 'classe chat'.includes(q)

  const total = contacts.length + groups.length + (showClassroom ? 1 : 0)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <h2 className="font-semibold text-gray-800 dark:text-white">Transférer vers...</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="bg-transparent flex-1 text-sm text-gray-700 dark:text-white outline-none placeholder-gray-400"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Message preview */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <p className="text-xs text-gray-400 mb-0.5">Message à transférer :</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{message.content || '📎 Pièce jointe'}</p>
        </div>

        {/* Destination list */}
        <div className="overflow-y-auto flex-1">
          {total === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">Aucune conversation trouvée</p>
          )}

          {/* Chat de classe */}
          {showClassroom && (
            <>
              {!q && <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Chat de classe</p>}
              <button
                onClick={() => onForward({ type: 'group' })}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">Chat de classe</p>
                  <p className="text-xs text-gray-400">Groupe public</p>
                </div>
              </button>
            </>
          )}

          {/* DMs */}
          {contacts.length > 0 && (
            <>
              {!q && <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Messages privés</p>}
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => onForward({ type: 'dm', id: contact.id })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                    {contact.avatar ? (
                      <img src={`${SOCKET_URL}${contact.avatar}`} alt={contact.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-sm">{contact.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{contact.username}</span>
                </button>
              ))}
            </>
          )}

          {/* Custom groups */}
          {groups.length > 0 && (
            <>
              {!q && <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Groupes</p>}
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => onForward({ type: 'customGroup', id: group.id })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-white" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{group.name}</p>
                    <p className="text-xs text-gray-400">{group.members?.length || 0} membre{group.members?.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>
              ))}
            </>
          )}
          <div className="h-2" />
        </div>
      </div>
    </div>
  )
}
