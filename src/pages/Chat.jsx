import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Send, Users, MessageCircle, LogIn, Loader2, AlertCircle,
  User, Smile, X, Reply, Pencil, History, Check, CheckCheck, Trash2,
  Search, MoreVertical, Plus, UserPlus, LogOut, Paperclip, Image, FileText, File, Download, Mic,
  Phone, Video, Forward, BellOff
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useCall } from '../contexts/CallContext'
import { SOCKET_URL, REACTION_EMOJIS, formatFileSize, forceDownload, getAttachmentUrl, getDmUnreadCount, uploadFile, formatTime, formatDateSeparator, getAvatarUrl, isDifferentDay } from '../utils/chat'
import { ForwardModal } from '../components/ForwardModal'
import { ContactCard, parseContactShare } from '../components/ContactCard'
import { DmInfoPanel } from '../components/DmInfoPanel'
import { GroupInfoPanel } from '../components/GroupInfoPanel'
import VoiceRecorder from '../components/VoiceRecorder'
import VoiceMessage from '../components/VoiceMessage'
import { uploadVoiceMessage } from '../utils/audio'

export function Chat() {
  const { user, isAuthenticated, getToken } = useAuth()
  const { socket, connected } = useSocket()
  const { initiateCall, activeCall } = useCall()
  const location = useLocation()

  // Get initial state from navigation (from ChatWidget expand button)
  const initialState = location.state || {}

  const [error, setError] = useState(null)

  // View state: 'group' | 'dm' - use initial state from navigation
  const [currentView, setCurrentView] = useState(initialState.openView === 'dm' ? 'dm' : 'group')
  const [selectedDm, setSelectedDm] = useState(initialState.openDm || null)

  // Group chat state
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])

  // DM state - use initial conversations from navigation
  const [conversations, setConversations] = useState(initialState.conversations || [])
  const [hiddenConversations, setHiddenConversations] = useState(() => {
    const saved = localStorage.getItem('hiddenConversations')
    return saved ? JSON.parse(saved) : []
  })
  const [dmMessages, setDmMessages] = useState([])
  const [dmTypingUsers, setDmTypingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Custom groups state
  const [customGroups, setCustomGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [customGroupMessages, setCustomGroupMessages] = useState([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])

  // Input state
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [forwardingMessage, setForwardingMessage] = useState(null)
  const [showDmInfo, setShowDmInfo] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [dmSettings, setDmSettings] = useState({ muted: [], blocked: [] })
  const [editingMessage, setEditingMessage] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [messageMenu, setMessageMenu] = useState(null)
  const [convMenu, setConvMenu] = useState(null)
  const [groupMenu, setGroupMenu] = useState(null)

  // Mention state
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  // Removed unused edit history & read by state

  // Mobile sidebar
  const [showSidebar, setShowSidebar] = useState(true)

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [previewImage, setPreviewImage] = useState(null) // { url, senderName, senderAvatar }
  const fileInputRef = useRef(null)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const dmTypingTimeoutRef = useRef(null)
  const inputRef = useRef(null)
  const selectedDmRef = useRef(selectedDm)
  const selectedGroupRef = useRef(selectedGroup)
  const currentViewRef = useRef(currentView)
  const longPressTimerRef = useRef(null)

  // Keep refs in sync
  useEffect(() => {
    selectedDmRef.current = selectedDm
  }, [selectedDm])

  useEffect(() => {
    selectedGroupRef.current = selectedGroup
  }, [selectedGroup])

  useEffect(() => {
    currentViewRef.current = currentView
  }, [currentView])

  // Lock body scroll when message menu is open (prevents background scroll on mobile)
  useEffect(() => {
    if (messageMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [messageMenu])

  // Draft auto-save
  const newMessageRef = useRef(newMessage)
  useEffect(() => { newMessageRef.current = newMessage }, [newMessage])

  const getDraftKey = useCallback(() => {
    if (currentView === 'group') return 'draft_group'
    if (currentView === 'dm' && selectedDm) return `draft_dm_${selectedDm.id}`
    if (currentView === 'customGroup' && selectedGroup) return `draft_cg_${selectedGroup.id}`
    return null
  }, [currentView, selectedDm, selectedGroup])

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
  }, [currentView, selectedDm?.id, selectedGroup?.id])

  // Auto-scroll
  const scrollInstantRef = useRef(false)
  const scrollToBottom = useCallback((instant) => {
    if (instant || scrollInstantRef.current) {
      scrollInstantRef.current = false
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }), 50)
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, dmMessages, customGroupMessages, scrollToBottom])

  // Process incoming navigation state changes dynamically
  useEffect(() => {
    if (location.state?.openView === 'dm' && location.state?.openDm) {
      setCurrentView('dm');
      setSelectedDm(location.state.openDm);
      setShowSidebar(false); // Mobile: force open the conversation
      
      if (connected) {
        socket.emit('dm:get-messages', { targetUserId: location.state.openDm.id });
      }
      
      // Clean up the location state so it doesn't fire repeatedly
      window.history.replaceState({}, '');
    }
  }, [location.state, connected, socket]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return

    // Group chat events
    const handleHistory = (history) => {
      setMessages(history)
      if (history.length > 0) {
        const lastMsg = history[history.length - 1]
        if (lastMsg.userId !== user?.id) {
          setTimeout(() => socket.emit('message:read', { messageId: lastMsg.id }), 500)
        }
      }
    }

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message])
      if (message.userId !== user?.id && currentViewRef.current === 'group') {
        setTimeout(() => socket.emit('message:read', { messageId: message.id }), 500)
      }
    }

    const handleEdited = (msg) => setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
    const handleReacted = ({ messageId, reactions }) => setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
    const handleDeleted = ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId))
    const handleOnline = (users) => setOnlineUsers(users)
    const handleTyping = (users) => setTypingUsers(users.filter(u => u !== user?.username))

    const handleReadUpdate = ({ userId, username, avatar, lastReadMessageId }) => {
      setMessages(prev => prev.map(m => {
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
    const handleConversations = (convs) => setConversations(convs || [])
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
        if (message.senderId !== user?.id && currentViewRef.current === 'dm') {
          socket.emit('dm:mark-read', { conversationId })
        }
      }
    }

    const handleDmTyping = ({ conversationId, typingUsers }) => {
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setDmTypingUsers(typingUsers.filter(u => u !== user?.username))
      }
    }

    const handleDmRead = ({ readBy }) => {
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
      if (selectedDmRef.current && conversationId.includes(selectedDmRef.current.id)) {
        setSelectedDm(null)
        setDmMessages([])
        setCurrentView('group')
        setShowSidebar(true)
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
        setCurrentView('group')
        setShowSidebar(true)
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

    const handleError = ({ message }) => {
      setError(message)
      setTimeout(() => setError(null), 3000)
    }

    // Register listeners
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
    socket.on('error', handleError)

    // Request initial data now that listeners are registered
    if (connected) {
      socket.emit('messages:request-history')
      socket.emit('dm:get-conversations')
      socket.emit('group:get-all')

      // If navigated from widget with a DM open, load its messages
      if (initialState.openDm && currentViewRef.current === 'dm') {
        socket.emit('dm:get-messages', { targetUserId: initialState.openDm.id })
      }
    }

    // Cleanup listeners
    return () => {
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
      socket.off('error', handleError)
    }
  }, [socket, connected, user, initialState.openDm])

  // Load DM settings (muted + blocked)
  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/auth/dm-settings', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => setDmSettings({ muted: data.muted || [], blocked: data.blocked || [] }))
      .catch(() => { })
  }, [isAuthenticated, getToken])

  // Fetch mutual friends for search
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/users/friends', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllUsers(data.filter(u => u.id !== user?.id))
        })
        .catch(() => { })
    }
  }, [isAuthenticated, getToken, user])




  // File upload helpers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 10MB)')
      return
    }

    setSelectedFile(file)

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

  const formatCallDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const renderCallMessage = (message) => {
    const att = message.attachment
    const isVideo = att.callType === 'video'
    const missed = att.status === 'missed' || att.status === 'cancelled'
    const iconColor = missed ? '#ef4444' : '#22c55e'
    const outgoing = att.initiatorId === user?.id
    let label = ''
    if (att.status === 'ended') {
      label = `Appel ${isVideo ? 'vidéo' : 'audio'} · ${formatCallDuration(att.duration)}`
    } else if (att.status === 'missed') {
      label = outgoing ? 'Appel sans réponse' : 'Appel manqué'
    } else {
      label = outgoing ? 'Appel annulé' : 'Appel manqué'
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
          {isVideo ? <Video size={12} color={iconColor} /> : <Phone size={12} color={iconColor} />}
          <span>{label}</span>
          <span style={{ opacity: 0.55, fontSize: '10px' }}>{formatTime(message.timestamp)}</span>
        </div>
      </div>
    )
  }

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
            className="max-w-full max-h-64 rounded-lg object-contain"
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
      if (!attachment && !newMessage.trim()) return
    }

    socket.emit('message:send', {
      content: newMessage.trim(),
      replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.username || replyingTo.senderUsername, content: replyingTo.content.substring(0, 100) } : null,
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
      replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.username || replyingTo.senderUsername, content: replyingTo.content.substring(0, 100) } : null,
      attachment
    })
    socket.emit('dm:typing:stop', { targetUserId: selectedDm.id })
    setNewMessage('')
    setReplyingTo(null)
    clearFile()
  }

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value
    setNewMessage(value)

    if (currentView === 'group') {
      // Mention detection
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

      if (socket && connected) {
        socket.emit('typing:start')
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => socket.emit('typing:stop'), 2000)
      }
    } else if (currentView === 'dm' && selectedDm) {
      if (socket && connected) {
        socket.emit('dm:typing:start', { targetUserId: selectedDm.id })
        if (dmTypingTimeoutRef.current) clearTimeout(dmTypingTimeoutRef.current)
        dmTypingTimeoutRef.current = setTimeout(() => {
          socket.emit('dm:typing:stop', { targetUserId: selectedDm.id })
        }, 2000)
      }
    }
  }

  // Insert mention
  const insertMention = (username) => {
    const atIndex = newMessage.lastIndexOf('@')
    if (atIndex !== -1) setNewMessage(newMessage.slice(0, atIndex) + '@' + username + ' ')
    setShowMentions(false)
    inputRef.current?.focus()
  }

  // Filter users for mention
  const filteredMentionUsers = onlineUsers.filter(u =>
    u.username.toLowerCase().includes(mentionFilter.toLowerCase()) && u.id !== user?.id
  )

  // Handle reactions
  const handleReact = (messageId, emoji) => {
    if (socket) socket.emit('message:react', { messageId, emoji })
    setMessageMenu(null)
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
    setMessageMenu(null)
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

  // Start conversation
  const startConversation = (targetUser) => {
    if (!socket) return
    socket.emit('dm:start-conversation', { targetUserId: targetUser.id })
    setSelectedDm(targetUser)
    socket.emit('dm:get-messages', { targetUserId: targetUser.id })
    setCurrentView('dm')
    setSearchQuery('')
    setShowSidebar(false)
  }

  // Open existing conversation
  const openConversation = (conv) => {
    const other = conv.participants.find(p => p.id !== user?.id)
    if (other) {
      scrollInstantRef.current = true
      // Clear custom group state
      setSelectedGroup(null)
      setCustomGroupMessages([])
      // Set DM state
      setSelectedDm(other)
      setDmMessages(conv.messages || [])
      setCurrentView('dm')
      if (socket) socket.emit('dm:mark-read', { conversationId: conv.id })
      setShowSidebar(false)

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
    setCurrentView('customGroup')
    setShowSidebar(false)
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
      replyTo: replyingTo ? { id: replyingTo.id, username: replyingTo.username || replyingTo.senderUsername, content: replyingTo.content.substring(0, 100) } : null,
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

    if (currentView === 'group') {
      socket.emit('message:send', { content: '', replyTo: null, attachment })
    } else if (currentView === 'dm' && selectedDm) {
      socket.emit('dm:send', { targetUserId: selectedDm.id, content: '', replyTo: null, attachment })
    } else if (currentView === 'customGroup' && selectedGroup) {
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

  // Render message content with mentions
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
        <Link
          key={match.index}
          to={`/social/user/${mentionedUsername}`}
          className={`font-semibold cursor-pointer hover:underline ${isMentioningMe ? 'text-blue-500 dark:text-blue-400' : isOwn ? 'text-white/90' : 'text-blue-600 dark:text-blue-400'
            }`}
        >
          @{mentionedUsername}
        </Link>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex))
    return parts.length > 0 ? parts : content
  }

  const stripFwd = (s) => s?.startsWith('fwd::') ? s.slice(5) : s

  const renderContent = (content, isOwn) => {
    const contact = parseContactShare(content)
    if (contact) return <ContactCard data={contact} isOwn={isOwn} />
    const isForwarded = content.startsWith('fwd::')
    const actualContent = isForwarded ? content.slice(5) : content
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

  // Search users
  const searchedUsers = searchQuery.trim()
    ? allUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  // Get read receipts for a message
  const getReadReceiptsForMessage = (message, allMessages) => {
    const msgIndex = allMessages.findIndex(m => m.id === message.id)
    return (message.readBy || []).filter(reader => {
      const laterRead = allMessages.slice(msgIndex + 1).some(m => m.readBy?.some(r => r.userId === reader.userId))
      return !laterRead
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-neutral-900 rounded-2xl shadow-xl p-8 text-center max-w-md border border-white/10">
          <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Chat TSI Monge</h1>
          <p className="text-gray-400 mb-6">Connectez-vous pour accéder au chat</p>
          <div className="flex gap-3">
            <Link to="/login" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
              <LogIn size={20} /> Connexion
            </Link>
            <Link to="/" className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-neutral-800 flex items-center justify-center gap-2">
              <ArrowLeft size={20} /> Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-56px-env(safe-area-inset-bottom))] md:h-[100dvh] w-full flex overflow-hidden bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[350px] lg:w-[398px] border-r border-gray-200 dark:border-neutral-800 shrink-0`}>
        {/* Sidebar Header */}
        <div className="pt-9 pb-3 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{user?.username || 'Messages'}</h1>
            {getDmUnreadCount(conversations.flatMap(c => c.messages || []), user?.id) > 0 && (
              <span className="mt-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {getDmUnreadCount(conversations.flatMap(c => c.messages || []), user?.id)}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            title="Nouveau message"
          >
            <svg aria-label="Nouveau message" color="currentColor" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
              <path d="M12.202 3.203H5.25a3 3 0 0 0-3 3V18.75a3 3 0 0 0 3 3h12.547a3 3 0 0 0 3-3v-6.952" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M10.002 17.226H6.774v-3.228L18.607 2.165a1.417 1.417 0 0 1 2.004 0l1.224 1.225a1.417 1.417 0 0 1 0 2.004Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="16.848" x2="20.076" y1="3.924" y2="7.153"></line>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-2 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-0 placeholder-gray-500"
            />
            <div className="absolute left-3 text-gray-400">
              <Search size={16} />
            </div>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchedUsers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Résultats</p>
              {searchedUsers.slice(0, 5).map(u => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u)}
                  className="w-full flex items-center gap-3 py-2 px-2 -mx-2 hover:bg-gray-50 dark:hover:bg-neutral-900 rounded-lg"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                    {u.avatar ? (
                      <img src={`${getAvatarUrl(u.avatar)}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                        {u.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm block leading-tight">{u.username}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations List Header */}
        {!searchQuery && (
          <div className="px-6 pt-4 pb-2 flex items-center justify-between shrink-0">
            <h2 className="text-base font-bold">Messages</h2>
            <button className="text-sm font-medium text-gray-500 hover:text-gray-400 transition-colors">Demandes</button>
          </div>
        )}

        {/* Conversations List */}
        {!searchQuery && (
          <div className="flex-1 overflow-y-auto px-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent' }}>
            {/* Group Chat - Pinned */}
            <button
              onClick={() => { scrollInstantRef.current = true; setCurrentView('group'); setSelectedDm(null); setShowSidebar(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-900 rounded-lg transition-colors ${currentView === 'group' ? 'bg-gray-100 dark:bg-neutral-800' : ''}`}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Users size={24} className="text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-normal text-sm block truncate">Groupe TSI</p>
                <div className="flex items-center text-xs text-gray-500">
                  <span className="truncate">Chat de la classe</span>
                </div>
              </div>
            </button>

            {/* Custom Groups */}
            {customGroups.map(group => {
              const isSelected = currentView === 'customGroup' && selectedGroup?.id === group.id
              return (
                <div key={`cg-${group.id}`} className="relative group/item">
                  <button
                    onClick={() => openCustomGroup(group)}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-900 rounded-lg transition-colors ${isSelected ? 'bg-gray-100 dark:bg-neutral-800' : ''}`}
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
                      {group.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`font-normal text-sm block truncate ${isSelected ? 'font-semibold' : ''}`}>{group.name}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="truncate">
                          {group.lastMessage ? `${group.lastMessage.senderUsername}: ${group.lastMessage.content}` : `${group.members.length} membres`}
                        </span>
                      </div>
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </button>
                  {/* ... contextual menu ... */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover/item:block">
                    <button
                      onClick={(e) => { e.stopPropagation(); setGroupMenu(groupMenu === group.id ? null : group.id); }}
                      className="p-1 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {groupMenu === group.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setGroupMenu(null)} />
                        <div className="absolute z-50 right-0 top-full mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-gray-200 dark:border-white/5 py-1 min-w-[160px]">
                          <button
                            onClick={() => {
                              if (socket && window.confirm('Voulez-vous vraiment quitter ce groupe ?')) {
                                socket.emit('group:leave', { groupId: group.id })
                              }
                              setGroupMenu(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm text-red-500 font-medium"
                          >
                            Quitter
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {/* DM Conversations */}
            {conversations.filter(c => !hiddenConversations.includes(c.id)).map(conv => {
              const other = conv.participants.find(p => p.id !== user?.id)
              const unread = getDmUnreadCount(conv.messages, user?.id)
              const isSelected = currentView === 'dm' && selectedDm?.id === other?.id

              return (
                <div key={conv.id} className="relative group/item">
                  <button
                    onClick={() => openConversation(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-900 rounded-lg transition-colors ${isSelected ? 'bg-gray-100 dark:bg-neutral-800' : ''}`}
                  >
                    <div className="relative w-14 h-14 shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden">
                        {other?.avatar ? (
                          <img src={`${getAvatarUrl(other.avatar)}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                            {other?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      {onlineUsers.some(u => u.id === other?.id) && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-black rounded-full z-10 box-content" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm block truncate ${unread > 0 || isSelected ? 'font-semibold' : 'font-normal'}`}>
                        {other?.username || 'Utilisateur'}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 mt-0.5">
                        <span className={`flex items-center truncate ${unread > 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : ''}`}>
                          {(() => {
                            const lastMsg = conv.messages?.[conv.messages.length - 1];
                            const isMine = lastMsg?.senderId === user?.id;
                            const isRead = lastMsg?.readBy?.length > 0;
                            if (isMine) {
                              return isRead ? <CheckCheck size={14} className="text-blue-500 mr-1 shrink-0" /> : <Check size={14} className="text-gray-400 mr-1 shrink-0" />;
                            }
                            return null;
                          })()}
                          <span className="truncate">
                            {conv.lastMessage?.content || (conv.lastMessage?.attachment ? 'Pièce jointe' : 'Nouvelle conversation')}
                          </span>
                        </span>
                        {conv.lastMessage?.timestamp && (
                          <>
                            <span className="mx-1 font-bold">·</span>
                            <span>{formatTime(conv.lastMessage.timestamp)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>

                  {/* Context Menu Icon on Hover */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover/item:block">
                    <button
                      onClick={(e) => { e.stopPropagation(); setConvMenu(convMenu === conv.id ? null : conv.id); }}
                      className="p-1 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {convMenu === conv.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setConvMenu(null)} />
                        <div className="absolute z-50 right-0 top-full mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-gray-200 dark:border-white/5 py-1 min-w-[140px]">
                          <button
                            onClick={() => {
                              const newHidden = [...hiddenConversations, conv.id]
                              setHiddenConversations(newHidden)
                              localStorage.setItem('hiddenConversations', JSON.stringify(newHidden))
                              setConvMenu(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm text-red-500 font-medium"
                          >
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 relative bg-white dark:bg-black`}>
        {(!selectedDm && !selectedGroup && currentView !== 'group') ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-60px)] md:h-full">
            <div className="mb-4">
              <svg aria-label="" color="currentColor" fill="currentColor" height="96" role="img" viewBox="0 0 96 96" width="96">
                <path d="M48 0C21.532 0 0 21.533 0 48s21.532 48 48 48 48-21.532 48-48S74.468 0 48 0Zm0 94C22.636 94 2 73.364 2 48S22.636 2 48 2s46 20.636 46 46-20.636 46-46 46Zm12.227-53.284-7.257 5.507c-.49.37-1.166.375-1.661.005l-5.373-4.031a3.453 3.453 0 0 0-4.989.921l-6.756 10.718c-.653 1.027.615 2.189 1.582 1.453l7.257-5.507a1.582 1.582 0 0 1 1.661-.005l5.373 4.031a3.453 3.453 0 0 0 4.989-.92l6.756-10.719c.653-1.027-.615-2.189-1.582-1.453ZM48 25c-12.958 0-23 9.492-23 22.31 0 6.706 2.749 12.5 7.224 16.503.375.338.602.806.62 1.31l.125 4.091a1.845 1.845 0 0 0 2.582 1.629l4.563-2.013a1.844 1.844 0 0 1 1.227-.093c2.096.579 4.331.884 6.659.884 12.958 0 23-9.491 23-22.31S60.958 25 48 25Zm0 42.621c-2.114 0-4.175-.273-6.133-.813a3.834 3.834 0 0 0-2.56.192l-4.346 1.917-.118-3.867a3.833 3.833 0 0 0-1.286-2.727C29.33 58.54 27 53.209 27 47.31 27 35.73 36.402 27 48 27s21 8.73 21 20.31-9.402 20.31-21 20.31Z"></path>
              </svg>
            </div>
            <h2 className="text-[20px] text-black dark:text-white mb-2 font-normal">Vos messages</h2>
            <p className="text-[#737373] dark:text-[#a8a8a8] text-sm mb-6 font-normal max-w-[300px]">Envoyez des photos et des messages privés à vos amis.</p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-4 py-1.5 bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer active:scale-95"
            >
              Envoyer un message
            </button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 md:hidden flex items-center justify-center transition-colors text-gray-800 dark:text-white"
                >
                  <ArrowLeft size={24} />
                </button>
                {currentView === 'group' ? (
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <Users size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base">Groupe TSI</h2>
                      <p className="text-xs text-gray-500">{onlineUsers.length} en ligne</p>
                    </div>
                  </div>
                ) : currentView === 'customGroup' && selectedGroup ? (
                  <button onClick={() => setShowGroupInfo(true)} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
                      {selectedGroup.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-bold text-base">{selectedGroup.name}</h2>
                        {dmSettings.muted.includes(selectedGroup.id) && (
                          <BellOff size={14} className="text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{selectedGroup.members.length} membres</p>
                    </div>
                  </button>
                ) : selectedDm && (
                  <button
                    onClick={() => setShowDmInfo(true)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
                  >
                    <div className="relative w-11 h-11 shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden">
                        {selectedDm.avatar ? (
                          <img src={`${getAvatarUrl(selectedDm.avatar)}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                            {selectedDm.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      {onlineUsers.some(u => u.id === selectedDm.id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-black rounded-full z-10 box-content" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-bold text-base">{selectedDm.username}</h2>
                        {dmSettings.muted.includes(selectedDm.id) && (
                          <BellOff size={14} className="text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {onlineUsers.some(u => u.id === selectedDm.id) ? 'En ligne' : 'Hors ligne'}
                      </p>
                    </div>
                  </button>
                )}
              </div>
              {/* Call buttons */}
              <div className="flex items-center gap-4">
                {((currentView === 'dm' && selectedDm) || (currentView === 'customGroup' && selectedGroup)) && (
                  <>
                    <button
                      onClick={() => initiateCall(currentView === 'dm' ? selectedDm.id : selectedGroup.id, 'audio', currentView === 'customGroup', currentView === 'customGroup' ? selectedGroup.members : undefined, currentView === 'customGroup' ? selectedGroup.name : undefined)}
                      disabled={!!activeCall}
                      className="text-gray-800 dark:text-gray-200 hover:text-gray-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Appel audio"
                    >
                      <Phone size={24} />
                    </button>
                    <button
                      onClick={() => initiateCall(currentView === 'dm' ? selectedDm.id : selectedGroup.id, 'video', currentView === 'customGroup', currentView === 'customGroup' ? selectedGroup.members : undefined, currentView === 'customGroup' ? selectedGroup.name : undefined)}
                      disabled={!!activeCall}
                      className="text-gray-800 dark:text-gray-200 hover:text-gray-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Appel vidéo"
                    >
                      <Video size={24} />
                    </button>
                    <button
                      onClick={() => currentView === 'dm' ? setShowDmInfo(true) : setShowGroupInfo(true)}
                      className="text-gray-800 dark:text-gray-200 hover:text-gray-500 transition-colors"
                      title="Informations"
                    >
                      <svg aria-label="Informations sur la discussion" color="currentColor" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                        <circle cx="12.001" cy="12.005" fill="none" r="10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></circle>
                        <circle cx="11.819" cy="7.709" r="1.25"></circle>
                        <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="10.569" x2="13.432" y1="16.777" y2="16.777"></line>
                        <polyline fill="none" points="10.569 11.05 12 11.05 12 16.777" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polyline>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </header>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent' }}>
              {currentView === 'group' ? (
                <>
                  {messages.map((message, index) => {
                    const isOwn = message.userId === user?.id
                    const readersAtThisMessage = getReadReceiptsForMessage(message, messages)
                    const showDateSep = isDifferentDay(message.timestamp, messages[index - 1]?.timestamp)

                    // Check if previous or next messages are from the same user to adjust border radius
                    const isNextSameUser = messages[index + 1]?.userId === message.userId && !isDifferentDay(messages[index + 1]?.timestamp, message.timestamp)
                    const isPrevSameUser = messages[index - 1]?.userId === message.userId && !showDateSep

                    return (
                      <div key={message.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${isNextSameUser ? 'mb-0.5' : 'mb-2'}`}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 w-full my-4 self-center px-8">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                            <span className="text-xs text-gray-500 font-medium">{formatDateSeparator(message.timestamp)}</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                          </div>
                        )}
                        <div
                          className={`flex gap-2 w-full ${isOwn ? 'justify-end' : 'justify-start'} group`}
                          onTouchStart={() => {
                            longPressTimerRef.current = setTimeout(() => setMessageMenu(message.id), 500)
                          }}
                          onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                          onTouchMove={() => clearTimeout(longPressTimerRef.current)}
                        >
                          {!isOwn && (
                            <div className="w-8 shrink-0 flex items-end">
                              {!isNextSameUser && (
                                <Link to={`/social/user/${message.username}`} title={`Profil de ${message.username}`} className="w-8 h-8 rounded-full overflow-hidden hover:opacity-80 transition-opacity">
                                  {message.avatar ? (
                                    <img src={`${getAvatarUrl(message.avatar)}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                      {message.username[0].toUpperCase()}
                                    </div>
                                  )}
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Swipe Reply Icon (hidden by default) */}
                          <div
                            id={`reply-icon-${message.id}`}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 bg-gray-100 dark:bg-neutral-800 p-2 rounded-full opacity-0 pointer-events-none transition-none shadow-sm z-0"
                            style={{ transform: 'scale(0)' }}
                          >
                            <Reply size={16} />
                          </div>

                          <div
                            id={`msg-bubble-${message.id}`}
                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[65%] z-10 transition-transform duration-75 ease-out`}
                            onTouchStart={(e) => handleTouchStart(e, message.id)}
                            onTouchMove={(e) => handleTouchMove(e, message.id)}
                            onTouchEnd={() => handleTouchEnd(message)}
                          >
                            {!isOwn && !isPrevSameUser && (
                              <Link to={`/social/user/${message.username}`} className="text-[11px] text-gray-500 mb-1 ml-1 hover:underline">{message.username}</Link>
                            )}

                            {message.replyTo && (
                              <div className={`mb-1 px-3 py-2 rounded-xl text-xs border-l-2 border-gray-400 ${isOwn ? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'}`}>
                                <span className="font-medium">{message.replyTo.username || message.replyTo.senderUsername || 'Utilisateur'}</span>
                                <p className="truncate opacity-75">{stripFwd(message.replyTo.content)}</p>
                              </div>
                            )}

                            <div className={`
                          px-4 py-2 text-[15px] shadow-sm
                          ${isOwn
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                : 'bg-[#efefef] dark:bg-[#262626] text-black dark:text-white'
                              }
                          ${isOwn
                                ? `rounded-l-2xl ${isPrevSameUser ? 'rounded-tr-md' : 'rounded-tr-2xl'} ${isNextSameUser ? 'rounded-br-md' : 'rounded-br-2xl'}`
                                : `rounded-r-2xl ${isPrevSameUser ? 'rounded-tl-md' : 'rounded-tl-2xl'} ${isNextSameUser ? 'rounded-bl-md' : 'rounded-bl-2xl'}`
                              }
                        `}>
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
                                  <button key={emoji} onClick={() => handleReact(message.id, emoji)} className="text-xs px-2 py-1 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm" title={users.join(', ')}>
                                    {emoji} {count > 1 ? <span className="text-[10px] ml-1 opacity-70">{count}</span> : null}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Message Menu (Instagram style: dots appear on hover next to message, long-press on mobile) */}
                          <div className={`relative self-center hidden md:flex items-center ${isOwn ? 'order-first mr-2' : 'ml-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                              onClick={() => setMessageMenu(messageMenu === message.id ? null : message.id)}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {messageMenu === message.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setMessageMenu(null)} />
                                <div className={`absolute z-50 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-200 dark:border-white/5 py-1 min-w-[150px]`}>
                                  <div className="px-3 py-2 border-b border-gray-100 dark:border-neutral-700 flex justify-between">
                                    {['😆', '🔥', '👍', '👎', '❤️'].map(emoji => (
                                      <button key={emoji} onClick={() => { handleReact(message.id, emoji); setMessageMenu(null); }} className="hover:scale-125 transition-transform text-lg">
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                  <button onClick={() => { setReplyingTo(message); setMessageMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium">
                                    <Reply size={16} /> Répondre
                                  </button>
                                  {message.content && (
                                    <button onClick={() => { setForwardingMessage(message); setMessageMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium">
                                      <Forward size={16} /> Transférer
                                    </button>
                                  )}
                                  {isOwn && (
                                    <>
                                      <button onClick={() => { setEditingMessage(message); setEditContent(message.content); setMessageMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium">
                                        <Pencil size={16} /> Modifier
                                      </button>
                                      <button onClick={() => { handleDelete(message.id); setMessageMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium text-red-500">
                                        <Trash2 size={16} /> Supprimer
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Read receipts */}
                        {isOwn && readersAtThisMessage.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-0.5 mr-1" title={readersAtThisMessage.map(r => r.username).join(', ')}>
                            <span className="text-[9px] text-gray-400 mr-0.5">Vu par</span>
                            <div className="flex -space-x-1">
                              {readersAtThisMessage.slice(0, 5).map(reader => (
                                <div key={reader.userId} className="w-4 h-4 rounded-full overflow-hidden border border-white dark:border-slate-800">
                                  {reader.avatar ? (
                                    <img src={`${getAvatarUrl(reader.avatar)}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[7px] font-bold">
                                      {reader.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {readersAtThisMessage.length > 5 && (
                                <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-neutral-700 flex items-center justify-center text-[7px] text-gray-600 dark:text-gray-300 border border-white dark:border-slate-800">
                                  +{readersAtThisMessage.length - 5}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                </>
              ) : (
                <>
                  {dmMessages.map((message, index) => {
                    const isOwn = message.senderId === user?.id
                    const isLastOwnMessage = isOwn && index === dmMessages.map((m, i) => m.senderId === user?.id ? i : -1).filter(i => i !== -1).pop()
                    const hasBeenRead = message.readBy?.length > 0
                    const showDateSep = isDifferentDay(message.timestamp, dmMessages[index - 1]?.timestamp)

                    // Check if previous or next messages are from the same user to adjust border radius
                    const isNextSameUser = dmMessages[index + 1]?.senderId === message.senderId && !isDifferentDay(dmMessages[index + 1]?.timestamp, message.timestamp)
                    const isPrevSameUser = dmMessages[index - 1]?.senderId === message.senderId && !showDateSep


                    return (
                      <div key={message.id} className={`flex flex-col ${message.attachment?.type === 'call' ? 'items-center' : isOwn ? 'items-end' : 'items-start'} ${isNextSameUser && message.attachment?.type !== 'call' ? 'mb-0.5' : 'mb-2'}`}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 w-full my-4 self-center px-8">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                            <span className="text-xs text-gray-500 font-medium">{formatDateSeparator(message.timestamp)}</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                          </div>
                        )}
                        {message.attachment?.type === 'call' ? (
                          renderCallMessage(message)
                        ) : (
                          <div
                            className={`flex gap-2 w-full ${isOwn ? 'justify-end' : 'justify-start'} group`}
                            onTouchStart={() => {
                              longPressTimerRef.current = setTimeout(() => setMessageMenu(message.id), 500)
                            }}
                            onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                            onTouchMove={() => clearTimeout(longPressTimerRef.current)}
                          >
                            {/* Avatar spacer for DMs (usually not shown in Insta DMs unless group) */}
                            {!isOwn && (
                              <div className="w-8 shrink-0 flex items-end">
                                {/*
                               Instagram DMs usually do not show avatar next to every message,
                               but if we want to keep it:
                             */}
                                {/*
                             {!isNextSameUser && (
                              <Link to={`/social/user/${message.senderUsername}`} title={`Profil de ${message.senderUsername}`} className="w-8 h-8 rounded-full overflow-hidden hover:opacity-80 transition-opacity">
                                {message.senderAvatar ? (
                                  <img src={`${getAvatarUrl(message.senderAvatar)}`} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                                    {message.senderUsername?.[0]?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </Link>
                             )}
                             */}
                              </div>
                            )}
                            {/* Swipe Reply Icon (hidden by default) */}
                            <div
                              id={`reply-icon-${message.id}`}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 bg-gray-100 dark:bg-neutral-800 p-2 rounded-full opacity-0 pointer-events-none transition-none shadow-sm z-0"
                              style={{ transform: 'scale(0)' }}
                            >
                              <Reply size={16} />
                            </div>

                            <div
                              id={`msg-bubble-${message.id}`}
                              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${message.attachment?.mimetype?.startsWith('audio/') ? 'flex-1 ' : ''}max-w-[65%] z-10 transition-transform duration-75 ease-out`}
                              onTouchStart={(e) => handleTouchStart(e, message.id)}
                              onTouchMove={(e) => handleTouchMove(e, message.id)}
                              onTouchEnd={() => handleTouchEnd(message)}
                            >
                              {/* Reply indicator */}
                              {message.replyTo && (
                                <div className={`mb-1 px-3 py-2 rounded-xl text-xs border-l-2 border-gray-400 ${isOwn ? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'}`}>
                                  <span className="font-medium">{message.replyTo.username || message.replyTo.senderUsername || 'Utilisateur'}</span>
                                  <p className="truncate opacity-75">{stripFwd(message.replyTo.content)}</p>
                                </div>
                              )}

                              <div className={`
                            px-4 py-2 text-[15px] shadow-sm
                            ${isOwn
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                  : 'bg-[#efefef] dark:bg-[#262626] text-black dark:text-white'
                                }
                            ${isOwn
                                  ? `rounded-l-2xl ${isPrevSameUser ? 'rounded-tr-md' : 'rounded-tr-2xl'} ${isNextSameUser ? 'rounded-br-md' : 'rounded-br-2xl'}`
                                  : `rounded-r-2xl ${isPrevSameUser ? 'rounded-tl-md' : 'rounded-tl-2xl'} ${isNextSameUser ? 'rounded-bl-md' : 'rounded-bl-2xl'}`
                                }
                          `}>
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
                                    <button key={emoji} onClick={() => socket?.emit('dm:react', { visavis: selectedDm.id, messageId: message.id, emoji })} className="text-xs px-2 py-1 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm" title={users.join(', ')}>
                                      {emoji} {count > 1 ? <span className="text-[10px] ml-1 opacity-70">{count}</span> : null}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''} text-[11px] text-gray-400`}>
                                {/* Instagram usually hides timestamps unless you swipe, but we can keep it subtle */}
                                {/* {formatTime(message.timestamp)} */}
                                {message.isEdited && <span>(modifié)</span>}
                                {/* {isOwn && (hasBeenRead ? <CheckCheck size={12} className="text-blue-500 ml-1" /> : <Check size={12} className="text-gray-400 ml-1" />)} */}
                              </div>
                            </div>

                            {/* DM Message menu */}
                            <div className={`relative self-center hidden md:flex items-center ${isOwn ? 'order-first mr-2' : 'ml-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <button
                                onClick={() => setMessageMenu(messageMenu === message.id ? null : message.id)}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {messageMenu === message.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setMessageMenu(null)} />
                                  <div className={`absolute z-50 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-200 dark:border-white/5 py-1 min-w-[150px]`}>
                                    {/* Emoji reactions */}
                                    <div className="px-3 py-2 border-b border-gray-100 dark:border-neutral-700 flex justify-between">
                                      {REACTION_EMOJIS.slice(0, 5).map(emoji => (
                                        <button
                                          key={emoji}
                                          onClick={() => { socket?.emit('dm:react', { visavis: selectedDm.id, messageId: message.id, emoji }); setMessageMenu(null); }}
                                          className="hover:scale-125 transition-transform text-lg"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Reply */}
                                    <button
                                      onClick={() => { setReplyingTo(message); setMessageMenu(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium"
                                    >
                                      <Reply size={16} /> Répondre
                                    </button>

                                    {/* Forward */}
                                    {message.content && (
                                      <button
                                        onClick={() => { setForwardingMessage(message); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium"
                                      >
                                        <Forward size={16} /> Transférer
                                      </button>
                                    )}

                                    {/* Edit (own messages only) */}
                                    {isOwn && (
                                      <button
                                        onClick={() => { setEditingMessage({ ...message, isDm: true }); setEditContent(message.content); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium"
                                      >
                                        <Pencil size={16} /> Modifier
                                      </button>
                                    )}

                                    {/* Delete (own messages only) */}
                                    {isOwn && (
                                      <button
                                        onClick={() => { handleDeleteDm(message.id); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium text-red-500"
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

                        {isLastOwnMessage && hasBeenRead && (() => {
                          const readEntry = message.readBy?.find(r => typeof r === 'object' && r.readAt)
                          const readAt = readEntry?.readAt ? new Date(readEntry.readAt) : null
                          return (
                            <div className="flex items-center justify-end w-full mt-1 mr-1">
                              <span className="text-[11px] text-gray-500">
                                {readAt ? `Vu à ${formatTime(readAt)}` : 'Vu'}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </>
              )}

              {/* Custom Group Messages */}
              {currentView === 'customGroup' && (
                <>
                  {customGroupMessages.map((message, index) => {
                    const isOwn = message.senderId === user?.id
                    const readersAtThisMessage = getReadReceiptsForMessage(message, customGroupMessages)
                    const showDateSep = isDifferentDay(message.timestamp, customGroupMessages[index - 1]?.timestamp)

                    // Check if previous or next messages are from the same user to adjust border radius
                    const isNextSameUser = customGroupMessages[index + 1]?.senderId === message.senderId && !isDifferentDay(customGroupMessages[index + 1]?.timestamp, message.timestamp) && !customGroupMessages[index + 1]?.isSystem
                    const isPrevSameUser = customGroupMessages[index - 1]?.senderId === message.senderId && !showDateSep && !customGroupMessages[index - 1]?.isSystem


                    if (message.isSystem) {
                      return (
                        <div key={message.id} className="flex flex-col items-center">
                          {showDateSep && (
                            <div className="flex items-center gap-3 w-full my-4 px-8">
                              <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                              <span className="text-xs text-gray-500 font-medium">{formatDateSeparator(message.timestamp)}</span>
                              <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                            </div>
                          )}
                          <span className="text-xs text-gray-500 font-medium my-2">
                            {message.content}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div key={message.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${isNextSameUser ? 'mb-0.5' : 'mb-2'}`}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 w-full my-4 self-center px-8">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                            <span className="text-xs text-gray-500 font-medium">{formatDateSeparator(message.timestamp)}</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                          </div>
                        )}
                        <div
                          className={`flex gap-2 w-full ${isOwn ? 'justify-end' : 'justify-start'} group`}
                          onTouchStart={() => {
                            longPressTimerRef.current = setTimeout(() => setMessageMenu(message.id), 500)
                          }}
                          onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                          onTouchMove={() => clearTimeout(longPressTimerRef.current)}
                        >
                          {!isOwn && (
                            <div className="w-8 shrink-0 flex items-end">
                              {!isNextSameUser && (
                                <Link to={`/social/user/${message.senderUsername}`} title={`Profil de ${message.senderUsername}`} className="w-8 h-8 rounded-full overflow-hidden hover:opacity-80 transition-opacity">
                                  {message.senderAvatar ? (
                                    <img src={`${getAvatarUrl(message.senderAvatar)}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                      {message.senderUsername?.[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Swipe Reply Icon (hidden by default) */}
                          <div
                            id={`reply-icon-${message.id}`}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 bg-gray-100 dark:bg-neutral-800 p-2 rounded-full opacity-0 pointer-events-none transition-none shadow-sm z-0"
                            style={{ transform: 'scale(0)' }}
                          >
                            <Reply size={16} />
                          </div>

                          <div
                            id={`msg-bubble-${message.id}`}
                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[65%] z-10 transition-transform duration-75 ease-out`}
                            onTouchStart={(e) => handleTouchStart(e, message.id)}
                            onTouchMove={(e) => handleTouchMove(e, message.id)}
                            onTouchEnd={() => handleTouchEnd(message)}
                          >
                            {!isOwn && !isPrevSameUser && (
                              <Link to={`/social/user/${message.senderUsername}`} className="text-[11px] text-gray-500 mb-1 ml-1 hover:underline">{message.senderUsername}</Link>
                            )}

                            {message.replyTo && (
                              <div className={`mb-1 px-3 py-2 rounded-xl text-xs border-l-2 border-gray-400 ${isOwn ? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'}`}>
                                <span className="font-medium">{message.replyTo.username || message.replyTo.senderUsername || 'Utilisateur'}</span>
                                <p className="truncate opacity-75">{stripFwd(message.replyTo.content)}</p>
                              </div>
                            )}

                            <div className={`
                          px-4 py-2 text-[15px] shadow-sm
                          ${isOwn
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-[#efefef] dark:bg-[#262626] text-black dark:text-white'
                              }
                          ${isOwn
                                ? `rounded-l-2xl ${isPrevSameUser ? 'rounded-tr-md' : 'rounded-tr-2xl'} ${isNextSameUser ? 'rounded-br-md' : 'rounded-br-2xl'}`
                                : `rounded-r-2xl ${isPrevSameUser ? 'rounded-tl-md' : 'rounded-tl-2xl'} ${isNextSameUser ? 'rounded-bl-md' : 'rounded-bl-2xl'}`
                              }
                        `}>
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
                                  <button key={emoji} onClick={() => socket?.emit('group:react', { groupId: selectedGroup.id, messageId: message.id, emoji })} className="text-xs px-2 py-1 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm" title={users.join(', ')}>
                                    {emoji} {count > 1 ? <span className="text-[10px] ml-1 opacity-70">{count}</span> : null}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Read receipts */}
                            {isOwn && readersAtThisMessage?.length > 0 && (
                              <div className="flex items-center gap-0.5 mt-0.5 mr-1" title={readersAtThisMessage.map(r => r.username).join(', ')}>
                                <span className="text-[9px] text-gray-400 mr-0.5">Vu par</span>
                                <div className="flex -space-x-1">
                                  {readersAtThisMessage.slice(0, 5).map(reader => (
                                    <div key={reader.userId} className="w-4 h-4 rounded-full overflow-hidden border border-white dark:border-slate-800">
                                      {reader.avatar ? (
                                        <img src={`${getAvatarUrl(reader.avatar)}`} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[7px] font-bold">
                                          {reader.username?.[0]?.toUpperCase() || '?'}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {readersAtThisMessage.length > 5 && (
                                    <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-neutral-700 flex items-center justify-center text-[7px] text-gray-600 dark:text-gray-300 border border-white dark:border-slate-800">
                                      +{readersAtThisMessage.length - 5}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''} text-[11px] text-gray-400`}>
                              {/* {formatTime(message.timestamp)} */}
                              {message.isEdited && <span>(modifié)</span>}
                            </div>
                          </div>

                          {/* Group message menu */}
                          <div className={`relative self-center hidden md:flex items-center ${isOwn ? 'order-first mr-2' : 'ml-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                              onClick={() => setMessageMenu(messageMenu === message.id ? null : message.id)}
                              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {messageMenu === message.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setMessageMenu(null)} />
                                <div className={`absolute z-50 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-200 dark:border-white/5 py-1 min-w-[150px]`}>
                                  <div className="px-3 py-2 border-b border-gray-100 dark:border-neutral-700 flex justify-between">
                                    {REACTION_EMOJIS.slice(0, 5).map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => { socket?.emit('group:react', { groupId: selectedGroup.id, messageId: message.id, emoji }); setMessageMenu(null); }}
                                        className="hover:scale-125 transition-transform text-lg"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => { setReplyingTo(message); setMessageMenu(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium"
                                  >
                                    <Reply size={16} /> Répondre
                                  </button>
                                  {message.content && (
                                    <button
                                      onClick={() => { setForwardingMessage(message); setMessageMenu(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium"
                                    >
                                      <Forward size={16} /> Transférer
                                    </button>
                                  )}
                                  {isOwn && (
                                    <>
                                      <button
                                        onClick={() => { setEditingMessage({ ...message, isCustomGroup: true }); setEditContent(message.content); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium"
                                      >
                                        <Pencil size={16} /> Modifier
                                      </button>
                                      <button
                                        onClick={() => { handleDeleteGroup(message.id); setMessageMenu(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium text-red-500"
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
                </>
              )}
              {/* En cours pseudo-message */}
              {currentView === 'dm' && activeCall && !activeCall.isGroup && activeCall.status === 'connected' &&
                (activeCall.targetId === selectedDm?.id || activeCall.callerId === selectedDm?.id) && (
                  <div className="flex justify-center w-full my-1 px-4">
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

            {/* Typing indicator - above input */}
            {currentView === 'group' && typingUsers.length > 0 && (
              <div className="px-6 py-2 bg-white dark:bg-black text-[13px] text-gray-500">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'écrit' : 'écrivent'}...
              </div>
            )}

            {currentView === 'dm' && dmTypingUsers.length > 0 && (
              <div className="px-6 py-2 bg-white dark:bg-black text-[13px] text-gray-500">
                {selectedDm?.username} écrit...
              </div>
            )}

            {/* Reply indicator */}
            {replyingTo && (
              <div className="px-6 py-2 bg-gray-50 dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="text-sm border-l-2 border-gray-400 pl-3">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Réponse à {replyingTo.username || replyingTo.senderUsername}</span>
                  <p className="text-gray-500 truncate text-xs">{stripFwd(replyingTo.content)}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
              </div>
            )}

            {/* File Preview */}
            {selectedFile && (
              <div className="px-6 py-3 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-black">
                <div className="relative inline-block">
                  {filePreview ? (
                    <div className="relative">
                      <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-xl" />
                      <button type="button" onClick={clearFile} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 border-2 border-white dark:border-black shadow-sm">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center border border-gray-200 dark:border-neutral-700">
                        {(() => { const Icon = getFileIcon(selectedFile.type); return <Icon size={24} className="text-gray-400" /> })()}
                      </div>
                      <button type="button" onClick={clearFile} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 border-2 border-white dark:border-black shadow-sm">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={currentView === 'group' ? handleSendGroup : currentView === 'customGroup' ? handleSendCustomGroup : handleSendDm} className="px-4 py-3 bg-white dark:bg-black relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              />
              {showMentions && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full left-4 mr-4 mb-2 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 max-h-40 overflow-y-auto z-50">
                  {filteredMentionUsers.map((u, idx) => (
                    <button key={u.id} type="button" onClick={() => insertMention(u.username)} className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 ${idx === mentionIndex ? 'bg-gray-50 dark:bg-neutral-700' : ''}`}>
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-neutral-700 shrink-0">
                        {u.avatar ? (
                          <img src={`${getAvatarUrl(u.avatar)}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                            {u.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{u.username}</span>
                    </button>
                  ))}
                </div>
              )}

              {isRecording ? (
                <div className="border border-gray-300 dark:border-neutral-700 rounded-full px-2 py-1 bg-white dark:bg-black max-w-[800px] mx-auto">
                  <VoiceRecorder
                    onSend={handleSendVoice}
                    onCancel={() => setIsRecording(false)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-full px-2 py-1 bg-white dark:bg-black max-w-[800px] mx-auto focus-within:border-gray-400 dark:focus-within:border-neutral-500 transition-colors">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!connected || uploading}
                    className="p-2 text-gray-800 dark:text-white hover:text-gray-500 dark:hover:text-gray-300 rounded-full transition-colors disabled:opacity-50"
                  >
                    <Paperclip size={22} className="rotate-45" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={currentView === 'group' ? "Message... (@ pour mentionner)" : "Votre message..."}
                    disabled={!connected || uploading}
                    className="flex-1 px-2 py-2.5 bg-transparent text-[15px] text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none disabled:opacity-50"
                  />
                  {!newMessage.trim() && !selectedFile ? (
                    <button
                      type="button"
                      onClick={() => setIsRecording(true)}
                      disabled={!connected || uploading}
                      className="p-2 text-gray-800 dark:text-white hover:text-gray-500 dark:hover:text-gray-300 rounded-full transition-colors disabled:opacity-50"
                    >
                      <Mic size={22} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !selectedFile) || !connected || uploading}
                      className="p-2 text-[#0095f6] hover:text-[#1877f2] font-semibold text-sm transition-colors disabled:opacity-50 disabled:text-[#0095f6]/50 mr-2"
                    >
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : 'Envoyer'}
                    </button>
                  )}
                </div>
              )}
            </form>

            {/* Info panels — inline inside the chat area bounds */}
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
          </>
        )
        }

        {/* Edit Modal */}
        {
          editingMessage && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Pencil size={20} /> Modifier le message
                </h3>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/5 bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button onClick={handleEdit} disabled={!editContent.trim()} className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
                    Enregistrer
                  </button>
                  <button onClick={() => { setEditingMessage(null); setEditContent(''); }} className="flex-1 py-2 border border-gray-300 dark:border-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-neutral-800">
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Create Group Modal (Instagram Style) */}
        {
          showCreateGroup && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-[400px] flex flex-col max-h-[85vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
                  <div className="w-8" /> {/* Spacer for centering */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Nouveau message
                  </h3>
                  <button
                    onClick={() => { setShowCreateGroup(false); setNewGroupName(''); setSelectedMembers([]); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* To / Search */}
                <div className="px-4 py-2 border-b border-gray-200 dark:border-neutral-800 flex items-center gap-4">
                  <span className="text-[15px] font-semibold text-gray-900 dark:text-white shrink-0">À :</span>
                  <div className="flex-1 flex flex-wrap gap-1 items-center min-w-0">
                    {selectedMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-sm font-medium">
                        {m.username}
                        <button onClick={() => toggleMemberSelection(m)} className="hover:opacity-70">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="flex-1 min-w-[120px] bg-transparent border-none focus:ring-0 text-[15px] placeholder-gray-400 dark:placeholder-gray-500 py-1.5"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Group Name (only shown if > 1 member) */}
                {selectedMembers.length > 1 && (
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Nom du groupe (optionnel)..."
                      className="w-full bg-transparent border-none focus:ring-0 text-[15px] placeholder-gray-400"
                    />
                  </div>
                )}

                {/* Suggested Users List */}
                <div className="flex-1 overflow-y-auto pt-2 pb-4">
                  <div className="px-4 py-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Suggérés</span>
                  </div>

                  {allUsers.map(u => {
                    const isSelected = selectedMembers.some(m => m.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleMemberSelection(u)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-neutral-800">
                          {u.avatar ? (
                            <img src={`${getAvatarUrl(u.avatar)}`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                              {u.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-[15px] font-semibold text-gray-900 dark:text-white block truncate">{u.username}</span>
                          <span className="text-sm text-gray-500 block truncate">{u.displayName || u.username}</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#0095f6] border-[#0095f6]' : 'border-gray-300 dark:border-gray-600'}`}>
                          {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer Button */}
                <div className="p-4 border-t border-gray-200 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      if (selectedMembers.length === 1) {
                        openDmWithUser(selectedMembers[0].username)
                        setShowCreateGroup(false)
                        setSelectedMembers([])
                      } else {
                        handleCreateGroup()
                      }
                    }}
                    disabled={selectedMembers.length === 0 || (selectedMembers.length > 1 && !newGroupName.trim())}
                    className="w-full py-3 bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg font-semibold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedMembers.length > 1 ? 'Créer la discussion' : 'Discuter'}
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
      </div >
    </div >
  )
}
