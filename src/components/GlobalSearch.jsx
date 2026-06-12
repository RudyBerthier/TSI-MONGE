import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, CalendarDays, UtensilsCrossed, MessageCircle, Clock,
  PieChart, MapPin, Calculator, BookOpen, CloudSun, User,
  Settings, X, Trophy, FileText, Brain, Car, Loader2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { formatTime } from '../utils/chat'

const SEARCH_ITEMS = [
  { id: 'emploi-du-temps', title: 'Emploi du temps', description: 'Consulter tes cours de la semaine', icon: CalendarDays, path: '/emploi-du-temps' },
  { id: 'covoiturage', title: 'Covoiturage', description: 'Trouver ou proposer un trajet', icon: Car, path: '/covoiturage' },
  { id: 'cantine', title: 'Cantine', description: 'Menu de la cantine et notes', icon: UtensilsCrossed, path: '/cantine' },
  { id: 'forum', title: 'Forum', description: 'Poser une question, aider les autres', icon: MessageCircle, path: '/forum' },
  { id: 'pomodoro', title: 'Session Focus', description: 'Minuteur Pomodoro', icon: Clock, path: '/pomodoro' },
  { id: 'countdown', title: 'Concours', description: 'Compte à rebours', icon: Clock, path: '/countdown' },
  { id: 'notes', title: 'Notes & Moyennes', description: 'Gérer ses notes', icon: PieChart, path: '/notes' },
  { id: 'places', title: 'Plan / Salles', description: 'Trouver une salle', icon: MapPin, path: '/places' },
  { id: 'chat', title: 'Chat / Feed', description: 'Espace social', icon: User, path: '/social' },
  { id: 'docs', title: 'Documents', description: 'Fichiers partagés', icon: FileText, path: '/docs' },
  { id: 'kholleurs', title: 'Khôlleurs', description: 'Informations sur les khôlleurs', icon: Trophy, path: '/kholleurs' },
  { id: 'profile', title: 'Mon Profil', description: 'Gérer mon compte', icon: Settings, path: '/profile' },
]

export function GlobalSearch() {
  const { getToken, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [chatResults, setChatResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Ecouteur de clavier global pour Cmd+K ou Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Gérer la recherche locale (Pages/Outils)
  const filteredItems = SEARCH_ITEMS.filter(item => {
    const q = query.toLowerCase()
    return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  })

  // API Backend pour la recherche de messages (Debounce)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || !isAuthenticated) {
      setChatResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
        if (res.ok) {
          const data = await res.json()
          setChatResults(data || [])
        }
      } catch (err) {
        console.error('Search API failed', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, isAuthenticated, getToken])

  // Les résultats totaux (pour la navigation au clavier)
  const allResults = [...filteredItems, ...chatResults]

  // Réinitialiser la sélection si les résultats changent
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, chatResults.length])

  // Scroll automatique pour garder l'élément sélectionné visible
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex]
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Focus automatique sur l'input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setChatResults([])
    }
  }, [isOpen])

  // Navigation clavier dans la liste
  const handleInputKeyDown = (e) => {
    if (allResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % allResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allResults.length > 0) {
        handleSelect(allResults[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  const handleSelect = (item) => {
    setIsOpen(false)
    navigate(item.path)
  }

  const formatResultDate = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + formatTime(d)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[9999] hidden md:flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-full backdrop-blur-md transition-colors group cursor-pointer"
      >
        <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors" />
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors border border-slate-300 dark:border-slate-600/50 rounded px-1.5 py-0.5">
          ⌘K
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 flex flex-col"
              style={{ maxHeight: '80vh' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-slate-800 shrink-0">
                <Search size={20} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Chercher un outil, un ancien message du chat..."
                  className="flex-1 bg-transparent border-none outline-none px-3 py-1 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-base"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuery('')} className={`p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity ${query ? 'opacity-100' : 'opacity-0'}`}>
                    <X size={16} />
                  </button>
                  <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">ESC</kbd>
                </div>
              </div>

              <div className="overflow-y-auto custom-scrollbar p-2" ref={listRef}>
                {allResults.length === 0 && !isSearching && query.length >= 2 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <p>Aucun résultat trouvé pour "{query}"</p>
                  </div>
                ) : allResults.length === 0 && query.length < 2 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>Recherchez dans les outils ou l'historique du chat...</p>
                  </div>
                ) : (
                  <>
                    {filteredItems.length > 0 && (
                      <div className="mb-4">
                        <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Outils & Navigation
                        </div>
                        {filteredItems.map((item, idx) => {
                          const isSelected = idx === selectedIndex
                          return (
                            <button
                              key={`tool-${item.id}`}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              onClick={() => handleSelect(item)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                isSelected 
                                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                                  : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${
                                isSelected 
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                              }`}>
                                <item.icon size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${
                                  isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'
                                }`}>
                                  {item.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {item.description}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {(chatResults.length > 0 || isSearching) && (
                      <div>
                        <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Messages du Chat</span>
                          {isSearching && <Loader2 size={12} className="animate-spin" />}
                        </div>
                        {chatResults.map((msg, offsetIdx) => {
                          const idx = filteredItems.length + offsetIdx
                          const isSelected = idx === selectedIndex
                          return (
                            <button
                              key={`msg-${msg.id}`}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              onClick={() => handleSelect(msg)}
                              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                isSelected 
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                                  : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-slate-700">
                                {msg.avatar ? (
                                  <img src={msg.avatar} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                    {msg.author.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between mb-0.5">
                                  <span className={`font-semibold text-sm ${
                                    isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'
                                  }`}>
                                    {msg.author}
                                  </span>
                                  <span className="text-[10px] text-gray-500">{formatResultDate(msg.created_at)}</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                  {msg.content}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
