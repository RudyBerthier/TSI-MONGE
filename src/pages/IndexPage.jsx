import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Globe, Calculator, Cog, ChefHat, GraduationCap, ExternalLink, Mountain, Settings, Plus, Edit, Trash2, Save, X, ArrowUp, ArrowDown,
  Book, BookOpen, Briefcase, Calendar, Camera, Car, Clock, Cloud, Code, Coffee, Compass,
  Database, Download, File, FileText, Film, Flag, Folder, FolderOpen, Gift, Heart, Home,
  Image, Laptop, Layers, Mail, Map, MapPin, Menu, MessageCircle, Mic, Music, Paperclip,
  Phone, Play, Printer, Radio, Rocket, Search, Send, Settings2, Share, ShoppingCart, Star,
  Sun, Tag, Target, Trash, TrendingUp, Tv, Upload, User, Users, Video, Wifi, Zap,
  Apple, Award, Beaker, Bell, Bus, Clipboard, CreditCard, DollarSign, Feather, FileCode,
  Gamepad2, GitBranch, Hammer, Headphones, Info, Key, Languages, Lightbulb,
  Link as LinkIcon, Lock, Megaphone, Monitor, Navigation, Palette, PenTool, Pizza, Plane, Receipt,
  Scissors, Shield, ShoppingBag, Smartphone, Speaker, Trophy, Truck, Umbrella, Wrench, Timer, Instagram,
  GripHorizontal, BarChart2
} from 'lucide-react'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ProchaineKholleBanner } from '../components/ProchaineKholleBanner'
import { VacationCountdown } from '../components/VacationCountdown'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* ─────────────────────────────────────────────────────────────
   Constants & helpers
───────────────────────────────────────────────────────────── */
const ANCIEN_MATH_URL = 'https://a-crida.toile-libre.org'
const MODERN_MATH_URL = '/maths'
const MATH_PREF_KEY = 'tsi_math_site_pref'

import WeatherWidget from '../components/widgets/WeatherWidget'
import { useWeatherCurrent } from '../components/widgets/useWeatherCurrent'
import NotesWidget from '../components/widgets/NotesWidget'
import { WeatherParticles } from '../components/WeatherParticles'
import { TransportWidget } from '../components/widgets/TransportWidget'

const NAV_ITEMS = [
  { href: '/emploi-du-temps', label: 'EDT & Kholles', Icon: Calendar, color: '#1D4ED8' },
  { href: '/covoiturage', label: 'Covoiturage', Icon: Car, color: '#10B981', badge: 'Nouveau' },
  { href: '/kholleurs', label: 'Avis Kholleurs', Icon: BarChart2, color: '#eab308', badge: 'Nouveau' },
  { href: '/sondages', label: 'Sondages', Icon: Star, color: '#D97706' },
  { href: '/social', label: 'Mongegram', Icon: Instagram, color: '#E1306C' },
  { href: '/outils', label: 'Autres Outils', Icon: Wrench, color: '#6366F1' },
]


/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
export function IndexPage() {
  const { user, getToken, userSettings, updateUserSettings } = useAuth()
  const isAdminAuthenticated = user?.role === 'admin'

  /* Math modal */
  const [mathModal, setMathModal] = useState(false)
  const [rememberMath, setRememberMath] = useState(false)
  const [mathPref, setMathPref] = useState(() => localStorage.getItem(MATH_PREF_KEY))

  const handleMathClick = (e) => {
    e.preventDefault()
    if (mathPref) window.open(mathPref, '_blank', 'noopener,noreferrer')
    else { setRememberMath(false); setMathModal(true) }
  }
  const chooseMathSite = (url) => {
    if (rememberMath || mathPref) { localStorage.setItem(MATH_PREF_KEY, url); setMathPref(url) }
    window.open(url, '_blank', 'noopener,noreferrer')
    setMathModal(false)
  }
  const resetMathPref = () => { localStorage.removeItem(MATH_PREF_KEY); setMathPref(null) }

  /* Links CRUD */
  const [editingCard, setEditingCard] = useState(null)
  const [newCard, setNewCard] = useState({ title: '', description: '', url: '', icon: 'Globe' })

  const defaultLinks = [
    { id: 1, title: 'Drive Anglais', description: "Ressources et cours d'anglais", url: 'https://drive.google.com/drive/folders/1DurjHeiIU_oEpJTccJK363khImMgTnzV', icon: 'GraduationCap' },
    { id: 2, title: 'Drive SI', description: "Sciences de l'Ingénieur", url: 'https://drive.google.com/drive/folders/0B2HWUKC_SYPnYndpZHFBOE9jVGM', icon: 'Cog' },
    { id: 3, title: 'Site Info', description: 'Informations TSI Monge', url: 'http://info.tsi.monge.free.fr', icon: 'Globe' },
    { id: 4, title: 'Site Math', description: 'Cours de mathématiques', url: ANCIEN_MATH_URL, icon: 'Calculator' },
    { id: 5, title: 'Cantine', description: 'Inscription vendredi soir', url: 'https://docs.google.com/spreadsheets/d/1avPYoIxm3z25uiQcjsbdmy_XtpssnmTiI03HJOfD7KA', icon: 'ChefHat' },
    { id: 6, title: 'Sortie Ski', description: 'Inscription sortie ski', url: 'https://docs.google.com/spreadsheets/d/1cn2yRqYtKScow7l7WbJbV4RWIlGQYB8LHp3RwruDOoo/', icon: 'Mountain' },
  ]

  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const skipNextSave = useRef(false)

  useEffect(() => {
    fetch('/api/links')
      .then(r => r.json())
      .then(d => { skipNextSave.current = true; setLinks(d.links); setLoading(false) })
      .catch(() => { setLinks(defaultLinks); setLoading(false) })
  }, [])

  useEffect(() => {
    if (skipNextSave.current) { skipNextSave.current = false; return }
    if (!loading && links.length > 0 && isAdminAuthenticated) {
      fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(links),
      })
        .then(r => { if (!r.ok) throw new Error(); return r.json() })
        .then(d => console.log('✅', d.message))
        .catch(() => alert('Erreur: Impossible de sauvegarder'))
    }
  }, [links, loading, isAdminAuthenticated])

  const iconMap = {
    Globe, Calculator, Cog, ChefHat, GraduationCap, Mountain, Timer,
    Book, BookOpen, Briefcase, Calendar, Camera, Car, Clock, Cloud, Code, Coffee, Compass,
    Database, Download, File, FileText, Film, Flag, Folder, FolderOpen, Gift, Heart, Home,
    Image, Laptop, Layers, Mail, Map, MapPin, Menu, MessageCircle, Mic, Music, Paperclip,
    Phone, Play, Printer, Radio, Rocket, Search, Send, Settings2, Share, ShoppingCart, Star,
    Sun, Tag, Target, Trash, TrendingUp, Tv, Upload, User, Users, Video, Wifi, Zap,
    Apple, Award, Beaker, Bell, Bus, Clipboard, CreditCard, DollarSign, Feather, FileCode,
    Gamepad2, GitBranch, Hammer, Headphones, Info, Key, Languages, Lightbulb,
    Link: LinkIcon, Lock, Megaphone, Monitor, Navigation, Palette, PenTool, Pizza, Plane, Receipt,
    Scissors, Shield, ShoppingBag, Smartphone, Speaker, Trophy, Truck, Umbrella, Wrench,
  }

  const suggestIcon = (t) => {
    t = t.toLowerCase()
    if (t.includes('anglais') || t.includes('english')) return 'Languages'
    if (t.includes('math')) return 'Calculator'
    if (t.includes('info') || t.includes('code')) return 'Code'
    if (t.includes('physique') || t.includes('science')) return 'Beaker'
    if (t.includes('si') || t.includes('ingénieur')) return 'Cog'
    if (t.includes('cantine') || t.includes('repas')) return 'ChefHat'
    if (t.includes('ski') || t.includes('montagne')) return 'Mountain'
    if (t.includes('sport')) return 'Trophy'
    if (t.includes('drive') || t.includes('fichier')) return 'FolderOpen'
    if (t.includes('cours') || t.includes('livre')) return 'BookOpen'
    if (t.includes('mail') || t.includes('email')) return 'Mail'
    if (t.includes('calendar') || t.includes('calendrier')) return 'Calendar'
    if (t.includes('github') || t.includes('git')) return 'GitBranch'
    return 'Globe'
  }

  useEffect(() => {
    if (newCard.title) setNewCard(p => ({ ...p, icon: suggestIcon(p.title) }))
  }, [newCard.title])

  const addCard = () => { if (newCard.title && newCard.description && newCard.url) { setLinks([...links, { ...newCard, id: Date.now() }]); setNewCard({ title: '', description: '', url: '', icon: 'Globe' }) } }
  const deleteCard = id => setLinks(links.filter(l => l.id !== id))
  const startEdit = link => setEditingCard({ ...link })
  const saveEdit = () => { setLinks(links.map(l => l.id === editingCard.id ? editingCard : l)); setEditingCard(null) }
  const cancelEdit = () => setEditingCard(null)
  const moveCardUp = i => { if (i === 0) return; const a = [...links];[a[i], a[i - 1]] = [a[i - 1], a[i]]; setLinks(a) }
  const moveCardDown = i => { if (i === links.length - 1) return; const a = [...links];[a[i], a[i + 1]] = [a[i + 1], a[i]]; setLinks(a) }

  /* ─────────────────────────────────────────────────────────────
     Drag and Drop Widgets (Dashboard)
  ───────────────────────────────────────────────────────────── */
  const WIDGETS = useMemo(() => {
    return {
      'WIDGET-TOOLS': <ToolsWidget key="WIDGET-TOOLS" />,
      'WIDGET-KHOLLES': <ProchaineKholleBanner key="WIDGET-KHOLLES" />,
      'WIDGET-RESOURCES': <ResourcesWidget
        key="WIDGET-RESOURCES"
        links={links} iconMap={iconMap} isAdminAuthenticated={isAdminAuthenticated}
        mathPref={mathPref} handleMathClick={handleMathClick}
        setRememberMath={setRememberMath} setMathModal={setMathModal}
        chooseMathSite={chooseMathSite} moveCardUp={moveCardUp}
        moveCardDown={moveCardDown} startEdit={startEdit} deleteCard={deleteCard}
      />
    }
  }, [links, isAdminAuthenticated, mathPref, setMathModal, chooseMathSite, handleMathClick])

  // Initialisation localStorage
  const DEFAULT_WIDGET_ORDER = ['WIDGET-TOOLS', 'WIDGET-KHOLLES', 'WIDGET-RESOURCES']
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const stored = localStorage.getItem('tsi_dashboard_order')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge: keep stored order, add any new widgets not in cache
        const missing = DEFAULT_WIDGET_ORDER.filter(w => !parsed.includes(w))
        const valid = parsed.filter(w => DEFAULT_WIDGET_ORDER.includes(w))
        if (valid.length > 0) return [...valid, ...missing]
      }
    } catch (e) { console.error('Erreur lecture order dashboard', e) }
    return DEFAULT_WIDGET_ORDER
  })

  // Synchronisation avec le Cloud
  useEffect(() => {
    if (userSettings && userSettings.tsi_dashboard_order) {
      const parsed = userSettings.tsi_dashboard_order
      const missing = DEFAULT_WIDGET_ORDER.filter(w => !parsed.includes(w))
      const valid = parsed.filter(w => DEFAULT_WIDGET_ORDER.includes(w))
      if (valid.length > 0) setWidgetOrder([...valid, ...missing])
    }
  }, [userSettings])

  // Hook capteurs DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) return

    if (active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        const newArray = arrayMove(items, oldIndex, newIndex)
        if (updateUserSettings) updateUserSettings({ tsi_dashboard_order: newArray })
        return newArray
      })
    }
  }

  const [isEditMode, setIsEditMode] = useState(false)

  /* Announcement state */
  const [siteSettings, setSiteSettings] = useState({ siteName: 'TSI Monge', schoolYear: '2024-2025' })
  const [announcement, setAnnouncement] = useState('')
  const [announcementActive, setAnnouncementActive] = useState(false)
  const [bannerClosed, setBannerClosed] = useState(true)
  const [isClosingBanner, setIsClosingBanner] = useState(false)

  const [editAnnouncement, setEditAnnouncement] = useState('')
  const [editAnnouncementActive, setEditAnnouncementActive] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.siteName) setSiteSettings({ siteName: d.siteName, schoolYear: d.schoolYear })
        setAnnouncement(d.announcementMessage || '')
        setAnnouncementActive(d.announcementActive === 'true')
        setEditAnnouncement(d.announcementMessage || '')
        setEditAnnouncementActive(d.announcementActive === 'true')

        const closedMsg = localStorage.getItem('tsi_announcement_closed')
        if (d.announcementActive === 'true' && closedMsg !== (d.announcementMessage || '')) {
          setBannerClosed(false)
        } else {
          setBannerClosed(true)
        }
      })
      .catch(console.error)

    // Prefetch silencieux pour le cache hors-ligne
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

    fetch(`/api/pronote/timetable?weekStart=${weekStart}`)
      .then(r => r.json())
      .then(data => {
        try { localStorage.setItem(`offline_timetable_${weekStart}`, JSON.stringify(data.courses || [])) } catch { }
      })
      .catch(() => { })

    fetch('/api/colloscope')
      .then(r => r.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          try { localStorage.setItem('offline_colloscope', JSON.stringify(data)) } catch { }
        }
      })
      .catch(() => { })

    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        try { localStorage.setItem('offline_events', JSON.stringify(data)) } catch { }
      })
      .catch(() => { })
  }, [])

  const closeBanner = () => {
    setIsClosingBanner(true)
    setTimeout(() => {
      setBannerClosed(true)
      setIsClosingBanner(false)
      localStorage.setItem('tsi_announcement_closed', announcement)
    }, 300)
  }

  const saveAnnouncement = () => {
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({
        ...siteSettings,
        announcementMessage: editAnnouncement,
        announcementActive: editAnnouncementActive
      })
    })
      .then(r => r.json())
      .then(d => {
        setAnnouncement(editAnnouncement)
        setAnnouncementActive(editAnnouncementActive)
        setBannerClosed(false)
        localStorage.removeItem('tsi_announcement_closed')
        alert('Annonce sauvegardée')
      })
      .catch(() => alert("Erreur lors de la sauvegarde de l'annonce"))
  }

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div style={{ background: 'var(--bg)', position: 'relative' }}>
      <WeatherParticles />

      {/* ════════════════════════════════════════════════════
          ANNOUNCEMENT BANNER
      ════════════════════════════════════════════════════ */}
      {announcementActive && !bannerClosed && announcement && (
        <div style={{
          background: 'rgba(var(--accent-rgb), 0.1)',
          borderBottom: '1px solid rgba(var(--accent-rgb), 0.2)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          position: 'relative',
          zIndex: 40,
          opacity: isClosingBanner ? 0 : 1,
          transform: isClosingBanner ? 'translateY(-10px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          animation: isClosingBanner ? 'none' : 'tsi-entrance 0.5s ease both'
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center' }}>
              <Megaphone size={16} className="shrink-0" style={{ marginRight: 8 }} />
              <span dangerouslySetInnerHTML={{ __html: announcement }} />
            </span>
          </div>
          <button onClick={closeBanner} className="shrink-0 hover:opacity-75 transition-opacity" style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          VACATION COUNTDOWN
      ════════════════════════════════════════════════════ */}
      <VacationCountdown>
        <MiniTransportPill />
      </VacationCountdown>

      {/* ════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 10% 70%, rgba(var(--accent-rgb), 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 5%,  rgba(var(--accent-warm-rgb), 0.05) 0%, transparent 45%),
            var(--bg)
          `,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Giant watermark "TSI" */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '-0.5rem',
            transform: 'translateY(-52%)',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(160px, 33vw, 400px)',
            fontWeight: 800,
            color: 'rgba(var(--accent-rgb), 0.032)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          TSI
        </div>

        {/* Hero content */}
        <div
          className="relative max-w-5xl mx-auto px-4 sm:px-6"
          style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem', zIndex: 1 }}
        >
          {/* Live tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              marginBottom: '1.75rem',
              animation: 'tsi-entrance 0.55s ease both',
            }}
          >
            <span
              style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'inline-block',
                flexShrink: 0,
                animation: 'tsi-pulse 2.8s ease-in-out infinite',
                boxShadow: '0 0 8px rgba(var(--accent-rgb), 0.55)',
              }}
            />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              Lycée Monge · Chambéry · CPGE
            </span>
          </div>

          {/* Main headline + mini weather */}
          <div className="flex items-start justify-between gap-4" style={{ animation: 'tsi-entrance 0.7s 0.07s ease both' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3.75rem, 14vw, 9.5rem)',
                fontWeight: 800,
                lineHeight: 0.88,
                letterSpacing: '-0.04em',
                color: 'var(--text)',
                margin: 0,
              }}
            >
              <span style={{ color: 'var(--accent)' }}>TSI</span>
              <br />
              <span>MONGE</span>
            </h1>
            <div className="flex flex-col items-end gap-1">
              <MiniWeatherPill />
            </div>
          </div>

          {/* Animated cyan rule */}
          <div
            style={{
              height: 2,
              maxWidth: 300,
              background: 'linear-gradient(90deg, var(--accent) 0%, transparent 100%)',
              margin: '1.6rem 0 1.3rem',
              borderRadius: 1,
              animation: 'tsi-line-reveal 0.85s 0.38s ease both',
            }}
          />

          {/* Subtitle */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.875rem, 2vw, 1.05rem)',
              color: 'var(--text-muted)',
              fontWeight: 400,
              lineHeight: 1.55,
              maxWidth: '42ch',
              margin: 0,
              animation: 'tsi-entrance 0.7s 0.52s ease both',
            }}
          >
            Classe Préparatoire — Technologie &amp; Sciences de l'Ingénieur
          </p>

          {/* Year badge + quick-access hint */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
              animation: 'tsi-entrance 0.7s 0.68s ease both',
              flexWrap: 'wrap',
            }}
          >
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.3rem 0.8rem',
              background: 'rgba(var(--accent-rgb), 0.07)',
              border: '1px solid rgba(var(--accent-rgb), 0.14)',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.16em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              <span style={{ color: 'var(--accent)', opacity: 0.75 }}>▸</span>
              2025 · 2027
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.3rem 0.8rem',
              background: 'rgba(var(--accent-warm-rgb), 0.06)',
              border: '1px solid rgba(var(--accent-warm-rgb), 0.12)',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              <span style={{ color: 'var(--accent-warm)', opacity: 0.75 }}>◆</span>
              TSI 1
            </div>

            {/* Dashboard Edit Toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.3rem 0.8rem',
                background: isEditMode ? 'var(--accent)' : 'var(--surface-2)',
                border: '1px solid',
                borderColor: isEditMode ? 'var(--accent)' : 'var(--border)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.05em',
                color: isEditMode ? 'white' : 'var(--text-muted)',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isEditMode ? <Save size={12} /> : <Settings2 size={12} />}
              {isEditMode ? 'Terminer' : 'Modifier l\'accueil'}
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          BODY
      ════════════════════════════════════════════════════ */}
      <div className="tsi-dot-grid">
        <div
          className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-6 sm:gap-12"
          style={{
            paddingTop: '2.75rem',
            paddingBottom: '5rem',
          }}
        >

          {/* ── DRAG & DROP DASHBOARD WIDGETS ────────────────────── */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgetOrder}
              strategy={verticalListSortingStrategy}
            >
              {widgetOrder.map(id => (
                <SortableItem key={id} id={id} isEditMode={isEditMode}>
                  {WIDGETS[id]}
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>

          {/* ── ADMIN PANEL ──────────────────────────────── */}
          {isAdminAuthenticated && (
            <section className="tsi-admin-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
                <Settings size={15} style={{ color: 'var(--accent)' }} />
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  margin: 0,
                }}>
                  Panel Administrateur
                </h2>
              </div>

              <div className="tsi-admin-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.875rem' }}>
                  <Plus size={13} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                    Ajouter une carte
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input className="tsi-input" type="text" placeholder="Titre" value={newCard.title} onChange={e => setNewCard({ ...newCard, title: e.target.value })} />
                  <input className="tsi-input" type="text" placeholder="Description" value={newCard.description} onChange={e => setNewCard({ ...newCard, description: e.target.value })} />
                  <input className="tsi-input" type="url" placeholder="URL" value={newCard.url} onChange={e => setNewCard({ ...newCard, url: e.target.value })} />
                  <select className="tsi-input" value={newCard.icon} onChange={e => setNewCard({ ...newCard, icon: e.target.value })}>
                    {Object.keys(iconMap).sort().map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button onClick={addCard} className="tsi-btn-primary" style={{ marginTop: '0.75rem' }}>
                  <Plus size={13} /> Ajouter
                </button>
              </div>

              <div className="tsi-admin-section" style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.875rem' }}>
                  <Megaphone size={13} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                    Bandeau d'annonce
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <textarea
                    className="tsi-input"
                    rows={2}
                    placeholder="Message d'annonce..."
                    value={editAnnouncement}
                    onChange={e => setEditAnnouncement(e.target.value)}
                    style={{ resize: 'vertical', width: '100%', padding: '0.5rem', borderRadius: '0.5rem' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={editAnnouncementActive}
                      onChange={e => setEditAnnouncementActive(e.target.checked)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                    />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text)' }}>
                      Activer l'annonce
                    </span>
                  </label>
                  <button onClick={saveAnnouncement} className="tsi-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    <Save size={13} /> Sauvegarder l'annonce
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ── FOOTER ───────────────────────────────────── */}
          <footer style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              lineHeight: 2,
              margin: 0,
            }}>
              TSI · MONGE · CHAMBÉRY — CPGE SCIENCES DE L'INGÉNIEUR
              <br />
              <span style={{ opacity: 0.5 }}>Développé par </span>
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>RUDY BERTHIER</span>
            </p>
          </footer>

        </div>
      </div >

      {/* ════════════════════════════════════════════════════
          MATH MODAL
      ════════════════════════════════════════════════════ */}
      {
        mathModal && createPortal(
          <div className="tsi-modal-overlay" onClick={() => setMathModal(false)}>
            <div className="tsi-modal w-[90%] sm:w-auto max-w-[400px] p-5 sm:p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div className="pr-4">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
                    Cours de mathématiques
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    Choisissez la version à ouvrir
                  </p>
                </div>
                <button
                  onClick={() => setMathModal(false)}
                  style={{ padding: '6px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
                <button
                  onClick={() => chooseMathSite(MODERN_MATH_URL)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '0.875rem 1rem',
                    background: 'rgba(var(--accent-rgb), 0.07)',
                    border: '1px solid rgba(var(--accent-rgb), 0.2)',
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Rocket size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>Site moderne</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Version intégrée à TSI Monge</div>
                  </div>
                </button>

                <button
                  onClick={() => chooseMathSite(ANCIEN_MATH_URL)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '0.875rem 1rem',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Globe size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>Ancien site</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>a-crida.toile-libre.org</div>
                  </div>
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '1rem', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={rememberMath}
                  onChange={e => setRememberMath(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Mémoriser ma décision
                </span>
              </label>

              <button
                onClick={() => setMathModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)', padding: 0 }}
              >
                Annuler
              </button>
            </div>
          </div>,
          document.body
        )
      }

      {/* ════════════════════════════════════════════════════
          EDIT CARD MODAL
      ════════════════════════════════════════════════════ */}
      {
        editingCard && createPortal(
          <div className="tsi-modal-overlay">
            <div className="tsi-modal">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.125rem' }}>
                <Edit size={14} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Modifier la carte
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <input className="tsi-input" type="text" placeholder="Titre" value={editingCard.title} onChange={e => setEditingCard({ ...editingCard, title: e.target.value })} />
                <input className="tsi-input" type="text" placeholder="Description" value={editingCard.description} onChange={e => setEditingCard({ ...editingCard, description: e.target.value })} />
                <input className="tsi-input" type="url" placeholder="URL" value={editingCard.url} onChange={e => setEditingCard({ ...editingCard, url: e.target.value })} />
                <select className="tsi-input" value={editingCard.icon} onChange={e => setEditingCard({ ...editingCard, icon: e.target.value })}>
                  {Object.keys(iconMap).sort().map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button onClick={saveEdit} className="tsi-btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Save size={13} /> Sauvegarder</button>
                <button onClick={cancelEdit} className="tsi-btn-ghost" style={{ flex: 1, justifyContent: 'center' }}><X size={13} /> Annuler</button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

    </div >
  )
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function IBtn({ children, onClick, disabled, title, accent, danger }) {
  const s = danger
    ? { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)', color: '#ef4444' }
    : accent
      ? { background: 'rgba(var(--accent-rgb),0.1)', borderColor: 'rgba(var(--accent-rgb),0.2)', color: 'var(--accent)' }
      : { background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        padding: '5px',
        borderRadius: 6,
        border: '1px solid',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.15s ease',
        ...s,
      }}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Widgets & Sortable
───────────────────────────────────────────────────────────── */
function SortableItem({ id, children, isEditMode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/widget">
      {/* Drag Handle — visible uniquement en mode édition */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-3 left-1/2 -translate-x-1/2 p-2 cursor-grab active:cursor-grabbing opacity-100 transition-opacity z-10"
        >
          <div className="bg-surface border border-border rounded-full p-1 shadow-sm text-text-muted hover:text-text hover:border-accent/40 transition-colors">
            <GripHorizontal size={16} />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

function ToolsWidget() {
  return (
    <section>
      <div className="tsi-section-label">
        <span>Accès rapide</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {NAV_ITEMS.map(({ href, label, Icon, color, badge }, i) => (
          <Link
            key={href}
            to={href}
            viewTransition
            className="tsi-tool-card relative"
            style={{
              '--tool-color': color,
              animationDelay: `${200 + i * 65}ms`,
            }}
          >
            {badge && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10 uppercase tracking-wider border-[1.5px] border-white dark:border-slate-900 animate-pulse">
                {badge}
              </span>
            )}
            {/* Colored icon box */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 0 0 1px ${color}22`,
            }}>
              <Icon size={22} style={{ color }} />
            </div>

            {/* Label */}
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text)',
              textAlign: 'center',
              lineHeight: 1.25,
            }}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ResourcesWidget({ links, iconMap, isAdminAuthenticated, mathPref, handleMathClick, setRememberMath, setMathModal, chooseMathSite, moveCardUp, moveCardDown, startEdit, deleteCard }) {
  return (
    <section>
      <div className="tsi-section-label">
        <span>Ressources &amp; Liens</span>
        <em>{links.length} liens</em>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {links.map((link, index) => {
          const Icon = iconMap[link.icon] || Globe
          const isMath = link.url === ANCIEN_MATH_URL

          return (
            <div
              key={link.id}
              className="relative group"
            >
              <a
                href={isMath ? undefined : link.url}
                target={isMath ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={isMath ? handleMathClick : undefined}
                className="tsi-resource-card"
                style={{ animationDelay: `${350 + index * 50}ms` }}
              >
                {/* Icon */}
                <div className="tsi-resource-icon">
                  <Icon size={18} style={{ color: 'var(--accent)' }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {link.title}
                    </span>
                    <ExternalLink
                      size={11}
                      style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }}
                    />
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: '0.2rem 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {link.description}
                  </p>
                </div>
              </a>

              {/* Math pref badge */}
              {isMath && mathPref && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setRememberMath(true); setMathModal(true) }}
                  title="Modifier le choix"
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px 3px 6px',
                    borderRadius: 20,
                    background: mathPref === MODERN_MATH_URL
                      ? 'rgba(var(--accent-rgb), 0.1)'
                      : 'rgba(var(--accent-warm-rgb), 0.08)',
                    border: mathPref === MODERN_MATH_URL
                      ? '1px solid rgba(var(--accent-rgb), 0.2)'
                      : '1px solid rgba(var(--accent-warm-rgb), 0.18)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.56rem',
                    letterSpacing: '0.06em',
                    color: mathPref === MODERN_MATH_URL ? 'var(--accent)' : 'var(--accent-warm)',
                    zIndex: 1,
                  }}
                >
                  <Edit size={9} />
                  {mathPref === MODERN_MATH_URL ? 'moderne' : 'ancien'}
                </button>
              )}

              {/* Admin controls */}
              {isAdminAuthenticated && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 right-2.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity"
                  style={{ zIndex: 2 }}
                >
                  <IBtn onClick={() => moveCardUp(index)} disabled={index === 0} title="Monter">   <ArrowUp size={11} /></IBtn>
                  <IBtn onClick={() => moveCardDown(index)} disabled={index === links.length - 1} title="Descendre"><ArrowDown size={11} /></IBtn>
                  <IBtn onClick={() => startEdit(link)} title="Modifier" accent><Edit size={11} /></IBtn>
                  <IBtn onClick={() => deleteCard(link.id)} title="Supprimer" danger><Trash2 size={11} /></IBtn>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//    Mini Weather Pill (hero section)
// ───────────────────────────────────────────────────────────── */
function MiniWeatherPill() {
  const weather = useWeatherCurrent()
  if (!weather?.current) return null

  const code = weather.current.weather_code
  const temp = Math.round(weather.current.temperature_2m)

  // Mini SVG icons for the pill
  const miniIcon = (c) => {
    if (c === 0 || c === 1) return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="6" fill="#FBBF24" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
          <line key={a} x1="16" y1="5" x2="16" y2="8" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 16 16)`} />
        ))}
      </svg>
    )
    if (c === 2 || c === 3) return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <ellipse cx="16" cy="18" rx="10" ry="6" fill="#94A3B8" />
        <ellipse cx="12" cy="15" rx="6" ry="5" fill="#CBD5E1" />
        <ellipse cx="20" cy="16" rx="5" ry="4" fill="#B0BEC5" />
      </svg>
    )
    if ([61, 63, 65, 80, 81, 82, 51, 53, 55, 66, 67].includes(c)) return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <ellipse cx="16" cy="12" rx="9" ry="5" fill="#94A3B8" />
        <ellipse cx="12" cy="10" rx="5" ry="4" fill="#CBD5E1" />
        {[[12, 22], [16, 24], [20, 22]].map(([x, y], i) => (
          <line key={i} x1={x} y1={y - 4} x2={x - 1} y2={y} stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </svg>
    )
    if ([71, 73, 75, 77, 85, 86].includes(c)) return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <ellipse cx="16" cy="12" rx="9" ry="5" fill="#CBD5E1" />
        <ellipse cx="12" cy="10" rx="5" ry="4" fill="#E2E8F0" />
        {[[12, 21], [16, 23], [20, 21]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}><line x1="0" y1="-2" x2="0" y2="2" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" /><line x1="-2" y1="0" x2="2" y2="0" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" /></g>
        ))}
      </svg>
    )
    if ([95, 96, 99].includes(c)) return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <ellipse cx="16" cy="10" rx="9" ry="5" fill="#64748B" />
        <polygon points="17,15 14,21 16.5,21 14.5,27 21,19 18,19 20,15" fill="#FBBF24" />
      </svg>
    )
    if ([45, 48].includes(c)) return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        {[10, 16, 22].map((y, i) => (
          <line key={i} x1={8 + i} y1={y} x2={24 - i} y2={y} stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity={0.5 + i * 0.15} />
        ))}
      </svg>
    )
    return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <ellipse cx="16" cy="18" rx="10" ry="6" fill="#94A3B8" />
        <ellipse cx="12" cy="15" rx="6" ry="5" fill="#CBD5E1" />
      </svg>
    )
  }

  return (
    <Link
      to="/meteo"
      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105 shrink-0"
      style={{
        background: 'rgba(var(--accent-rgb), 0.06)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(8px)',
        textDecoration: 'none',
        marginTop: '0.5rem',
      }}
      title="Voir la météo complète"
    >
      {miniIcon(code)}
      <span className="text-lg font-display font-bold" style={{ color: 'var(--text)' }}>{temp}°</span>
    </Link>
  )
}

function MiniNotesPill() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null

  return (
    <Link
      to="/notes"
      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105 shrink-0"
      style={{
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(8px)',
        textDecoration: 'none',
        marginTop: '0.5rem',
      }}
      title="Mes notes"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="#6366F1" strokeWidth="1.8" fill="rgba(99,102,241,0.1)" />
        <line x1="8" y1="8" x2="16" y2="8" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="12" x2="14" y2="12" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="16" x2="12" y2="16" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Notes</span>
    </Link>
  )
}

function MiniTransportPill() {
  const { getToken, userSettings } = useAuth()
  const [nextBus, setNextBus] = useState(null)
  
  useEffect(() => {
    const favorites = userSettings?.tsi_transit_favorites || []
    if (favorites.length === 0) return

    const fetchNext = async () => {
      try {
        const stopIds = [...new Set(favorites.map(f => f.stopId))].join(',')
        const res = await fetch(`/api/transit/chambery?stops=${stopIds}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        if (res.ok) {
          const d = await res.json()
          if (d.arrivals) {
            const myArrivals = d.arrivals.filter(a => 
              favorites.some(f => f.stopId === a.stop_id && f.routeId === a.route_id && f.headsign === a.headsign)
            )
            if (myArrivals.length > 0) {
              myArrivals.sort((a, b) => a.delay_minutes - b.delay_minutes)
              setNextBus(myArrivals[0])
            }
          }
        }
      } catch (err) {}
    }
    fetchNext()
    const int = setInterval(fetchNext, 60000)
    return () => clearInterval(int)
  }, [userSettings, getToken])

  if (!nextBus) return null

  const isImminent = nextBus.delay_minutes <= 5

  return (
    <Link
      to="/transport"
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:scale-105 shrink-0"
      style={{
        background: 'rgba(34, 197, 94, 0.08)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(8px)',
        textDecoration: 'none',
        marginTop: '0.2rem',
      }}
      title={`Prochain bus : ${nextBus.route_short_name} vers ${nextBus.headsign}`}
    >
      <div 
        className="w-5 h-5 flex items-center justify-center rounded-[6px] font-bold text-[10px]"
        style={{ backgroundColor: `#${nextBus.route_color || 'ccc'}`, color: `#${nextBus.route_text_color || 'fff'}` }}
      >
        {nextBus.route_short_name || 'Bus'}
      </div>
      <span className={`text-sm font-bold ${isImminent ? 'text-red-500 animate-pulse' : 'text-green-600 dark:text-green-400'}`}>
        {nextBus.delay_minutes <= 0 ? 'Là' : `${nextBus.delay_minutes}m`}
      </span>
    </Link>
  )
}
