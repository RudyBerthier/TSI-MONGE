import { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, BookOpen, Settings, X, Save, Pencil, ExternalLink, Plus, Trash2, Clock, MapPin, User, RefreshCw, Calendar, List, Search, UtensilsCrossed, Coffee, Bus, FileText, BookMarked, Sparkles, MessageSquarePlus, Check, XCircle, Bell, Send, WifiOff } from 'lucide-react'
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { WEEKS, SCHEDULE, HOLIDAYS, DEVOIRS_SURVEILLES, CONCOURS_BLANC } from '../utils/schedule'

const ALL_CODES = ['MP 1', 'MP 2', 'MP 3', 'MP 4', 'MP 5', 'MP 6', 'MSA 1', 'MSA 2', 'MSA 3', 'MSA 4', 'MSA 5', 'MSA 6']

// Couleurs pour chaque matière (light + dark)
const MATIERE_COLORS = {
  'Maths': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-400 dark:border-blue-600', dot: 'bg-blue-500' },
  'Physique': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-600', dot: 'bg-emerald-500' },
  'SI': { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-400 dark:border-orange-600', dot: 'bg-orange-500' },
  'Anglais': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-400 dark:border-fuchsia-600', dot: 'bg-fuchsia-500' },
  'Francais': { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-400 dark:border-pink-600', dot: 'bg-pink-500' },
  'Info': { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-400 dark:border-cyan-600', dot: 'bg-cyan-500' },
  'Colle': { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-400 dark:border-violet-600', dot: 'bg-violet-500' },
  'Etude': { bg: 'bg-stone-100 dark:bg-stone-800/40', text: 'text-stone-600 dark:text-stone-400', border: 'border-stone-300 dark:border-stone-600', dot: 'bg-stone-400' },
  'EPS': { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-400 dark:border-red-600', dot: 'bg-red-500' },
  'TIPE': { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-400 dark:border-teal-600', dot: 'bg-teal-500' },
  'Repas': { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-400 dark:border-amber-600', dot: 'bg-amber-500' },
}

const ALL_SUBJECTS = Object.keys(MATIERE_COLORS)

const DEFAULT_COLOR = { bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', dot: 'bg-slate-500' }

// Couleurs pour les événements (light + dark)
const EVENT_TYPE_COLORS = {
  'DS': { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-400 dark:border-red-600', dot: 'bg-red-500' },
  'Interro': { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-400 dark:border-yellow-600', dot: 'bg-yellow-500' },
  'DM': { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-400 dark:border-indigo-600', dot: 'bg-indigo-500' },
  'Sortie': { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-400 dark:border-teal-600', dot: 'bg-teal-500' },
  'Sortie pédagogique': { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-400 dark:border-teal-600', dot: 'bg-teal-500' },
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const JOURS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const HOURS_START = 8
const HOURS_END = 19
const HOUR_HEIGHT = 60 // px per hour

// Heures simples pour les selects (8h à 19h)
const HEURES_SIMPLES = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h']

// Créneaux de kholle (basés sur les horaires réels du colloscope)
const HEURES_KHOLLE = [
  '12h05 - 13h',
  '12h30 - 13h25',
  '13h - 13h55',
  '16h50 - 17h45',
  '17h45 - 18h40'
]

const FALLBACK_COLLEURS = {
  'MP 1': [
    { matiere: 'Maths', prof: 'Mme Maugendre', salle: 'L301', jour: 'Mercredi', heure: '13h - 13h55' },
    { matiere: 'Physique', prof: 'Mr Charge', salle: 'E3 ??', jour: 'Jeudi', heure: '13h - 13h55' },
  ],
  'MP 2': [
    { matiere: 'Maths', prof: 'Mr Lecoustey', salle: 'G136', jour: 'Jeudi', heure: '12h05 - 13h' },
    { matiere: 'Physique', prof: 'Mr Guy', salle: 'E3 ??', jour: 'Mercredi', heure: '12h05 - 13h' },
  ],
  'MP 3': [
    { matiere: 'Maths', prof: 'Mme Mugnier', salle: 'i314', jour: 'Vendredi', heure: '12h05 - 13h' },
    { matiere: 'Physique', prof: 'Mr Bisognin', salle: 'E3 ??', jour: 'Mercredi', heure: '12h05 - 13h' },
  ],
  'MP 4': [
    { matiere: 'Maths', prof: 'Mr Berrabah', salle: 'E112', jour: 'Lundi', heure: '16h50 - 17h45' },
    { matiere: 'Physique', prof: 'Mr Pillet', salle: 'E3 ??', jour: 'Jeudi', heure: '12h05 - 13h' },
  ],
  'MP 5': [
    { matiere: 'Maths', prof: 'Mr Berrabah', salle: 'E112', jour: 'Lundi', heure: '17h45 - 18h40' },
    { matiere: 'Physique', prof: 'Mr Jimenez', salle: 'E3 ??', jour: 'Jeudi', heure: '13h - 13h55' },
  ],
  'MP 6': [
    { matiere: 'Maths', prof: 'Mr Pech', salle: 'E112', jour: 'Jeudi', heure: '13h - 13h55' },
    { matiere: 'Physique', prof: 'Mme Vandroux', salle: 'L301', jour: 'Vendredi', heure: '13h - 13h55' },
  ],
  'MSA 1': [
    { matiere: 'Maths', prof: 'Mme Crida', salle: 'E112', jour: 'Mercredi', heure: '13h - 13h55' },
    { matiere: 'SI', prof: 'Mme Bonnard', salle: 'E110', jour: 'Vendredi', heure: '12h05 - 13h' },
    { matiere: 'Anglais', prof: 'Mme Hellal', salle: 'i200', jour: 'Jeudi', heure: '13h - 13h55', type: 'PA' },
  ],
  'MSA 2': [
    { matiere: 'Maths', prof: 'Mr Moreau', salle: 'i206', jour: 'Jeudi', heure: '12h05 - 13h' },
    { matiere: 'SI', prof: 'Mr Champlong', salle: 'G137', jour: 'Mercredi', heure: '12h05 - 13h' },
    { matiere: 'Anglais', prof: 'Mr Ward', salle: 'i303', jour: 'Lundi', heure: '16h50 - 17h45', type: 'TQ' },
  ],
  'MSA 3': [
    { matiere: 'Maths', prof: 'Mme Lehmann', salle: 'i302', jour: 'Mercredi', heure: '13h - 13h55' },
    { matiere: 'SI', prof: 'Mr Riondy', salle: 'F109', jour: 'Lundi', heure: '16h50 - 17h45' },
    { matiere: 'Anglais', prof: 'Mme Vitry-Roche', salle: 'i217', jour: 'Jeudi', heure: '12h05 - 13h', type: 'PA' },
  ],
  'MSA 4': [
    { matiere: 'Maths', prof: 'Mme Lehmann', salle: 'E105', jour: 'Mercredi', heure: '17h45 - 18h40' },
    { matiere: 'SI', prof: 'Mme Bonnard / Mr Brayer', salle: 'E112', jour: 'Jeudi', heure: '12h05 - 13h' },
    { matiere: 'Anglais', prof: 'Mme Vitry-Roche', salle: 'i322', jour: 'Lundi', heure: '16h50 - 17h45', type: 'TQ' },
  ],
  'MSA 5': [
    { matiere: 'Maths', prof: 'Mme Maugendre', salle: 'L301', jour: 'Mercredi', heure: '12h05 - 13h' },
    { matiere: 'SI', prof: 'Mr Leconte', salle: 'E117', jour: 'Mardi', heure: '12h30 - 13h25' },
    { matiere: 'Anglais', prof: 'Mme Akgun', salle: 'i200', jour: 'Jeudi', heure: '12h05 - 13h', type: 'PA' },
  ],
  'MSA 6': [
    { matiere: 'Maths', prof: 'Mr Deveaux', salle: 'i200', jour: 'Vendredi', heure: '12h05 - 13h' },
    { matiere: 'SI', prof: 'Mr Romanjek', salle: 'A045', jour: 'Jeudi', heure: '13h - 13h55' },
    { matiere: 'Anglais', prof: 'Mme Courrier', salle: 'i201', jour: 'Mercredi', heure: '13h - 13h55', type: 'TQ' },
  ],
}

// --- UTILS ---

function parseTime(str) {
  if (!str) return 0
  const clean = str.trim().toLowerCase()
  const match = clean.match(/^(\d{1,2})h(\d{0,2})$/)
  if (!match) return 0
  const h = parseInt(match[1])
  const m = match[2] ? parseInt(match[2]) : 0
  return h + m / 60
}

function parseHeurRange(heure) {
  if (!heure) return { start: 0, end: 0 }
  const parts = heure.split('-').map(s => s.trim())
  return { start: parseTime(parts[0]), end: parts[1] ? parseTime(parts[1]) : parseTime(parts[0]) + 1 }
}

function formatDate(dateStr, dayOffset) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + dayOffset)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDateISO(dateStr, dayOffset) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + dayOffset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCurrentWeekIdx() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = WEEKS.length - 1; i >= 0; i--) {
    const start = new Date(WEEKS[i].start)
    const end = new Date(start)
    end.setDate(end.getDate() + 4)
    if (today >= start && today <= end) return i
  }
  for (let i = 0; i < WEEKS.length; i++) {
    const start = new Date(WEEKS[i].start)
    if (today < start) return i
  }
  return WEEKS.length - 1
}

function isToday(weekStart, dayIdx) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayIdx)
  return d.getTime() === today.getTime()
}

// --- COMPOSANT ---

export function EmploiDuTemps() {
  const { user, getToken, userSettings, updateUserSettings } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [trinome, setTrinomeState] = useState(() => {
    return parseInt(localStorage.getItem('colloscope_trinome') || '0')
  })

  useEffect(() => {
    if (userSettings && userSettings.colloscope_trinome !== undefined) {
      setTrinomeState(parseInt(userSettings.colloscope_trinome))
    }
  }, [userSettings])

  const setTrinome = (val) => {
    setTrinomeState(val)
    if (updateUserSettings) updateUserSettings({ colloscope_trinome: val })
  }
  const [weekIdx, setWeekIdx] = useState(() => {
    const weekNum = parseInt(searchParams.get('week') || '0')
    if (weekNum > 0) {
      const idx = WEEKS.findIndex(w => w.num === weekNum)
      if (idx >= 0) return idx
    }
    return getCurrentWeekIdx()
  })
  const urlDayRef = useRef(searchParams.get('day'))
  const [activeDay, setActiveDay] = useState(() => {
    const day = parseInt(searchParams.get('day') ?? '-1')
    return day >= 0 && day <= 5 ? day : 0
  })
  const [colleurs, setColleurs] = useState(FALLBACK_COLLEURS)
  const [events, setEvents] = useState({ events: [], recurring: [] })
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminTab, setAdminTab] = useState('kholles')
  const [editingCode, setEditingCode] = useState(null)
  const [editData, setEditData] = useState([])
  const [saving, setSaving] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState({
    type: 'DS', title: '', matiere: 'Maths', jour: 'Lundi',
    heureDebut: '8h', heureFin: '12h', salle: '', weekNum: WEEKS[0].num,
    description: '', recurring: false
  })
  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [pronoteStatus, setPronoteStatus] = useState({ synced: false, lastUpdated: null, courseCount: 0, isRefreshing: false })
  const [pronoteRefreshing, setPronoteRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('day') // 'day' or 'week'
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showWeekPicker, setShowWeekPicker] = useState(false)
  const [showColorsModal, setShowColorsModal] = useState(false)

  // Exceptions de kholles (modifications individuelles pour une semaine)
  const [kholleExceptions, setKholleExceptions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kholle_exceptions') || '{}') } catch { return {} }
  })
  const [editingKholle, setEditingKholle] = useState(null) // { weekNum, matiere, originalData }
  const [kholleForm, setKholleForm] = useState({ jour: 'Lundi', heure: '', prof: '', salle: '' })
  const [customDateCourses, setCustomDateCourses] = useState([]) // Cours de la date personnalisée
  const [loadingCustomDateCourses, setLoadingCustomDateCourses] = useState(false)

  // Custom Subject Colors
  const [subjectColors, setSubjectColorsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('subject_colors') || '{}') } catch { return {} }
  })

  useEffect(() => {
    if (userSettings && userSettings.subject_colors) {
      setSubjectColorsState(userSettings.subject_colors)
    }
  }, [userSettings])

  // Save subject color
  const updateSubjectColor = (subject, colorHex) => {
    const newColors = { ...subjectColors }
    if (!colorHex || colorHex === '#000000') {
      delete newColors[subject]
    } else {
      newColors[subject] = colorHex
    }
    setSubjectColorsState(newColors)
    if (updateUserSettings) updateUserSettings({ subject_colors: newColors })
  }

  // Demandes de déplacement de kholle
  const [kholleRequests, setKholleRequests] = useState([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState({
    matiere: '', currentDay: '', currentHour: '', requestedDay: 'Lundi', requestedHour: '', useCustomDate: false, customDate: ''
  })
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [requestFormCourses, setRequestFormCourses] = useState([]) // Cours du jour sélectionné pour la demande

  // Ref pour le scroll automatique dans la vue jour
  const dayViewContainerRef = useRef(null)
  const touchStartRef = useRef(null)
  const navStateAppliedRef = useRef(false)

  // Listen to incoming navigation state (from Prochaine Kholle)
  useEffect(() => {
    if (location.state) {
      if (typeof location.state.day === 'number' && location.state.day !== activeDay) {
        setActiveDay(location.state.day)
        navStateAppliedRef.current = true
      }
      if (typeof location.state.weekNum === 'number') {
        const idx = WEEKS.findIndex(w => w.num === location.state.weekNum)
        if (idx >= 0 && idx !== weekIdx) {
          setWeekIdx(idx)
        }
      }
      if (location.state.viewMode && location.state.viewMode !== viewMode) {
        setViewMode(location.state.viewMode)
      }
    }
  }, [location.state])

  useEffect(() => {
    if (trinome > 0) localStorage.setItem('colloscope_trinome', trinome.toString())
  }, [trinome])

  // Sauvegarder les exceptions dans localStorage
  const saveKholleException = (weekNum, trinomeNum, matiere, data) => {
    const key = `${weekNum}-${trinomeNum}-${matiere}`
    const newExceptions = { ...kholleExceptions, [key]: data }
    setKholleExceptions(newExceptions)
    localStorage.setItem('kholle_exceptions', JSON.stringify(newExceptions))
  }

  const removeKholleException = (weekNum, trinomeNum, matiere) => {
    const key = `${weekNum}-${trinomeNum}-${matiere}`
    const newExceptions = { ...kholleExceptions }
    delete newExceptions[key]
    setKholleExceptions(newExceptions)
    localStorage.setItem('kholle_exceptions', JSON.stringify(newExceptions))
  }

  const getKholleException = (weekNum, trinomeNum, matiere) => {
    const key = `${weekNum}-${trinomeNum}-${matiere}`
    return kholleExceptions[key] || null
  }

  // Charger les cours d'une date spécifique pour les heures disponibles
  const fetchCoursesForDate = async (dateStr) => {
    if (!dateStr) {
      setCustomDateCourses([])
      return
    }
    setLoadingCustomDateCourses(true)
    try {
      // Trouver le lundi de la semaine de cette date
      const date = new Date(dateStr)
      const dayOfWeek = date.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(date)
      monday.setDate(date.getDate() + mondayOffset)
      const weekStart = monday.toISOString().split('T')[0]

      const res = await fetch(`/api/pronote/timetable?weekStart=${weekStart}`)
      const data = await res.json()

      // Filtrer les cours du jour sélectionné
      const jourIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const jour = JOURS[jourIdx]
      const daysCourses = (data.courses || []).filter(c => c.jour === jour)
      setCustomDateCourses(daysCourses)
    } catch (e) {
      console.error('Erreur chargement cours:', e)
      setCustomDateCourses([])
    }
    setLoadingCustomDateCourses(false)
  }

  // Calculer les heures de kholle disponibles (pas de chevauchement avec les cours)
  const getAvailableKholleHours = (coursesToCheck) => {
    if (!coursesToCheck || coursesToCheck.length === 0) return HEURES_KHOLLE

    return HEURES_KHOLLE.filter(heureKholle => {
      const { start: kStart, end: kEnd } = parseHeurRange(heureKholle)
      // Vérifier si ce créneau chevauche un cours
      const hasConflict = coursesToCheck.some(course => {
        const cStart = course.start
        const cEnd = course.end
        // Chevauchement si: kStart < cEnd AND kEnd > cStart
        return kStart < cEnd && kEnd > cStart
      })
      return !hasConflict
    })
  }

  useEffect(() => {
    fetch('/api/colloscope')
      .then(r => r.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setColleurs(data)
          try { localStorage.setItem('offline_colloscope', JSON.stringify(data)) } catch { }
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('offline_colloscope')
          if (cached) setColleurs(JSON.parse(cached))
        } catch { }
      })
  }, [])

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        setEvents(data)
        try { localStorage.setItem('offline_events', JSON.stringify(data)) } catch { }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('offline_events')
          if (cached) setEvents(JSON.parse(cached))
        } catch { }
      })
  }, [])

  // Fetch Pronote status
  useEffect(() => {
    fetch('/api/pronote/status')
      .then(r => r.json())
      .then(data => setPronoteStatus(data))
      .catch(() => { })
  }, [])

  // Track offline status
  useEffect(() => {
    const goOnline = () => setIsOffline(false)
    const goOffline = () => setIsOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Fetch Pronote timetable when week changes (avec cache offline)
  useEffect(() => {
    if (!WEEKS[weekIdx]) return
    const cacheKey = `offline_timetable_${WEEKS[weekIdx].start}`
    setLoadingCourses(true)
    fetch(`/api/pronote/timetable?weekStart=${WEEKS[weekIdx].start}`)
      .then(r => r.json())
      .then(data => {
        const c = data.courses || []
        setCourses(c)
        try { localStorage.setItem(cacheKey, JSON.stringify(c)) } catch { }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) setCourses(JSON.parse(cached))
          else setCourses([])
        } catch { setCourses([]) }
      })
      .finally(() => setLoadingCourses(false))
  }, [weekIdx])

  // Refresh Pronote manually
  const refreshPronote = async () => {
    if (pronoteRefreshing) return
    setPronoteRefreshing(true)
    try {
      const res = await fetch('/api/pronote/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (data.success) {
        // Refresh status and courses
        const statusRes = await fetch('/api/pronote/status')
        const statusData = await statusRes.json()
        setPronoteStatus(statusData)
        // Refresh current week courses
        const coursesRes = await fetch(`/api/pronote/timetable?weekStart=${WEEKS[weekIdx].start}`)
        const coursesData = await coursesRes.json()
        setCourses(coursesData.courses || [])
      } else {
        alert('Erreur: ' + (data.error || 'Echec de la synchronisation'))
      }
    } catch (err) {
      alert('Erreur de connexion: ' + err.message)
    } finally {
      setPronoteRefreshing(false)
    }
  }

  // Fetch kholle requests (for admin)
  const fetchKholleRequests = async () => {
    try {
      const res = await fetch('/api/kholle-requests')
      const data = await res.json()
      setKholleRequests(data)
    } catch (e) {
      console.error('Erreur chargement demandes:', e)
    }
  }

  useEffect(() => {
    fetchKholleRequests()
  }, [])

  // Submit a kholle change request
  const submitKholleRequest = async () => {
    const needsDate = requestForm.useCustomDate
    if (!requestForm.matiere || !requestForm.currentDay || !requestForm.currentHour || !requestForm.requestedHour) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (needsDate && !requestForm.customDate) {
      alert('Veuillez choisir une date')
      return
    }
    if (!needsDate && !requestForm.requestedDay) {
      alert('Veuillez choisir un jour')
      return
    }
    setSubmittingRequest(true)
    try {
      const payload = {
        trinome,
        matiere: requestForm.matiere,
        currentDay: requestForm.currentDay,
        currentHour: requestForm.currentHour,
        requestedDay: requestForm.useCustomDate ? requestForm.customDate : requestForm.requestedDay,
        requestedHour: requestForm.requestedHour,
        isCustomDate: requestForm.useCustomDate
      }
      const res = await fetch('/api/kholle-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        alert('Demande envoyée ! L\'admin va la traiter.')
        setShowRequestForm(false)
        setRequestForm({ matiere: '', currentDay: '', currentHour: '', requestedDay: 'Lundi', requestedHour: '', useCustomDate: false, customDate: '' })
        fetchKholleRequests()
      } else {
        const data = await res.json()
        alert('Erreur: ' + (data.error || 'Echec de l\'envoi'))
      }
    } catch (e) {
      alert('Erreur de connexion')
    } finally {
      setSubmittingRequest(false)
    }
  }

  // Approve a request (admin)
  const approveRequest = async (id) => {
    try {
      const res = await fetch(`/api/kholle-requests/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ adminNote: '' })
      })
      if (res.ok) {
        fetchKholleRequests()
      }
    } catch (e) {
      alert('Erreur')
    }
  }

  // Reject a request (admin)
  const rejectRequest = async (id) => {
    try {
      const res = await fetch(`/api/kholle-requests/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ adminNote: '' })
      })
      if (res.ok) {
        fetchKholleRequests()
      }
    } catch (e) {
      alert('Erreur')
    }
  }

  // Delete a request (admin)
  const deleteRequest = async (id) => {
    if (!confirm('Supprimer cette demande ?')) return
    try {
      await fetch(`/api/kholle-requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      fetchKholleRequests()
    } catch (e) {
      alert('Erreur')
    }
  }

  const pendingRequestsCount = kholleRequests.filter(r => r.status === 'pending').length

  const week = WEEKS[weekIdx]
  const code = week.num ? SCHEDULE[(week.num - 1) % SCHEDULE.length]?.[trinome - 1] || '' : ''
  const kholles = colleurs[code] || []

  // Correction de l'ordre des cours selon le trinôme
  // Pronote donne parfois le mauvais ordre — on swap le cours entier (matière + prof + salle)
  // en conservant uniquement le créneau horaire (start/end/heure/jour) de chaque slot.
  const correctCoursesOrder = (coursesData) => {
    if (!coursesData || coursesData.length === 0) return coursesData

    const isGroup1to6 = trinome >= 1 && trinome <= 6

    // Construit un Map<start → cours corrigé> en réaffectant les cours entiers aux slots.
    // slots : les cours candidats au swap (non triés)
    // correctOrder : tableau de matières dans l'ordre voulu
    function buildSwapMap(slots, correctOrder) {
      const sorted = [...slots].sort((a, b) => a.start - b.start)
      const map = new Map()
      for (let i = 0; i < Math.min(sorted.length, correctOrder.length); i++) {
        const source = slots.find(c => c.matiere === correctOrder[i])
        if (source) {
          // Contenu du bon cours, mais créneau horaire du slot i
          map.set(sorted[i].start, {
            ...source,
            start: sorted[i].start,
            end: sorted[i].end,
            heure: sorted[i].heure,
            jour: sorted[i].jour,
          })
        }
      }
      return map
    }

    // Pré-calcul des Maps pour chaque scénario de swap (dépendant du groupe)
    const lundiAprem = coursesData.filter(c => c.jour === 'Lundi' && c.start >= 12 && (c.matiere === 'Maths' || c.matiere === 'Physique'))
    const jeudiMatin = coursesData.filter(c => c.jour === 'Jeudi' && c.start < 12 && (c.matiere === 'SI' || c.matiere === 'Physique'))
    const vendrediAprem = coursesData.filter(c => c.jour === 'Vendredi' && c.start >= 12 && (c.matiere === 'Maths' || c.matiere === 'Francais'))

    const lundiMap = lundiAprem.length === 2 ? buildSwapMap(lundiAprem, isGroup1to6 ? ['Physique', 'Maths'] : ['Maths', 'Physique']) : new Map()
    const jeudiMap = jeudiMatin.length === 2 ? buildSwapMap(jeudiMatin, isGroup1to6 ? ['Physique', 'SI'] : ['SI', 'Physique']) : new Map()
    const vendrediMap = vendrediAprem.length === 2 ? buildSwapMap(vendrediAprem, isGroup1to6 ? ['Francais', 'Maths'] : ['Maths', 'Francais']) : new Map()

    // Mercredi : ordre toujours Physique → Maths → SI (même pour tous les groupes)
    // Correction positionnelle uniquement sur la matière (Pronote donne parfois "Maths" deux fois)
    const mercrediAprem = coursesData.filter(c => c.jour === 'Mercredi' && c.start >= 12 && (c.matiere === 'Maths' || c.matiere === 'Physique' || c.matiere === 'SI'))
    const mercrediSorted = [...mercrediAprem].sort((a, b) => a.start - b.start)
    const mercrediCorrect = ['Physique', 'Maths', 'SI']

    return coursesData.map(course => {
      const { jour, start, matiere } = course

      if (jour === 'Lundi' && start >= 12 && (matiere === 'Maths' || matiere === 'Physique') && lundiMap.has(start))
        return lundiMap.get(start)

      if (jour === 'Jeudi' && start < 12 && (matiere === 'SI' || matiere === 'Physique') && jeudiMap.has(start))
        return jeudiMap.get(start)

      if (jour === 'Vendredi' && start >= 12 && (matiere === 'Maths' || matiere === 'Francais') && vendrediMap.has(start))
        return vendrediMap.get(start)

      if (jour === 'Mercredi' && start >= 12 && (matiere === 'Maths' || matiere === 'Physique' || matiere === 'SI') && mercrediAprem.length >= 2) {
        const idx = mercrediSorted.findIndex(c => c.start === start)
        if (idx !== -1 && idx < mercrediCorrect.length) {
          return { ...course, matiere: mercrediCorrect[idx] }
        }
      }

      return course
    })
  }

  // Build calendar data: merge kholles + events + recurring
  const calendarData = useMemo(() => {
    const byDay = {}
    JOURS.forEach(j => { byDay[j] = [] })

    // Helper: vérifier si une date est dans la semaine actuelle
    const isDateInCurrentWeek = (dateStr) => {
      if (!dateStr || !week) return false
      const date = new Date(dateStr)
      const weekStart = new Date(week.start)
      const weekEnd = new Date(week.start)
      weekEnd.setDate(weekEnd.getDate() + 6) // Dimanche
      return date >= weekStart && date <= weekEnd
    }

    // Add kholles de la semaine actuelle (avec exceptions si présentes)
    kholles.forEach(k => {
      // Vérifier s'il y a une exception pour cette kholle
      const exception = getKholleException(week.num, trinome, k.matiere)
      const isException = !!exception
      const hasCustomDate = exception?.customDate

      // Si date personnalisée HORS de la semaine actuelle, ne pas afficher ici
      if (hasCustomDate && !isDateInCurrentWeek(exception.customDate)) {
        return // Skip - cette kholle sera affichée dans sa semaine de destination
      }

      // Si date personnalisée dans la semaine actuelle, utiliser cette date
      let jour = k.jour
      let customDateStr = null
      if (hasCustomDate) {
        const customDate = new Date(exception.customDate)
        const dayOfWeek = customDate.getDay()
        const jourIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        jour = JOURS[jourIdx] || k.jour
        customDateStr = exception.customDate
      } else if (exception?.jour) {
        jour = exception.jour
      }

      const kholleData = {
        ...k,
        jour,
        heure: exception?.heure || k.heure,
        prof: exception?.prof || k.prof,
        salle: exception?.salle || k.salle,
      }

      if (byDay[kholleData.jour]) {
        const { start, end } = parseHeurRange(kholleData.heure)
        byDay[kholleData.jour].push({
          kind: 'kholle',
          matiere: k.matiere,
          title: k.matiere,
          prof: kholleData.prof,
          salle: kholleData.salle,
          heure: kholleData.heure,
          start, end,
          type: k.type,
          code,
          weekNum: week.num,
          isException,
          originalData: k,
          customDate: customDateStr,
        })
      }
    })

    // Chercher les kholles d'autres semaines qui ont une date personnalisée dans la semaine actuelle
    Object.entries(kholleExceptions).forEach(([key, exception]) => {
      if (!exception?.customDate) return
      if (!isDateInCurrentWeek(exception.customDate)) return

      // Parser la clé: "weekNum-trinomeNum-matiere"
      const parts = key.split('-')
      if (parts.length < 3) return
      const excWeekNum = parseInt(parts[0])
      const excTrinome = parseInt(parts[1])
      const excMatiere = parts.slice(2).join('-') // Au cas où la matière contient un tiret

      // Ignorer si c'est la semaine actuelle (déjà traité) ou pas le bon trinôme
      if (excWeekNum === week.num || excTrinome !== trinome) return

      // Trouver les infos de base de cette kholle dans les colleurs
      const excWeekIdx = (excWeekNum - 1) % SCHEDULE.length
      const excCode = SCHEDULE[excWeekIdx]?.[excTrinome - 1]
      const excKholleBase = colleurs[excCode]?.find(k => k.matiere === excMatiere)
      if (!excKholleBase) return

      const customDate = new Date(exception.customDate)
      const dayOfWeek = customDate.getDay()
      const jourIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const jour = JOURS[jourIdx]

      if (byDay[jour]) {
        const { start, end } = parseHeurRange(exception.heure || excKholleBase.heure)
        byDay[jour].push({
          kind: 'kholle',
          matiere: excMatiere,
          title: excMatiere,
          prof: exception.prof || excKholleBase.prof,
          salle: exception.salle || excKholleBase.salle,
          heure: exception.heure || excKholleBase.heure,
          start, end,
          type: excKholleBase.type,
          code: excCode,
          weekNum: excWeekNum, // Semaine originale
          isException: true,
          originalData: excKholleBase,
          customDate: exception.customDate,
          isFromOtherWeek: true, // Marquer comme venant d'une autre semaine
        })
      }
    })

    // Add Pronote courses FIRST (so events can attach to them)
    // Appliquer la correction de l'ordre des cours selon le trinôme
    const correctedCourses = correctCoursesOrder(courses)
    correctedCourses.forEach(c => {
      if (byDay[c.jour]) {
        byDay[c.jour].push({
          kind: c.isSortie ? 'sortie' : 'cours',
          matiere: c.matiere,
          title: c.isSortie ? 'Sortie pédagogique' : c.title,
          prof: c.prof,
          salle: c.salle,
          heure: c.heure,
          start: c.start,
          end: c.end,
          overlayEvents: [], // Events that overlap with this course
          isSortie: c.isSortie || false,
          isCancelled: c.isCancelled || false,
        })
      }
    })

    // Helper: check if event overlaps with a course and attach it
    const tryAttachToCourse = (jour, eventStart, eventEnd, eventData) => {
      const dayItems = byDay[jour] || []
      for (const item of dayItems) {
        if (item.kind === 'cours') {
          // Check overlap: event starts during course OR course starts during event
          if (eventStart < item.end && eventEnd > item.start) {
            item.overlayEvents.push(eventData)
            return true // attached
          }
        }
      }
      return false // not attached, add as separate
    }

    // Add week-specific events (attach to course if overlapping)
    events.events?.filter(e => e.weekNum === week.num).forEach(e => {
      if (byDay[e.jour]) {
        const { start, end } = parseHeurRange(e.heure)
        const eventData = {
          kind: 'event',
          eventType: e.type,
          matiere: e.matiere,
          title: e.title,
          salle: e.salle,
          heure: e.heure,
          start, end,
          description: e.description,
          id: e.id,
          weekNum: week.num,
        }
        if (!tryAttachToCourse(e.jour, start, end, eventData)) {
          byDay[e.jour].push(eventData)
        }
      }
    })

    // Add recurring events (attach to course if overlapping)
    events.recurring?.forEach(e => {
      if (byDay[e.jour]) {
        const { start, end } = parseHeurRange(e.heure)
        const eventData = {
          kind: 'event',
          eventType: e.type,
          matiere: e.matiere,
          title: e.title,
          salle: e.salle || '',
          heure: e.heure,
          start, end,
          description: e.description || '',
          id: e.id,
          recurring: true,
          weekNum: week.num,
        }
        if (!tryAttachToCourse(e.jour, start, end, eventData)) {
          byDay[e.jour].push(eventData)
        }
      }
    })

    // Add DS & Concours Blanc
    JOURS.forEach((jour, dayOffset) => {
      if (!week) return
      const dateStr = formatDateISO(week.start, dayOffset)

      const dsInfo = DEVOIRS_SURVEILLES[dateStr]
      if (dsInfo) {
        const isSamedi = jour === 'Samedi'
        const startH = isSamedi ? 8 : 13.5
        const endH = isSamedi ? 12 : 17.5

        byDay[jour].push({
          kind: 'event',
          eventType: 'DS',
          matiere: dsInfo.subject,
          title: `DS de ${dsInfo.subject}`,
          salle: 'Salles d\'examen',
          heure: isSamedi ? '8h - 12h' : '13h30 - 17h30',
          start: startH,
          end: endH,
          description: `Devoir Surveillé de ${dsInfo.subject}`,
          id: `ds-${dateStr}`,
          weekNum: week.num,
        })
      }

      const cb = CONCOURS_BLANC
      if (dateStr >= cb.startDate && dateStr <= cb.endDate && jour !== 'Samedi') {
        byDay[jour].push({
          kind: 'event',
          eventType: 'DS',
          matiere: 'Général',
          title: 'CONCOURS BLANC',
          salle: 'Salles d\'examen',
          heure: '8h - 18h',
          start: 8,
          end: 18,
          description: 'Epreuves du concours blanc',
          id: `cb-${dateStr}`,
          weekNum: week.num,
        })
      }
    })

    // Add "MANGER" pause - find a free slot between 12-14h each day (except Saturday)
    const LUNCH_START = 12
    const LUNCH_END = 14
    JOURS.forEach(jour => {
      if (jour === 'Samedi') return // Pas de repas le samedi

      const dayItems = byDay[jour] || []
      if (dayItems.length === 0) return // No school day

      // Get all items that overlap with 12-14h period, sorted by start
      const lunchItems = dayItems
        .filter(item => item.start < LUNCH_END && item.end > LUNCH_START)
        .sort((a, b) => a.start - b.start)

      // Find the best free slot for lunch
      let lunchSlotStart = LUNCH_START
      let lunchSlotEnd = LUNCH_END

      if (lunchItems.length === 0) {
        // Whole period is free
        lunchSlotStart = LUNCH_START
        lunchSlotEnd = LUNCH_END
      } else {
        // Find gaps
        let bestGap = { start: LUNCH_START, end: LUNCH_START, duration: 0 }

        // Gap before first item
        if (lunchItems[0].start > LUNCH_START) {
          const gap = { start: LUNCH_START, end: Math.min(lunchItems[0].start, LUNCH_END), duration: 0 }
          gap.duration = gap.end - gap.start
          if (gap.duration > bestGap.duration) bestGap = gap
        }

        // Gaps between items
        for (let i = 0; i < lunchItems.length - 1; i++) {
          const gapStart = Math.max(lunchItems[i].end, LUNCH_START)
          const gapEnd = Math.min(lunchItems[i + 1].start, LUNCH_END)
          if (gapEnd > gapStart) {
            const gap = { start: gapStart, end: gapEnd, duration: gapEnd - gapStart }
            if (gap.duration > bestGap.duration) bestGap = gap
          }
        }

        // Gap after last item
        const lastItem = lunchItems[lunchItems.length - 1]
        if (lastItem.end < LUNCH_END) {
          const gap = { start: Math.max(lastItem.end, LUNCH_START), end: LUNCH_END, duration: 0 }
          gap.duration = gap.end - gap.start
          if (gap.duration > bestGap.duration) bestGap = gap
        }

        // Only add lunch if gap is at least 30 minutes
        if (bestGap.duration >= 0.5) {
          lunchSlotStart = bestGap.start
          lunchSlotEnd = bestGap.end
        } else {
          return // No room for lunch
        }
      }

      // Format hours for display
      const formatH = (h) => {
        const hours = Math.floor(h)
        const mins = Math.round((h - hours) * 60)
        return mins === 0 ? `${hours}h` : `${hours}h${mins.toString().padStart(2, '0')}`
      }

      byDay[jour].push({
        kind: 'cours',
        matiere: 'Repas',
        title: 'REPAS',
        prof: '',
        salle: '',
        heure: `${formatH(lunchSlotStart)} - ${formatH(lunchSlotEnd)}`,
        start: lunchSlotStart,
        end: lunchSlotEnd,
        overlayEvents: [],
      })
    })

    return byDay
  }, [kholles, events, week, code, courses, kholleExceptions, trinome, colleurs])

  // Helper: check if an item is in the past (for the current day)
  const isItemPassed = (item, dayIdx) => {
    if (!week) return false
    const now = new Date()
    const itemDate = new Date(week.start)
    itemDate.setDate(itemDate.getDate() + dayIdx)

    // If different day, check if whole day is passed
    if (itemDate.toDateString() !== now.toDateString()) {
      return itemDate < now
    }

    // Same day: check if end time is passed
    const currentHour = now.getHours() + now.getMinutes() / 60
    return item.end <= currentHour
  }

  // Helper: get the last course end time for a day
  const getLastCourseEnd = (dayIdx) => {
    const jour = JOURS[dayIdx]
    const items = calendarData[jour] || []
    if (items.length === 0) return 0
    return Math.max(...items.map(item => item.end))
  }

  // Auto-select day: if last course of current day is done, go to next day
  useEffect(() => {
    if (!week) return
    // If a specific day was requested via URL param or navigation state, skip auto-select entirely
    if (searchParams.get('day') !== null) return
    if (navStateAppliedRef.current) { navStateAppliedRef.current = false; return }

    const now = new Date()
    const currentDayOfWeek = now.getDay() // 0=Sunday, 1=Monday...
    const currentHour = now.getHours() + now.getMinutes() / 60

    // Check if we're in the current week
    const weekStart = new Date(week.start)
    const weekEnd = new Date(week.start)
    weekEnd.setDate(weekEnd.getDate() + 5) // Friday end

    const isCurrentWeek = now >= weekStart && now <= weekEnd

    if (!isCurrentWeek) {
      setActiveDay(0) // Default to Monday
      return
    }

    // Map day of week to our index (Monday=0, ..., Friday=4)
    let dayIdx = currentDayOfWeek >= 1 && currentDayOfWeek <= 5 ? currentDayOfWeek - 1 : 0

    // If it's weekend, show Monday
    if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
      setActiveDay(0)
      return
    }

    // Check if last course of current day is finished
    const lastEnd = getLastCourseEnd(dayIdx)
    if (lastEnd > 0 && currentHour >= lastEnd && dayIdx < 4) {
      // Move to next day
      dayIdx = dayIdx + 1
    }

    setActiveDay(dayIdx)
  }, [calendarData, week])

  // Auto-scroll vers le prochain cours non passé dans la vue jour
  useEffect(() => {
    if (viewMode !== 'day' || !dayViewContainerRef.current) return

    const now = new Date()
    const currentHour = now.getHours() + now.getMinutes() / 60

    // Vérifier si c'est aujourd'hui
    const isActiveDayToday = isToday(week?.start, activeDay)
    if (!isActiveDayToday) return // Pas de scroll si ce n'est pas aujourd'hui

    // Trouver le premier élément avec data-start-hour >= currentHour
    const container = dayViewContainerRef.current
    const items = container.querySelectorAll('[data-start-hour]')

    let targetElement = null
    for (const item of items) {
      const startHour = parseFloat(item.getAttribute('data-start-hour'))
      if (startHour >= currentHour - 0.5) { // 30 min de marge pour voir le cours en cours
        targetElement = item
        break
      }
    }

    if (targetElement) {
      // Scroll vers l'élément avec un petit délai pour laisser le rendu se faire
      setTimeout(() => {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [viewMode, activeDay, week, calendarData])

  // Auto-scroll vers le jour actuel dans la vue semaine mobile
  useEffect(() => {
    if (viewMode !== 'week') return

    // Seulement sur mobile (md:hidden)
    const isMobile = window.innerWidth < 768
    if (!isMobile) return

    const now = new Date()
    const currentDayOfWeek = now.getDay() // 0=Sunday, 1=Monday...
    const currentHour = now.getHours() + now.getMinutes() / 60

    // Vérifier si on est dans la semaine affichée
    if (!week) return
    const weekStart = new Date(week.start)
    const weekEnd = new Date(week.start)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const isCurrentWeek = now >= weekStart && now <= weekEnd
    if (!isCurrentWeek) return // Pas de scroll si pas la semaine actuelle

    // Trouver le jour cible (aujourd'hui, ou le prochain jour avec cours si aujourd'hui est fini)
    let targetDayIdx = currentDayOfWeek >= 1 && currentDayOfWeek <= 5 ? currentDayOfWeek - 1 : 0

    // Si c'est le weekend, aller au lundi
    if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
      targetDayIdx = 0
    } else {
      // Vérifier si le dernier cours du jour est passé
      const todayItems = calendarData[JOURS[targetDayIdx]] || []
      if (todayItems.length > 0) {
        const lastEnd = Math.max(...todayItems.map(item => item.end || 0))
        if (currentHour >= lastEnd && targetDayIdx < 4) {
          // Chercher le prochain jour avec des cours
          for (let i = targetDayIdx + 1; i <= 5; i++) {
            const nextDayItems = calendarData[JOURS[i]] || []
            if (nextDayItems.length > 0) {
              targetDayIdx = i
              break
            }
          }
        }
      }
    }

    // Scroll vers le jour cible avec un délai
    setTimeout(() => {
      const targetElement = document.getElementById(`week-day-${targetDayIdx}`)
      if (targetElement) {
        // Calculer la position pour voir l'en-tête du jour (avec marge pour le header sticky)
        const headerOffset = 350 // Hauteur du header sticky + marge pour être au-dessus du jour
        const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }, 150)
  }, [viewMode, week, calendarData])

  // --- Kholle Exception (modification individuelle) ---
  const startEditingKholle = (kholleItem) => {
    const exception = getKholleException(kholleItem.weekNum, trinome, kholleItem.matiere)
    setEditingKholle({
      weekNum: kholleItem.weekNum,
      matiere: kholleItem.matiere,
      originalData: kholleItem.originalData || kholleItem,
      isException: kholleItem.isException
    })
    setKholleForm({
      jour: kholleItem.isException ? kholleItem.originalData?.jour : kholleItem.jour,
      heure: kholleItem.heure,
      prof: kholleItem.prof,
      salle: kholleItem.salle,
      // Valeurs modifiées (si exception)
      newJour: kholleItem.jour || JOURS[0],
      newHeure: kholleItem.heure,
      newProf: kholleItem.prof,
      newSalle: kholleItem.salle,
      // Date personnalisée
      useCustomDate: exception?.customDate ? true : false,
      customDate: exception?.customDate || '',
    })
  }

  const handleSaveKholleException = () => {
    if (!editingKholle) return

    const exceptionData = {
      jour: kholleForm.useCustomDate ? null : kholleForm.newJour,
      heure: kholleForm.newHeure,
      prof: kholleForm.newProf,
      salle: kholleForm.newSalle,
      customDate: kholleForm.useCustomDate ? kholleForm.customDate : null,
    }

    saveKholleException(editingKholle.weekNum, trinome, editingKholle.matiere, exceptionData)
    setEditingKholle(null)
    setCustomDateCourses([])
  }

  const handleRemoveKholleException = () => {
    if (!editingKholle) return
    removeKholleException(editingKholle.weekNum, trinome, editingKholle.matiere)
    setEditingKholle(null)
    setCustomDateCourses([])
  }

  // --- Admin ---

  const startEditing = (code) => {
    setEditingCode(code)
    setEditData(JSON.parse(JSON.stringify(colleurs[code] || [])))
  }

  const handleEditField = (khIdx, field, value) => {
    setEditData(prev => {
      const copy = [...prev]
      copy[khIdx] = { ...copy[khIdx], [field]: value }
      return copy
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/colloscope/${encodeURIComponent(editingCode)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ kholles: editData })
      })
      if (res.ok) {
        setColleurs(prev => ({ ...prev, [editingCode]: editData }))
        setEditingCode(null)
      } else alert('Erreur lors de la sauvegarde')
    } catch { alert('Erreur reseau') }
    setSaving(false)
  }

  const handleEventSubmit = async () => {
    setSaving(true)
    const body = {
      type: eventForm.type,
      title: eventForm.title,
      matiere: eventForm.matiere,
      jour: eventForm.jour,
      heure: `${eventForm.heureDebut} - ${eventForm.heureFin}`,
      salle: eventForm.salle,
      description: eventForm.description,
      recurring: eventForm.recurring,
    }
    if (!eventForm.recurring) body.weekNum = parseInt(eventForm.weekNum)

    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events'
      const method = editingEvent ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        const refreshed = await fetch('/api/events').then(r => r.json())
        setEvents(refreshed)
        setShowEventForm(false)
        setEditingEvent(null)
        resetEventForm()
      } else alert('Erreur')
    } catch { alert('Erreur reseau') }
    setSaving(false)
  }

  const handleDeleteEvent = async (id) => {
    if (!confirm('Supprimer cet evenement ?')) return
    try {
      await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const refreshed = await fetch('/api/events').then(r => r.json())
      setEvents(refreshed)
    } catch { alert('Erreur reseau') }
  }

  const startEditEvent = (evt) => {
    const parts = evt.heure?.split('-').map(s => s.trim()) || ['', '']
    setEditingEvent(evt)
    setEventForm({
      type: evt.type || evt.eventType || 'DS',
      title: evt.title || '',
      matiere: evt.matiere || 'Maths',
      jour: evt.jour || 'Lundi',
      heureDebut: parts[0] || '',
      heureFin: parts[1] || '',
      salle: evt.salle || '',
      weekNum: evt.weekNum || WEEKS[0].num,
      description: evt.description || '',
      recurring: !!evt.recurring,
    })
    setShowEventForm(true)
  }

  const resetEventForm = () => {
    setEventForm({
      type: 'DS', title: '', matiere: 'Maths', jour: 'Lundi',
      heureDebut: '8h', heureFin: '12h', salle: '', weekNum: week.num,
      description: '', recurring: false
    })
  }

  // --- Selection trinome ---
  if (trinome === 0) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }} className="shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-5">
            <div className="flex items-center gap-3">
              <Link to="/" style={{ color: 'var(--accent)' }} className="hover:opacity-80 transition-opacity p-1">
                <ArrowLeft size={22} />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>Emploi du temps</h1>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <BookOpen size={40} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Choisissez votre trinome</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Votre choix sera sauvegarde</p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(t => (
                <button
                  key={t}
                  onClick={() => setTrinome(t)}
                  className="py-3 rounded-xl font-bold text-sm border-2 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                  style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Render event card (used in both desktop and mobile) ---
  const renderEventCard = (item, compact = false, dayIdx = 0) => {
    const isKholle = item.kind === 'kholle'
    const isCours = item.kind === 'cours'
    const isSortie = item.kind === 'sortie'
    const isEvent = item.kind === 'event'
    const isPassed = isItemPassed(item, dayIdx)
    const colors = isSortie
      ? EVENT_TYPE_COLORS['Sortie']
      : (isKholle || isCours)
        ? (MATIERE_COLORS[item.matiere] || DEFAULT_COLOR)
        : (EVENT_TYPE_COLORS[item.eventType] || EVENT_TYPE_COLORS['DS'])

    if (compact) {
      // Desktop: positioned card in the grid
      const hasOverlay = isCours && item.overlayEvents?.length > 0
      const overlayEvent = hasOverlay ? item.overlayEvents[0] : null
      const overlayColors = overlayEvent ? (EVENT_TYPE_COLORS[overlayEvent.eventType] || EVENT_TYPE_COLORS['DS']) : null

      // Custom colour for this matiere (user-defined)
      const customHex = (isCours || isKholle) ? subjectColors[item.matiere] : null
      const customStyle = customHex ? {
        backgroundColor: `${customHex}25`,
        borderColor: customHex,
        color: customHex,
      } : {}
      const hasCustColor = !!customHex && !hasOverlay

      // KHOLLE en vue semaine - style similaire aux cours avec liens cliquables
      if (isKholle) {
        return (
          <div className={`absolute left-0.5 right-0.5 ${hasCustColor ? '' : colors.bg} ${hasCustColor ? '' : colors.border} border-2 border-l-4 rounded-lg px-1.5 py-1 overflow-hidden cursor-default z-20 hover:z-30 hover:shadow-md transition-all ${isPassed ? 'opacity-40 grayscale-[30%]' : ''}`}
            style={{
              top: `${(item.start - HOURS_START) * HOUR_HEIGHT}px`,
              height: `${Math.max((item.end - item.start) * HOUR_HEIGHT - 2, 18)}px`,
              ...customStyle
            }}
          >
            <div className="flex items-center gap-1 min-w-0 flex-wrap">
              <span className={`font-bold text-[10px] leading-tight ${hasCustColor ? '' : colors.text} truncate`}
                style={hasCustColor ? { color: customHex } : {}}>
                {item.matiere}
              </span>
              <span className={`shrink-0 text-[7px] font-semibold px-1 py-0.5 rounded ${hasCustColor ? '' : colors.dot} text-white`}
                style={hasCustColor ? { backgroundColor: customHex } : {}}>Kholle</span>
              {item.isException && (
                <span className="shrink-0 text-[7px] font-semibold px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600">
                  {item.customDate ? new Date(item.customDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Excep.'}
                </span>
              )}
              {item.matiere === 'Maths' && (
                <a href={`https://a-crida.toile-libre.org/colles/semaine_${item.weekNum}.pdf`} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-0.5 text-[8px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600 shadow-sm transition-all hover:scale-105">
                  Sujet <ExternalLink size={8} />
                </a>
              )}
              {item.type === 'TQ' && (
                <a href="https://drive.google.com/drive/folders/16uCn2ZhdKX-Sobsk88zpN9csToGHkR5k" target="_blank" rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-0.5 text-[8px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded hover:bg-purple-600 shadow-sm transition-all hover:scale-105">
                  TQ <ExternalLink size={8} />
                </a>
              )}
              {item.type === 'PA' && (
                <span className="shrink-0 text-[8px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">PA</span>
              )}
              {isAdmin && (
                <button onClick={() => startEditingKholle(item)}
                  className="shrink-0 text-[8px] p-0.5 rounded transition-all" style={{ color: 'var(--text-muted)' }}>
                  <Pencil size={10} />
                </button>
              )}
              {!isAdmin && (
                <button onClick={() => {
                  setRequestForm({
                    matiere: item.matiere,
                    currentDay: JOURS[dayIdx],
                    currentHour: item.heure,
                    requestedDay: 'Lundi',
                    requestedHour: HEURES_KHOLLE[0],
                    reason: '',
                    contact: '',
                    useCustomDate: false,
                    customDate: ''
                  })
                  setShowRequestForm(true)
                }}
                  className="shrink-0 text-[8px] text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                  title="Demander un changement">
                  <MessageSquarePlus size={10} />
                </button>
              )}
            </div>
            {(item.end - item.start) * HOUR_HEIGHT > 30 && (
              <div className={`text-[9px] ${colors.text} opacity-70 truncate leading-tight mt-0.5`}>
                {item.prof} • {item.salle}
              </div>
            )}
            {(item.end - item.start) * HOUR_HEIGHT > 45 && (
              <div className={`text-[9px] ${colors.text} opacity-60 truncate leading-tight`}>
                {item.heure}
              </div>
            )}
          </div>
        )
      }

      return (
        <div className={`absolute left-0.5 right-0.5 ${hasCustColor ? '' : (hasOverlay ? overlayColors.bg : colors.bg)} ${hasCustColor ? '' : (hasOverlay ? overlayColors.border : colors.border)} border-2 rounded-lg px-1.5 py-1 overflow-hidden cursor-default z-10 hover:z-20 hover:shadow-md transition-shadow ${item.eventType === 'DM' ? 'border-dashed' : ''} ${isPassed ? 'opacity-30 grayscale-[40%]' : ''} ${item.isCancelled ? 'opacity-60' : ''}`}
          style={{
            top: `${(item.start - HOURS_START) * HOUR_HEIGHT}px`,
            height: `${Math.max((item.end - item.start) * HOUR_HEIGHT - 2, 18)}px`,
            backgroundImage: item.isCancelled ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)' : undefined,
            ...(hasCustColor ? customStyle : {})
          }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span className={`font-bold text-[10px] leading-tight ${hasCustColor ? '' : (hasOverlay ? overlayColors.text : colors.text)} truncate`}
              style={hasCustColor ? { color: customHex } : {}}>
              {isCours ? item.matiere : isSortie ? 'Sortie' : (item.eventType === 'DM' ? item.matiere : item.title)}
            </span>
            {item.isCancelled && (
              <span className="shrink-0 text-[7px] font-bold px-1 py-0.5 rounded bg-red-500 text-white leading-none">Absent</span>
            )}
            {hasOverlay && (
              overlayEvent.eventType === 'DM' && overlayEvent.matiere === 'Maths' ? (
                <a href={`https://a-crida.toile-libre.org/tsi1/DM${overlayEvent.weekNum + 2}_enonce.pdf`} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-0.5 text-[8px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded hover:bg-indigo-600 shadow-sm transition-all hover:scale-105">
                  DM <ExternalLink size={8} />
                </a>
              ) : (
                <span className={`shrink-0 text-[8px] font-bold px-1 rounded ${overlayColors.bg} ${overlayColors.text} border ${overlayColors.border}`}>
                  {overlayEvent.eventType}
                </span>
              )
            )}
            {isEvent && item.eventType === 'DM' && item.matiere === 'Maths' && (
              <a href={`https://a-crida.toile-libre.org/tsi1/DM${item.weekNum + 2}_enonce.pdf`} target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-0.5 text-[8px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded hover:bg-indigo-600 shadow-sm transition-all hover:scale-105">
                DM <ExternalLink size={8} />
              </a>
            )}
          </div>
          {(item.end - item.start) * HOUR_HEIGHT > 30 && (
            <div className={`text-[9px] ${hasOverlay ? overlayColors.text : colors.text} opacity-70 truncate leading-tight mt-0.5`}>
              {isCours ? `${item.prof ? item.prof + ' • ' : ''}${item.salle}` : `${item.matiere}${item.salle ? ` • ${item.salle}` : ''}`}
            </div>
          )}
          {(item.end - item.start) * HOUR_HEIGHT > 45 && (
            <div className={`text-[9px] ${hasOverlay ? overlayColors.text : colors.text} opacity-60 truncate leading-tight`}>
              {item.heure}
            </div>
          )}
        </div>
      )
    }

    // Mobile: full card (list view) - meme style pour kholle et cours
    const hasOverlayMobile = isCours && item.overlayEvents?.length > 0
    const overlayEventMobile = hasOverlayMobile ? item.overlayEvents[0] : null
    const overlayColorsMobile = overlayEventMobile ? (EVENT_TYPE_COLORS[overlayEventMobile.eventType] || EVENT_TYPE_COLORS['DS']) : null

    // Custom colour for mobile list view
    const customHexMobile = (isCours || isKholle) && !hasOverlayMobile ? subjectColors[item.matiere] : null
    const customStyleMobile = customHexMobile ? {
      backgroundColor: `${customHexMobile}25`,
      borderColor: customHexMobile,
    } : {}
    const hasCustColorMobile = !!customHexMobile

    return (
      <div className={`${hasCustColorMobile ? '' : (hasOverlayMobile ? overlayColorsMobile.bg : colors.bg)} ${hasCustColorMobile ? '' : (hasOverlayMobile ? overlayColorsMobile.border : colors.border)} border-2 rounded-xl p-2.5 ${item.eventType === 'DM' ? 'border-dashed' : ''} ${isPassed ? 'opacity-40 grayscale-[30%]' : ''} ${item.isCancelled ? 'opacity-60' : ''}`}
        style={{ ...customStyleMobile }}>
        <div className="flex items-start gap-2.5">
          <div className={`w-1.5 min-h-[36px] rounded-full ${hasCustColorMobile ? '' : (hasOverlayMobile ? overlayColorsMobile.dot : colors.dot)} shrink-0 mt-0.5`}
            style={hasCustColorMobile ? { backgroundColor: customHexMobile } : {}} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`font-bold text-xs ${hasCustColorMobile ? '' : (hasOverlayMobile ? overlayColorsMobile.text : colors.text)}`}
                style={hasCustColorMobile ? { color: customHexMobile } : {}}>
                {isKholle ? item.matiere : isCours ? item.matiere : isSortie ? 'Sortie pédagogique' : (item.eventType === 'DM' ? item.matiere : item.title)}
              </span>
              {isKholle && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${colors.dot} text-white`}>
                  Kholle
                </span>
              )}
              {isKholle && item.isException && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600">
                  {item.customDate ? new Date(item.customDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Excep.'}
                </span>
              )}
              {isCours && !hasOverlayMobile && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--text-muted)' }}>
                  Cours
                </span>
              )}
              {isCours && item.isCancelled && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500 text-white">
                  Prof absent
                </span>
              )}
              {isSortie && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-200 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                  Sortie
                </span>
              )}
              {hasOverlayMobile && (
                overlayEventMobile.eventType === 'DM' && overlayEventMobile.matiere === 'Maths' ? (
                  <a href={`https://a-crida.toile-libre.org/tsi1/DM${overlayEventMobile.weekNum + 2}_enonce.pdf`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-500 text-white px-2 py-1 rounded-lg hover:bg-indigo-600 shadow-sm transition-all active:scale-95">
                    DM <ExternalLink size={10} />
                  </a>
                ) : (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${overlayColorsMobile.bg} ${overlayColorsMobile.text} border ${overlayColorsMobile.border}`}>
                    {overlayEventMobile.eventType}
                  </span>
                )
              )}
              {isEvent && (
                item.eventType === 'DM' && item.matiere === 'Maths' ? (
                  <a href={`https://a-crida.toile-libre.org/tsi1/DM${item.weekNum + 2}_enonce.pdf`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-500 text-white px-2 py-1 rounded-lg hover:bg-indigo-600 shadow-sm transition-all active:scale-95">
                    DM <ExternalLink size={10} />
                  </a>
                ) : (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {item.eventType}
                  </span>
                )
              )}
              {isKholle && item.matiere === 'Maths' && (
                <a href={`https://a-crida.toile-libre.org/colles/semaine_${item.weekNum}.pdf`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600 shadow-sm transition-all active:scale-95">
                  Sujet <ExternalLink size={10} />
                </a>
              )}
              {isKholle && item.type === 'PA' && <span className="text-[10px] font-semibold bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md">PA</span>}
              {isKholle && item.type === 'TQ' && (
                <a href="https://drive.google.com/drive/folders/16uCn2ZhdKX-Sobsk88zpN9csToGHkR5k" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-500 text-white px-2 py-1 rounded-lg hover:bg-purple-600 shadow-sm transition-all active:scale-95">
                  TQ <ExternalLink size={10} />
                </a>
              )}
              {isKholle && isAdmin && (
                <button onClick={() => startEditingKholle(item)}
                  className="shrink-0 text-[8px] p-0.5 rounded transition-all" style={{ color: 'var(--text-muted)' }}>
                  <Pencil size={10} />
                </button>
              )}
              {isKholle && !isAdmin && (
                <button onClick={() => {
                  setRequestForm({
                    matiere: item.matiere,
                    currentDay: JOURS[dayIdx],
                    currentHour: item.heure,
                    requestedDay: 'Lundi',
                    requestedHour: HEURES_KHOLLE[0],
                    reason: '',
                    contact: '',
                    useCustomDate: false,
                    customDate: ''
                  })
                  setShowRequestForm(true)
                }}
                  className="shrink-0 text-[8px] text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                  title="Demander un changement">
                  <MessageSquarePlus size={10} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><Clock size={10} className="shrink-0" />{item.heure}</span>
              {(isKholle || isCours) && item.prof && <span className="flex items-center gap-1"><User size={10} className="shrink-0" /><span className="truncate">{item.prof}</span></span>}
              {item.salle && <span className="flex items-center gap-1"><MapPin size={10} className="shrink-0" />{item.salle}</span>}
              {isEvent && item.matiere && <span>{item.matiere}</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Modal d'edition d'un code de kholle ---
  const renderEditModal = () => {
    if (!editingCode) return null
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>Modifier {editingCode}</h3>
            <button onClick={() => setEditingCode(null)} style={{ color: 'var(--text-muted)' }} className="hover:opacity-80"><X size={20} /></button>
          </div>
          <div className="p-4 space-y-4">
            {editData.map((kh, i) => {
              const colors = MATIERE_COLORS[kh.matiere] || MATIERE_COLORS['Maths']
              return (
                <div key={i} className={`p-3 rounded-xl border ${colors.border} ${colors.bg}`}>
                  <span className={`font-bold text-sm ${colors.text} mb-2 block`}>{kh.matiere}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Prof</label>
                      <input type="text" value={kh.prof} onChange={e => handleEditField(i, 'prof', e.target.value)}
                        className="tsi-input w-full px-2 py-1.5 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Salle</label>
                      <input type="text" value={kh.salle} onChange={e => handleEditField(i, 'salle', e.target.value)}
                        className="tsi-input w-full px-2 py-1.5 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Jour</label>
                      <select value={kh.jour} onChange={e => handleEditField(i, 'jour', e.target.value)}
                        className="tsi-input w-full px-2 py-1.5 rounded-lg text-sm">
                        {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Heure</label>
                      <select value={kh.heure} onChange={e => handleEditField(i, 'heure', e.target.value)}
                        className="tsi-input w-full px-2 py-1.5 rounded-lg text-sm">
                        {HEURES_KHOLLE.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    {kh.matiere === 'Anglais' && (
                      <div>
                        <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Type</label>
                        <select value={kh.type || ''} onChange={e => handleEditField(i, 'type', e.target.value || undefined)}
                          className="tsi-input w-full px-2 py-1.5 rounded-lg text-sm">
                          <option value="">—</option>
                          <option value="PA">PA (Press Article)</option>
                          <option value="TQ">TQ (Topic Question)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 p-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setEditingCode(null)}
              className="tsi-btn-ghost flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="tsi-btn-primary flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={16} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Modal d'edition individuelle d'une kholle (exception) ---
  const renderKholleExceptionModal = () => {
    if (!editingKholle) return null
    const colors = MATIERE_COLORS[editingKholle.matiere] || MATIERE_COLORS['Maths']
    const useCustomDate = kholleForm.useCustomDate || false

    // Calculer les heures disponibles en fonction du jour/date sélectionné
    const getCoursesForSelectedDay = () => {
      if (useCustomDate && kholleForm.customDate) {
        return customDateCourses
      } else {
        // Utiliser les cours de la semaine actuelle pour le jour sélectionné
        return courses.filter(c => c.jour === kholleForm.newJour)
      }
    }
    const availableHours = getAvailableKholleHours(getCoursesForSelectedDay())

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: 'var(--surface)' }}>
          <div className={`flex items-center justify-between p-4 border-b-2 ${colors.border} ${colors.bg} rounded-t-2xl`}>
            <div>
              <h3 className={`font-bold ${colors.text}`}>Modifier kholle {editingKholle.matiere}</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Semaine {editingKholle.weekNum} • Trinôme {trinome}</p>
            </div>
            <button onClick={() => { setEditingKholle(null); setCustomDateCourses([]) }} style={{ color: 'var(--text-muted)' }} className="hover:opacity-80"><X size={20} /></button>
          </div>

          <div className="p-4 space-y-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
              <strong>Modification exceptionnelle</strong> : ce changement s'applique uniquement à cette semaine.
            </div>

            {/* Toggle date personnalisée */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={useCustomDate}
                  onChange={e => setKholleForm(p => ({ ...p, useCustomDate: e.target.checked, customDate: '' }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-400"
                />
                Date personnalisée (hors semaine)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!useCustomDate ? (
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Jour</label>
                  <select value={kholleForm.newJour} onChange={e => setKholleForm(p => ({ ...p, newJour: e.target.value }))}
                    className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                    {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Date</label>
                  <input
                    type="date"
                    value={kholleForm.customDate || ''}
                    onChange={e => {
                      const newDate = e.target.value
                      setKholleForm(p => ({ ...p, customDate: newDate }))
                      fetchCoursesForDate(newDate)
                    }}
                    className="tsi-input w-full px-3 py-2 rounded-xl text-sm"
                  />
                  {loadingCustomDateCourses && <span className="text-xs text-gray-400 mt-1">Chargement des cours...</span>}
                </div>
              )}
              <div className={useCustomDate ? 'col-span-2' : ''}>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  Heure {availableHours.length < HEURES_KHOLLE.length && <span className="text-green-600 dark:text-green-400">({availableHours.length} dispo)</span>}
                </label>
                <select value={kholleForm.newHeure} onChange={e => setKholleForm(p => ({ ...p, newHeure: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                  {availableHours.length > 0 ? (
                    availableHours.map(h => <option key={h} value={h}>{h}</option>)
                  ) : (
                    <option value="">Aucun créneau disponible</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Prof</label>
                <input type="text" value={kholleForm.newProf} onChange={e => setKholleForm(p => ({ ...p, newProf: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Salle</label>
                <input type="text" value={kholleForm.newSalle} onChange={e => setKholleForm(p => ({ ...p, newSalle: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-4" style={{ borderTop: '1px solid var(--border)' }}>
            {editingKholle.isException && (
              <button onClick={handleRemoveKholleException}
                className="px-4 py-2.5 rounded-xl border border-red-300 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:bg-red-900/30 transition-colors">
                Supprimer
              </button>
            )}
            <button onClick={() => { setEditingKholle(null); setCustomDateCourses([]) }}
              className="tsi-btn-ghost flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Annuler
            </button>
            <button onClick={handleSaveKholleException}
              className="tsi-btn-primary flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Save size={16} />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Modal de demande de changement de kholle ---
  const renderRequestModal = () => {
    if (!showRequestForm) return null
    const colors = MATIERE_COLORS[requestForm.matiere] || MATIERE_COLORS['Maths']
    const useCustomDate = requestForm.useCustomDate || false

    // Vérifier si le jour sélectionné est déjà passé
    const isDayPassed = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (useCustomDate && requestForm.customDate) {
        // Pour une date personnalisée, vérifier si la date est dans le passé
        const [year, month, day] = requestForm.customDate.split('-').map(Number)
        const selectedDate = new Date(year, month - 1, day)
        return selectedDate < today
      } else {
        // Pour un jour de la semaine actuelle, calculer la date correspondante
        const week = WEEKS[weekIdx]
        if (!week) return false
        const [startYear, startMonth, startDay] = week.start.split('-').map(Number)
        const weekStart = new Date(startYear, startMonth - 1, startDay)
        const dayIndex = JOURS.indexOf(requestForm.requestedDay)
        if (dayIndex === -1) return false
        const selectedDate = new Date(weekStart)
        selectedDate.setDate(weekStart.getDate() + dayIndex)
        return selectedDate < today
      }
    }

    const dayPassed = isDayPassed()

    // Calculer les heures disponibles en fonction du jour/date sélectionné
    const getCoursesForRequestDay = () => {
      if (useCustomDate && requestForm.customDate) {
        return requestFormCourses
      } else {
        // Utiliser les cours de la semaine actuelle pour le jour sélectionné
        return courses.filter(c => c.jour === requestForm.requestedDay)
      }
    }
    const availableHours = dayPassed ? [] : getAvailableKholleHours(getCoursesForRequestDay())

    // Handler pour changement de jour
    const handleDayChange = (newDay) => {
      setRequestForm(p => ({ ...p, requestedDay: newDay }))
      // Les cours sont déjà dans `courses` pour la semaine actuelle
    }

    // Handler pour changement de date personnalisée
    const handleCustomDateChange = async (newDate) => {
      setRequestForm(p => ({ ...p, customDate: newDate }))
      if (newDate) {
        // Fetch les cours pour cette date
        try {
          // Parser la date en local (éviter les problèmes de timezone)
          const [year, month, day] = newDate.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          const dayOfWeek = date.getDay()

          // Calculer le lundi de cette semaine
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
          const monday = new Date(year, month - 1, day + mondayOffset)
          const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

          const res = await fetch(`/api/pronote/timetable?weekStart=${weekStart}`)
          const data = await res.json()

          // Filtrer les cours du jour sélectionné
          const jourIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const jour = JOURS[jourIdx] || 'Lundi'
          const daysCourses = (data.courses || []).filter(c => c.jour === jour)
          setRequestFormCourses(daysCourses)
        } catch (e) {
          console.error('Erreur chargement cours:', e)
          setRequestFormCourses([])
        }
      } else {
        setRequestFormCourses([])
      }
    }

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="rounded-2xl shadow-2xl flex flex-col w-full max-w-md max-h-[90vh]" style={{ background: 'var(--surface)' }}>
          <div className={`flex items-center justify-between p-4 shrink-0 border-b-2 ${colors.border} ${colors.bg} rounded-t-2xl`}>
            <div>
              <h3 className={`font-bold ${colors.text} flex items-center gap-2`}>
                <MessageSquarePlus size={18} />
                Demander un changement
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kholle {requestForm.matiere} • Trinome {trinome}</p>
            </div>
            <button onClick={() => { setShowRequestForm(false); setRequestFormCourses([]) }} style={{ color: 'var(--text-muted)' }} className="hover:opacity-80"><X size={20} /></button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-300">
              Votre demande sera envoyee a l'admin qui pourra l'approuver ou la refuser.
            </div>

            {/* Créneau actuel (lecture seule) */}
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Creneau actuel</label>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${colors.text}`}>{requestForm.currentDay}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{requestForm.currentHour}</span>
              </div>
            </div>

            {/* Toggle date personnalisée */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={useCustomDate}
                  onChange={e => {
                    setRequestForm(p => ({ ...p, useCustomDate: e.target.checked, customDate: '' }))
                    setRequestFormCourses([])
                  }}
                  className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-400"
                />
                Date personnalisee (hors semaine)
              </label>
            </div>

            {/* Créneau souhaité */}
            <div className="grid grid-cols-2 gap-3">
              {!useCustomDate ? (
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Jour souhaite</label>
                  <select value={requestForm.requestedDay} onChange={e => handleDayChange(e.target.value)}
                    className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                    {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Date souhaitee</label>
                  <input
                    type="date"
                    value={requestForm.customDate || ''}
                    onChange={e => handleCustomDateChange(e.target.value)}
                    className="tsi-input w-full px-3 py-2 rounded-xl text-sm"
                  />
                </div>
              )}
              <div className={useCustomDate ? 'col-span-2' : ''}>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  Heure souhaitee {' '}
                  {getCoursesForRequestDay().length > 0 ? (
                    availableHours.length < HEURES_KHOLLE.length && <span className="text-green-600 dark:text-green-400">({availableHours.length} dispo)</span>
                  ) : (
                    useCustomDate && requestForm.customDate && <span className="text-amber-600">(pas de cours cette semaine)</span>
                  )}
                </label>
                <select value={requestForm.requestedHour} onChange={e => setRequestForm(p => ({ ...p, requestedHour: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                  {availableHours.length > 0 ? (
                    availableHours.map(h => <option key={h} value={h}>{h}</option>)
                  ) : (
                    <option value="">Aucun creneau disponible</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { setShowRequestForm(false); setRequestFormCourses([]) }}
              className="tsi-btn-ghost flex-1 py-2.5 justify-center text-sm font-medium">
              Annuler
            </button>
            <button onClick={submitKholleRequest} disabled={submittingRequest || availableHours.length === 0}
              className="tsi-btn-primary flex-1 py-2.5 justify-center text-sm font-medium disabled:opacity-50">
              <Send size={16} />
              {submittingRequest ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Event form modal ---
  const renderEventFormModal = () => {
    if (!showEventForm) return null
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>{editingEvent ? 'Modifier' : 'Nouvel'} evenement</h3>
            <button onClick={() => { setShowEventForm(false); setEditingEvent(null); resetEventForm() }} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Titre</label>
              <input type="text" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                placeholder="DS de Maths n.3" className="tsi-input w-full px-3 py-2 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Type</label>
                <select value={eventForm.type} onChange={e => setEventForm(p => ({ ...p, type: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                  <option value="DS">DS</option>
                  <option value="Interro">Interro</option>
                  <option value="DM">DM</option>
                  <option value="Sortie">Sortie pédagogique</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Matiere</label>
                <select value={eventForm.matiere} onChange={e => setEventForm(p => ({ ...p, matiere: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                  <option value="Maths">Maths</option>
                  <option value="Physique">Physique</option>
                  <option value="SI">SI</option>
                  <option value="Anglais">Anglais</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={eventForm.recurring} onChange={e => setEventForm(p => ({ ...p, recurring: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                Recurrent (toutes les semaines)
              </label>
            </div>
            {!eventForm.recurring && (
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Semaine</label>
                <select value={eventForm.weekNum} onChange={e => setEventForm(p => ({ ...p, weekNum: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                  {WEEKS.map(w => <option key={w.num} value={w.num}>S{w.num} — {w.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Jour</label>
              <select value={eventForm.jour} onChange={e => setEventForm(p => ({ ...p, jour: e.target.value }))}
                className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Heure debut</label>
                <select value={eventForm.heureDebut} onChange={e => setEventForm(p => ({ ...p, heureDebut: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                  {HEURES_SIMPLES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Heure fin</label>
                <select value={eventForm.heureFin} onChange={e => setEventForm(p => ({ ...p, heureFin: e.target.value }))}
                  className="tsi-input w-full px-3 py-2 rounded-xl text-sm">
                  {HEURES_SIMPLES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Salle (optionnel)</label>
              <input type="text" value={eventForm.salle} onChange={e => setEventForm(p => ({ ...p, salle: e.target.value }))}
                className="tsi-input w-full px-3 py-2 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>Description (optionnel)</label>
              <input type="text" value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))}
                className="tsi-input w-full px-3 py-2 rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex gap-2 p-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { setShowEventForm(false); setEditingEvent(null); resetEventForm() }}
              className="tsi-btn-ghost flex-1 py-2.5 justify-center text-sm font-medium">
              Annuler
            </button>
            <button onClick={handleEventSubmit} disabled={saving || !eventForm.title}
              className="tsi-btn-primary flex-1 py-2.5 justify-center text-sm font-medium disabled:opacity-50">
              <Save size={16} />
              {saving ? 'Sauvegarde...' : editingEvent ? 'Modifier' : 'Creer'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Admin panel ---
  const renderAdminPanel = () => {
    if (!showAdminPanel || editingCode || showEventForm) return null
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>Admin</h3>
            <button onClick={() => setShowAdminPanel(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
          </div>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setAdminTab('kholles')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${adminTab === 'kholles' ? 'border-b-2 border-blue-600' : ''}`}
              style={{ color: adminTab === 'kholles' ? 'var(--accent)' : 'var(--text-muted)' }}>
              Kholles
            </button>
            <button onClick={() => setAdminTab('events')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${adminTab === 'events' ? 'border-b-2 border-blue-600' : ''}`}
              style={{ color: adminTab === 'events' ? 'var(--accent)' : 'var(--text-muted)' }}>
              Evenements
            </button>
            <button onClick={() => setAdminTab('pronote')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${adminTab === 'pronote' ? 'border-b-2 border-blue-600' : ''}`}
              style={{ color: adminTab === 'pronote' ? 'var(--accent)' : 'var(--text-muted)' }}>
              Pronote
            </button>
            <button onClick={() => setAdminTab('demandes')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${adminTab === 'demandes' ? 'border-b-2 border-blue-600' : ''}`}
              style={{ color: adminTab === 'demandes' ? 'var(--accent)' : 'var(--text-muted)' }}>
              Demandes
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>

          {adminTab === 'kholles' && (
            <div className="p-4">
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Selectionnez un code pour modifier les infos (prof, salle, jour, heure).</p>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>MP (Maths + Physique)</h4>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {ALL_CODES.filter(c => c.startsWith('MP')).map(code => (
                  <button key={code} onClick={() => startEditing(code)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                    {code} <Pencil size={14} className="text-blue-400" />
                  </button>
                ))}
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>MSA (Maths + SI + Anglais)</h4>
              <div className="grid grid-cols-3 gap-2">
                {ALL_CODES.filter(c => c.startsWith('MSA')).map(code => (
                  <button key={code} onClick={() => startEditing(code)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-600 transition-all">
                    {code} <Pencil size={14} className="text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'events' && (
            <div className="p-4">
              <button onClick={() => { resetEventForm(); setEditingEvent(null); setShowEventForm(true) }}
                className="tsi-btn-primary w-full justify-center py-2.5 text-sm font-medium mb-4">
                <Plus size={16} /> Ajouter un evenement
              </button>

              {events.recurring?.length > 0 && (
                <>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Recurrents</h4>
                  <div className="space-y-2 mb-4">
                    {events.recurring.map(evt => {
                      const c = EVENT_TYPE_COLORS[evt.type] || EVENT_TYPE_COLORS['Interro']
                      return (
                        <div key={evt.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${c.border} ${c.bg}`}>
                          <div>
                            <span className={`font-bold text-xs ${c.text}`}>{evt.title}</span>
                            <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>{evt.jour} {evt.heure}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => startEditEvent(evt)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteEvent(evt.id)} className="p-1.5 rounded-lg text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {events.events?.length > 0 && (
                <>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ponctuels</h4>
                  <div className="space-y-2">
                    {events.events.map(evt => {
                      const c = EVENT_TYPE_COLORS[evt.type] || EVENT_TYPE_COLORS['DS']
                      return (
                        <div key={evt.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${c.border} ${c.bg}`}>
                          <div>
                            <span className={`font-bold text-xs ${c.text}`}>{evt.title}</span>
                            <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>S{evt.weekNum} • {evt.jour} {evt.heure}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => startEditEvent(evt)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteEvent(evt.id)} className="p-1.5 rounded-lg text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {(!events.events?.length && !events.recurring?.length) && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Aucun evenement</p>
              )}
            </div>
          )}

          {adminTab === 'pronote' && (
            <div className="p-4">
              <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Synchronisation Pronote</h4>

              {pronoteStatus.synced ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                    <div>
                      <span className="text-sm text-green-700 font-medium block">Synchronise</span>
                      <span className="text-xs text-green-600 dark:text-green-400">{pronoteStatus.courseCount} cours charges</span>
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Derniere mise a jour : {pronoteStatus.lastUpdated ? new Date(pronoteStatus.lastUpdated).toLocaleString('fr-FR') : 'Inconnue'}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm text-amber-700">Non synchronise</span>
                </div>
              )}

              {/* Bouton actualiser */}
              <button
                onClick={refreshPronote}
                disabled={pronoteRefreshing}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${pronoteRefreshing ? 'cursor-not-allowed' : 'tsi-btn-primary'}`}
                style={pronoteRefreshing ? { background: 'var(--surface-2)', color: 'var(--text-muted)' } : {}}
              >
                {pronoteRefreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Actualisation en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Actualiser maintenant
                  </>
                )}
              </button>

              <div className="mt-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Actualisation automatique toutes les 2 heures
              </div>

              {pronoteStatus.lastError && (
                <div className="mt-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                  <span className="text-xs text-red-600 dark:text-red-400">Derniere erreur : {pronoteStatus.lastError}</span>
                </div>
              )}
            </div>
          )}

          {adminTab === 'demandes' && (
            <div className="p-4">
              <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Demandes de changement de kholle</h4>

              {kholleRequests.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Aucune demande</p>
              ) : (
                <div className="space-y-3">
                  {/* Pending requests */}
                  {kholleRequests.filter(r => r.status === 'pending').length > 0 && (
                    <>
                      <h5 className="text-xs font-bold text-amber-600 uppercase tracking-wider">En attente ({kholleRequests.filter(r => r.status === 'pending').length})</h5>
                      {kholleRequests.filter(r => r.status === 'pending').map(req => (
                        <div key={req.id} className="p-3 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-sm text-amber-800">Trinome {req.trinome}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${MATIERE_COLORS[req.matiere]?.dot || 'bg-gray-400'} text-white`}>
                                  {req.matiere}
                                </span>
                              </div>
                              <div className="text-xs space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                                <div><span>Actuel :</span> {req.currentDay} {req.currentHour}</div>
                                <div><span>Souhaite :</span> <span className="font-medium text-green-700">
                                  {req.isCustomDate ? new Date(req.requestedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) : req.requestedDay} {req.requestedHour}
                                </span></div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button onClick={() => approveRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors flex items-center gap-1">
                                <Check size={12} /> Accepter
                              </button>
                              <button onClick={() => rejectRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors flex items-center gap-1">
                                <XCircle size={12} /> Refuser
                              </button>
                              <button onClick={() => deleteRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                <Trash2 size={12} /> Suppr
                              </button>
                            </div>
                          </div>
                          <div className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                            {new Date(req.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Approved requests */}
                  {kholleRequests.filter(r => r.status === 'approved').length > 0 && (
                    <>
                      <h5 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mt-4">Acceptees</h5>
                      {kholleRequests.filter(r => r.status === 'approved').map(req => (
                        <div key={req.id} className="p-3 rounded-xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/30">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-sm text-green-800">Trinome {req.trinome} - {req.matiere}</span>
                              <Check size={14} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {req.currentDay} {req.currentHour} → {req.isCustomDate ? new Date(req.requestedDay).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : req.requestedDay} {req.requestedHour}
                            </div>
                            <button onClick={() => deleteRequest(req.id)}
                              className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Rejected requests */}
                  {kholleRequests.filter(r => r.status === 'rejected').length > 0 && (
                    <>
                      <h5 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mt-4">Refusees</h5>
                      {kholleRequests.filter(r => r.status === 'rejected').map(req => (
                        <div key={req.id} className="p-3 rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-sm text-red-800">Trinome {req.trinome} - {req.matiere}</span>
                                <XCircle size={14} className="text-red-600 dark:text-red-400" />
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {req.currentDay} {req.currentHour} → {req.isCustomDate ? new Date(req.requestedDay).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : req.requestedDay} {req.requestedHour}
                              </div>
                            </div>
                            <button onClick={() => deleteRequest(req.id)}
                              className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setShowAdminPanel(false)}
              className="tsi-btn-ghost w-full py-2.5 justify-center text-sm font-medium">
              Fermer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- MAIN CALENDAR VIEW ---
  const totalHeight = (HOURS_END - HOURS_START) * HOUR_HEIGHT

  // Render day view card (bigger, clearer)
  const renderDayCard = (item, dayIdx = activeDay) => {
    const isKholle = item.kind === 'kholle'
    const isCours = item.kind === 'cours'
    const isSortie = item.kind === 'sortie'
    const isEvent = item.kind === 'event'
    const isPassed = isItemPassed(item, dayIdx)
    let colors = isSortie
      ? EVENT_TYPE_COLORS['Sortie']
      : (isKholle || isCours)
        ? (MATIERE_COLORS[item.matiere] || DEFAULT_COLOR)
        : (EVENT_TYPE_COLORS[item.eventType] || EVENT_TYPE_COLORS['DS'])

    const hasOverlay = isCours && item.overlayEvents?.length > 0
    const overlayEvent = hasOverlay ? item.overlayEvents[0] : null
    const overlayColors = overlayEvent ? (EVENT_TYPE_COLORS[overlayEvent.eventType] || EVENT_TYPE_COLORS['DS']) : null

    // Apply Custom Colors
    let dynamicStyles = {}
    let dynamicClasses = {
      bg: colors.bg,
      text: colors.text,
      border: colors.border,
      dot: colors.dot
    }

    if (item.kind === 'kholle' || item.kind === 'cours' || item.kind === 'sortie') {
      const customHex = subjectColors[item.matiere]
      if (customHex) {
        dynamicStyles = {
          backgroundColor: `${customHex}25`, // ~15% opacity hex
          borderColor: customHex,
          color: customHex
        }
        dynamicClasses = { bg: '', text: '', border: '', dot: '' } // Clear default classes if custom style is applied
      }
    }

    // Style unifie pour tous les elements (kholle, cours, events)
    return (
      <div className={`${hasOverlay ? overlayColors.bg : dynamicClasses.bg} ${hasOverlay ? overlayColors.border : dynamicClasses.border} border-2 ${isKholle ? 'border-l-[6px]' : ''} rounded-2xl p-4 ${item.eventType === 'DM' ? 'border-dashed' : ''} ${isPassed ? 'opacity-40 grayscale-[30%]' : ''} ${item.isCancelled ? 'opacity-60' : ''} shadow-sm`}
        style={{ ...dynamicStyles, ...(item.isCancelled ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.03) 6px, rgba(0,0,0,0.03) 12px)' } : {}) }}>
        <div className="flex items-start gap-3">
          <div className={`w-1.5 min-h-[40px] rounded-full ${hasOverlay ? overlayColors.dot : dynamicClasses.dot} shrink-0 mt-1`}
            style={dynamicStyles.backgroundColor ? { backgroundColor: dynamicStyles.borderColor } : {}} />
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`font-bold text-base ${hasOverlay ? overlayColors.text : dynamicClasses.text} flex items-center gap-2`}
                style={dynamicStyles.color ? { color: dynamicStyles.color } : {}}>
                {isCours && item.matiere === 'Repas' && <UtensilsCrossed size={18} className="text-amber-500" />}
                {isCours && item.matiere === 'Récré' && <Coffee size={18} className="text-lime-500" />}
                {isSortie && <Bus size={18} className="text-teal-500" />}
                {isKholle ? item.matiere : isCours ? (item.matiere === 'Repas' ? 'REPAS' : item.matiere === 'Récré' ? 'Récré' : item.matiere) : isSortie ? 'Sortie pédagogique' : (item.eventType === 'DM' ? item.matiere : item.title)}
              </span>
              {isKholle && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${dynamicClasses.dot} text-white`}
                  style={dynamicStyles.backgroundColor ? { backgroundColor: dynamicStyles.borderColor } : {}}>
                  Kholle
                </span>
              )}
              {isKholle && item.isException && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600">
                  {item.customDate ? new Date(item.customDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Exceptionnel'}
                </span>
              )}
              {isKholle && item.matiere === 'Maths' && (
                <a href={`https://a-crida.toile-libre.org/colles/semaine_${item.weekNum}.pdf`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600 transition-all active:scale-95">
                  Sujet <ExternalLink size={10} />
                </a>
              )}
              {isKholle && item.type === 'PA' && <span className="text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">PA</span>}
              {isKholle && item.type === 'TQ' && (
                <a href="https://drive.google.com/drive/folders/16uCn2ZhdKX-Sobsk88zpN9csToGHkR5k" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-500 text-white px-2 py-0.5 rounded hover:bg-purple-600 transition-all active:scale-95">
                  TQ <ExternalLink size={10} />
                </a>
              )}
              {isKholle && isAdmin && (
                <button onClick={() => startEditingKholle(item)}
                  className="inline-flex items-center text-[11px] p-1 rounded transition-all" style={{ color: 'var(--text-muted)' }}>
                  <Pencil size={10} />
                </button>
              )}
              {isKholle && !isAdmin && (
                <button onClick={() => {
                  setRequestForm({
                    matiere: item.matiere,
                    currentDay: JOURS[dayIdx],
                    currentHour: item.heure,
                    requestedDay: 'Lundi',
                    requestedHour: HEURES_KHOLLE[0],
                    reason: '',
                    contact: '',
                    useCustomDate: false,
                    customDate: ''
                  })
                  setShowRequestForm(true)
                }}
                  className="inline-flex items-center gap-1 text-[11px] p-1 rounded transition-all" style={{ color: 'var(--text-muted)' }}
                  title="Demander un changement">
                  <MessageSquarePlus size={12} />
                </button>
              )}
              {isCours && !hasOverlay && !isSortie && item.matiere !== 'Repas' && item.matiere !== 'Récré' && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                  Cours
                </span>
              )}
              {isCours && item.isCancelled && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-500 text-white">
                  Prof absent
                </span>
              )}
              {hasOverlay && (
                overlayEvent.eventType === 'DM' && overlayEvent.matiere === 'Maths' ? (
                  <a href={`https://a-crida.toile-libre.org/tsi1/DM${overlayEvent.weekNum + 2}_enonce.pdf`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-500 text-white px-2 py-0.5 rounded hover:bg-indigo-600 transition-all active:scale-95">
                    DM <ExternalLink size={10} />
                  </a>
                ) : (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${overlayColors.dot} text-white`}>
                    {overlayEvent.eventType}
                  </span>
                )
              )}
              {isEvent && item.eventType === 'DM' && item.matiere === 'Maths' && (
                <a href={`https://a-crida.toile-libre.org/tsi1/DM${item.weekNum + 2}_enonce.pdf`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-500 text-white px-2 py-0.5 rounded hover:bg-indigo-600 transition-all active:scale-95">
                  DM <ExternalLink size={10} />
                </a>
              )}
            </div>
            {/* Details row */}
            <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock size={16} className="text-gray-400" />
                {item.heure}
              </span>
              {(isCours || isKholle) && item.prof && (
                <span className="flex items-center gap-1.5">
                  <User size={16} className="text-gray-400" />
                  {item.prof}
                </span>
              )}
              {item.salle && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-gray-400" />
                  {item.salle}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }



  // ── Swipe handlers (day view mobile) ──────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) {
      // Swipe gauche → jour suivant
      if (activeDay < JOURS.length - 1) {
        setActiveDay(activeDay + 1)
      } else {
        setWeekIdx(prev => Math.min(prev + 1, WEEKS.length - 1))
        setActiveDay(0)
      }
    } else {
      // Swipe droite → jour précédent
      if (activeDay > 0) {
        setActiveDay(activeDay - 1)
      } else {
        setWeekIdx(prev => Math.max(prev - 1, 0))
        setActiveDay(JOURS.length - 1)
      }
    }
  }

  const handleTouchEndWeek = (e) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) {
      setWeekIdx(prev => Math.min(prev + 1, WEEKS.length - 1))
    } else {
      setWeekIdx(prev => Math.max(prev - 1, 0))
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Top row: back + title + trinome */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link to="/" className="transition-colors p-1" style={{ color: 'var(--accent)' }}>
                <ArrowLeft size={22} />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Emploi du temps</h1>
                  {isAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>TSI-1 • {code}</p>
              </div>
            </div>
            <div className="relative">
              <select value={trinome} onChange={(e) => setTrinome(parseInt(e.target.value))}
                className="appearance-none bg-blue-600 text-white font-bold pl-4 pr-10 py-2.5 rounded-xl text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 shadow">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(t => (
                  <option key={t} value={t}>Trinôme {t}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
            </div>
          </div>

          {/* Week selector row */}
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))} disabled={weekIdx === 0}
              className="p-2 rounded-xl hover:bg-blue-100 text-blue-600 dark:text-blue-400 disabled:opacity-30 transition-colors flex items-center justify-center">
              <ChevronLeft size={20} />
            </button>

            {/* Week button - opens picker */}
            <button onClick={() => setShowWeekPicker(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-700 transition-colors">
              <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-blue-700 dark:text-blue-300">Semaine {week.num}</span>
              <span className="text-sm text-blue-500">{week.label}</span>
            </button>

            <button onClick={() => setWeekIdx(Math.min(WEEKS.length - 1, weekIdx + 1))} disabled={weekIdx === WEEKS.length - 1}
              className="p-2 rounded-xl hover:bg-blue-100 text-blue-600 dark:text-blue-400 disabled:opacity-30 transition-colors flex items-center justify-center">
              <ChevronRight size={20} />
            </button>

            <button onClick={() => {
              setWeekIdx(getCurrentWeekIdx())
              // Mettre le jour actuel, ou demain si cours finis
              const now = new Date()
              const currentDayOfWeek = now.getDay()
              const currentHour = now.getHours() + now.getMinutes() / 60

              // Si weekend -> Lundi
              if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
                setActiveDay(0)
                return
              }

              let dayIdx = currentDayOfWeek - 1
              const lastEnd = getLastCourseEnd(dayIdx)

              // Si dernier cours fini et pas vendredi -> demain
              if (lastEnd > 0 && currentHour >= lastEnd && dayIdx < 4) {
                dayIdx = dayIdx + 1
              }

              setActiveDay(dayIdx)
            }}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow">
              Auj.
            </button>
          </div>

          {/* View toggle + day selector */}
          <div className="flex items-center gap-2 mt-3">
            {/* View mode toggle */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl p-1 shrink-0" style={{ background: 'var(--surface-2)' }}>
                <button onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1`}
                  style={viewMode === 'day' ? { background: 'var(--surface)', color: 'var(--accent)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: 'var(--text-muted)' }}>
                  <List size={16} /><span className="hidden sm:inline">Jour</span>
                </button>
                <button onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1`}
                  style={viewMode === 'week' ? { background: 'var(--surface)', color: 'var(--accent)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: 'var(--text-muted)' }}>
                  <Calendar size={16} /><span className="hidden sm:inline">Semaine</span>
                </button>
              </div>
              <button onClick={() => setShowColorsModal(true)}
                className="p-2 sm:px-3 sm:py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 font-medium border text-xs sm:text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }} title="Couleurs des matières">
                <Sparkles size={18} />
              </button>
            </div>

            {/* Day tabs (only in day view) */}
            {viewMode === 'day' && (
              <div className="flex-1 flex gap-1 rounded-xl p-1 overflow-x-auto scrollbar-hide" style={{ background: 'var(--surface-2)' }}>
                {JOURS.map((jour, di) => {
                  const todayHighlight = isToday(week.start, di)
                  return (
                    <button key={jour} onClick={() => setActiveDay(di)}
                      className="flex-1 min-w-[40px] py-1.5 rounded-lg text-center transition-all text-sm font-medium"
                      style={activeDay === di
                        ? { background: 'var(--accent)', color: '#fff' }
                        : todayHighlight
                          ? { background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent)' }
                          : { color: 'var(--text-muted)' }
                      }>
                      {JOURS_SHORT[di]}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Info text in week view on desktop */}
            {viewMode === 'week' && (
              <div className="flex-1 text-center hidden md:block">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Vue semaine complète</span>
              </div>
            )}

          </div>

          {/* Mobile week day selector - dans le header pour sticky garanti */}
          {viewMode === 'week' && (
            <div className="md:hidden mt-3">
              <div className="flex gap-1 rounded-2xl p-1.5 overflow-x-auto scrollbar-hide" style={{ background: 'var(--surface-2)' }}>
                {JOURS.map((jour, di) => {
                  const todayHighlight = isToday(week.start, di)
                  const dayItems = calendarData[jour] || []
                  const hasKholle = dayItems.some(item => item.kind === 'kholle')
                  const hasEvent = dayItems.some(item => item.kind === 'event' || item.kind === 'sortie')
                  const itemCount = dayItems.length
                  return (
                    <button
                      key={jour}
                      onClick={() => {
                        const element = document.getElementById(`week-day-${di}`)
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`flex-1 min-w-[50px] py-2 px-1 rounded-xl text-center transition-all active:scale-95 ${todayHighlight
                        ? 'bg-blue-600 text-white shadow-md'
                        : itemCount > 0
                          ? 'bg-white text-gray-700 shadow-sm'
                          : 'text-gray-400'
                        }`}>
                      <div className={`text-[10px] font-semibold uppercase ${todayHighlight ? 'text-blue-100' : 'text-gray-400'}`}>
                        {JOURS_SHORT[di]}
                      </div>
                      <div className={`text-base font-bold leading-tight ${todayHighlight ? 'text-white' : itemCount > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                        {formatDate(week.start, di).split('/')[0]}
                      </div>
                      {/* Indicateurs de contenu */}
                      <div className="flex justify-center gap-0.5 mt-1 min-h-[6px]">
                        {hasKholle && <span className={`w-1.5 h-1.5 rounded-full ${todayHighlight ? 'bg-violet-300' : 'bg-violet-500'}`} />}
                        {hasEvent && <span className={`w-1.5 h-1.5 rounded-full ${todayHighlight ? 'bg-red-300' : 'bg-red-500'}`} />}
                      </div>
                    </button>
                  )
                })}
              </div>
              {/* Légende */}
              <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />Kholle</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Événement</span>
                <span className="text-gray-300">•</span>
                <span>Cliquez pour aller au jour</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Offline banner */}
      {isOffline && (
        <div style={{
          background: 'rgba(234,179,8,0.12)',
          borderBottom: '1px solid rgba(234,179,8,0.3)',
        }}>
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-2">
            <WifiOff size={14} style={{ color: '#ca8a04', flexShrink: 0 }} />
            <span style={{ color: '#ca8a04', fontSize: '0.78rem', fontWeight: 500 }}>
              Hors ligne — données mises en cache affichées
            </span>
          </div>
        </div>
      )}

      {/* Week picker modal */}
      {showWeekPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Search size={18} /> Choisir une semaine
              </h3>
              <button onClick={() => setShowWeekPicker(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[60vh]">
              {WEEKS.map((w, i) => {
                const isCurrent = i === weekIdx
                const isCurrentReal = i === getCurrentWeekIdx()
                return (
                  <button key={w.num}
                    onClick={() => { setWeekIdx(i); setShowWeekPicker(false) }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                    style={isCurrent
                      ? { background: 'rgba(var(--accent-rgb), 0.1)', border: '2px solid rgba(var(--accent-rgb), 0.4)' }
                      : { background: 'transparent' }
                    }>
                    <span className="font-bold text-lg" style={{ color: isCurrent ? 'var(--accent)' : 'var(--text)' }}>
                      S{w.num}
                    </span>
                    <span className="text-sm" style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {w.label}
                    </span>
                    {isCurrentReal && (
                      <span className="ml-auto text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Actuelle
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* VACANCES VIEW */}
      {week.isVacances && (
        <div className="max-w-3xl mx-auto px-4 py-8 mb-8 sm:py-16 text-center flex flex-col items-center justify-center" style={{ minHeight: '50vh' }}>
          <div className="rounded-[2rem] p-8 sm:p-12 w-full shadow-2xl relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400"></div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <Sparkles size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: 'var(--text)' }}>{week.isVacances}</h2>
            <p className="text-base sm:text-lg" style={{ color: 'var(--text-muted)' }}>Profitez bien de votre repos !<br />Aucun cours n'est programmé cette semaine.</p>
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && !week.isVacances && (
        <div className="max-w-2xl mx-auto px-4 py-4" ref={dayViewContainerRef}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {/* Date header */}
          <div className="text-center mb-4">
            <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{JOURS[activeDay]}</div>
            <div style={{ color: 'var(--text-muted)' }}>{formatDate(week.start, activeDay)}</div>
          </div>

          {/* Day content */}
          <div className="space-y-3">
            {loadingCourses ? (
              <>
                {[120, 90, 110, 80].map((w, i) => (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden animate-pulse"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 80 + i * 12 }}
                  >
                    <div className="flex h-full">
                      <div className="w-1.5 h-full rounded-l-2xl" style={{ background: 'var(--surface-3)' }} />
                      <div className="flex-1 p-4 flex flex-col justify-center gap-2">
                        <div className="h-3.5 rounded-full" style={{ background: 'var(--surface-3)', width: `${w}px` }} />
                        <div className="h-2.5 rounded-full" style={{ background: 'var(--surface-3)', width: `${w * 0.65}px` }} />
                        <div className="h-2 rounded-full" style={{ background: 'var(--surface-3)', width: `${w * 0.45}px` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : HOLIDAYS[formatDateISO(week.start, activeDay)] ? (
              <div className="rounded-2xl p-12 text-center shadow-sm" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                <Sparkles size={48} className="text-yellow-400 mx-auto mb-4 opacity-80" />
                <p className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Férié : {HOLIDAYS[formatDateISO(week.start, activeDay)]}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pas de cours aujourd'hui !</p>
              </div>
            ) : (
              <>
                {(calendarData[JOURS[activeDay]] || [])
                  .sort((a, b) => a.start - b.start)
                  .map((item, idx) => (
                    <div key={idx} data-start-hour={item.start}>{renderDayCard(item)}</div>
                  ))}
                {(calendarData[JOURS[activeDay]] || []).length === 0 && (
                  <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <Sparkles size={48} className="text-yellow-400 mx-auto mb-3" />
                    <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Rien ce jour</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && !week.isVacances && (
        <>
          {/* Desktop week view - grille complete */}
          <div className="hidden md:block max-w-6xl mx-auto px-4 py-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              {/* Day headers */}
              <div className="grid grid-cols-[50px_repeat(6,1fr)]" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="p-2" />
                {JOURS.map((jour, di) => {
                  const todayHighlight = isToday(week.start, di)
                  return (
                    <div key={jour} className="p-2 text-center" style={{ borderLeft: '1px solid var(--border)', background: todayHighlight ? 'rgba(var(--accent-rgb), 0.06)' : 'transparent' }}>
                      <div className="text-xs font-medium" style={{ color: todayHighlight ? 'var(--accent)' : 'var(--text-muted)' }}>{JOURS_SHORT[di]}</div>
                      <div className="text-sm font-bold" style={{ color: todayHighlight ? 'var(--accent)' : 'var(--text)' }}>{formatDate(week.start, di)}</div>
                    </div>
                  )
                })}
              </div>

              {/* Time grid */}
              <div className="grid grid-cols-[50px_repeat(6,1fr)]">
                {/* Hour labels */}
                <div className="relative" style={{ height: totalHeight }}>
                  {Array.from({ length: HOURS_END - HOURS_START }, (_, i) => (
                    <div key={i} className="absolute right-2 text-[10px] text-gray-400 -translate-y-1/2"
                      style={{ top: i * HOUR_HEIGHT }}>
                      {HOURS_START + i}h
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {JOURS.map((jour, di) => {
                  const todayHighlight = isToday(week.start, di)
                  const dayDateStr = formatDateISO(week.start, di)
                  const isHoliday = HOLIDAYS[dayDateStr]
                  const dayItems = calendarData[jour] || []

                  if (isHoliday) {
                    return (
                      <div key={jour} className="relative flex flex-col items-center justify-center p-4 text-center overflow-hidden"
                        style={{ height: totalHeight, borderLeft: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(var(--text) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                        <Sparkles size={24} className="text-yellow-400 mb-2 relative z-10" />
                        <p className="font-bold relative z-10 text-xs text-balance leading-tight" style={{ color: 'var(--text)' }}>{isHoliday}</p>
                        <p className="text-[10px] uppercase font-bold tracking-wider relative z-10 mt-1" style={{ color: 'var(--text-muted)' }}>Férié</p>
                      </div>
                    )
                  }

                  return (
                    <div key={jour} className="relative"
                      style={{ height: totalHeight, borderLeft: '1px solid var(--border)', background: todayHighlight ? 'rgba(var(--accent-rgb), 0.04)' : 'transparent' }}>
                      {/* Hour lines */}
                      {Array.from({ length: HOURS_END - HOURS_START }, (_, i) => (
                        <div key={i} className="absolute left-0 right-0"
                          style={{ borderTop: '1px solid var(--border)', opacity: 0.5, top: i * HOUR_HEIGHT }} />
                      ))}
                      {/* Events */}
                      {dayItems.map((item, idx) => (
                        <div key={idx}>
                          {renderEventCard(item, true, di)}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile week view - liste verticale des jours */}
          <div className="md:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEndWeek}>
            <div className="px-3 py-4 space-y-4">
              {JOURS.map((jour, di) => {
                const todayHighlight = isToday(week.start, di)
                const dayDateStr = formatDateISO(week.start, di)
                const isHoliday = HOLIDAYS[dayDateStr]
                const dayItems = (calendarData[jour] || []).sort((a, b) => a.start - b.start)

                if (dayItems.length === 0 && !isHoliday) return null // Skip les jours vides normaux

                if (isHoliday) {
                  return (
                    <div key={jour} id={`week-day-${di}`} className="rounded-2xl overflow-hidden p-6 text-center select-none mt-4"
                      style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
                      <div className="flex items-center justify-center gap-3">
                        <Sparkles size={24} className="text-yellow-400 shrink-0" />
                        <div className="text-left">
                          <p className="font-bold text-base leading-tight" style={{ color: 'var(--text)' }}>Férié : {isHoliday}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{jour} {formatDate(week.start, di)}</p>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Séparer les kholles des autres événements pour meilleure lisibilité
                const kholles = dayItems.filter(item => item.kind === 'kholle')
                const others = dayItems.filter(item => item.kind !== 'kholle')

                return (
                  <div
                    key={jour}
                    id={`week-day-${di}`}
                    className="rounded-2xl overflow-hidden scroll-mt-[280px]"
                    style={todayHighlight
                      ? { background: 'var(--surface)', border: '2px solid rgba(var(--accent-rgb), 0.5)', boxShadow: '0 0 0 4px rgba(var(--accent-rgb), 0.1)' }
                      : { background: 'var(--surface)', border: '1px solid var(--border)' }
                    }
                  >
                    {/* En-tete du jour - plus grand et plus visible */}
                    <div className="flex items-center justify-between px-4 py-3.5"
                      style={{ background: todayHighlight ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--surface-2)', borderBottom: `2px solid ${todayHighlight ? 'rgba(var(--accent-rgb), 0.3)' : 'var(--border)'}` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 flex items-center justify-center rounded-xl"
                          style={todayHighlight ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--surface-3)', color: 'var(--text)' }}>
                          <span className="text-2xl font-bold">{formatDate(week.start, di).split('/')[0]}</span>
                        </div>
                        <div>
                          <div className="text-lg font-bold" style={{ color: todayHighlight ? 'var(--accent)' : 'var(--text)' }}>
                            {jour}
                          </div>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span>{dayItems.length} élément{dayItems.length > 1 ? 's' : ''}</span>
                            {kholles.length > 0 && (
                              <span className="flex items-center gap-1 text-violet-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                {kholles.length} kholle{kholles.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {todayHighlight && (
                        <span className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-md animate-pulse">
                          Aujourd'hui
                        </span>
                      )}
                    </div>

                    {/* Liste des kholles en premier (si présentes) */}
                    {kholles.length > 0 && (
                      <div className="px-3 pt-3 pb-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-2 flex items-center gap-1.5">
                          <BookMarked size={12} />
                          Kholles du jour
                        </div>
                        <div className="space-y-2">
                          {kholles.map((item, idx) => {
                            const baseColor = MATIERE_COLORS[item.matiere] || DEFAULT_COLOR;
                            let dynamicStyles = {};
                            let dynamicClasses = {
                              bg: baseColor.bg,
                              text: baseColor.text,
                              border: baseColor.border,
                              dot: baseColor.dot
                            };

                            const customHex = subjectColors[item.matiere];
                            if (customHex) {
                              dynamicStyles = {
                                backgroundColor: `${customHex}25`,
                                borderColor: customHex,
                                color: customHex
                              };
                              dynamicClasses = { bg: '', text: '', border: '', dot: '' };
                            }

                            return (
                              <div
                                key={`kholle-${idx}`}
                                className={`relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between shadow-sm transition-all group hover:shadow-md
                                  ${dynamicClasses.bg} ${dynamicClasses.border}
                                  ${item.kind === 'event' ? 'border-dashed border-2 my-1 z-20' : 'z-10'}
                                `}
                                style={{ ...dynamicStyles }}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {item.kind === 'kholle' && <BookOpen size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  {item.kind === 'event' && <FileText size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  {item.kind === 'cours' && <Clock size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  {item.kind === 'sortie' && <MapPin size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  <span className={`font-bold text-xs sm:text-sm truncate leading-tight ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}}>
                                    {item.kind === 'kholle' ? item.matiere : item.kind === 'cours' ? item.matiere : item.title}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] sm:text-xs font-medium" style={{ color: dynamicStyles.color ? dynamicStyles.color : 'var(--text-muted)' }}>
                                    {item.heure}
                                  </span>
                                  {item.prof && item.kind !== 'event' && (
                                    <span className={`flex items-center gap-1 text-[10px] sm:text-xs truncate opacity-80 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}}>
                                      <User size={10} className="shrink-0" />
                                      <span className="truncate">{item.prof}</span>
                                    </span>
                                  )}
                                  {item.salle && item.kind !== 'event' && (
                                    <span className={`flex items-center gap-1 text-[10px] sm:text-xs truncate opacity-80 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}}>
                                      <MapPin size={10} className="shrink-0" />
                                      <span className="truncate">{item.salle}</span>
                                    </span>
                                  )}
                                </div>
                                {isAdmin && (item.kind === 'kholle' || item.kind === 'event') && (
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); item.kind === 'kholle' ? startEditingKholle(item) : startEditEvent(item) }}
                                      className="p-1 rounded-lg bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600">
                                      <Pencil size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Liste des cours et autres événements */}
                    {others.length > 0 && (
                      <div className="px-3 pt-3 pb-3">
                        {kholles.length > 0 && (
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                            <Calendar size={12} />
                            Cours & Événements
                          </div>
                        )}
                        <div className="space-y-2">
                          {others.map((item, idx) => {
                            const baseColor = item.kind === 'sortie'
                              ? EVENT_TYPE_COLORS['Sortie']
                              : (item.kind === 'kholle' || item.kind === 'cours')
                                ? (MATIERE_COLORS[item.matiere] || DEFAULT_COLOR)
                                : (EVENT_TYPE_COLORS[item.eventType] || EVENT_TYPE_COLORS['DS']);

                            let dynamicStyles = {};
                            let dynamicClasses = {
                              bg: baseColor.bg,
                              text: baseColor.text,
                              border: baseColor.border,
                              dot: baseColor.dot
                            };

                            if (item.kind === 'kholle' || item.kind === 'cours' || item.kind === 'sortie') {
                              const customHex = subjectColors[item.matiere];
                              if (customHex) {
                                dynamicStyles = {
                                  backgroundColor: `${customHex}25`,
                                  borderColor: customHex,
                                  color: customHex
                                };
                                dynamicClasses = { bg: '', text: '', border: '', dot: '' };
                              }
                            }

                            return (
                              <div
                                key={`other-${idx}`}
                                className={`relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between shadow-sm transition-all group hover:shadow-md
                                  ${dynamicClasses.bg} ${dynamicClasses.border}
                                  ${item.kind === 'event' ? 'border-dashed border-2 my-1 z-20' : 'z-10'}
                                `}
                                style={{ ...dynamicStyles }}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {item.kind === 'kholle' && <BookOpen size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  {item.kind === 'event' && <FileText size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  {item.kind === 'cours' && <Clock size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  {item.kind === 'sortie' && <MapPin size={12} className={`shrink-0 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}} />}
                                  <span className={`font-bold text-xs sm:text-sm truncate leading-tight ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}}>
                                    {item.kind === 'kholle' ? item.matiere : item.kind === 'cours' ? item.matiere : item.title}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] sm:text-xs font-medium" style={{ color: dynamicStyles.color ? dynamicStyles.color : 'var(--text-muted)' }}>
                                    {item.heure}
                                  </span>
                                  {item.prof && item.kind !== 'event' && (
                                    <span className={`flex items-center gap-1 text-[10px] sm:text-xs truncate opacity-80 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}}>
                                      <User size={10} className="shrink-0" />
                                      <span className="truncate">{item.prof}</span>
                                    </span>
                                  )}
                                  {item.salle && item.kind !== 'event' && (
                                    <span className={`flex items-center gap-1 text-[10px] sm:text-xs truncate opacity-80 ${dynamicClasses.text}`} style={dynamicStyles.color ? { color: dynamicStyles.color } : {}}>
                                      <MapPin size={10} className="shrink-0" />
                                      <span className="truncate">{item.salle}</span>
                                    </span>
                                  )}
                                </div>
                                {isAdmin && (item.kind === 'kholle' || item.kind === 'event') && (
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); item.kind === 'kholle' ? startEditingKholle(item) : startEditEvent(item) }}
                                      className="p-1 rounded-lg bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600">
                                      <Pencil size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Message si aucun cours cette semaine */}
              {JOURS.every(jour => (calendarData[jour] || []).length === 0) && (
                <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Sparkles size={48} className="text-yellow-400 mx-auto mb-3" />
                  <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Aucun cours cette semaine</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs rounded-xl p-3" style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}>
          {Object.entries(MATIERE_COLORS).filter(([k]) => {
            const basic = ['Maths', 'Physique', 'SI', 'Anglais']
            if (basic.includes(k)) return true
            return courses.some(c => c.matiere === k)
          }).map(([mat, c]) => {
            const customHex = subjectColors[mat];
            const dotStyle = customHex ? { backgroundColor: customHex } : {};
            return (
              <span key={mat} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${customHex ? '' : c.dot}`} style={dotStyle} />{mat}
              </span>
            );
          })}
          <span className="w-px h-4 bg-gray-300" />
          {Object.entries(EVENT_TYPE_COLORS).map(([t, c]) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${c.dot}`} />{t}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-24">
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors">
          ← Retour a l'accueil
        </Link>
      </div>

      {/* ── Dialog pour les couleurs personnalisées ── */}
      {showColorsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-t-[2rem] sm:rounded-3xl p-0 overflow-hidden shadow-2xl border flex flex-col max-h-[85vh] w-full sm:max-w-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {/* Header */}
            <div className="px-6 py-5 border-b sticky top-0 z-10 flex items-center justify-between backdrop-blur-md bg-opacity-90" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)' }}>
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <h3 className="font-display font-bold text-xl" style={{ color: 'var(--text)' }}>Couleurs des matières</h3>
              </div>
              <button onClick={() => setShowColorsModal(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg)' }}>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Personnalisez l'affichage de votre emploi du temps en attribuant des couleurs spécifiques à chaque matière. Cliquez sur les cercles pour modifier la couleur.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {ALL_SUBJECTS.map(subject => {
                  const customHex = subjectColors[subject] || ''
                  const defaultClasses = MATIERE_COLORS[subject] || DEFAULT_COLOR

                  return (
                    <div key={subject} className="group flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all hover:shadow-md" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {/* The actual visual circle indicator */}
                          <div
                            className={`w-10 h-10 rounded-full border-2 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 ${!customHex && defaultClasses.border} ${!customHex && defaultClasses.bg}`}
                            style={customHex ? { backgroundColor: customHex, borderColor: customHex } : {}}
                          />
                          {/* The invisible color input layered on top */}
                          <input
                            type="color"
                            value={customHex || '#3b82f6'}
                            onChange={(e) => updateSubjectColor(subject, e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title={`Changer la couleur pour ${subject}`}
                          />
                        </div>
                        <span className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--text)' }}>
                          {subject}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center ml-2">
                        {customHex ? (
                          <button
                            onClick={() => updateSubjectColor(subject, '')}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Réinitialiser la couleur par défaut"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <div className="w-8" /> /* Reserved space so grid items don't jump around */
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog pour Admin Options (Semaine entière) ── */}
      <button
        onClick={() => setShowAdminPanel(true)}
        className={`fixed bottom-20 right-6 bg-white dark:bg-slate-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl p-4 rounded-full border border-blue-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all z-40 ${!isAdmin ? 'hidden' : ''}`}>
        <Settings className="w-6 h-6" />
        {pendingRequestsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {pendingRequestsCount}
          </span>
        )}
      </button>

      {renderAdminPanel()}
      {renderEditModal()}
      {renderEventFormModal()}
      {renderKholleExceptionModal()}
      {renderRequestModal()}
    </div>
  )
}
