import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Star, Send, Trash2, UtensilsCrossed, TrendingUp, Users, ChevronDown, Image as ImageIcon, X, ZoomIn, LogIn, SmilePlus, Menu as MenuIcon, MessageCircle, CalendarDays, Info, Upload, RefreshCw, Facebook } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { REACTION_EMOJIS } from '../utils/chat'

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

function ReactionPicker({ avisId, onReact }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-all touch-small"
        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
        title="Ajouter une réaction"
      >
        <SmilePlus size={14} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full mb-1 z-20 rounded-xl shadow-lg p-1.5 flex gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { onReact(avisId, emoji); setOpen(false) }}
                className="hover:scale-125 transition-transform text-lg p-0.5 touch-small"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Cantine() {
  const location = useLocation();
  const { user, isAuthenticated, getToken, userSettings, updateUserSettings } = useAuth()
  const { socket } = useSocket()

  const [avis, setAvis] = useState([])
  const [stats, setStats] = useState({ total: 0, moyenne: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state - use authenticated username if available
  const [pseudoState, setPseudoState] = useState(() => localStorage.getItem('cantine_pseudo') || '')

  useEffect(() => {
    if (userSettings && userSettings.cantine_pseudo !== undefined) {
      setPseudoState(userSettings.cantine_pseudo)
    }
  }, [userSettings])

  const pseudo = pseudoState
  const setPseudo = (val) => {
    setPseudoState(val)
    if (updateUserSettings) updateUserSettings({ cantine_pseudo: val })
  }

  const [note, setNote] = useState(0)
  const [hoverNote, setHoverNote] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [plat, setPlat] = useState('')
  const [images, setImages] = useState([]) // { url, name }

  // Image viewer
  const [viewingImage, setViewingImage] = useState(null)

  // Menu state
  const [menuData, setMenuData] = useState(null)
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState(null)
  const [uploadingMenu, setUploadingMenu] = useState(false)
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date()
    let dayIndex = now.getDay()
    if (now.getHours() >= 19) dayIndex = (dayIndex + 1) % 7
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    return (dayIndex >= 1 && dayIndex <= 5) ? jours[dayIndex] : 'Lundi'
  })
  const [selectedMeal, setSelectedMeal] = useState(() => {
    const hour = new Date().getHours()
    return hour >= 15 ? 'soir' : 'midi'
  })

  const CATEGORIES_ORDER = ['Entrées', 'Plats', 'Accompagnements', 'Desserts']

  const [activeTab, setActiveTab] = useState('menu') // 'menu' or 'avis'

  // Admin - based on user role
  const isAdmin = user?.role === 'admin'

  // Fetch data
  const fetchData = async () => {
    try {
      const [avisRes, statsRes] = await Promise.all([
        fetch('/api/cantine/avis'),
        fetch('/api/cantine/stats')
      ])
      const avisData = await avisRes.json()
      const statsData = await statsRes.json()
      setAvis(avisData)
      setStats(statsData)
    } catch (e) {
      console.error('Erreur chargement:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch menu
  const fetchMenu = async () => {
    setMenuLoading(true)
    setMenuError(null)
    try {
      const res = await fetch('/api/cantine/menu')
      const data = await res.json()
      setMenuData(data)
    } catch (e) {
      setMenuError('Impossible de charger le menu')
    } finally {
      setMenuLoading(false)
    }
  }

  useEffect(() => {
    fetchMenu()
  }, [])

  // Lock body scroll when lightbox is open (prevents background scroll on mobile)
  useEffect(() => {
    if (viewingImage) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [viewingImage])

  // Admin: upload menu image/PDF
  const handleMenuUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMenu(true)
    try {
      const formData = new FormData()
      formData.append('menu', file)
      formData.append('weekLabel', `Menu de la semaine du ${new Date().toLocaleDateString('fr-FR')}`)
      const res = await fetch('/api/cantine/menu-upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        fetchMenu()
        if (data.stats) {
          alert(`Menu extrait : ${data.stats.days} jours, ${data.stats.items} plats détectés`)
        }
      } else {
        alert(data.error || 'Erreur lors de l\'upload')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setUploadingMenu(false)
    }
  }

  // Set pseudo from authenticated user
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      setPseudo(user.username)
    }
  }, [isAuthenticated, user])

  // Socket listener for real-time reactions
  useEffect(() => {
    if (!socket) return
    const handleReacted = ({ avisId, reactions }) => {
      setAvis(prev => prev.map(a => a.id === avisId ? { ...a, reactions } : a))
    }
    socket.on('cantine:reacted', handleReacted)
    return () => socket.off('cantine:reacted', handleReacted)
  }, [socket])

  // React to an avis
  const handleReact = (avisId, emoji) => {
    if (!socket || !isAuthenticated) return
    socket.emit('cantine:react', { avisId, emoji })
  }

  // Upload images
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    if (images.length + files.length > 3) {
      alert('Maximum 3 images')
      return
    }

    const formData = new FormData()
    files.forEach(file => formData.append('images', file))

    try {
      const res = await fetch('/api/cantine/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.images) {
        setImages(prev => [...prev, ...data.images])
      }
    } catch (err) {
      console.error('Erreur upload:', err)
      alert('Erreur lors de l\'upload')
    }
  }

  // Remove image
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  // Submit review
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (note === 0) {
      alert('Choisis une note (1-5 etoiles)')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/cantine/avis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, note, commentaire, plat, images })
      })

      if (res.ok) {
        setNote(0)
        setCommentaire('')
        setPlat('')
        setImages([])
        fetchData()
      } else {
        const data = await res.json()
        alert('Erreur: ' + (data.error || 'Echec'))
      }
    } catch (e) {
      alert('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  // Check if user can delete a review (own post or admin)
  const canDelete = (authorPseudo) => {
    if (isAdmin) return true
    // L'utilisateur peut supprimer son propre avis si le pseudo correspond
    return pseudo && pseudo.toLowerCase() === authorPseudo?.toLowerCase()
  }

  // Delete review (own post or admin)
  const handleDelete = async (id, authorPseudo) => {
    if (!confirm('Supprimer cet avis ?')) return
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-author-pseudo': pseudo
      }
      if (isAdmin) {
        headers['Authorization'] = `Bearer ${getToken()}`
      }

      const res = await fetch(`/api/cantine/avis/${id}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert('Erreur: ' + (data.error || 'Impossible de supprimer'))
      }
    } catch (e) {
      alert('Erreur')
    }
  }

  // Star rating component
  const StarRating = ({ value, onChange, onHover, size = 24, readonly = false }) => {
    const displayValue = onHover && hoverNote > 0 ? hoverNote : value
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
            className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
          >
            <Star
              size={size}
              className={`transition-colors ${star <= displayValue
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
                }`}
            />
          </button>
        ))}
      </div>
    )
  }

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "A l'instant"
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Note emoji
  const getNoteEmoji = (n) => {
    if (n >= 4.5) return '😍'
    if (n >= 3.5) return '😊'
    if (n >= 2.5) return '😐'
    if (n >= 1.5) return '😕'
    return '😖'
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="transition-colors p-1" style={{ color: 'var(--accent)' }}>
                <ArrowLeft size={22} />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <UtensilsCrossed size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Cantine</h1>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Menu et Avis</p>
                </div>
              </div>
            </div>
            {isAdmin && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500 text-white animate-pulse">ADMIN</span>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="mt-5 flex items-center gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
            <button
              onClick={() => setActiveTab('menu')}
              className="flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
              style={activeTab === 'menu' ? { background: 'var(--surface)', color: 'var(--accent)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-muted)' }}
            >
              <MenuIcon size={16} /> <span>Menu</span>
            </button>
            <button
              onClick={() => setActiveTab('avis')}
              className="flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
              style={activeTab === 'avis' ? { background: 'var(--surface)', color: 'var(--accent)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-muted)' }}
            >
              <MessageCircle size={16} /> <span>Avis & Photos</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* VIEW: MENU */}
        {activeTab === 'menu' && (
          <div className="space-y-4 animate-fade-in-up">

            {/* Menu Content */}
            {menuLoading ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="animate-pulse">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-4 w-48 mx-auto rounded" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
            ) : menuData?.imageUrl ? (
              <>
                <div className="rounded-2xl p-6 text-center mb-6" style={{ background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
                  <Info size={28} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                  <p className="font-medium" style={{ color: 'var(--text)' }}>
                    Le service de reconnaissance textuelle est temporairement en maintenance
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Mais voici l'image originale complète du menu :
                  </p>
                </div>

                {/* Image preview (zoomable) */}
                <div
                  className="rounded-2xl overflow-hidden cursor-pointer group relative"
                  style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
                  onClick={() => setViewingImage(menuData.imageUrl)}
                >
                  <img
                    src={menuData.imageUrl}
                    alt="Menu de la cantine"
                    className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                    style={{ background: 'var(--surface)' }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                    <div className="p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--surface)' }}>
                      <ZoomIn size={22} style={{ color: 'var(--text)' }} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl p-8 text-center space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <UtensilsCrossed size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>Menu pas encore disponible</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {menuError || 'Le menu de la semaine n\'a pas encore été uploadé.'}
                </p>
                {menuData?.facebookUrl && (
                  <a
                    href={menuData.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{ background: '#1877F2', color: 'white' }}
                  >
                    <Facebook size={16} />
                    Voir sur la page Facebook du lycée
                  </a>
                )}
              </div>
            )}

            {/* Admin: upload */}
            {isAdmin && (
              <div className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Upload size={16} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Upload le menu (image ou PDF)</span>
                </div>
                <label className="tsi-btn-primary text-xs cursor-pointer flex items-center gap-1.5">
                  {uploadingMenu ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploadingMenu ? 'Analyse en cours...' : 'Choisir un fichier'}
                  <input type="file" accept="image/*,.pdf" onChange={handleMenuUpload} className="hidden" disabled={uploadingMenu} />
                </label>
              </div>
            )}

            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Info size={20} className="shrink-0 text-blue-500 mt-0.5" />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Le menu est extrait automatiquement depuis la photo ou le PDF uploadé par l'admin. <br />
                Les plats sont détectés par OCR et classés par catégorie.
              </p>
            </div>
          </div>
        )}

        {/* VIEW: AVIS */}
        {activeTab === 'avis' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Stats Card */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
                  Statistiques
                </h2>
                <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Users size={14} />
                  {stats.total} avis
                </span>
              </div>

              {stats.total > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{stats.moyenne.toFixed(1)}</div>
                    <div className="flex justify-center mt-1">
                      <StarRating value={Math.round(stats.moyenne)} readonly size={16} />
                    </div>
                    <div className="text-2xl mt-1">{getNoteEmoji(stats.moyenne)}</div>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map(n => {
                      const count = stats.distribution[n] || 0
                      const percent = stats.total > 0 ? (count / stats.total) * 100 : 0
                      return (
                        <div key={n} className="flex items-center gap-2 text-sm">
                          <span className="w-3" style={{ color: 'var(--text-muted)' }}>{n}</span>
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, background: 'var(--accent)' }} />
                          </div>
                          <span className="w-8 text-xs text-right" style={{ color: 'var(--text-muted)' }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>Aucun avis pour le moment</p>
              )}
            </div>

            {/* Submit Form */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Donner ton avis</h2>

              {isAuthenticated ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Ta note</label>
                    <div className="flex items-center gap-3">
                      <StarRating
                        value={note}
                        onChange={setNote}
                        onHover={setHoverNote}
                        size={32}
                      />
                      {(hoverNote || note) > 0 && (
                        <span className="text-2xl">
                          {getNoteEmoji(hoverNote || note)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Plat du jour (optionnel)</label>
                    <input type="text" value={plat} onChange={e => setPlat(e.target.value)} placeholder="Ex: Poulet frites, Lasagnes..." maxLength={100} className="tsi-input" />
                  </div>

                  <div className="mb-4">
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Commentaire (optionnel)</label>
                    <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Ton avis sur le repas..." rows={3} maxLength={500} className="tsi-input" style={{ resize: 'none' }} />
                  </div>

                  <div className="mb-4">
                    <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Photos du plat (optionnel)</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm" style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}>
                        <ImageIcon size={18} />
                        <span>Ajouter des photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-gray-400">Max 3 images</span>
                    </div>

                    {/* Image previews */}
                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border-2" style={{ borderColor: 'var(--border)' }}>
                            <img src={img.url} alt={img.name || `Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={submitting || note === 0} className="tsi-btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send size={18} />
                    {submitting ? 'Envoi...' : 'Publier mon avis'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
                    <LogIn size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    Connectez-vous pour donner votre avis sur la cantine.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Link to="/login" state={{ from: location.pathname }} className="tsi-btn-primary text-sm"><LogIn size={16} />Connexion</Link>
                    <Link to="/register" state={{ from: location.pathname }} className="tsi-btn-ghost text-sm">S'inscrire</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                Derniers avis
                <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({avis.length})</span>
              </h2>

              {loading ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
              ) : avis.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                  <UtensilsCrossed size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Aucun avis pour le moment</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sois le premier a donner ton avis !</p>
                </div>
              ) : (
                avis.map(a => (
                  <div key={a.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Link to={`/social/user/${a.pseudo}`} className="font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--text)' }}>{a.pseudo}</Link>
                          <StarRating value={a.note} readonly size={14} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(a.createdAt)}</span>
                        </div>

                        {/* Plat */}
                        {a.plat && (
                          <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg mb-2" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)' }}>
                            <UtensilsCrossed size={12} />
                            {a.plat}
                          </div>
                        )}

                        {/* Comment */}
                        {a.commentaire && (
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{a.commentaire}</p>
                        )}

                        {/* Images */}
                        {a.images && a.images.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {a.images.map((img, idx) => (
                              <div
                                key={idx}
                                className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden border-2 transition-all"
                                style={{ borderColor: 'var(--border)' }}
                                onClick={() => setViewingImage(typeof img === 'string' ? img : img.url)}
                              >
                                <img
                                  src={typeof img === 'string' ? img : img.url}
                                  alt={`Photo ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                  <div className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--surface)' }}>
                                    <ZoomIn size={14} style={{ color: 'var(--text)' }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reactions */}
                        {(a.reactions?.length > 0 || isAuthenticated) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-3">
                            {a.reactions?.length > 0 && Object.values((a.reactions || []).reduce((acc, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] }
                              acc[r.emoji].count++
                              acc[r.emoji].users.push(r)
                              return acc
                            }, {})).map(({ emoji, count, users }) => {
                              const hasReacted = users.some(u => u.userId === user?.id)
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(a.id, emoji)}
                                  disabled={!isAuthenticated}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all touch-small"
                                  style={hasReacted
                                    ? { background: 'rgba(var(--accent-rgb), 0.12)', border: '1px solid rgba(var(--accent-rgb), 0.4)' }
                                    : { background: 'var(--surface-2)', border: '1px solid transparent' }
                                  }
                                  title={users.map(u => u.username).join(', ')}
                                >
                                  <span>{emoji}</span>
                                  <div className="flex -space-x-1.5">
                                    {users.slice(0, 3).map(u => (
                                      <Link to={`/social/user/${u.username}`} key={u.userId} className="w-4 h-4 rounded-full overflow-hidden border hover:opacity-80 transition-opacity" style={{ borderColor: 'var(--surface)' }} title={u.username}>
                                        {u.avatar ? (
                                          <img src={`${SOCKET_URL}${u.avatar}`} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[7px] font-bold">
                                            {u.username?.[0]?.toUpperCase() || '?'}
                                          </div>
                                        )}
                                      </Link>
                                    ))}
                                  </div>
                                  {count > 3 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{count - 3}</span>}
                                </button>
                              )
                            })}
                            {isAuthenticated && <ReactionPicker avisId={a.id} onReact={handleReact} />}
                          </div>
                        )}
                      </div>

                      {/* Delete button (own post or admin) */}
                      {canDelete(a.pseudo) && (
                        <button
                          onClick={() => handleDelete(a.id, a.pseudo)}
                          className="p-2 rounded-lg transition-colors shrink-0 flex items-center justify-center"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                          title={isAdmin ? "Supprimer (Admin)" : "Supprimer mon avis"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Back link */}
            <div className="text-center pb-8 pt-4">
              <Link to="/" className="font-medium text-sm transition-colors" style={{ color: 'var(--accent)' }}>
                ← Retour a l'accueil
              </Link>
            </div>
          </div>
        )}

        {/* Image viewer lightbox */}
        {viewingImage && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
            onTouchMove={(e) => e.preventDefault()}
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-white transition-all hover:bg-white/20"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <X size={24} />
            </button>
            <img
              src={viewingImage}
              alt="Photo en grand"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  )
}
