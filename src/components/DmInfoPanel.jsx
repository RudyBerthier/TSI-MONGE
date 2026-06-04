import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BellOff, Bell, Ban, Link2, Share2, ExternalLink, File, Video } from 'lucide-react'
import { SOCKET_URL, getAttachmentUrl, forceDownload } from '../utils/chat'
import { ForwardModal } from './ForwardModal'
import { serializeContactShare } from './ContactCard'

const URL_REGEX = /https?:\/\/[^\s]+/g

function extractLinks(messages) {
  const links = []
  for (const msg of messages) {
    if (!msg.content) continue
    const found = msg.content.match(URL_REGEX)
    if (found) {
      found.forEach(url => links.push({ url, msg }))
    }
  }
  return links
}

function isImage(mimetype) {
  return mimetype?.startsWith('image/')
}
function isVideo(mimetype) {
  return mimetype?.startsWith('video/')
}

export function DmInfoPanel({ contact, messages, conversations, customGroups, currentUserId, dmSettings, onMuteToggle, onBlockToggle, onClose, token, socket, inline = false, onPreview = null }) {
  const [tab, setTab] = useState('media')
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [loadingMute, setLoadingMute] = useState(false)
  const [loadingBlock, setLoadingBlock] = useState(false)
  const [sharingContact, setSharingContact] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)

  useEffect(() => {
    if (!dmSettings || !contact) return
    setMuted(dmSettings.muted?.includes(contact.id) || false)
    setBlocked(dmSettings.blocked?.includes(contact.id) || false)
  }, [dmSettings, contact])

  const handleMute = async () => {
    setLoadingMute(true)
    try {
      const r = await fetch(`/api/auth/mute/${contact.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json()
      setMuted(data.muted)
      onMuteToggle?.(contact.id, data.muted)
    } catch (_) { }
    setLoadingMute(false)
  }

  const handleBlock = async () => {
    setLoadingBlock(true)
    setConfirmBlock(false)
    try {
      const r = await fetch(`/api/auth/block/${contact.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json()
      setBlocked(data.blocked)
      onBlockToggle?.(contact.id, data.blocked)
    } catch (_) { }
    setLoadingBlock(false)
  }

  const mediaMessages = messages.filter(m => m.attachment)
  const links = extractLinks(messages)

  const avatarUrl = contact?.avatar ? `${SOCKET_URL}${contact.avatar}` : null

  return (
    <>
      {inline && (
        <style>{`@keyframes _panelIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      )}

      {/* Backdrop — only in floating mode */}
      {!inline && <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} />}

      {/* Panel */}
      <div
        className={inline
          ? "absolute inset-0 z-20 flex flex-col bg-white dark:bg-slate-800 overflow-hidden"
          : "fixed right-0 top-0 bottom-0 z-[71] w-80 max-w-full bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden"
        }
        style={inline
          ? { animation: '_panelIn 0.22s ease-out' }
          : { borderLeft: '1px solid var(--border, #e2e8f0)' }
        }
      >

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Infos</span>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Contact hero */}
          <div className="flex flex-col items-center py-6 px-4 border-b border-gray-100 dark:border-slate-700">
            <Link to={`/social/user/${contact.username}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-4 ring-white dark:ring-slate-800 shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={contact.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                    {contact.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{contact.username}</p>
            </Link>
            {blocked && (
              <span className="mt-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                Bloqué
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 space-y-1 border-b border-gray-100 dark:border-slate-700">

            {/* Mute */}
            <button
              onClick={handleMute}
              disabled={loadingMute}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {muted
                ? <Bell size={18} className="text-blue-500 shrink-0" />
                : <BellOff size={18} className="text-gray-500 shrink-0" />}
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {muted ? 'Réactiver les notifications' : 'Mettre en sourdine'}
                </p>
                <p className="text-xs text-gray-400">
                  {muted ? 'Les notifications sont désactivées' : 'Plus de notifications pour cette conv'}
                </p>
              </div>
            </button>

            {/* Share contact */}
            <button
              onClick={() => setSharingContact(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Share2 size={18} className="text-gray-500 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">Partager le contact</p>
                <p className="text-xs text-gray-400">Envoyer dans une autre conversation</p>
              </div>
            </button>

            {/* Block */}
            {!confirmBlock ? (
              <button
                onClick={() => setConfirmBlock(true)}
                disabled={loadingBlock}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <Ban size={18} className={blocked ? 'text-gray-400 shrink-0' : 'text-red-500 shrink-0'} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${blocked ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-400'}`}>
                    {blocked ? 'Débloquer' : 'Bloquer'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {blocked ? 'Autoriser à nouveau les messages' : 'Empêche l\'envoi de messages'}
                  </p>
                </div>
              </button>
            ) : (
              <div className="px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400 mb-2 font-medium">
                  Bloquer {contact.username} ?
                </p>
                <div className="flex gap-2">
                  <button onClick={handleBlock} disabled={loadingBlock}
                    className="flex-1 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                    Confirmer
                  </button>
                  <button onClick={() => setConfirmBlock(false)}
                    className="flex-1 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setTab('media')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'media'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 dark:text-gray-400'}`}
            >
              Médias
              {mediaMessages.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                  {mediaMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('links')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'links'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 dark:text-gray-400'}`}
            >
              Liens
              {links.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                  {links.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          {tab === 'media' && (
            <div className="p-3">
              {mediaMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Aucun média partagé</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {mediaMessages.map((msg, i) => {
                    const att = msg.attachment
                    const secureUrl = `${SOCKET_URL}${getAttachmentUrl(att.url)}`
                    if (isImage(att.mimetype)) {
                      return (
                        <button key={i} type="button"
                          onClick={() => onPreview?.({ url: secureUrl, senderName: msg.senderUsername || msg.username || '', senderAvatar: null })}
                          className="aspect-square rounded-lg overflow-hidden block bg-gray-100 dark:bg-slate-700 hover:opacity-80 transition-opacity">
                          <img src={secureUrl} alt={att.originalName} className="w-full h-full object-cover" />
                        </button>
                      )
                    }
                    if (isVideo(att.mimetype)) {
                      return (
                        <button key={i} type="button"
                          onClick={() => forceDownload(secureUrl, att.originalName)}
                          className="aspect-square rounded-lg overflow-hidden flex items-center justify-center bg-gray-900 hover:opacity-80 transition-opacity">
                          <Video size={24} className="text-white" />
                        </button>
                      )
                    }
                    return (
                      <button key={i} type="button"
                        onClick={() => forceDownload(secureUrl, att.originalName)}
                        className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors p-2">
                        <File size={20} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
                          {att.originalName}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'links' && (
            <div className="p-3 space-y-1">
              {links.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Aucun lien partagé</p>
              ) : (
                links.map(({ url, msg }, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Link2 size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 dark:text-blue-400 truncate group-hover:underline">{url}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {msg.senderUsername} · {new Date(msg.timestamp).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-gray-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share contact modal */}
      {sharingContact && (
        <ForwardModal
          message={{ content: contact.username }}
          conversations={conversations}
          customGroups={customGroups}
          currentUserId={currentUserId}
          onForward={({ type, id }) => {
            const content = serializeContactShare(contact)
            if (!socket) return
            if (type === 'group') socket.emit('message:send', { content, replyTo: null, attachment: null })
            else if (type === 'dm') socket.emit('dm:send', { targetUserId: id, content, replyTo: null, attachment: null })
            else if (type === 'customGroup') socket.emit('group:send', { groupId: id, content, replyTo: null, attachment: null })
            setSharingContact(false)
          }}
          onClose={() => setSharingContact(false)}
        />
      )}
    </>
  )
}
