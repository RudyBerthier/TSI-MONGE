// Shared chat constants and utilities (used by Chat.jsx and ChatWidget.jsx)

export const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '👀', '🎉', '💀', '🤔', '😍', '💯', '🙏', '😭']

import imageCompression from 'browser-image-compression'

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Append ?token= to protected upload paths so <img>/<audio> tags can load them
export function getAttachmentUrl(filePath) {
  if (!filePath) return filePath
  if (filePath.startsWith('/uploads/chat/') || filePath.startsWith('/uploads/voice/')) {
    const token = localStorage.getItem('token')
    if (token) return `${filePath}?token=${encodeURIComponent(token)}`
  }
  return filePath
}

// Ensure external avatar URLs (like Google's lh3.googleusercontent) aren't prefixed
export function getAvatarUrl(avatar) {
  if (!avatar) return null
  if (avatar.startsWith('http')) return avatar
  return `${SOCKET_URL}${avatar}`
}

export async function forceDownload(url, filename) {
  try {
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(url, { headers })
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

export async function uploadFile(selectedFile, getToken, setUploading) {
  if (!selectedFile) return null
  if (setUploading) setUploading(true)
  try {
    let fileToUpload = selectedFile
    if (selectedFile.type.startsWith('image/') && !selectedFile.type.includes('gif')) {
      try {
        fileToUpload = await imageCompression(selectedFile, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
      } catch (err) {
        console.error('Compression failed:', err)
      }
    }

    const formData = new FormData()
    formData.append('file', fileToUpload)
    const response = await fetch(`${SOCKET_URL}/api/chat/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur upload')
    }
    return await response.json()
  } catch (error) {
    console.error('Upload error:', error)
    alert(error.message || 'Erreur lors de l\'upload')
    return null
  } finally {
    if (setUploading) setUploading(false)
  }
}

// Format time (HH:MM)
export const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Date separator label (Aujourd'hui, Hier, lundi 10 février...)
export function formatDateSeparator(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((today - msgDay) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Check if two timestamps are on different days
export function isDifferentDay(ts1, ts2) {
  if (!ts1 || !ts2) return true
  const d1 = new Date(ts1), d2 = new Date(ts2)
  return d1.getDate() !== d2.getDate() || d1.getMonth() !== d2.getMonth() || d1.getFullYear() !== d2.getFullYear()
}

// Compute unread count for a DM conversation
// readBy in DMs is stored as simple userId strings on the server
export function getDmUnreadCount(messages, currentUserId) {
  if (!messages || !currentUserId) return 0
  return messages.filter(m =>
    m.senderId !== currentUserId && !m.readBy?.includes(currentUserId)
  ).length
}
