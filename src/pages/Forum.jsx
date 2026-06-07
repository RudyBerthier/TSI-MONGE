import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, MessageSquare, Search, Filter, ThumbsUp, ThumbsDown, Clock, User, Tag, Send, Trash2, X, TrendingUp, MessageCircle, Users, Shield, Image as ImageIcon, ZoomIn, ChevronDown, FileText, File, FileCode, FileArchive, Download, Paperclip, ExternalLink, LogIn } from 'lucide-react'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { useAuth } from '../contexts/AuthContext'
import { RestrictedAccess } from '../components/RestrictedAccess'

// File type icons and colors
const FILE_TYPES = {
  image: { icon: ImageIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
  word: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  excel: { icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
  powerpoint: { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50' },
  archive: { icon: FileArchive, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  code: { icon: FileCode, color: 'text-purple-500', bg: 'bg-purple-50' },
  file: { icon: File, color: 'text-gray-500', bg: 'bg-gray-50' }
}

// Helper: format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

// Helper: get file type from URL or extension
const getFileTypeFromUrl = (url) => {
  const ext = url.split('.').pop().toLowerCase().split('?')[0]
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['xls', 'xlsx'].includes(ext)) return 'excel'
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint'
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive'
  if (['py', 'js', 'html', 'css', 'c', 'cpp', 'java', 'txt'].includes(ext)) return 'code'
  return 'file'
}

// Helper: normalize files array (handle both old format with just URLs and new format with objects)
const normalizeFiles = (files) => {
  if (!files || files.length === 0) return []
  return files.map(f => {
    if (typeof f === 'string') {
      // Old format: just URL string
      const name = f.split('/').pop()
      return { url: f, name, type: getFileTypeFromUrl(f), size: 0 }
    }
    // New format: object with url, name, type, size
    return { ...f, type: f.type || getFileTypeFromUrl(f.url) }
  })
}

// Component: File attachment display
const FileAttachment = ({ file, onView, small = false }) => {
  const fileType = file.type || getFileTypeFromUrl(file.url)
  const typeInfo = FILE_TYPES[fileType] || FILE_TYPES.file
  const IconComponent = typeInfo.icon

  if (fileType === 'image') {
    return (
      <div
        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 active:border-blue-600 transition-all ${small ? 'aspect-square' : 'aspect-video'}`}
        onClick={() => onView?.(file)}
      >
        <img
          src={file.url}
          alt={file.name || 'Image'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <div className="p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--surface)' }}>
            <ZoomIn style={{ color: 'var(--text)' }} size={small ? 16 : 20} />
          </div>
        </div>
      </div>
    )
  }

  if (fileType === 'pdf') {
    return (
      <div
        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 border-gray-200 hover:border-red-400 transition-all ${small ? '' : 'aspect-[4/3]'}`}
        onClick={() => onView?.(file)}
      >
        <div className={`w-full h-full ${typeInfo.bg} flex flex-col items-center justify-center p-3`}>
          <FileText size={small ? 32 : 48} className={typeInfo.color} />
          <span className={`${small ? 'text-[10px]' : 'text-xs'} font-medium mt-2 text-center truncate max-w-full px-2`} style={{ color: 'var(--text-muted)' }}>
            {file.name || 'Document PDF'}
          </span>
          {file.size > 0 && !small && (
            <span className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</span>
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
          <div className="p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--surface)' }}>
            <ExternalLink style={{ color: 'var(--text)' }} size={small ? 14 : 18} />
          </div>
        </div>
      </div>
    )
  }

  // Other file types - show as downloadable card
  return (
    <a
      href={file.url}
      download={file.name}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 ${typeInfo.bg} transition-all group`}
    >
      <div className={`p-2 rounded-lg bg-white/80 ${typeInfo.color}`}>
        <IconComponent size={small ? 18 : 24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${small ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--text)' }}>{file.name || 'Fichier'}</p>
        {file.size > 0 && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</p>
        )}
      </div>
      <Download size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
    </a>
  )
}

// Component: Files grid display
const FilesGrid = ({ files, onViewFile, small = false }) => {
  const normalizedFiles = normalizeFiles(files)
  if (!normalizedFiles || normalizedFiles.length === 0) return null

  const images = normalizedFiles.filter(f => (f.type || getFileTypeFromUrl(f.url)) === 'image')
  const pdfs = normalizedFiles.filter(f => (f.type || getFileTypeFromUrl(f.url)) === 'pdf')
  const others = normalizedFiles.filter(f => !['image', 'pdf'].includes(f.type || getFileTypeFromUrl(f.url)))

  return (
    <div className="space-y-3">
      {/* Images grid */}
      {images.length > 0 && (
        <div className={`grid ${small ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
          {images.map((file, idx) => (
            <FileAttachment key={idx} file={file} onView={onViewFile} small={small} />
          ))}
        </div>
      )}

      {/* PDFs grid */}
      {pdfs.length > 0 && (
        <div className={`grid ${small ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2`}>
          {pdfs.map((file, idx) => (
            <FileAttachment key={idx} file={file} onView={onViewFile} small={small} />
          ))}
        </div>
      )}

      {/* Other files list */}
      {others.length > 0 && (
        <div className="space-y-2">
          {others.map((file, idx) => (
            <FileAttachment key={idx} file={file} small={small} />
          ))}
        </div>
      )}
    </div>
  )
}

const CATEGORIES = [
  { id: 'maths', name: 'Maths', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
  { id: 'physique', name: 'Physique', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
  { id: 'si', name: 'SI', color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
  { id: 'anglais', name: 'Anglais', color: 'bg-purple-100 text-purple-700 border-purple-300', dot: 'bg-purple-500' },
  { id: 'info', name: 'Info', color: 'bg-cyan-100 text-cyan-700 border-cyan-300', dot: 'bg-cyan-500' },
  { id: 'francais', name: 'Français', color: 'bg-pink-100 text-pink-700 border-pink-300', dot: 'bg-pink-500' },
  { id: 'general', name: 'Général', color: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-500' },
  { id: 'vie-classe', name: 'Vie de classe', color: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' },
]

export function Forum() {
  const location = useLocation();
  const { user, isAuthenticated, getToken } = useAuth()

  const [topics, setTopics] = useState([])
  const [filteredTopics, setFilteredTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showNewTopicModal, setShowNewTopicModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recent') // recent, popular, replies

  // Admin - based on user role
  const isAdmin = user?.role === 'admin'

  // Form states
  const [newTopic, setNewTopic] = useState({
    title: '',
    category: 'general',
    content: '',
    author: '',
    files: [] // { url, name, type, size }
  })
  const [newReply, setNewReply] = useState('')
  const [replyAuthor, setReplyAuthor] = useState('')
  const [replyFiles, setReplyFiles] = useState([]) // { url, name, type, size }

  // Image viewer
  const [viewingImage, setViewingImage] = useState(null)

  // Device fingerprint for voting
  const [fingerprint, setFingerprint] = useState(null)

  // Votes (fetched from server based on fingerprint)
  const [userVotes, setUserVotes] = useState({})

  // Load author from authenticated user or localStorage
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      setReplyAuthor(user.username)
      setNewTopic(prev => ({ ...prev, author: user.username }))
    } else {
      const savedAuthor = localStorage.getItem('forum_username')
      if (savedAuthor) {
        setReplyAuthor(savedAuthor)
        setNewTopic(prev => ({ ...prev, author: savedAuthor }))
      }
    }
  }, [isAuthenticated, user])

  // Save author to localStorage
  const saveAuthor = (author) => {
    localStorage.setItem('forum_username', author)
    setReplyAuthor(author)
    setNewTopic(prev => ({ ...prev, author }))
  }

  // Check if user can delete (author or admin)
  const canDelete = (itemAuthor) => {
    return isAdmin || itemAuthor === replyAuthor
  }

  // Initialize fingerprint on mount
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load()
        const result = await fp.get()
        setFingerprint(result.visitorId)
      } catch (err) {
        console.error('Error getting fingerprint:', err)
      }
    }
    initFingerprint()
    fetchTopics()
  }, [])

  // Fetch user's votes when fingerprint is ready
  useEffect(() => {
    if (fingerprint) {
      fetchUserVotes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint])

  // Fetch user's votes (by fingerprint)
  const fetchUserVotes = async () => {
    if (!fingerprint) return
    try {
      const res = await fetch('/api/forum/my-votes', {
        headers: { 'x-fingerprint': fingerprint }
      })
      const data = await res.json()
      if (data.votes) {
        setUserVotes(data.votes)
      }
    } catch (err) {
      console.error('Error fetching user votes:', err)
    }
  }

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/forum/topics')
      const data = await res.json()
      setTopics(data.topics || [])
      setFilteredTopics(data.topics || [])
    } catch (err) {
      console.error('Error fetching topics:', err)
    }
  }

  // Filter and search
  useEffect(() => {
    let filtered = [...topics]

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory)
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        t.author.toLowerCase().includes(query)
      )
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (sortBy === 'popular') {
      filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    } else if (sortBy === 'replies') {
      filtered.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0))
    }

    setFilteredTopics(filtered)
  }, [topics, searchQuery, filterCategory, sortBy])

  // Handle file upload for topic
  const handleTopicFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    try {
      const res = await fetch('/api/forum/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.files) {
        setNewTopic(prev => ({ ...prev, files: [...prev.files, ...data.files] }))
      }
    } catch (err) {
      console.error('Error uploading files:', err)
      alert('Erreur lors de l\'upload des fichiers')
    }
  }

  // Handle file upload for reply
  const handleReplyFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    try {
      const res = await fetch('/api/forum/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.files) {
        setReplyFiles(prev => [...prev, ...data.files])
      }
    } catch (err) {
      console.error('Error uploading files:', err)
      alert('Erreur lors de l\'upload des fichiers')
    }
  }

  // Remove file from topic
  const removeTopicFile = (index) => {
    setNewTopic(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }))
  }

  // Remove file from reply
  const removeReplyFile = (index) => {
    setReplyFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Create new topic
  const handleCreateTopic = async () => {
    if (!newTopic.title.trim() || !newTopic.content.trim() || !newTopic.author.trim()) {
      alert('Veuillez remplir tous les champs')
      return
    }

    try {
      const res = await fetch('/api/forum/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTopic)
      })

      if (res.ok) {
        saveAuthor(newTopic.author)
        setNewTopic({ title: '', category: 'general', content: '', author: newTopic.author, files: [] })
        setShowNewTopicModal(false)
        fetchTopics()
      }
    } catch (err) {
      console.error('Error creating topic:', err)
      alert('Erreur lors de la création du sujet')
    }
  }

  // Add reply
  const handleAddReply = async () => {
    if (!newReply.trim() || !replyAuthor.trim()) {
      alert('Veuillez remplir tous les champs')
      return
    }

    try {
      const res = await fetch(`/api/forum/topics/${selectedTopic.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newReply,
          author: replyAuthor,
          files: replyFiles
        })
      })

      if (res.ok) {
        saveAuthor(replyAuthor)
        setNewReply('')
        setReplyFiles([])
        fetchTopics()
        // Refresh selected topic
        const updated = await fetch(`/api/forum/topics/${selectedTopic.id}`).then(r => r.json())
        setSelectedTopic(updated.topic)
      }
    } catch (err) {
      console.error('Error adding reply:', err)
      alert('Erreur lors de l\'ajout de la réponse')
    }
  }

  // Get user's vote for a topic ('like', 'dislike', or null)
  const getUserVote = (topicId) => {
    return userVotes[topicId] || null
  }

  // Handle vote (like or dislike) - fingerprint-based on server
  const handleVote = async (topicId, voteType) => {
    if (!fingerprint) return
    try {
      const res = await fetch(`/api/forum/topics/${topicId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-fingerprint': fingerprint
        },
        body: JSON.stringify({ action: voteType })
      })

      if (res.ok) {
        const data = await res.json()
        // Update local vote state
        setUserVotes(prev => {
          const newVotes = { ...prev }
          if (data.userVote) {
            newVotes[topicId] = data.userVote
          } else {
            delete newVotes[topicId]
          }
          return newVotes
        })

        // Update topics with new counts
        setTopics(prev => prev.map(t =>
          t.id === topicId
            ? { ...t, likes: data.likes, dislikes: data.dislikes }
            : t
        ))

        // Update selected topic if viewing
        if (selectedTopic?.id === topicId) {
          setSelectedTopic(prev => ({
            ...prev,
            likes: data.likes,
            dislikes: data.dislikes
          }))
        }
      }
    } catch (err) {
      console.error('Error voting:', err)
    }
  }

  // Delete topic
  const handleDeleteTopic = async (topicId, topicAuthor) => {
    if (!canDelete(topicAuthor)) {
      alert('Vous ne pouvez supprimer que vos propres sujets')
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce sujet ?')) return

    try {
      const headers = {}
      if (isAdmin) {
        headers['Authorization'] = `Bearer ${getToken()}`
      }

      const res = await fetch(`/api/forum/topics/${topicId}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        fetchTopics()
        if (selectedTopic?.id === topicId) setSelectedTopic(null)
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (err) {
      console.error('Error deleting topic:', err)
      alert('Erreur lors de la suppression')
    }
  }

  // Delete reply
  const handleDeleteReply = async (topicId, replyId, replyAuthor) => {
    if (!canDelete(replyAuthor)) {
      alert('Vous ne pouvez supprimer que vos propres réponses')
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réponse ?')) return

    try {
      const headers = {}
      if (isAdmin) {
        headers['Authorization'] = `Bearer ${getToken()}`
      }

      const res = await fetch(`/api/forum/topics/${topicId}/replies/${replyId}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        fetchTopics()
        // Refresh selected topic
        const updated = await fetch(`/api/forum/topics/${topicId}`).then(r => r.json())
        setSelectedTopic(updated.topic)
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (err) {
      console.error('Error deleting reply:', err)
      alert('Erreur lors de la suppression')
    }
  }

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Get category info
  const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[6]
  }

  // Stats
  const totalTopics = topics.length
  const totalReplies = topics.reduce((sum, t) => sum + (t.replies?.length || 0), 0)
  const activeUsers = new Set(topics.flatMap(t => [t.author, ...(t.replies?.map(r => r.author) || [])])).size

  // If viewing a topic
  if (selectedTopic) {
    const category = getCategoryInfo(selectedTopic.category)
    return (
      <div className="pb-20" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        {/* Header */}
        <div className="shadow-lg sticky top-0 z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedTopic(null)} className="hover:opacity-70 transition-opacity p-1" style={{ color: 'var(--accent)' }}>
                <ArrowLeft size={22} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Forum TSI-1</h1>
                  {isAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Retour aux sujets</p>
              </div>
            </div>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="max-w-4xl mx-auto px-4 py-12">
            <RestrictedAccess
              title="Accès restreint"
              message="Connectez-vous pour lire ou participer à ce sujet du forum."
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Main topic card */}
            <div className="rounded-2xl shadow-lg overflow-hidden mb-4" style={{ background: 'var(--surface)', border: '2px solid var(--border)' }}>
              <div className="p-6">
                {/* Category badge */}
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${category.color}`}>
                    <span className={`w-2 h-2 rounded-full ${category.dot}`} />
                    {category.name}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>{selectedTopic.title}</h2>

                {/* Content */}
                <p className="whitespace-pre-wrap mb-4" style={{ color: 'var(--text)' }}>{selectedTopic.content}</p>

                {/* Files/Attachments */}
                {((selectedTopic.files && selectedTopic.files.length > 0) || (selectedTopic.images && selectedTopic.images.length > 0)) && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Paperclip size={16} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                        {(selectedTopic.files?.length || 0) + (selectedTopic.images?.length || 0)} fichier{((selectedTopic.files?.length || 0) + (selectedTopic.images?.length || 0)) > 1 ? 's' : ''}
                      </span>
                    </div>
                    <FilesGrid
                      files={[...(selectedTopic.files || []), ...(selectedTopic.images || [])]}
                      onViewFile={(file) => setViewingImage(file)}
                    />
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1.5">
                      <User size={16} />
                      <Link to={`/social/user/${selectedTopic.author}`} className="font-medium hover:underline" style={{ color: 'var(--text)' }}>{selectedTopic.author}</Link>
                      {isAdmin && selectedTopic.author === replyAuthor && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 dark:text-red-400 border border-red-200">
                          ADMIN
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} />
                      {formatDate(selectedTopic.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Like button */}
                    <button
                      onClick={() => handleVote(selectedTopic.id, 'like')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all ${getUserVote(selectedTopic.id) === 'like'
                        ? 'bg-green-100 text-green-600'
                        : 'text-gray-600 hover:bg-green-50 hover:text-green-600'
                        }`}
                      title={getUserVote(selectedTopic.id) === 'like' ? "Retirer le j'aime" : "J'aime"}
                    >
                      <ThumbsUp size={16} className={getUserVote(selectedTopic.id) === 'like' ? 'fill-green-600' : ''} />
                      <span className="font-bold">{selectedTopic.likes || 0}</span>
                    </button>

                    {/* Dislike button */}
                    <button
                      onClick={() => handleVote(selectedTopic.id, 'dislike')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all ${getUserVote(selectedTopic.id) === 'dislike'
                        ? 'bg-red-100 text-red-600'
                        : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                        }`}
                      title={getUserVote(selectedTopic.id) === 'dislike' ? "Retirer le j'aime pas" : "J'aime pas"}
                    >
                      <ThumbsDown size={16} className={getUserVote(selectedTopic.id) === 'dislike' ? 'fill-red-600' : ''} />
                      <span className="font-bold">{selectedTopic.dislikes || 0}</span>
                    </button>
                    {canDelete(selectedTopic.author) && (
                      <button
                        onClick={() => handleDeleteTopic(selectedTopic.id, selectedTopic.author)}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl text-red-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all flex items-center justify-center"
                        title={isAdmin ? "Supprimer (Admin)" : "Supprimer votre sujet"}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Replies section */}
            <div className="rounded-2xl shadow-lg overflow-hidden mb-4" style={{ background: 'var(--surface)', border: '2px solid var(--border)' }}>
              <div className="px-6 py-4" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <MessageCircle size={20} style={{ color: 'var(--accent)' }} />
                  {selectedTopic.replies?.length || 0} Réponse{(selectedTopic.replies?.length || 0) !== 1 ? 's' : ''}
                </h3>
              </div>

              {/* Replies list */}
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {(selectedTopic.replies || []).map((reply, idx) => (
                  <div key={idx} className="p-4 sm:p-6 transition-colors group" style={{ background: 'var(--surface)' }}>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Link to={`/social/user/${reply.author}`} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 hover:opacity-80 transition-opacity">
                        {reply.author.charAt(0).toUpperCase()}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Link to={`/social/user/${reply.author}`} className="font-semibold hover:underline" style={{ color: 'var(--text)' }}>{reply.author}</Link>
                          {isAdmin && reply.author === replyAuthor && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">
                              ADMIN
                            </span>
                          )}
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>•</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap mb-2" style={{ color: 'var(--text)' }}>{reply.content}</p>

                        {/* Reply files */}
                        {((reply.files && reply.files.length > 0) || (reply.images && reply.images.length > 0)) && (
                          <div className="mt-3">
                            <FilesGrid
                              files={[...(reply.files || []), ...(reply.images || [])]}
                              onViewFile={(file) => setViewingImage(file)}
                              small
                            />
                          </div>
                        )}
                      </div>
                      {canDelete(reply.author) && (
                        <button
                          onClick={() => handleDeleteReply(selectedTopic.id, reply.id, reply.author)}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 transition-all shrink-0"
                          title={isAdmin ? "Supprimer (Admin)" : "Supprimer votre réponse"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(selectedTopic.replies || []).length === 0 && (
                  <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
                    <p>Aucune réponse pour le moment. Soyez le premier à répondre !</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reply form */}
            <div className="rounded-2xl shadow-lg p-4 sm:p-6" style={{ background: 'var(--surface)', border: '2px solid var(--border)' }}>
              <h3 className="font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base" style={{ color: 'var(--text)' }}>
                <Send size={18} style={{ color: 'var(--accent)' }} />
                Ajouter une réponse
              </h3>

              {isAuthenticated ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Votre réponse</label>
                    <textarea
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Écrivez votre réponse..."
                      rows={4}
                      className="tsi-input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>

                  {/* File upload for reply */}
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>Fichiers (optionnel)</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed hover:border-blue-400 cursor-pointer transition-all" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <Paperclip size={18} />
                        <span className="text-sm font-medium">Ajouter des fichiers</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.py,.js,.html,.css,.c,.cpp,.java"
                          onChange={handleReplyFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Images, PDF, documents... (max 5, 10Mo/fichier)</span>
                    </div>

                    {/* File previews */}
                    {replyFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {replyFiles.map((file, idx) => {
                          const fileType = file.type || getFileTypeFromUrl(file.url)
                          const typeInfo = FILE_TYPES[fileType] || FILE_TYPES.file
                          const IconComponent = typeInfo.icon
                          return (
                            <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border ${typeInfo.bg}`} style={{ borderColor: 'var(--border)' }}>
                              {fileType === 'image' ? (
                                <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded" />
                              ) : (
                                <div className={`p-2 rounded ${typeInfo.color}`}>
                                  <IconComponent size={20} />
                                </div>
                              )}
                              <span className="flex-1 text-sm truncate" style={{ color: 'var(--text)' }}>{file.name}</span>
                              {file.size > 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</span>}
                              <button
                                onClick={() => removeReplyFile(idx)}
                                className="p-1 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddReply}
                    disabled={!newReply.trim() || !replyAuthor.trim()}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    Envoyer la réponse
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <LogIn size={24} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    Connectez-vous pour répondre à ce sujet.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Link
                      to="/login" state={{ from: location.pathname }}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <LogIn size={16} />
                      Connexion
                    </Link>
                    <Link
                      to="/register" state={{ from: location.pathname }}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--surface-2)' }}
                    >
                      S'inscrire
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File viewer lightbox (images and PDFs) */}
        {viewingImage && (() => {
          const file = typeof viewingImage === 'string' ? { url: viewingImage, type: getFileTypeFromUrl(viewingImage) } : viewingImage
          const fileType = file.type || getFileTypeFromUrl(file.url)

          return (
            <div
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden"
              onClick={() => setViewingImage(null)}
            >
              {/* Header with close and download */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex items-center justify-between z-10">
                <div className="text-white text-xs sm:text-sm truncate max-w-[50%]">
                  {file.name || (fileType === 'pdf' ? 'Document PDF' : 'Image')}
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 sm:p-2 rounded-full text-white transition-all hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.1)' }}
                    title="Télécharger"
                  >
                    <Download size={18} />
                  </a>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 sm:p-2 rounded-full text-white transition-all hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.1)' }}
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    onClick={() => setViewingImage(null)}
                    className="p-1.5 sm:p-2 rounded-full text-white transition-all hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.1)' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              {fileType === 'image' ? (
                <img
                  src={file.url}
                  alt={file.name || 'Image en grand'}
                  className="w-auto h-auto max-w-[calc(100vw-1rem)] max-h-[80vh] sm:max-w-[calc(100vw-2rem)] sm:max-h-[85vh] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : fileType === 'pdf' ? (
                <iframe
                  src={file.url}
                  title={file.name || 'PDF'}
                  className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-4xl h-[80vh] sm:h-[85vh] rounded-lg shadow-2xl"
                  style={{ background: 'var(--surface)' }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : null}
            </div>
          )
        })()}
      </div>
    )
  }

  // Main forum view
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Topics list header */}
      <div className="sticky top-0 z-30 shadow-sm" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="transition-colors p-1" style={{ color: 'var(--accent)' }}>
                <ArrowLeft size={22} />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <MessageSquare size={24} style={{ color: 'var(--accent)' }} className="hidden sm:block" />
                Forum TSI-1
              </h1>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => setShowNewTopicModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-md active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nouveau sujet</span>
              </button>
            )}
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un sujet..."
                className="tsi-input w-full pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            {/* Category filter - custom styled */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="tsi-input appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium cursor-pointer"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* Sort filter */}
            <div className="relative hidden sm:block">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="tsi-input appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium cursor-pointer"
              >
                <option value="recent">Récents</option>
                <option value="popular">Populaires</option>
                <option value="replies">Plus actifs</option>
              </select>
              <TrendingUp size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <RestrictedAccess
            title="Accès restreint"
            message="Connectez-vous pour lire ou participer au forum de la classe."
          />
        </div>
      ) : (
        <>
          <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
            {/* Active filters display */}
          </div>

          {/* Stats bar */}
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl shadow-sm p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{totalTopics}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Sujets</div>
              </div>
              <div className="rounded-xl shadow-sm p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-2xl font-bold text-emerald-600">{totalReplies}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Réponses</div>
              </div>
              <div className="rounded-xl shadow-sm p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-2xl font-bold text-purple-600">{activeUsers}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Participants</div>
              </div>
            </div>
          </div>

          {/* Topics list */}
          <div className="max-w-6xl mx-auto px-4 pb-6">
            <div className="space-y-3">
              {filteredTopics.map(topic => {
                const category = getCategoryInfo(topic.category)
                return (
                  <div
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className="rounded-xl shadow-sm hover:shadow-md p-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <Link to={`/social/user/${topic.author}`} onClick={(e) => e.stopPropagation()} className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 hover:opacity-80 transition-opacity">
                        {topic.author.charAt(0).toUpperCase()}
                      </Link>
                      <div className="flex-1 min-w-0">
                        {/* Category badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${category.color} mb-2`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${category.dot}`} />
                          {category.name}
                        </span>

                        {/* Title */}
                        <h3 className="font-bold mb-1 truncate" style={{ color: 'var(--text)' }}>{topic.title}</h3>

                        {/* Preview */}
                        <p className="text-sm line-clamp-2 mb-2" style={{ color: 'var(--text-muted)' }}>{topic.content}</p>

                        {/* Images preview indicator */}
                        {topic.images && topic.images.length > 0 && (
                          <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--accent)' }}>
                            <ImageIcon size={14} />
                            <span className="font-medium">{topic.images.length} image{topic.images.length > 1 ? 's' : ''}</span>
                          </div>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-3 sm:gap-4 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <User size={14} className="shrink-0" />
                            <Link to={`/social/user/${topic.author}`} onClick={(e) => e.stopPropagation()} className="truncate max-w-[80px] sm:max-w-none hover:underline">{topic.author}</Link>
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock size={14} />
                            {formatDate(topic.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <MessageSquare size={14} />
                            {topic.replies?.length || 0}
                          </span>
                          <span className={`flex items-center gap-1 shrink-0 ${getUserVote(topic.id) === 'like' ? 'text-green-600 font-medium' : ''}`}>
                            <ThumbsUp size={14} className={getUserVote(topic.id) === 'like' ? 'fill-green-600' : ''} />
                            {topic.likes || 0}
                          </span>
                          <span className={`flex items-center gap-1 shrink-0 ${getUserVote(topic.id) === 'dislike' ? 'text-red-600 font-medium' : ''}`}>
                            <ThumbsDown size={14} className={getUserVote(topic.id) === 'dislike' ? 'fill-red-600' : ''} />
                            {topic.dislikes || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredTopics.length === 0 && (
                <div className="rounded-xl shadow-sm p-12 text-center" style={{ background: 'var(--surface)' }}>
                  <MessageSquare size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)' }}>
                    {searchQuery || filterCategory !== 'all'
                      ? 'Aucun sujet trouvé avec ces critères'
                      : 'Aucun sujet pour le moment. Soyez le premier à créer un sujet !'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* New topic modal */}
      {showNewTopicModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-4 sticky top-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Plus size={20} style={{ color: 'var(--accent)' }} />
                Créer un nouveau sujet
              </h3>
              <button onClick={() => setShowNewTopicModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewTopic({ ...newTopic, category: cat.id })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${newTopic.category === cat.id
                        ? cat.color + ' ring-2 ring-offset-2 ring-blue-400'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Titre du sujet</label>
                <input
                  type="text"
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  placeholder="Ex: Question sur le chapitre 5 de Maths"
                  className="tsi-input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Votre message</label>
                <textarea
                  value={newTopic.content}
                  onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                  placeholder="Décrivez votre question ou sujet de discussion..."
                  rows={6}
                  className="tsi-input w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {/* File upload for topic */}
              <div>
                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>Fichiers (optionnel)</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed hover:border-blue-400 cursor-pointer transition-all" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <Paperclip size={18} />
                    <span className="text-sm font-medium">Ajouter des fichiers</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.py,.js,.html,.css,.c,.cpp,.java"
                      onChange={handleTopicFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-gray-400">Images, PDF, documents... (max 5, 10Mo/fichier)</span>
                </div>

                {/* File previews */}
                {newTopic.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newTopic.files.map((file, idx) => {
                      const fileType = file.type || getFileTypeFromUrl(file.url)
                      const typeInfo = FILE_TYPES[fileType] || FILE_TYPES.file
                      const IconComponent = typeInfo.icon
                      return (
                        <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border ${typeInfo.bg} border-gray-200`}>
                          {fileType === 'image' ? (
                            <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className={`p-2 rounded ${typeInfo.color}`}>
                              <IconComponent size={20} />
                            </div>
                          )}
                          <span className="flex-1 text-sm truncate" style={{ color: 'var(--text)' }}>{file.name}</span>
                          {file.size > 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</span>}
                          <button
                            onClick={() => removeTopicFile(idx)}
                            className="p-1 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowNewTopicModal(false)}
                className="tsi-btn-ghost flex-1 py-2.5 justify-center font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateTopic}
                disabled={!newTopic.title.trim() || !newTopic.content.trim() || !newTopic.author.trim()}
                className="tsi-btn-primary flex-1 py-2.5 justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Créer le sujet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File viewer lightbox (images and PDFs) */}
      {viewingImage && (() => {
        const file = typeof viewingImage === 'string' ? { url: viewingImage, type: getFileTypeFromUrl(viewingImage) } : viewingImage
        const fileType = file.type || getFileTypeFromUrl(file.url)

        return (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={() => setViewingImage(null)}
          >
            {/* Header with close and download */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="text-white text-sm truncate max-w-[60%]">
                {file.name || (fileType === 'pdf' ? 'Document PDF' : 'Image')}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={file.url}
                  download={file.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-full text-white transition-all hover:bg-white/20 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}
                  title="Télécharger"
                >
                  <Download size={20} />
                </a>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-full text-white transition-all hover:bg-white/20 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink size={20} />
                </a>
                <button
                  onClick={() => setViewingImage(null)}
                  className="p-2 rounded-full text-white transition-all hover:bg-white/20 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            {fileType === 'image' ? (
              <img
                src={file.url}
                alt={file.name || 'Image en grand'}
                className="w-auto h-auto max-w-[calc(100vw-1rem)] max-h-[80vh] sm:max-w-[calc(100vw-2rem)] sm:max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : fileType === 'pdf' ? (
              <iframe
                src={file.url}
                title={file.name || 'PDF'}
                className="w-[calc(100vw-1rem)] sm:w-full max-w-4xl h-[80vh] sm:h-[85vh] rounded-lg shadow-2xl" style={{ background: 'var(--surface)' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : null}
          </div>
        )
      })()}

      {/* Login required prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center" style={{ background: 'var(--surface)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
              <LogIn size={32} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>Connexion requise</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Vous devez être connecté pour poster sur le forum.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="tsi-btn-ghost flex-1 py-2.5 justify-center text-sm font-medium"
              >
                Annuler
              </button>
              <Link
                to="/login" state={{ from: location.pathname }}
                className="tsi-btn-primary flex-1 py-2.5 justify-center text-sm font-medium"
              >
                <LogIn size={16} />
                Connexion
              </Link>
            </div>
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Pas de compte ?{' '}
              <Link to="/register" state={{ from: location.pathname }} className="hover:underline" style={{ color: 'var(--accent)' }}>
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
