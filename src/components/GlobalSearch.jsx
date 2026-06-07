import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  CalendarDays,
  UtensilsCrossed,
  MessageCircle,
  Clock,
  PieChart,
  MapPin,
  Calculator,
  BookOpen,
  CloudSun,
  User,
  Settings,
  X,
  Trophy,
  FileText,
  Brain,
  Car
} from 'lucide-react'

const SEARCH_ITEMS = [
  { id: 'emploi-du-temps', title: 'Emploi du temps', description: 'Consulter tes cours de la semaine', icon: CalendarDays, path: '/emploi-du-temps' },
  { id: 'cantine', title: 'Cantine', description: 'Menu, notes et photos', icon: UtensilsCrossed, path: '/cantine' },
  { id: 'forum', title: 'Forum', description: 'Discuter avec les autres étudiants', icon: MessageCircle, path: '/forum' },
  { id: 'maths', title: 'Mathématiques', description: 'Ressources et cours de maths', icon: Calculator, path: '/maths' },
  { id: 'annales', title: 'Annales', description: 'Sujets et corrections', icon: BookOpen, path: '/annales' },
  { id: 'meteo', title: 'Météo', description: 'Prévisions pour le lycée', icon: CloudSun, path: '/meteo' },
  { id: 'focus', title: 'Focus Mode', description: 'Pomodoro et concentration', icon: Brain, path: '/focus' },
  { id: 'covoiturage', title: 'Covoiturage', description: 'Trajets partagés TSI', icon: Car, path: '/covoiturage' },
  { id: 'pomodoro', title: 'Pomodoro', description: 'Minuteur de concentration', icon: Clock, path: '/pomodoro' },
  { id: 'sondages', title: 'Sondages', description: 'Participe aux sondages de la classe', icon: PieChart, path: '/sondages' },
  { id: 'places', title: 'Plan / Salles', description: 'Trouver une salle', icon: MapPin, path: '/places' },
  { id: 'chat', title: 'Chat / Feed', description: 'Espace social', icon: User, path: '/social' },
  { id: 'docs', title: 'Documents', description: 'Fichiers partagés', icon: FileText, path: '/docs' },
  { id: 'kholleurs', title: 'Khôlleurs', description: 'Informations sur les khôlleurs', icon: Trophy, path: '/kholleurs' },
  { id: 'profile', title: 'Mon Profil', description: 'Gérer mon compte', icon: Settings, path: '/profile' },
]

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
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

  // Gérer la recherche
  const filteredItems = SEARCH_ITEMS.filter(item => {
    const q = query.toLowerCase()
    return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  })

  // Réinitialiser la sélection si les résultats changent
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

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
    }
  }, [isOpen])

  // Navigation clavier dans la liste
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % filteredItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems.length > 0) {
        handleSelect(filteredItems[selectedIndex])
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

  return (
    <>
      {/* Floating Button */}
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
        <>
          {/* Overlay flouté */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={() => setIsOpen(false)}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-slate-800">
                <Search size={20} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Chercher une page, un outil... (Cmd+K)"
                  className="flex-1 bg-transparent border-none outline-none px-3 py-1 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-base"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuery('')} className={`p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity ${query ? 'opacity-100' : 'opacity-0'}`}>
                    <X size={16} />
                  </button>
                  <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">ESC</kbd>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar p-2" ref={listRef}>
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <p>Aucun résultat trouvé pour "{query}"</p>
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
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
                        {isSelected && (
                          <kbd className="hidden sm:inline-block shrink-0 px-2 py-1 text-[10px] font-semibold text-blue-500 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-800/50 shadow-sm">
                            Entrée ↵
                          </kbd>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  )
}
