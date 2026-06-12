import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  MessageCircle, X, Send, ArrowLeft, Users, User, Search,
  Smile, Reply, Pencil, Trash2, Check, CheckCheck, History, Loader2,
  Maximize2, MoreVertical, Plus, UserPlus, LogOut, Paperclip, Image, FileText, File, Download, Mic,
  Phone, Video, Forward, BellOff
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useCall } from '../contexts/CallContext'
import { SOCKET_URL, REACTION_EMOJIS, formatFileSize, forceDownload, getAttachmentUrl, getDmUnreadCount, uploadFile, formatTime, formatDateSeparator, getAvatarUrl, isDifferentDay } from '../utils/chat'
import { ForwardModal } from './ForwardModal'
import { ContactCard, parseContactShare } from './ContactCard'
import { MediaShareCard, parseMediaShare } from './MediaShareCard'
import { DmInfoPanel } from './DmInfoPanel'
import { GroupInfoPanel } from './GroupInfoPanel'
import VoiceRecorder from './VoiceRecorder'
import VoiceMessage from './VoiceMessage'
import { uploadVoiceMessage } from '../utils/audio'

export function ChatWidget() {
  const { user, isAuthenticated, getToken } = useAuth()
  const { socket, connected } = useSocket()
  const { initiateCall, activeCall } = useCall()
  const navigate = useNavigate()
  const location = useLocation()

  // Don't show widget on /chat page
  const isOnChatPage = location.pathname === '/social/chat'

  const [isOpen, setIsOpen] = useState(false)
  const [messageMenu, setMessageMenu] = useState(null) // message.id when menu is open
  const [convMenu, setConvMenu] = useState(null) // conv.id when menu is open
  const [groupMenu, setGroupMenu] = useState(null) // group.id when menu is open

  // View state: 'list' | 'group' | 'dm'
  const [view, setView] = useState('list')
  const [selectedDm, setSelectedDm] = useState(null)

  // Group chat state
  const [groupMessages, setGroupMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])

  // DM state
  const [conversations, setConversations] = useState([])
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const [hiddenConversations, setHiddenConversations] = useState(() => {
    const saved = localStorage.getItem('hiddenConversations')
    return saved ? JSON.parse(saved) : []
  })
  const [dmMessages, setDmMessages] = useState([])

  // Custom groups state
  const [customGroups, setCustomGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [customGroupMessages, setCustomGroupMessages] = useState([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [unreadDmCount, setUnreadDmCount] = useState(0)
  const [unreadMentions, setUnreadMentions] = useState(0)
  const [lastSeenGroupMessageId, setLastSeenGroupMessageId] = useState(() =>
    localStorage.getItem('lastSeenGroupMessageId') || null
  )
  const [dmTypingUsers, setDmTypingUsers] = useState([])
  const [dmReadStatus, setDmReadStatus] = useState(null) // { id, username, avatar, readAt }
  const dmTypingTimeoutRef = useRef(null)

  // Input state
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [forwardingMessage, setForwardingMessage] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const shareMedia = searchParams.get('shareMedia')
    if (shareMedia) {
      setForwardingMessage({ id: 'virtual', content: shareMedia, type: 'text', attachment: null })
      setSearchParams(prev => {
        prev.delete('shareMedia')
        return prev
      }, { replace: true })
      if (!isOpen && !isOnChatPage) setIsOpen(true)
    }
  }, [searchParams, isOpen, isOnChatPage, setSearchParams])
  const [showDmInfo, setShowDmInfo] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [dmSettings, setDmSettings] = useState({ muted: [], blocked: [] })
  const [editingMessage, setEditingMessage] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const [showEditHistory, setShowEditHistory] = useState(null)

  // Mention state
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [previewImage, setPreviewImage] = useState(null) // { url, senderName, senderAvatar }
  const fileInputRef = useRef(null)

  // Search users for new DM
  const [searchQuery, setSearchQuery] = useState('')
  const [allUsers, setAllUsers] = useState([])

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const selectedDmRef = useRef(selectedDm)
  const selectedGroupRef = useRef(selectedGroup)
  const viewRef = useRef(view)
  const isOpenRef = useRef(isOpen)

  // Keep refs in sync
  useEffect(() => { selectedDmRef.current = selectedDm }, [selectedDm])
  useEffect(() => { selectedGroupRef.current = selectedGroup }, [selectedGroup])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // Draft auto-save
  const newMessageRef = useRef(newMessage)
  useEffect(() => { newMessageRef.current = newMessage }, [newMessage])

  const getDraftKey = useCallback(() => {
    if (view === 'group') return 'draft_group'
    if (view === 'dm' && selectedDm) return `draft_dm_${selectedDm.id}`
    if (view === 'customGroup' && selectedGroup) return `draft_cg_${selectedGroup.id}`
    return null
  }, [view, selectedDm, selectedGroup])

  // Save on every keystroke
  useEffect(() => {
    const key = getDraftKey()
    if (!key) return
    if (newMessage) localStorage.setItem(key, newMessage)
    else localStorage.removeItem(key)
  }, [newMessage, getDraftKey])

  // Restore when conversation changes
  useEffect(() => {
    const key = getDraftKey()
    setNewMessage(key ? (localStorage.getItem(key) || '') : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedDm?.id, selectedGroup?.id])

  // Scroll to bottom
  const scrollInstantRef = useRef(false)
  const scrollToBottom = useCallback(() => {
    if (scrollInstantRef.current) {
      scrollInstantRef.current = false
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }), 50)
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [groupMessages, dmMessages, customGroupMessages, view, scrollToBottom])

  // Check if message mentions current user
  const checkMention = useCallback((content) => {
    if (!user?.username) return false
    const mentionRegex = new RegExp(`@${user.username}\\b`, 'i')
    return mentionRegex.test(content)
  }, [user?.username])

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return

    // Group chat events
    const handleHistory = (history) => {
      setGroupMessages(history)
      const lastSeen = localStorage.getItem('lastSeenGroupMessageId')
      if (lastSeen) {
        const lastSeenIndex = history.findIndex(m => m.id === lastSeen)
        const newMessages = lastSeenIndex >= 0 ? history.slice(lastSeenIndex + 1) : history
        const mentions = newMessages.filter(m =>
          m.userId !== user?.id && checkMention(m.content)
        ).length
        setUnreadMentions(mentions)
      }
    }

    const handleNewMessage = (message) => {
      setGroupMessages(prev => [...prev, message])
      if (message.userId !== user?.id && checkMention(message.content)) {
        if (!isOpenRef.current || viewRef.current !== 'group') {
          setUnreadMentions(prev => prev + 1)
        }
      }
    }

    const handleEdited = (msg) => setGroupMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
    const handleReacted = ({ messageId, reactions }) => setGroupMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
    const handleDeleted = ({ messageId }) => setGroupMessages(prev => prev.filter(m => m.id !== messageId))
    const handleOnline = (users) => setOnlineUsers(users)
    const handleTyping = (users) => setTypingUsers(users.filter(u => u !== user?.username))
    const handleReadUpdate = ({ userId, username, avatar, lastReadMessageId }) => {
      setGroupMessages(prev => prev.map(m => {
        if (!m.readBy) m.readBy = []
        const msgIndex = prev.findIndex(msg => msg.id === m.id)
        const lastReadIndex = prev.findIndex(msg => msg.id === lastReadMessageId)
        if (msgIndex <= lastReadIndex && m.userId !== userId) {
          const alreadyRead = m.readBy.some(r => r.userId === userId)
          if (!alreadyRead) {
            return { ...m, readBy: [...m.readBy, { userId, username, avatar, readAt: new Date().toISOString() }] }
          }
        }
        return m
      }))
    }

    // DM events
    const handleConversations = (convs) => {
      setConversations(convs || [])
      setConversationsLoaded(true)
      let unread = 0
      convs?.forEach(c => {
        unread += getDmUnreadCount(c.messages, user?.id)
      })
      setUnreadDmCount(unread)
    }

    const handleConversation = (conv) => {
      setConversations(prev => {
        const exists = prev.find(c => c.id === conv.id)
        if (exists) return prev
        return [conv, ...prev]
      })
    }

    const handleDmMessages = ({ conversationId, messages }) => {
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmMessages(messages)
      }
    }

    const handleDmNewMessage = ({ conversationId, message }) => {
      // Unhide conversation if it was hidden and a new message comes in
      setHiddenConversations(prev => {
        if (prev.includes(conversationId)) {
          const newHidden = prev.filter(id => id !== conversationId)
          localStorage.setItem('hiddenConversations', JSON.stringify(newHidden))
          return newHidden
        }
        return prev
      })

      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: [...(c.messages || []), message],
              lastMessage: { content: message.content, senderId: message.senderId, timestamp: message.timestamp, attachment: message.attachment || null },
              updatedAt: new Date().toISOString()
            }
          }
          return c
        })
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      })

      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmMessages(prev => [...prev, message])
        // Auto-mark as read if viewing this conversation and message is from other user
        if (message.senderId !== user?.id && isOpenRef.current && viewRef.current === 'dm') {
          socket.emit('dm:mark-read', { conversationId })
        }
      }

      if (message.senderId !== user?.id) {
        if (!isOpenRef.current || viewRef.current !== 'dm' || !selectedDmRef.current || !conversationId.includes(selectedDmRef.current.id)) {
          setUnreadDmCount(prev => prev + 1)
        }
      }
    }

    const handleDmTyping = ({ conversationId, typingUsers }) => {
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmTypingUsers(typingUsers.filter(u => u !== user?.username))
      }
    }

    const handleDmRead = ({ conversationId, readBy }) => {
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmReadStatus(readBy)
      }
      setDmMessages(prev => prev.map(m => {
        if (m.senderId === user?.id && !m.readBy?.some(r => r === readBy.id || r.id === readBy.id)) {
          return { ...m, readBy: [...(m.readBy || []), readBy] }
        }
        return m
      }))
    }

    const handleDmEdited = ({ conversationId, message }) => {
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmMessages(prev => prev.map(m => m.id === message.id ? message : m))
      }
    }

    const handleDmReacted = ({ conversationId, messageId, reactions }) => {
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
      }
    }

    const handleDmDeleted = ({ conversationId, messageId, lastMessage }) => {
      // Update conversation lastMessage AND remove deleted message from cached messages
      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage, messages: (c.messages || []).filter(m => m.id !== messageId) }
          : c
      ))
      // Remove from current DM view
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmMessages(prev => prev.filter(m => m.id !== messageId))
      }
    }

    const handleConversationDeleted = ({ conversationId }) => {
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      // If we're viewing this conversation, go back to list
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setSelectedDm(null)
        setDmMessages([])
        setView('list')
      }
    }

    // Custom group events
    const handleGroupList = (groups) => setCustomGroups(groups || [])
    const handleGroupCreated = (group) => {
      setCustomGroups(prev => {
        if (prev.some(g => g.id === group.id)) return prev
        return [group, ...prev]
      })
    }
    const handleGroupMessages = ({ groupId, messages }) => {
      if (selectedGroupRef.current?.id === groupId) {
        setCustomGroupMessages(messages)
      }
    }
    const handleGroupNewMessage = ({ groupId, message }) => {
      setCustomGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            messages: [...(g.messages || []), message],
            lastMessage: { content: message.content, senderId: message.senderId, senderUsername: message.senderUsername, timestamp: message.timestamp, attachment: message.attachment || null },
            updatedAt: new Date().toISOString()
          }
        }
        return g
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))

      if (selectedGroupRef.current?.id === groupId) {
        setCustomGroupMessages(prev => [...prev, message])
      }
    }
    const handleGroupReacted = ({ groupId, messageId, reactions }) => {
      if (selectedGroupRef.current?.id === groupId) {
        setCustomGroupMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
      }
    }
    const handleGroupEdited = ({ groupId, message }) => {
      if (selectedGroupRef.current?.id === groupId) {
        setCustomGroupMessages(prev => prev.map(m => m.id === message.id ? message : m))
      }
    }
    const handleGroupDeleted = ({ groupId, messageId, lastMessage }) => {
      // Update group lastMessage AND remove deleted message from cached messages
      setCustomGroups(prev => prev.map(g =>
        g.id === groupId
          ? { ...g, lastMessage, messages: (g.messages || []).filter(m => m.id !== messageId) }
          : g
      ))
      // Remove from current group view
      if (selectedGroupRef.current?.id === groupId) {
        setCustomGroupMessages(prev => prev.filter(m => m.id !== messageId))
      }
    }
    const handleGroupLeft = ({ groupId }) => {
      setCustomGroups(prev => prev.filter(g => g.id !== groupId))
      if (selectedGroupRef.current?.id === groupId) {
        setSelectedGroup(null)
        setCustomGroupMessages([])
        setView('list')
      }
    }
    const handleGroupMemberAdded = ({ groupId, member }) => {
      setCustomGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, members: [...g.members, member] }
        }
        return g
      }))
    }
    const handleGroupMemberLeft = ({ groupId, userId }) => {
      setCustomGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, members: g.members.filter(m => m.id !== userId) }
        }
        return g
      }))
    }
    const handleGroupUpdated = ({ groupId, name, avatar }) => {
      setCustomGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g
        return { ...g, ...(name !== undefined ? { name } : {}), ...(avatar !== undefined ? { avatar } : {}) }
      }))
      setSelectedGroup(prev => {
        if (!prev || prev.id !== groupId) return prev
        return { ...prev, ...(name !== undefined ? { name } : {}), ...(avatar !== undefined ? { avatar } : {}) }
      })
    }

    // Re-fetch conversations on every connect/reconnect
    const handleReconnect = () => {
      setConversationsLoaded(false)
      socket.emit('dm:get-conversations')
      socket.emit('group:get-all')
    }

    // Register listeners
    socket.on('connect', handleReconnect)
    socket.on('messages:history', handleHistory)
    socket.on('message:new', handleNewMessage)
    socket.on('message:edited', handleEdited)
    socket.on('message:reacted', handleReacted)
    socket.on('message:deleted', handleDeleted)
    socket.on('users:online', handleOnline)
    socket.on('typing:update', handleTyping)
    socket.on('messages:read-update', handleReadUpdate)
    socket.on('dm:conversations', handleConversations)
    socket.on('dm:conversation', handleConversation)
    socket.on('dm:messages', handleDmMessages)
    socket.on('dm:new-message', handleDmNewMessage)
    socket.on('dm:typing:update', handleDmTyping)
    socket.on('dm:read', handleDmRead)
    socket.on('dm:edited', handleDmEdited)
    socket.on('dm:reacted', handleDmReacted)
    socket.on('dm:deleted', handleDmDeleted)
    socket.on('dm:conversation-deleted', handleConversationDeleted)
    socket.on('group:list', handleGroupList)
    socket.on('group:created', handleGroupCreated)
    socket.on('group:messages', handleGroupMessages)
    socket.on('group:new-message', handleGroupNewMessage)
    socket.on('group:reacted', handleGroupReacted)
    socket.on('group:edited', handleGroupEdited)
    socket.on('group:deleted', handleGroupDeleted)
    socket.on('group:left', handleGroupLeft)
    socket.on('group:kicked', handleGroupLeft)
    socket.on('group:member-added', handleGroupMemberAdded)
    socket.on('group:member-left', handleGroupMemberLeft)
    socket.on('group:updated', handleGroupUpdated)

    // Request data now that listeners are registered
    if (connected) {
      socket.emit('dm:get-conversations')
      socket.emit('group:get-all')
    }

    // Cleanup listeners
    return () => {
      socket.off('connect', handleReconnect)
      socket.off('messages:history', handleHistory)
      socket.off('message:new', handleNewMessage)
      socket.off('message:edited', handleEdited)
      socket.off('message:reacted', handleReacted)
      socket.off('message:deleted', handleDeleted)
      socket.off('users:online', handleOnline)
      socket.off('typing:update', handleTyping)
      socket.off('messages:read-update', handleReadUpdate)
      socket.off('dm:conversations', handleConversations)
      socket.off('dm:conversation', handleConversation)
      socket.off('dm:messages', handleDmMessages)
      socket.off('dm:new-message', handleDmNewMessage)
      socket.off('dm:typing:update', handleDmTyping)
      socket.off('dm:read', handleDmRead)
      socket.off('dm:edited', handleDmEdited)
      socket.off('dm:reacted', handleDmReacted)
      socket.off('dm:deleted', handleDmDeleted)
      socket.off('dm:conversation-deleted', handleConversationDeleted)
      socket.off('group:list', handleGroupList)
      socket.off('group:created', handleGroupCreated)
      socket.off('group:messages', handleGroupMessages)
      socket.off('group:new-message', handleGroupNewMessage)
      socket.off('group:reacted', handleGroupReacted)
      socket.off('group:edited', handleGroupEdited)
      socket.off('group:deleted', handleGroupDeleted)
      socket.off('group:left', handleGroupLeft)
      socket.off('group:kicked', handleGroupLeft)
      socket.off('group:member-added', handleGroupMemberAdded)
      socket.off('group:member-left', handleGroupMemberLeft)
      socket.off('group:updated', handleGroupUpdated)
    }
  }, [socket, connected, user, checkMention])

  // Fetch mutual friends for DM search
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetch('/api/users/friends', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAllUsers(data.filter(u => u.id !== user?.id))
          }
        })
        .catch(() => { })
    }
  }, [isOpen, isAuthenticated, getToken, user])

  // Clear unread mentions and mark messages as read when viewing group chat
  useEffect(() => {
    if (isOpen && view === 'group' && groupMessages.length > 0 && socket && connected) {
      const lastMsgId = groupMessages[groupMessages.length - 1]?.id
      if (lastMsgId) {
        localStorage.setItem('lastSeenGroupMessageId', lastMsgId)
        setUnreadMentions(0)
        // Mark messages as read
        socket.emit('message:read', { messageId: lastMsgId })
      }
    }
  }, [isOpen, view, groupMessages, socket, connected])

  // Reset DM states when changing conversations
  useEffect(() => {
    setDmTypingUsers([])
    setDmReadStatus(null)
  }, [selectedDm?.id])

  // Close menus when view changes
  useEffect(() => {
    setMessageMenu(null)
    setShowReactionPicker(null)
    setShowEditHistory(null)
  }, [view])

  // Load DM settings (muted + blocked) once authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/auth/dm-settings', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => setDmSettings({ muted: data.muted || [], blocked: data.blocked || [] }))
      .catch(() => { })
  }, [isAuthenticated, getToken])

  // Total unread count for badge
  const totalUnread = unreadDmCount + unreadMentions

  // File upload helpers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 10MB)')
      return
    }

    setSelectedFile(file)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }


  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return Image
    if (mimetype === 'application/pdf') return FileText
    return File
  }



  // Format call duration: 65 → "1:05"
  const formatCallDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // Render a call system message (centered event card)
  const renderCallMessage = (message, isOwn) => {
    const att = message.attachment
    const isVideo = att.callType === 'video'
    const Icon = isVideo ? Video : Phone
    const missed = att.status === 'missed' || att.status === 'cancelled'
    const iconColor = missed ? '#ef4444' : '#22c55e'
    const outgoing = att.initiatorId === user?.id

    let label = ''
    if (att.status === 'ended') {
      label = `Appel ${isVideo ? 'vidéo' : 'audio'} · ${formatCallDuration(att.duration)}`
    } else if (att.status === 'missed') {
      label = outgoing ? 'Appel sans réponse' : 'Appel manqué'
    } else if (att.status === 'cancelled') {
      label = outgoing ? 'Appel annulé' : 'Appel annulé'
    } else {
      label = `Appel ${isVideo ? 'vidéo' : 'audio'}`
    }

    return (
      <div className="flex justify-center w-full my-1">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: missed ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${missed ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)'}`,
            color: 'var(--text-muted)',
          }}
        >
          <Icon size={12} color={iconColor} />
          <span>{label}</span>
          <span style={{ opacity: 0.55, fontSize: '10px' }}>{formatTime(message.timestamp)}</span>
        </div>
      </div>
    )
  }

  // Render attachment in message bubble
  const renderAttachment = (attachment, isOwn, senderName = null, senderAvatar = null) => {
    if (!attachment) return null

    if (attachment.mimetype?.startsWith('audio/')) {
      return <VoiceMessage attachment={{ ...attachment, url: getAttachmentUrl(attachment.url) }} isOwn={isOwn} />
    }

    const isImage = attachment.mimetype?.startsWith('image/')
    const FileIcon = getFileIcon(attachment.mimetype)

    const secureUrl = `${SOCKET_URL}${getAttachmentUrl(attachment.url)}`

    if (isImage) {
      return (
        <button
          type="button"
          onClick={() => setPreviewImage({
            url: secureUrl,
            senderName: senderName || 'Inconnu',
            senderAvatar: senderAvatar ? `${getAvatarUrl(senderAvatar)}` : null
          })}
          className="block mt-1 cursor-zoom-in"
        >
          <img
            src={secureUrl}
            alt={attachment.originalName}
            className="max-w-full max-h-48 rounded-lg object-contain"
          />
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={() => forceDownload(secureUrl, attachment.originalName)}
        className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg w-full text-left ${isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500'
          } transition-colors cursor-pointer`}
      >
        <FileIcon size={20} className={isOwn ? 'text-white' : 'text-gray-600 dark:text-gray-300'} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            {attachment.originalName}
          </p>
          <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatFileSize(attachment.size)}
          </p>
        </div>
        <Download size={16} className={isOwn ? 'text-white' : 'text-gray-500'} />
      </button>
    )
  }

  // Send group message
  const handleSendGroup = async (e) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !socket || !connected) return

    let attachment = null
    if (selectedFile) {
      attachment = await uploadFile(selectedFile, getToken, setUploading)
      if (!attachment && !newMessage.trim()) return // Upload failed and no text
    }

    socket.emit('message:send', {
      content: newMessage.trim(),
      replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.username, content: replyingTo.content.substring(0, 100) } : null,
      attachment
    })

    setNewMessage('')
    setReplyingTo(null)
    setShowMentions(false)
    clearFile()
    socket.emit('typing:stop')
  }

  // Send DM
  const handleSendDm = async (e) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !socket || !connected || !selectedDm) return

    let attachment = null
    if (selectedFile) {
      attachment = await uploadFile(selectedFile, getToken, setUploading)
      if (!attachment && !newMessage.trim()) return
    }

    socket.emit('dm:send', {
      targetUserId: selectedDm.id,
      content: newMessage.trim(),
      replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.senderUsername, content: replyingTo.content.substring(0, 100) } : null,
      attachment
    })

    setNewMessage('')
    setReplyingTo(null)
    clearFile()
    socket.emit('dm:typing:stop', { targetUserId: selectedDm.id })
  }

  // Handle DM input with typing indicator
  const handleDmInputChange = (e) => {
    const value = e.target.value
    setNewMessage(value)

    if (socket && connected && selectedDm) {
      socket.emit('dm:typing:start', { targetUserId: selectedDm.id })
      if (dmTypingTimeoutRef.current) clearTimeout(dmTypingTimeoutRef.current)
      dmTypingTimeoutRef.current = setTimeout(() => {
        socket.emit('dm:typing:stop', { targetUserId: selectedDm.id })
      }, 2000)
    }
  }

  // Start conversation with user
  const startConversation = (targetUser) => {
    if (!socket) return
    socket.emit('dm:start-conversation', { targetUserId: targetUser.id })
    setSelectedDm(targetUser)
    socket.emit('dm:get-messages', { targetUserId: targetUser.id })
    setView('dm')
    setSearchQuery('')
  }

  // Open existing conversation
  const openConversation = (conv) => {
    const otherParticipant = conv.participants.find(p => p.id !== user?.id)
    if (otherParticipant) {
      scrollInstantRef.current = true
      // Clear custom group state
      setSelectedGroup(null)
      setCustomGroupMessages([])
      // Set DM state
      setSelectedDm(otherParticipant)
      setDmMessages(conv.messages || [])
      setView('dm')

      // Mark as read and update unread count
      if (socket) {
        socket.emit('dm:mark-read', { conversationId: conv.id })
      }

      // Count unread in this conversation BEFORE updating
      const unreadInThisConv = conv.messages?.filter(m => m.senderId !== user?.id && !m.readBy?.includes(user?.id)).length || 0

      // Update local conversations state to mark messages as read
      setConversations(prev => prev.map(c => {
        if (c.id === conv.id) {
          return {
            ...c,
            messages: c.messages?.map(m => {
              if (m.senderId !== user?.id && !m.readBy?.includes(user?.id)) {
                return { ...m, readBy: [...(m.readBy || []), user?.id] }
              }
              return m
            })
          }
        }
        return c
      }))

      // Decrement unread count
      setUnreadDmCount(prev => Math.max(0, prev - unreadInThisConv))
    }
  }

  // Open custom group
  const openCustomGroup = (group) => {
    scrollInstantRef.current = true
    // Clear DM state
    setSelectedDm(null)
    setDmMessages([])
    // Set group state
    setSelectedGroup(group)
    setCustomGroupMessages(group.messages || [])
    setView('customGroup')
    if (socket) {
      socket.emit('group:get-messages', { groupId: group.id })
    }
  }

  // Create custom group
  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0 || !socket) return

    socket.emit('group:create', {
      name: newGroupName.trim(),
      memberIds: selectedMembers.map(m => m.id)
    })

    setShowCreateGroup(false)
    setNewGroupName('')
    setSelectedMembers([])
  }

  // Send message to custom group
  const handleSendCustomGroup = async (e) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !socket || !connected || !selectedGroup) return

    let attachment = null
    if (selectedFile) {
      attachment = await uploadFile(selectedFile, getToken, setUploading)
      if (!attachment && !newMessage.trim()) return
    }

    socket.emit('group:send', {
      groupId: selectedGroup.id,
      content: newMessage.trim(),
      replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.senderUsername, content: replyingTo.content.substring(0, 100) } : null,
      attachment
    })

    setNewMessage('')
    setReplyingTo(null)
    clearFile()
  }

  const handleSendVoice = async ({ blob, waveform, duration }) => {
    setIsRecording(false)
    const attachment = await uploadVoiceMessage(blob, waveform, duration, getToken, setUploading)
    if (!attachment) return

    if (view === 'group') {
      socket.emit('message:send', { content: '', replyTo: null, attachment })
    } else if (view === 'dm' && selectedDm) {
      socket.emit('dm:send', { targetUserId: selectedDm.id, content: '', replyTo: null, attachment })
    } else if (view === 'customGroup' && selectedGroup) {
      socket.emit('group:send', { groupId: selectedGroup.id, content: '', replyTo: null, attachment })
    }
  }

  // Toggle member selection
  const toggleMemberSelection = (u) => {
    setSelectedMembers(prev => {
      if (prev.some(m => m.id === u.id)) {
        return prev.filter(m => m.id !== u.id)
      }
      return [...prev, u]
    })
  }

  // Handle input change with mention detection
  const handleInputChange = (e) => {
    const value = e.target.value
    setNewMessage(value)

    // Check for @ mention (only in group chat)
    if (view === 'group') {
      const lastAtIndex = value.lastIndexOf('@')
      if (lastAtIndex !== -1) {
        const textAfterAt = value.slice(lastAtIndex + 1)
        if (!textAfterAt.includes(' ')) {
          setShowMentions(true)
          setMentionFilter(textAfterAt)
          setMentionIndex(0)
        } else {
          setShowMentions(false)
        }
      } else {
        setShowMentions(false)
      }
    }

    if (socket && connected) {
      socket.emit('typing:start')
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => socket.emit('typing:stop'), 2000)
    }
  }

  // Filter users for mention
  const filteredMentionUsers = onlineUsers.filter(u =>
    u.username.toLowerCase().includes(mentionFilter.toLowerCase()) && u.id !== user?.id
  )

  // Insert mention
  const insertMention = (username) => {
    const atIndex = newMessage.lastIndexOf('@')
    if (atIndex !== -1) {
      setNewMessage(newMessage.slice(0, atIndex) + '@' + username + ' ')
    }
    setShowMentions(false)
    inputRef.current?.focus()
  }

  // Open DM with mentioned user
  const openDmWithUser = (username) => {
    // Find user in allUsers or onlineUsers
    const targetUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) ||
      onlineUsers.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (targetUser && targetUser.id !== user?.id) {
      // Check if conversation already exists
      const existingConv = conversations.find(c =>
        c.participants.some(p => p.id === targetUser.id)
      )
      if (existingConv) {
        openConversation(existingConv)
      } else {
        startConversation(targetUser)
      }
    }
  }

  // Render mention content
  const renderMessageContent = (content, isOwn) => {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index))
      const mentionedUsername = match[1]
      const isMentioningMe = mentionedUsername.toLowerCase() === user?.username?.toLowerCase()
      parts.push(
        <button
          key={match.index}
          onClick={(e) => { e.stopPropagation(); openDmWithUser(mentionedUsername); }}
          className={`font-semibold cursor-pointer hover:underline ${isMentioningMe ? 'text-blue-500 dark:text-blue-400' : isOwn ? 'text-white/90' : 'text-blue-600 dark:text-blue-400'
            }`}
        >
          @{mentionedUsername}
        </button>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex))
    return parts.length > 0 ? parts : content
  }

  const stripFwd = (s) => s?.startsWith('fwd::') ? s.slice(5) : s

  const renderContent = (content, isOwn) => {
    const isForwarded = content?.startsWith('fwd::')
    const actualContent = isForwarded ? content.slice(5) : content

    const contact = parseContactShare(actualContent)
    if (contact) return (
      <>
        {isForwarded && <p className="text-[10px] font-medium mb-1 flex items-center gap-1" style={{ opacity: 0.6 }}>↪ Transféré</p>}
        <ContactCard data={contact} isOwn={isOwn} />
      </>
    )

    const media = parseMediaShare(actualContent)
    if (media) return (
      <>
        {isForwarded && <p className="text-[10px] font-medium mb-1 flex items-center gap-1" style={{ opacity: 0.6 }}>↪ Transféré</p>}
        <MediaShareCard data={media} isOwn={isOwn} />
      </>
    )
    return (
      <>
        {isForwarded && (
          <p className="text-[10px] font-medium mb-1 flex items-center gap-1" style={{ opacity: 0.6 }}>
            ↪ Transféré
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{renderMessageContent(actualContent, isOwn)}</p>
      </>
    )
  }

  const messagesMentioningMe = (content) => {
    if (!user?.username) return false
    return new RegExp(`@${user.username}\\b`, 'i').test(content)
  }


  // Handle reactions
  const handleReact = (messageId, emoji) => {
    if (socket) socket.emit('message:react', { messageId, emoji })
    setShowReactionPicker(null)
  }

  // Forward message to another conversation
  const handleForward = ({ type, id }) => {
    if (!forwardingMessage || !socket) return
    const rawContent = forwardingMessage.content || ''
    const content = rawContent.startsWith('fwd::') ? rawContent : 'fwd::' + rawContent
    const attachment = forwardingMessage.attachment || null
    if (!content.trim() && !attachment) return
    if (type === 'group') {
      socket.emit('message:send', { content, replyTo: null, attachment })
    } else if (type === 'dm') {
      socket.emit('dm:send', { targetUserId: id, content, replyTo: null, attachment })
    } else if (type === 'customGroup') {
      socket.emit('group:send', { groupId: id, content, replyTo: null, attachment })
    }
    setForwardingMessage(null)
  }

  // Delete message
  const handleDelete = (messageId) => {
    if (socket) socket.emit('message:delete', { messageId })
  }

  // Delete DM message (optimistic + emit)
  const handleDeleteDm = (messageId) => {
    setDmMessages(prev => prev.filter(m => m.id !== messageId))
    setConversations(prev => prev.map(c => {
      if (!selectedDm || !c.id.includes(selectedDm.id)) return c
      const msgs = (c.messages || []).filter(m => m.id !== messageId)
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null
      return { ...c, messages: msgs, lastMessage: lastMsg ? { content: lastMsg.content, senderId: lastMsg.senderId, timestamp: lastMsg.timestamp, attachment: lastMsg.attachment || null } : null }
    }))
    socket?.emit('dm:delete', { visavis: selectedDm.id, messageId })
    setMessageMenu(null)
  }

  // Delete group message (optimistic + emit)
  const handleDeleteGroup = (messageId) => {
    setCustomGroupMessages(prev => prev.filter(m => m.id !== messageId))
    setCustomGroups(prev => prev.map(g => {
      if (!selectedGroup || g.id !== selectedGroup.id) return g
      const msgs = (g.messages || []).filter(m => m.id !== messageId)
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null
      return { ...g, messages: msgs, lastMessage: lastMsg ? { content: lastMsg.content, senderId: lastMsg.senderId, senderUsername: lastMsg.senderUsername, timestamp: lastMsg.timestamp, attachment: lastMsg.attachment || null } : null }
    }))
    socket?.emit('group:delete', { groupId: selectedGroup.id, messageId })
    setMessageMenu(null)
  }

  // Edit message
  const handleEdit = () => {
    if (!editContent.trim() || !socket || !editingMessage) return
    if (editingMessage.isDm) {
      socket.emit('dm:edit', { visavis: selectedDm?.id, messageId: editingMessage.id, newContent: editContent.trim() })
    } else if (editingMessage.isCustomGroup) {
      socket.emit('group:edit', { groupId: selectedGroup?.id, messageId: editingMessage.id, newContent: editContent.trim() })
    } else {
      socket.emit('message:edit', { messageId: editingMessage.id, newContent: editContent.trim() })
    }
    setEditingMessage(null)
    setEditContent('')
  }

  // Search filtered users
  const searchedUsers = searchQuery.trim()
    ? allUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  if (isOnChatPage) return null

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          if (isAuthenticated) {
            setIsOpen(true)
          } else {
            navigate('/login', { state: { from: location.pathname } })
          }
        }}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-4 md:right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center justify-center transform hover:scale-105 active:scale-95"
      >
        <MessageCircle size={24} />
        {isAuthenticated && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

          {/* Modal Content */}
          <div className="relative w-full sm:max-w-lg h-[100dvh] sm:h-[600px] bg-white dark:bg-slate-800 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[100dvh]">
            {/* Hidden file input - always available */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                {view !== 'list' && (
                  <button onClick={() => { setView('list'); setSelectedDm(null); setDmMessages([]); setSelectedGroup(null); setCustomGroupMessages([]); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center">
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                  </button>
                )}
                {view === 'dm' && selectedDm ? (
                  <button
                    onClick={() => setShowDmInfo(true)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                      {selectedDm.avatar ? (
                        <img src={`${getAvatarUrl(selectedDm.avatar)}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                          {selectedDm.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white">{selectedDm.username}</span>
                    {dmSettings.muted.includes(selectedDm.id) && (
                      <BellOff size={13} className="text-gray-400" />
                    )}
                  </button>
                ) : view === 'customGroup' && selectedGroup ? (
                  <button
                    onClick={() => setShowGroupInfo(true)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{selectedGroup.name[0].toUpperCase()}</span>
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white">{selectedGroup.name}</span>
                    {dmSettings.muted.includes(selectedGroup.id) && (
                      <BellOff size={13} className="text-gray-400" />
                    )}
                  </button>
                ) : (
                  <h2 className="font-bold text-gray-800 dark:text-white">
                    {view === 'list' && 'Messages'}
                    {view === 'group' && 'Groupe TSI'}
                  </h2>
                )}
                {view === 'group' && connected && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    {onlineUsers.length} en ligne
                  </span>
                )}
                {view === 'customGroup' && selectedGroup && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedGroup.members.length} membres
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {(view === 'dm' && selectedDm) && (
                  <>
                    <button
                      onClick={() => initiateCall(selectedDm.id, 'audio', false)}
                      disabled={!!activeCall}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Appel audio"
                    >
                      <Phone size={17} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => initiateCall(selectedDm.id, 'video', false)}
                      disabled={!!activeCall}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Appel vidéo"
                    >
                      <Video size={17} className="text-gray-600 dark:text-gray-300" />
                    </button>
                  </>
                )}
                {(view === 'customGroup' && selectedGroup) && (
                  <>
                    <button
                      onClick={() => initiateCall(selectedGroup.id, 'audio', true, selectedGroup.members, selectedGroup.name)}
                      disabled={!!activeCall}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Appel audio de groupe"
                    >
                      <Phone size={17} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => initiateCall(selectedGroup.id, 'video', true, selectedGroup.members, selectedGroup.name)}
                      disabled={!!activeCall}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Appel vidéo de groupe"
                    >
                      <Video size={17} className="text-gray-600 dark:text-gray-300" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Pass current view state to Chat page
                    navigate('/social/chat', {
                      state: {
                        openView: view,
                        openDm: selectedDm,
                        conversations: conversations
                      }
                    })
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center"
                  title="Ouvrir en grand"
                >
                  <Maximize2 size={18} className="text-gray-600 dark:text-gray-300" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center">
                  <X size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Conversations List View */}
              {view === 'list' && (
                <div className="flex-1 overflow-y-auto">
                  {/* Group Chat Option */}
                  <button
                    onClick={() => { scrollInstantRef.current = true; setView('group') }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Users size={24} className="text-white" />
                      </div>
                      {unreadMentions > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {unreadMentions > 9 ? '9+' : unreadMentions}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-800 dark:text-white">Groupe TSI</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Chat de la classe</p>
                    </div>
                    {connected && <span className="w-2 h-2 bg-green-500 rounded-full" />}
                  </button>

                  {/* Search for new DM */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un utilisateur..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                      />
                    </div>

                    {/* Search Result - show only first match */}
                    {searchedUsers.length > 0 && (
                      <button
                        onClick={() => startConversation(searchedUsers[0])}
                        className="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                          {searchedUsers[0].username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <span className="font-medium text-gray-800 dark:text-white">{searchedUsers[0].username}</span>
                          <p className="text-xs text-gray-500">Cliquer pour démarrer une conversation</p>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Existing Conversations */}
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {conversations.filter(c => !hiddenConversations.includes(c.id)).map(conv => {
                      const other = conv.participants.find(p => p.id !== user?.id)
                      const unread = conv.messages?.filter(m => m.senderId !== user?.id && !m.readBy?.includes(user?.id)).length || 0
                      const isOnline = onlineUsers.some(u => u.id === other?.id)

                      return (
                        <div key={conv.id} className="relative flex items-center hover:bg-gray-50 dark:hover:bg-slate-700 group">
                          <button
                            onClick={() => openConversation(conv)}
                            className="flex-1 flex items-center gap-3 px-4 py-3"
                          >
                            <div className="relative w-12 h-12 shrink-0">
                              <div className="w-12 h-12 rounded-full overflow-hidden">
                                {other?.avatar ? (
                                  <img src={`${getAvatarUrl(other.avatar)}`} alt={other?.username} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                                    {other?.username?.[0]?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                              {isOnline && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-semibold text-gray-800 dark:text-white truncate">{other?.username || 'Utilisateur'}</p>
                              {conv.lastMessage && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {conv.lastMessage.senderId === user?.id && 'Vous: '}
                                  {conv.lastMessage.content || (conv.lastMessage.attachment ? '📎 Fichier' : '')}
                                </p>
                              )}
                            </div>
                            {unread > 0 && (
                              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                                {unread}
                              </span>
                            )}
                          </button>

                          {/* Conversation menu */}
                          <div className="relative pr-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setConvMenu(convMenu === conv.id ? null : conv.id); }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>

                            {convMenu === conv.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setConvMenu(null)} />
                                <div className="absolute z-20 right-0 top-full mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 py-1 min-w-[140px]">
                                  <button
                                    onClick={() => {
                                      // Hide conversation locally (visual only)
                                      const newHidden = [...hiddenConversations, conv.id]
                                      setHiddenConversations(newHidden)
                                      localStorage.setItem('hiddenConversations', JSON.stringify(newHidden))
                                      setConvMenu(null)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-red-500"
                                  >
                                    <Trash2 size={16} /> Masquer
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Custom Groups */}
                  {customGroups.length > 0 && (
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-700/50">
                        Groupes
                      </div>
                      {customGroups.map(group => (
                        <div key={group.id} className="relative flex items-center hover:bg-gray-50 dark:hover:bg-slate-700 group">
                          <button
                            onClick={() => openCustomGroup(group)}
                            className="flex-1 flex items-center gap-3 px-4 py-3"
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                              {group.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-semibold text-gray-800 dark:text-white truncate">{group.name}</p>
                              {group.lastMessage && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {group.lastMessage.senderUsername}: {group.lastMessage.content}
                                </p>
                              )}
                              {!group.lastMessage && (
                                <p className="text-sm text-gray-400 dark:text-gray-500">{group.members.length} membres</p>
                              )}
                            </div>
                          </button>

                          {/* Group menu */}
                          <div className="relative pr-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setGroupMenu(groupMenu === group.id ? null : group.id); }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>

                            {groupMenu === group.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setGroupMenu(null)} />
                                <div className="absolute z-20 right-0 top-full mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 py-1 min-w-[160px]">
                                  <button
                                    onClick={() => {
                                      if (socket && window.confirm('Voulez-vous vraiment quitter ce groupe ?')) {
                                        socket.emit('group:leave', { groupId: group.id })
                                      }
                                      setGroupMenu(null)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-red-500"
                                  >
                                    <LogOut size={16} /> Quitter le groupe
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create Group Button */}
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-gray-100 dark:border-slate-700"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Plus size={24} />
                    </div>
                    <span className="font-medium">Créer un groupe</span>
                  </button>

                  {!connected && !conversationsLoaded ? (
                    <div className="p-8 text-center text-gray-400">
                      <Loader2 size={40} className="mx-auto mb-2 animate-spin opacity-50" />
                      <p className="text-sm">Connexion en cours...</p>
                    </div>
                  ) : connected && !conversationsLoaded ? (
                    <div className="p-8 text-center text-gray-400">
                      <Loader2 size={40} className="mx-auto mb-2 animate-spin opacity-50" />
                      <p className="text-sm">Chargement...</p>
                    </div>
                  ) : conversations.filter(c => !hiddenConversations.includes(c.id)).length === 0 && customGroups.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                      <MessageCircle size={40} className="mx-auto mb-2 opacity-50" />
                      <p>Aucune conversation</p>
                      <p className="text-sm">Recherchez un utilisateur pour commencer</p>
                    </div>
                  )}
                </div>
              )}

              {/* Group Chat View */}
              {view === 'group' && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {groupMessages.map((message, index) => {
                      const isOwn = message.userId === user?.id
                      const showDateSep = isDifferentDay(message.timestamp, groupMessages[index - 1]?.timestamp)
                      // Find users whose last read message is this one
                      const readersAtThisMessage = message.readBy?.filter(reader => {
                        // Check if this is the last message this user has read
                        const laterMessagesReadByThisUser = groupMessages.slice(index + 1).some(
                          m => m.readBy?.some(r => r.userId === reader.userId)
                        )
                        return !laterMessagesReadByThisUser
                      }) || []

                      return (
                        <div key={message.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {showDateSep && (
                            <div className="flex items-center gap-3 w-full my-2 self-center">
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{formatDateSeparator(message.timestamp)}</span>
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                            </div>
                          )}
                          <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} group w-full`}>
                            {!isOwn && (
                              <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
                                {message.avatar ? (
                                  <img src={`${getAvatarUrl(message.avatar)}`} alt={message.username} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                    {message.username[0].toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                              {!isOwn && <p className="text-[10px] text-gray-500 mb-0.5 ml-1">{message.username}</p>}

                              {message.replyTo && (
                                <div className={`mb-1 px-2 py-1 rounded text-[10px] border-l-2 border-blue-400 ${isOwn ? 'bg-blue-700/50 text-blue-100' : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-200'}`}>
                                  <span className="font-medium">{message.replyTo.username || message.replyTo.senderUsername || 'Utilisateur'}</span>
                                  <p className="truncate opacity-75">{stripFwd(message.replyTo.content)}</p>
                                </div>
                              )}

                              <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-blue-600 text-white rounded-br-sm' :
                                messagesMentioningMe(message.content) ? 'bg-blue-50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 rounded-bl-sm' :
                                  'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-sm'
                                }`}>
                                {message.content && renderContent(message.content, isOwn)}
                                {renderAttachment(message.attachment, isOwn, message.username, message.avatar)}
                              </div>

                              {/* Reactions */}
                              {message.reactions?.length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                  {Object.values(message.reactions.reduce((acc, r) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] }
                                    acc[r.emoji].count++
                                    acc[r.emoji].users.push(r.username)
                                    return acc
                                  }, {})).map(({ emoji, count, users }) => (
                                    <button key={emoji} onClick={() => handleReact(message.id, emoji)} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-slate-600" title={users.join(', ')}>
                                      {emoji} {count}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                <span className="text-[10px] text-gray-400">{formatTime(message.timestamp)}</span>
                                {message.isEdited && (
                                  <button onClick={() => setShowEditHistory(showEditHistory === message.id ? null : message.id)} className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                    <History size={10} /> modifié
                                  </button>
                                )}
                                {isOwn && !message.readBy?.length && <Check size={12} className="text-gray-400" />}
                              </div>

                              {showEditHistory === message.id && message.editHistory?.length > 0 && (
                                <div className={`mt-1 flex flex-col gap-1 ${isOwn ? 'items-end' : ''}`}>
                                  {message.editHistory.slice(-3).reverse().map((edit, idx) => (
                                    <div key={idx} className={`px-2 py-1 rounded text-[10px] ${isOwn ? 'bg-blue-500/50 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200'}`}>
                                      <p className="opacity-75">{new Date(edit.editedAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                                      <p className="line-through">{edit.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Quick actions - "..." button */}
                            <div className="relative self-center">
                              <button
                                onClick={() => setMessageMenu(messageMenu === message.id ? null : message.id)}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>

                              {/* Dropdown menu - centered */}
                              {messageMenu === message.id && (
                                <>
                                  {/* Backdrop to close menu */}
                                  <div className="fixed inset-0 z-10" onClick={() => setMessageMenu(null)} />

                                  <div className={`absolute z-20 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-gray-200 dark:border-slate-600 py-1 min-w-[140px]`}>
                                    {/* Emoji reactions */}
                                    <div className="px-2 py-1.5 border-b border-gray-100 dark:border-slate-600">
                                      <div className="flex gap-1 justify-center">
                                        {REACTION_EMOJIS.slice(0, 6).map(emoji => (
                                          <button
                                            key={emoji}
                                            onClick={() => { handleReact(message.id, emoji); setMessageMenu(null); }}
                                            className="hover:scale-125 transition-transform text-lg"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Reply */}
                                    <button
                                      onClick={() => { setReplyingTo(message); setMessageMenu(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                    >
                                      <Reply size={16} /> Répondre
                                    </button>

                                    {/* Forward */}
                                    <button
                                      onClick={() => { setForwardingMessage(message); setMessageMenu(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                    >
                                      <Forward size={16} /> Transférer
                                    </button>

                                    {/* Edit (own messages only) */}
                                    {isOwn && (
                                      <button
                                        onClick={() => { setEditingMessage(message); setEditContent(message.content); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                      >
                                        <Pencil size={16} /> Modifier
                                      </button>
                                    )}

                                    {/* Delete (own messages only) */}
                                    {isOwn && (
                                      <button
                                        onClick={() => { handleDelete(message.id); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-red-500"
                                      >
                                        <Trash2 size={16} /> Supprimer
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Read receipt avatars - show who has read up to this message */}
                          {isOwn && readersAtThisMessage.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-0.5 mr-1" title={readersAtThisMessage.map(r => r.username).join(', ')}>
                              <span className="text-[9px] text-gray-400 mr-0.5">Vu par</span>
                              <div className="flex -space-x-1">
                                {readersAtThisMessage.slice(0, 5).map(reader => (
                                  <div key={reader.userId} className="w-4 h-4 rounded-full overflow-hidden border border-white dark:border-slate-800">
                                    {reader.avatar ? (
                                      <img src={`${getAvatarUrl(reader.avatar)}`} alt={reader.username} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[7px] font-bold">
                                        {reader.username?.[0]?.toUpperCase() || '?'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {readersAtThisMessage.length > 5 && (
                                  <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-[7px] text-gray-600 dark:text-gray-300 border border-white dark:border-slate-800">
                                    +{readersAtThisMessage.length - 5}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Group Typing indicator - above input */}
                  {typingUsers.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'écrit' : 'écrivent'}...
                    </div>
                  )}

                  {/* Reply indicator */}
                  {replyingTo && (
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-t flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-blue-600 font-medium">Réponse à {replyingTo.username}</span>
                        <p className="text-gray-500 truncate text-xs">{stripFwd(replyingTo.content)}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)}><X size={16} className="text-gray-400" /></button>
                    </div>
                  )}

                  {/* File Preview */}
                  {selectedFile && (
                    <div className="px-3 py-2 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      <div className="flex items-center gap-2">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                            {(() => { const Icon = getFileIcon(selectedFile.type); return <Icon size={24} className="text-gray-500" /> })()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button type="button" onClick={clearFile} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">
                          <X size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <form onSubmit={handleSendGroup} className="p-3 border-t border-gray-200 dark:border-slate-700 relative">
                    {showMentions && filteredMentionUsers.length > 0 && (
                      <div className="absolute bottom-full left-3 right-3 mb-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border max-h-32 overflow-y-auto">
                        {filteredMentionUsers.map((u, idx) => (
                          <button key={u.id} type="button" onClick={() => insertMention(u.username)} className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-600 text-sm ${idx === mentionIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                              {u.username[0].toUpperCase()}
                            </div>
                            <span className="text-gray-800 dark:text-white">@{u.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {isRecording ? (
                      <VoiceRecorder
                        onSend={handleSendVoice}
                        onCancel={() => setIsRecording(false)}
                        compact
                      />
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!connected || uploading}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 flex items-center justify-center"
                        >
                          <Paperclip size={18} />
                        </button>
                        <input
                          ref={inputRef}
                          type="text"
                          value={newMessage}
                          onChange={handleInputChange}
                          placeholder="Message... (@ pour mentionner)"
                          disabled={!connected || uploading}
                          className="flex-1 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                        />
                        {!newMessage.trim() && !selectedFile ? (
                          <button
                            type="button"
                            onClick={() => setIsRecording(true)}
                            disabled={!connected || uploading}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 flex items-center justify-center"
                          >
                            <Mic size={18} />
                          </button>
                        ) : (
                          <button type="submit" disabled={(!newMessage.trim() && !selectedFile) || !connected || uploading} className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 flex items-center justify-center">
                            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* DM View */}
              {view === 'dm' && selectedDm && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {dmMessages.map((message, index) => {
                      const isOwn = message.senderId === user?.id
                      const isLastOwnMessage = isOwn && index === dmMessages.map((m, i) => m.senderId === user?.id ? i : -1).filter(i => i !== -1).pop()
                      const hasBeenRead = message.readBy?.length > 0
                      const showDateSep = isDifferentDay(message.timestamp, dmMessages[index - 1]?.timestamp)

                      return (
                        <div key={message.id} className={`flex flex-col ${message.attachment?.type === 'call' ? 'items-center' : isOwn ? 'items-end' : 'items-start'}`}>
                          {showDateSep && (
                            <div className="flex items-center gap-3 w-full my-2 self-center">
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{formatDateSeparator(message.timestamp)}</span>
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                            </div>
                          )}
                          {message.attachment?.type === 'call' ? (
                            renderCallMessage(message, isOwn)
                          ) : (
                            <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} group w-full`}>
                              {!isOwn && (
                                <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
                                  {message.senderAvatar ? (
                                    <img src={`${getAvatarUrl(message.senderAvatar)}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                                      {message.senderUsername?.[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className={`${message.attachment?.mimetype?.startsWith('audio/') ? 'flex-1 ' : ''}max-w-[70%]`}>
                                {/* Reply indicator */}
                                {message.replyTo && (
                                  <div className={`mb-1 px-2 py-1 rounded text-[10px] border-l-2 border-blue-400 ${isOwn ? 'bg-blue-700/50 text-blue-100' : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-200'}`}>
                                    <span className="font-medium">{message.replyTo.username || message.replyTo.senderUsername || 'Utilisateur'}</span>
                                    <p className="truncate opacity-75">{stripFwd(message.replyTo.content)}</p>
                                  </div>
                                )}

                                <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-sm'}`}>
                                  {message.content && renderContent(message.content, isOwn)}
                                  {renderAttachment(message.attachment, isOwn, message.senderUsername, message.senderAvatar)}
                                </div>

                                {/* Reactions */}
                                {message.reactions?.length > 0 && (
                                  <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                    {Object.values(message.reactions.reduce((acc, r) => {
                                      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] }
                                      acc[r.emoji].count++
                                      acc[r.emoji].users.push(r.username)
                                      return acc
                                    }, {})).map(({ emoji, count, users }) => (
                                      <button key={emoji} onClick={() => socket?.emit('dm:react', { visavis: selectedDm.id, messageId: message.id, emoji })} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-slate-600" title={users.join(', ')}>
                                        {emoji} {count}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                  <span className="text-[10px] text-gray-400">{formatTime(message.timestamp)}</span>
                                  {message.isEdited && <span className="text-[10px] text-gray-400">(modifié)</span>}
                                  {isOwn && (hasBeenRead ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} className="text-gray-400" />)}
                                </div>
                              </div>

                              {/* DM Message menu "..." */}
                              <div className="relative self-center">
                                <button
                                  onClick={() => setMessageMenu(messageMenu === message.id ? null : message.id)}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical size={16} className="text-gray-400" />
                                </button>

                                {messageMenu === message.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMessageMenu(null)} />
                                    <div className={`absolute z-20 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-gray-200 dark:border-slate-600 py-1 min-w-[140px]`}>
                                      {/* Emoji reactions */}
                                      <div className="px-2 py-1.5 border-b border-gray-100 dark:border-slate-600">
                                        <div className="flex gap-1 justify-center">
                                          {REACTION_EMOJIS.slice(0, 6).map(emoji => (
                                            <button
                                              key={emoji}
                                              onClick={() => { socket?.emit('dm:react', { visavis: selectedDm.id, messageId: message.id, emoji }); setMessageMenu(null); }}
                                              className="hover:scale-125 transition-transform text-lg"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Reply */}
                                      <button
                                        onClick={() => { setReplyingTo(message); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                      >
                                        <Reply size={16} /> Répondre
                                      </button>

                                      {/* Forward */}
                                      {message.content && (
                                        <button
                                          onClick={() => { setForwardingMessage(message); setMessageMenu(null); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                        >
                                          <Forward size={16} /> Transférer
                                        </button>
                                      )}

                                      {/* Edit (own messages only) */}
                                      {isOwn && (
                                        <button
                                          onClick={() => { setEditingMessage({ ...message, isDm: true }); setEditContent(message.content); setMessageMenu(null); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                        >
                                          <Pencil size={16} /> Modifier
                                        </button>
                                      )}

                                      {/* Delete (own messages only) */}
                                      {isOwn && (
                                        <button
                                          onClick={() => handleDeleteDm(message.id)}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-red-500"
                                        >
                                          <Trash2 size={16} /> Supprimer
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Read receipt - show at last own message if read */}
                          {isLastOwnMessage && hasBeenRead && (() => {
                            const readEntry = message.readBy?.find(r => typeof r === 'object' && r.readAt)
                            const readAt = readEntry?.readAt ? new Date(readEntry.readAt) : null
                            const isRecent = readAt && (Date.now() - readAt.getTime()) < 60000
                            return (
                              <div className="flex items-center gap-1 mt-1 mr-1">
                                <span className="text-[9px] text-gray-400">
                                  {isRecent || !readAt ? 'Vu à l\'instant' : `Vu ${readAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${readAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                    {/* En cours pseudo-message */}
                    {activeCall && !activeCall.isGroup && activeCall.status === 'connected' &&
                      (activeCall.targetId === selectedDm?.id || activeCall.callerId === selectedDm?.id) && (
                        <div className="flex justify-center w-full my-1">
                          <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium animate-pulse"
                            style={{
                              background: 'rgba(34,197,94,0.1)',
                              border: '1px solid rgba(34,197,94,0.25)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {activeCall.callType === 'video' ? <Video size={12} color="#22c55e" /> : <Phone size={12} color="#22c55e" />}
                            <span>Appel {activeCall.callType === 'video' ? 'vidéo' : 'audio'} en cours…</span>
                          </div>
                        </div>
                      )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* DM Typing indicator - above input */}
                  {dmTypingUsers.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      {selectedDm.username} écrit...
                    </div>
                  )}

                  {/* Reply indicator for DM */}
                  {replyingTo && view === 'dm' && (
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-t flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-blue-600 font-medium">Réponse à {replyingTo.senderUsername}</span>
                        <p className="text-gray-500 truncate text-xs">{stripFwd(replyingTo.content)}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)}><X size={16} className="text-gray-400" /></button>
                    </div>
                  )}

                  {/* File Preview for DM */}
                  {selectedFile && view === 'dm' && (
                    <div className="px-3 py-2 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      <div className="flex items-center gap-2">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                            {(() => { const Icon = getFileIcon(selectedFile.type); return <Icon size={24} className="text-gray-500" /> })()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button type="button" onClick={clearFile} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">
                          <X size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendDm} className="p-3 border-t border-gray-200 dark:border-slate-700">
                    {isRecording ? (
                      <VoiceRecorder
                        onSend={handleSendVoice}
                        onCancel={() => setIsRecording(false)}
                        compact
                      />
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!connected || uploading}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 flex items-center justify-center"
                        >
                          <Paperclip size={18} />
                        </button>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={handleDmInputChange}
                          placeholder="Message..."
                          disabled={!connected || uploading}
                          className="flex-1 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                        />
                        {!newMessage.trim() && !selectedFile ? (
                          <button
                            type="button"
                            onClick={() => setIsRecording(true)}
                            disabled={!connected || uploading}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 flex items-center justify-center"
                          >
                            <Mic size={18} />
                          </button>
                        ) : (
                          <button type="submit" disabled={(!newMessage.trim() && !selectedFile) || !connected || uploading} className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 flex items-center justify-center">
                            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* Custom Group View */}
              {view === 'customGroup' && selectedGroup && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {customGroupMessages.map((message, index) => {
                      const isOwn = message.senderId === user?.id
                      const showDateSep = isDifferentDay(message.timestamp, customGroupMessages[index - 1]?.timestamp)

                      // System message rendering
                      if (message.isSystem) {
                        return (
                          <div key={message.id} className="flex flex-col items-center">
                            {showDateSep && (
                              <div className="flex items-center gap-3 w-full my-2">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                                <span className="text-xs text-gray-400 font-medium">{formatDateSeparator(message.timestamp)}</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                              </div>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700/60 px-3 py-1 rounded-full my-1">
                              {message.content}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div key={message.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {showDateSep && (
                            <div className="flex items-center gap-3 w-full my-2 self-center">
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{formatDateSeparator(message.timestamp)}</span>
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                            </div>
                          )}
                          <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} group w-full`}>
                            {!isOwn && (
                              <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
                                {message.senderAvatar ? (
                                  <img src={`${getAvatarUrl(message.senderAvatar)}`} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                    {message.senderUsername?.[0]?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={`${message.attachment?.mimetype?.startsWith('audio/') ? 'flex-1 ' : ''}max-w-[70%]`}>
                              {!isOwn && <p className="text-[10px] text-gray-500 mb-0.5 ml-1">{message.senderUsername}</p>}

                              {message.replyTo && (
                                <div className={`mb-1 px-2 py-1 rounded text-[10px] border-l-2 border-purple-400 ${isOwn ? 'bg-purple-700/50 text-purple-100' : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-200'}`}>
                                  <span className="font-medium">{message.replyTo.username || message.replyTo.senderUsername || 'Utilisateur'}</span>
                                  <p className="truncate opacity-75">{stripFwd(message.replyTo.content)}</p>
                                </div>
                              )}

                              <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-sm'}`}>
                                {message.content && renderContent(message.content, isOwn)}
                                {renderAttachment(message.attachment, isOwn, message.senderUsername, message.senderAvatar)}
                              </div>

                              {/* Reactions */}
                              {message.reactions?.length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                  {Object.values(message.reactions.reduce((acc, r) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] }
                                    acc[r.emoji].count++
                                    acc[r.emoji].users.push(r.username)
                                    return acc
                                  }, {})).map(({ emoji, count, users }) => (
                                    <button key={emoji} onClick={() => socket?.emit('group:react', { groupId: selectedGroup.id, messageId: message.id, emoji })} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-slate-600" title={users.join(', ')}>
                                      {emoji} {count}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                <span className="text-[10px] text-gray-400">{formatTime(message.timestamp)}</span>
                                {message.isEdited && <span className="text-[10px] text-gray-400">(modifié)</span>}
                              </div>
                            </div>

                            {/* Group message menu */}
                            <div className="relative self-center">
                              <button
                                onClick={() => setMessageMenu(messageMenu === message.id ? null : message.id)}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>

                              {messageMenu === message.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setMessageMenu(null)} />
                                  <div className={`absolute z-20 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-gray-200 dark:border-slate-600 py-1 min-w-[140px]`}>
                                    <div className="px-2 py-1.5 border-b border-gray-100 dark:border-slate-600">
                                      <div className="flex gap-1 justify-center">
                                        {REACTION_EMOJIS.slice(0, 6).map(emoji => (
                                          <button
                                            key={emoji}
                                            onClick={() => { socket?.emit('group:react', { groupId: selectedGroup.id, messageId: message.id, emoji }); setMessageMenu(null); }}
                                            className="hover:scale-125 transition-transform text-lg"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => { setReplyingTo(message); setMessageMenu(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                    >
                                      <Reply size={16} /> Répondre
                                    </button>
                                    {message.content && (
                                      <button
                                        onClick={() => { setForwardingMessage(message); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                      >
                                        <Forward size={16} /> Transférer
                                      </button>
                                    )}
                                    {isOwn && (
                                      <>
                                        <button
                                          onClick={() => { setEditingMessage({ ...message, isCustomGroup: true }); setEditContent(message.content); setMessageMenu(null); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-gray-700 dark:text-gray-200"
                                        >
                                          <Pencil size={16} /> Modifier
                                        </button>
                                        <button
                                          onClick={() => handleDeleteGroup(message.id)}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600 text-sm text-red-500"
                                        >
                                          <Trash2 size={16} /> Supprimer
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply indicator for custom group */}
                  {replyingTo && view === 'customGroup' && (
                    <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border-t flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-purple-600 font-medium">Réponse à {replyingTo.senderUsername}</span>
                        <p className="text-gray-500 truncate text-xs">{stripFwd(replyingTo.content)}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)}><X size={16} className="text-gray-400" /></button>
                    </div>
                  )}

                  {/* File Preview for custom group */}
                  {selectedFile && view === 'customGroup' && (
                    <div className="px-3 py-2 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      <div className="flex items-center gap-2">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                            {(() => { const Icon = getFileIcon(selectedFile.type); return <Icon size={24} className="text-gray-500" /> })()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button type="button" onClick={clearFile} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">
                          <X size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendCustomGroup} className="p-3 border-t border-gray-200 dark:border-slate-700">
                    {isRecording ? (
                      <VoiceRecorder
                        onSend={handleSendVoice}
                        onCancel={() => setIsRecording(false)}
                        compact
                      />
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!connected || uploading}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 flex items-center justify-center"
                        >
                          <Paperclip size={18} />
                        </button>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Message..."
                          disabled={!connected || uploading}
                          className="flex-1 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
                        />
                        {!newMessage.trim() && !selectedFile ? (
                          <button
                            type="button"
                            onClick={() => setIsRecording(true)}
                            disabled={!connected || uploading}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 flex items-center justify-center"
                          >
                            <Mic size={18} />
                          </button>
                        ) : (
                          <button type="submit" disabled={(!newMessage.trim() && !selectedFile) || !connected || uploading} className="p-2 bg-purple-600 text-white rounded-full disabled:opacity-50 flex items-center justify-center">
                            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>

            {/* Info panels — inline inside the widget bounds */}
            {showGroupInfo && selectedGroup && (
              <GroupInfoPanel
                inline
                group={selectedGroup}
                messages={customGroupMessages}
                currentUserId={user?.id}
                dmSettings={dmSettings}
                token={getToken()}
                socket={socket}
                onPreview={(img) => setPreviewImage(img)}
                onMuteToggle={(groupId, isMuted) => setDmSettings(prev => ({
                  ...prev,
                  muted: isMuted ? [...prev.muted, groupId] : prev.muted.filter(id => id !== groupId)
                }))}
                onGroupUpdated={({ groupId, name, avatar }) => {
                  setCustomGroups(prev => prev.map(g => g.id !== groupId ? g : { ...g, ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) }))
                  setSelectedGroup(prev => prev?.id === groupId ? { ...prev, ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) } : prev)
                }}
                onClose={() => setShowGroupInfo(false)}
              />
            )}
            {showDmInfo && selectedDm && (
              <DmInfoPanel
                inline
                contact={selectedDm}
                messages={dmMessages}
                conversations={conversations}
                customGroups={customGroups}
                currentUserId={user?.id}
                dmSettings={dmSettings}
                token={getToken()}
                socket={socket}
                onPreview={(img) => setPreviewImage(img)}
                onMuteToggle={(userId, isMuted) => setDmSettings(prev => ({
                  ...prev,
                  muted: isMuted ? [...prev.muted, userId] : prev.muted.filter(id => id !== userId)
                }))}
                onBlockToggle={(userId, isBlocked) => setDmSettings(prev => ({
                  ...prev,
                  blocked: isBlocked ? [...prev.blocked, userId] : prev.blocked.filter(id => id !== userId)
                }))}
                onClose={() => setShowDmInfo(false)}
              />
            )}
          </div>
        </div>
      )
      }

      {/* Edit Modal */}
      {
        editingMessage && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-white">
                <Pencil size={18} /> Modifier le message
              </h3>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button onClick={handleEdit} disabled={!editContent.trim()} className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  Enregistrer
                </button>
                <button onClick={() => { setEditingMessage(null); setEditContent(''); }} className="flex-1 py-2 border rounded-lg text-gray-600 dark:text-gray-300">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Create Group Modal */}
      {
        showCreateGroup && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-4 max-h-[80vh] flex flex-col">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-white">
                <Users size={18} /> Créer un groupe
              </h3>

              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nom du groupe..."
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />

              <p className="text-sm text-gray-500 mb-2">Sélectionner les membres :</p>

              <div className="flex-1 overflow-y-auto border dark:border-slate-600 rounded-lg mb-3 max-h-[200px]">
                {allUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => toggleMemberSelection(u)}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 ${selectedMembers.some(m => m.id === u.id) ? 'bg-purple-50 dark:bg-purple-900/30' : ''
                      }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      {u.avatar ? (
                        <img src={`${getAvatarUrl(u.avatar)}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                          {u.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-left text-gray-800 dark:text-white">{u.username}</span>
                    {selectedMembers.some(m => m.id === u.id) && (
                      <Check size={18} className="text-purple-600" />
                    )}
                  </button>
                ))}
              </div>

              {selectedMembers.length > 0 && (
                <p className="text-sm text-gray-500 mb-3">
                  {selectedMembers.length} membre{selectedMembers.length > 1 ? 's' : ''} sélectionné{selectedMembers.length > 1 ? 's' : ''}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                >
                  Créer
                </button>
                <button
                  onClick={() => { setShowCreateGroup(false); setNewGroupName(''); setSelectedMembers([]); }}
                  className="flex-1 py-2 border rounded-lg text-gray-600 dark:text-gray-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Forward Modal */}
      {
        forwardingMessage && (
          <ForwardModal
            message={forwardingMessage}
            conversations={conversations}
            customGroups={customGroups}
            currentUserId={user?.id}
            onForward={handleForward}
            onClose={() => setForwardingMessage(null)}
          />
        )
      }

      {/* Fullscreen Image Preview Modal */}
      {
        previewImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            {/* Header with sender info */}
            <div className="absolute top-4 left-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-10 rounded-full overflow-hidden">
                {previewImage.senderAvatar ? (
                  <img src={previewImage.senderAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                    {previewImage.senderName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <span className="text-white font-medium text-lg">{previewImage.senderName}</span>
            </div>

            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/50 rounded-full"
            >
              <X size={24} />
            </button>
            <img
              src={previewImage.url}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); forceDownload(previewImage.url, 'image') }}
              className="absolute bottom-4 right-4 p-3 text-white bg-blue-600 hover:bg-blue-700 rounded-full cursor-pointer"
            >
              <Download size={20} />
            </button>
          </div>
        )
      }
    </>
  )
}
