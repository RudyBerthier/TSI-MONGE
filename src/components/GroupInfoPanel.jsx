import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BellOff, Bell, LogOut, Link2, ExternalLink, File, Video, UserMinus, Camera, Pencil, Check } from 'lucide-react'
import { SOCKET_URL, getAttachmentUrl, forceDownload } from '../utils/chat'

const URL_REGEX = /https?:\/\/[^\s]+/g

function extractLinks(messages) {
  const links = []
  for (const msg of messages) {
    if (!msg.content) continue
    const found = msg.content.match(URL_REGEX)
    if (found) found.forEach(url => links.push({ url, msg }))
  }
  return links
}

function isImage(mimetype) { return mimetype?.startsWith('image/') }
function isVideo(mimetype) { return mimetype?.startsWith('video/') }

export function GroupInfoPanel({ group, messages, currentUserId, dmSettings, onMuteToggle, onGroupUpdated, onClose, token, socket, inline = false, onPreview = null }) {
  const [tab, setTab] = useState('members')
  const [muted, setMuted] = useState(false)
  const [loadingMute, setLoadingMute] = useState(false)
  const [kicking, setKicking] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [members, setMembers] = useState(group?.members || [])
  const [groupName, setGroupName] = useState(group?.name || '')
  const [groupAvatar, setGroupAvatar] = useState(group?.avatar || null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(group?.name || '')
  const [loadingAvatar, setLoadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  const isAdmin = group?.creatorId === currentUserId

  useEffect(() => {
    if (!dmSettings || !group) return
    setMuted(dmSettings.muted?.includes(group.id) || false)
  }, [dmSettings, group])

  useEffect(() => {
    setMembers(group?.members || [])
    setGroupName(group?.name || '')
    setNewName(group?.name || '')
    setGroupAvatar(group?.avatar || null)
  }, [group])

  useEffect(() => {
    if (!socket) return
    const onKickSuccess = ({ groupId, memberId }) => {
      if (groupId !== group?.id) return
      setMembers(prev => prev.filter(m => m.id !== memberId))
    }
    const onGroupUpdated = ({ groupId, name, avatar }) => {
      if (groupId !== group?.id) return
      if (name !== undefined) { setGroupName(name); setNewName(name) }
      if (avatar !== undefined) setGroupAvatar(avatar)
    }
    socket.on('group:kick-success', onKickSuccess)
    socket.on('group:updated', onGroupUpdated)
    return () => {
      socket.off('group:kick-success', onKickSuccess)
      socket.off('group:updated', onGroupUpdated)
    }
  }, [socket, group?.id])

  const handleMute = async () => {
    setLoadingMute(true)
    try {
      const r = await fetch(`/api/auth/mute/${group.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json()
      setMuted(data.muted)
      onMuteToggle?.(group.id, data.muted)
    } catch (_) { }
    setLoadingMute(false)
  }

  const handleKick = (memberId) => {
    if (!socket) return
    setKicking(null)
    socket.emit('group:kick', { groupId: group.id, memberId })
  }

  const handleLeave = () => {
    if (!socket) return
    socket.emit('group:leave', { groupId: group.id })
    onClose()
  }

  const handleSaveName = () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === groupName) { setEditingName(false); return }
    socket?.emit('group:rename', { groupId: group.id, name: trimmed })
    setGroupName(trimmed)
    onGroupUpdated?.({ groupId: group.id, name: trimmed })
    setEditingName(false)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return
    setLoadingAvatar(true)
    const form = new FormData()
    form.append('avatar', file)
    try {
      const r = await fetch(`/api/auth/groups/${group.id}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await r.json()
      if (data.avatar) {
        setGroupAvatar(data.avatar)
        onGroupUpdated?.({ groupId: group.id, avatar: data.avatar })
      }
    } catch (_) { }
    setLoadingAvatar(false)
  }

  const mediaMessages = messages.filter(m => m.attachment)
  const links = extractLinks(messages)

  const avatarUrl = groupAvatar ? `${SOCKET_URL}${groupAvatar}` : null

  const tabs = [
    { id: 'members', label: 'Membres', count: members.length },
    { id: 'media', label: 'Médias', count: mediaMessages.length },
    { id: 'links', label: 'Liens', count: links.length },
  ]

  return (
    <>
      {inline && (
        <style>{`@keyframes _panelIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      )}

      {/* Backdrop — only in floating mode */}
      {!inline && <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} />}

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
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Infos du groupe</span>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Group hero */}
          <div className="flex flex-col items-center py-6 px-4 border-b border-gray-100 dark:border-slate-700">
            {/* Avatar with edit button for admin */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={groupName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                    {groupName?.[0]?.toUpperCase()}
                  </div>
                )}
                {loadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={loadingAvatar}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: 'var(--accent, #3b82f6)', border: '2px solid white' }}
                  >
                    <Camera size={13} className="text-white" />
                  </button>
                  <input type="file" ref={avatarInputRef} onChange={handleAvatarChange}
                    accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" />
                </>
              )}
            </div>

            {/* Name with inline edit for admin */}
            {editingName ? (
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 text-center text-sm font-bold border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-800 dark:text-white outline-none"
                  autoFocus
                  maxLength={50}
                />
                <button onClick={handleSaveName} className="p-1 rounded-lg bg-green-600 text-white">
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{groupName}</p>
                {isAdmin && (
                  <button onClick={() => setEditingName(true)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <Pencil size={13} className="text-gray-400" />
                  </button>
                )}
              </div>
            )}

            <p className="text-sm text-gray-400">{members.length} membre{members.length !== 1 ? 's' : ''}</p>
            {isAdmin && (
              <span className="mt-1.5 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 font-medium">
                Admin
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 space-y-1 border-b border-gray-100 dark:border-slate-700">
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
                  {muted ? 'Les notifications sont désactivées' : 'Plus de notifications pour ce groupe'}
                </p>
              </div>
            </button>

            {!confirmLeave ? (
              <button
                onClick={() => setConfirmLeave(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={18} className="text-red-500 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Quitter le groupe</p>
                  <p className="text-xs text-gray-400">Vous ne pourrez plus voir les messages</p>
                </div>
              </button>
            ) : (
              <div className="px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400 mb-2 font-medium">
                  Quitter «&nbsp;{groupName}&nbsp;» ?
                </p>
                <div className="flex gap-2">
                  <button onClick={handleLeave}
                    className="flex-1 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                    Quitter
                  </button>
                  <button onClick={() => setConfirmLeave(false)}
                    className="flex-1 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 shrink-0">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === t.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400'}`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="ml-1 text-[10px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Members tab */}
          {tab === 'members' && (
            <div className="py-2">
              {members.map(member => {
                const mAvatar = member.avatar ? `${SOCKET_URL}${member.avatar}` : null
                const isCreator = member.id === group?.creatorId
                const isMe = member.id === currentUserId
                return (
                  <div key={member.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <Link to={`/social/user/${member.username}`} className="flex flex-1 min-w-0 items-center gap-3 hover:opacity-80 transition-opacity">
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                        {mAvatar ? (
                          <img src={mAvatar} alt={member.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {member.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{member.username}</span>
                          {isMe && <span className="text-[10px] text-gray-400">(vous)</span>}
                        </div>
                        {isCreator && (
                          <span className="text-[10px] text-purple-500 font-medium">Admin</span>
                        )}
                      </div>
                    </Link>
                    {isAdmin && !isMe && !isCreator && (
                      kicking === member.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleKick(member.id)}
                            className="text-[10px] px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            Exclure
                          </button>
                          <button onClick={() => setKicking(null)}
                            className="text-[10px] px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setKicking(member.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                          title={`Exclure ${member.username}`}>
                          <UserMinus size={15} />
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Media tab */}
          {tab === 'media' && (
            <div className="p-3">
              {mediaMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Aucun média partagé</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {mediaMessages.map((msg, i) => {
                    const att = msg.attachment
                    const secureUrl = `${SOCKET_URL}${getAttachmentUrl(att.url)}`
                    if (isImage(att.mimetype)) return (
                      <button key={i} type="button"
                        onClick={() => onPreview?.({ url: secureUrl, senderName: msg.senderUsername || '', senderAvatar: null })}
                        className="aspect-square rounded-lg overflow-hidden block bg-gray-100 dark:bg-slate-700 hover:opacity-80 transition-opacity">
                        <img src={secureUrl} alt={att.originalName} className="w-full h-full object-cover" />
                      </button>
                    )
                    if (isVideo(att.mimetype)) return (
                      <button key={i} type="button"
                        onClick={() => forceDownload(secureUrl, att.originalName)}
                        className="aspect-square rounded-lg flex items-center justify-center bg-gray-900 hover:opacity-80 transition-opacity">
                        <Video size={24} className="text-white" />
                      </button>
                    )
                    return (
                      <button key={i} type="button"
                        onClick={() => forceDownload(secureUrl, att.originalName)}
                        className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors p-2">
                        <File size={20} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{att.originalName}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Links tab */}
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
          <div className="h-2" />
        </div>
      </div>
    </>
  )
}
