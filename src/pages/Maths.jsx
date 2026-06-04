import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, FileText, BookOpen, ClipboardList, GraduationCap, ChevronDown, ChevronRight, ExternalLink, Calendar, PenTool, Loader2, TrendingUp, CheckCircle2, Circle, Search, X, Bookmark, BookmarkCheck } from 'lucide-react'

const BASE = 'https://a-crida.toile-libre.org'
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TABS = [
  { id: 'cours', label: 'Cours', icon: BookOpen },
  { id: 'evaluations', label: 'DS & DM', icon: ClipboardList },
  { id: 'interros', label: 'Interros & AP', icon: PenTool },
  { id: 'colles', label: 'Colles', icon: GraduationCap },
  { id: 'progression', label: 'Progression', icon: TrendingUp },
  { id: 'favoris', label: 'Favoris', icon: Bookmark },
]

// Couleurs par section
const SECTION_COLORS = {
  'Fonctions': 'blue',
  'Calculs': 'emerald',
  'Geometrie': 'violet',
  'Ensembles et raisonnements': 'amber',
  'Nombres complexes': 'rose',
  'Suites': 'cyan',
  'Algebre': 'orange',
}

const COLOR_MAP = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', dot: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700', dot: 'bg-violet-500' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700', dot: 'bg-rose-500' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700', dot: 'bg-cyan-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', dot: 'bg-orange-500' },
}

const FALLBACK_COLORS = ['blue', 'emerald', 'violet', 'amber', 'rose', 'cyan', 'orange']

function PdfLink({ href, children, variant = 'primary' }) {
  const cls = variant === 'primary'
    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'
    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${cls}`}>
      <FileText className="w-3.5 h-3.5" />
      {children}
    </a>
  )
}

function CategoryAccordion({ section, chapters, colorIndex, onToggleFav, isFav }) {
  const [open, setOpen] = useState(false)
  const colorKey = SECTION_COLORS[section] || FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length]
  const c = COLOR_MAP[colorKey] || COLOR_MAP.blue

  return (
    <div className="rounded-xl transition-all duration-200" style={{ background: 'var(--surface)', border: `1px solid ${open ? `rgba(var(--accent-rgb), 0.3)` : 'var(--border)'}` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 sm:p-4 text-left">
        <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
        <span className="flex-1 text-sm sm:text-base font-semibold" style={{ color: 'var(--text)' }}>
          {section}
        </span>
        <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>{chapters.length} ch.</span>
        {open ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
      </button>

      {open && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
          {chapters.map((ch, i) => {
            const saved = isFav?.('Cours', ch.title)
            return (
              <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-3 rounded-lg ${c.bg}`}>
                <span className={`flex-1 text-xs sm:text-sm font-medium ${c.text}`}>
                  {i + 1}. {ch.title}
                </span>
                <div className="flex items-center gap-2">
                  <PdfLink href={ch.cours}>Cours</PdfLink>
                  {ch.exercices && <PdfLink href={ch.exercices} variant="secondary">Exercices</PdfLink>}
                  <FavBtn saved={saved} onClick={() => onToggleFav?.({
                    kind: 'Cours', label: ch.title, sub: section,
                    links: [
                      ...(ch.cours ? [{ href: ch.cours, label: 'Cours', primary: true }] : []),
                      ...(ch.exercices ? [{ href: ch.exercices, label: 'Exercices', primary: false }] : []),
                    ]
                  })} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CoursTab({ data, onToggleFav, isFav }) {
  const sections = []
  for (const ch of data.cours) {
    let sec = sections.find(s => s.section === ch.section)
    if (!sec) { sec = { section: ch.section, chapters: [] }; sections.push(sec) }
    sec.chapters.push(ch)
  }

  if (sections.length === 0) {
    return <p className="text-center text-gray-400 dark:text-gray-500 py-8">Aucun cours disponible</p>
  }

  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <CategoryAccordion key={i} section={sec.section} chapters={sec.chapters} colorIndex={i} onToggleFav={onToggleFav} isFav={isFav} />
      ))}
    </div>
  )
}

function EvaluationsTab({ data, onToggleFav, isFav }) {
  const mkLinks = (d) => [
    ...(d.enonce ? [{ href: d.enonce, label: 'Énoncé', primary: true }] : []),
    ...(d.corrige ? [{ href: d.corrige, label: 'Corrigé', primary: false }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* DS */}
      {data.ds.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-red-500 rounded-full" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200">Devoirs Surveilles</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{data.ds.length} DS</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
            {data.ds.map(d => (
              <div key={d.num} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{d.title}</span>
                <div className="flex items-center flex-wrap gap-2">
                  {d.enonce && <PdfLink href={d.enonce}>Enoncé</PdfLink>}
                  {d.corrige && <PdfLink href={d.corrige} variant="secondary">Corrigé</PdfLink>}
                  <FavBtn saved={isFav?.('DS', d.title)} onClick={() => onToggleFav?.({ kind: 'DS', label: d.title, links: mkLinks(d) })} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DM */}
      {data.dm.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200">Devoirs Maison</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{data.dm.length} DM</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
            {data.dm.map(d => (
              <div key={d.num} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{d.title}</span>
                <div className="flex items-center flex-wrap gap-2">
                  {d.enonce && <PdfLink href={d.enonce}>Enoncé</PdfLink>}
                  {d.corrige && <PdfLink href={d.corrige} variant="secondary">Corrigé</PdfLink>}
                  <FavBtn saved={isFav?.('DM', d.title)} onClick={() => onToggleFav?.({ kind: 'DM', label: d.title, links: mkLinks(d) })} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


function APItem({ item, onToggleFav, isFav }) {
  const [open, setOpen] = useState(false)
  const saved = isFav?.('AP', item.title)
  const links = [
    { href: item.url, label: 'PDF', primary: true },
    ...(item.extras || []).map(ex => ({ href: ex.url, label: ex.label, primary: false })),
  ]
  return (
    <div className="rounded-xl transition-all duration-200" style={{ background: 'var(--surface)', border: `1px solid ${open ? 'rgba(16,185,129,0.35)' : 'var(--border)'}` }}>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-3 flex-1 text-left min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="flex-1 text-sm sm:text-base font-semibold truncate" style={{ color: 'var(--text)' }}>{item.title}</span>
          {open
            ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          }
        </button>
        <FavBtn saved={saved} onClick={() => onToggleFav?.({ kind: 'AP', label: item.title, links })} />
      </div>
      {open && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-wrap gap-2">
          <PdfLink href={item.url}>PDF</PdfLink>
          {item.extras?.map((ex, j) => (
            <PdfLink key={j} href={ex.url} variant="secondary">{ex.label}</PdfLink>
          ))}
        </div>
      )}
    </div>
  )
}

function InterrosTab({ data, onToggleFav, isFav }) {
  return (
    <div className="space-y-6">
      {/* Interros */}
      {data.interros.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-purple-500 rounded-full" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200">Interrogations</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{data.interros.length} interros</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.interros.map(interro => {
              const saved = isFav?.('Interro', interro.title)
              return (
                <div key={interro.num} className="relative flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all">
                  <a href={interro.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{interro.title}</span>
                  </a>
                  <FavBtn saved={saved} onClick={() => onToggleFav?.({ kind: 'Interro', label: interro.title, links: [{ href: interro.url, label: 'PDF', primary: true }] })} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AP */}
      {data.ap.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
            <h3 className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text)' }}>Accompagnement Personnalisé (AP)</h3>
            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{data.ap.length} fiches</span>
          </div>
          <div className="space-y-2">
            {data.ap.map((item, i) => (
              <APItem key={i} item={item} onToggleFav={onToggleFav} isFav={isFav} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CollesTab({ data }) {
  const colles = data.colles || {}

  return (
    <div className="space-y-4">
      {/* Planning annuel */}
      {colles.planning && (
        <a href={colles.planning} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-xl text-white transition-all" style={{ background: 'var(--accent)' }}>
          <Calendar className="w-5 h-5" />
          <div>
            <div className="font-semibold text-sm">Planning annuel des colles</div>
            <div className="text-xs opacity-80">Colloscope TSI1 2025-26</div>
          </div>
          <ExternalLink className="w-4 h-4 ml-auto opacity-70" />
        </a>
      )}

      {/* Programmes par semaine */}
      {colles.semaines?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200">Programmes par semaine</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {colles.semaines.map(w => (
              <a key={w.num} href={w.url} target="_blank" rel="noopener noreferrer"
                className="flex flex-col p-3 rounded-xl transition-all hover:shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">Semaine {w.num}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{w.dates}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Lien icolle */}
      {colles.icolleLien && (
        <a href={colles.icolleLien} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-white">iColle</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">Voir les colles en ligne</div>
          </div>
        </a>
      )}
    </div>
  )
}

const SECTION_ACCENT = {
  'Geometrie': '#7c3aed', 'Calculs': '#059669', 'Fonctions': '#2563eb',
  'Ensembles et raisonnements': '#d97706', 'Nombres complexes': '#e11d48',
  'Suites': '#0891b2', 'Algebre': '#ea580c',
}

function ProgressionTab({ data }) {
  const items = data.progression || []
  const courseSections = new Set((data.cours || []).map(c => c.section))

  if (items.length === 0) {
    return <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Progression non disponible.</p>
  }

  // Séparer les chapitres faits (section avec cours dispo) des chapitres à venir
  // On suppose que la progression est ordonnée : une fois qu'un chapitre "à venir" apparaît, les suivants aussi
  const doneItems = items.filter(ch => courseSections.has(ch.section))
  const upcomingItems = items.filter(ch => !courseSections.has(ch.section))

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* Chapitres faits */}
      {doneItems.length > 0 && (
        <div>
          <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Vus en cours — {doneItems.length} chapitre{doneItems.length > 1 ? 's' : ''}
            </span>
          </div>
          {doneItems.map((ch, i) => {
            const accent = SECTION_ACCENT[ch.section] || '#6b7280'
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-[11px] font-bold w-8 shrink-0 text-right" style={{ color: accent }}>{ch.roman}.</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ch.title}</span>
                  <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>{ch.subtitle}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Chapitres à venir */}
      {upcomingItems.length > 0 && (
        <div>
          <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <Circle className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              À venir — {upcomingItems.length} chapitre{upcomingItems.length > 1 ? 's' : ''}
            </span>
          </div>
          {upcomingItems.map((ch, i) => {
            const accent = SECTION_ACCENT[ch.section] || '#6b7280'
            const isLast = i === upcomingItems.length - 1
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 ${!isLast ? 'border-b' : ''}`}
                style={{ borderColor: 'var(--border)', opacity: 0.5 }}
              >
                <span className="text-[11px] font-bold w-8 shrink-0 text-right" style={{ color: accent }}>{ch.roman}.</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ch.title}</span>
                  <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>{ch.subtitle}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FavBtn({ saved, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="shrink-0 p-1 rounded-md transition-colors hover:opacity-70"
      title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      style={{ color: saved ? '#f59e0b' : 'var(--text-muted)' }}
    >
      {saved
        ? <BookmarkCheck className="w-4 h-4" />
        : <Bookmark className="w-4 h-4" />
      }
    </button>
  )
}

function FavoritesTab({ favorites, onToggleFav }) {
  const kindColor = {
    Cours: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    DS: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    DM: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
    Interro: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    AP: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  }

  if (favorites.length === 0) return (
    <div className="text-center py-12 space-y-3">
      <Bookmark className="w-10 h-10 mx-auto opacity-20" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun favori enregistré</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clique sur l'icône <Bookmark className="w-3 h-3 inline" /> à côté d'un cours, DS, DM ou interro.</p>
    </div>
  )

  return (
    <div className="space-y-2">
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{favorites.length} favori{favorites.length > 1 ? 's' : ''}</p>
      {favorites.map((fav, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${kindColor[fav.kind] || ''}`}>{fav.kind}</span>
            <p className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text)' }}>{fav.label}</p>
            {fav.sub && <p className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{fav.sub}</p>}
            <button
              onClick={() => onToggleFav(fav)}
              className="shrink-0 p-1 rounded-md transition-colors hover:opacity-70"
              title="Retirer des favoris"
              style={{ color: '#f59e0b' }}
            >
              <BookmarkCheck className="w-4 h-4" />
            </button>
          </div>
          {fav.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fav.links.map((l, j) => (
                <PdfLink key={j} href={l.href} variant={l.primary ? 'primary' : 'secondary'}>{l.label}</PdfLink>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SearchResults({ data, query }) {
  const q = query.toLowerCase()
  const results = []

    ; (data.cours || []).forEach(ch => {
      if (![ch.title, ch.section].some(s => s?.toLowerCase().includes(q))) return
      const links = []
      if (ch.cours) links.push({ href: ch.cours, label: 'Cours', primary: true })
      if (ch.exercices) links.push({ href: ch.exercices, label: 'Exercices', primary: false })
      results.push({ kind: 'Cours', label: ch.title, sub: ch.section, links })
    })
    ; (data.ds || []).forEach(d => {
      if (!d.title?.toLowerCase().includes(q)) return
      const links = []
      if (d.enonce) links.push({ href: d.enonce, label: 'Énoncé', primary: true })
      if (d.corrige) links.push({ href: d.corrige, label: 'Corrigé', primary: false })
      results.push({ kind: 'DS', label: d.title, links })
    })
    ; (data.dm || []).forEach(d => {
      if (!d.title?.toLowerCase().includes(q)) return
      const links = []
      if (d.enonce) links.push({ href: d.enonce, label: 'Énoncé', primary: true })
      if (d.corrige) links.push({ href: d.corrige, label: 'Corrigé', primary: false })
      results.push({ kind: 'DM', label: d.title, links })
    })
    ; (data.interros || []).forEach(interro => {
      if (!interro.title?.toLowerCase().includes(q)) return
      results.push({ kind: 'Interro', label: interro.title, links: [{ href: interro.url, label: 'PDF', primary: true }] })
    })
    ; (data.ap || []).forEach(item => {
      if (!item.title?.toLowerCase().includes(q)) return
      const links = [{ href: item.url, label: 'PDF', primary: true }]
        ; (item.extras || []).forEach(ex => links.push({ href: ex.url, label: ex.label, primary: false }))
      results.push({ kind: 'AP', label: item.title, links })
    })

  const kindColor = {
    Cours: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    DS: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    DM: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
    Interro: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    AP: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  }

  if (results.length === 0) return (
    <div className="text-center py-12 space-y-2">
      <Search className="w-8 h-8 mx-auto opacity-20" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun résultat pour « {query} »</p>
    </div>
  )

  return (
    <div className="space-y-2">
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{results.length} résultat{results.length > 1 ? 's' : ''}</p>
      {results.map((r, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Header row */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${kindColor[r.kind] || ''}`}>{r.kind}</span>
            <p className="text-sm font-medium truncate flex-1" style={{ color: 'var(--text)' }}>{r.label}</p>
            {r.sub && <p className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{r.sub}</p>}
          </div>
          {/* PDF links — all displayed */}
          {r.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {r.links.map((l, j) => (
                <PdfLink key={j} href={l.href} variant={l.primary ? 'primary' : 'secondary'}>{l.label}</PdfLink>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function Maths() {
  const { isAuthenticated, getToken } = useAuth()
  const [tab, setTab] = useState('cours')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('maths_favorites') || '[]') } catch { return [] }
  })

  // Charger les favoris depuis le serveur au montage
  useEffect(() => {
    if (!isAuthenticated) return
    fetch(`${API}/api/auth/maths-favorites`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFavorites(data)
          localStorage.setItem('maths_favorites', JSON.stringify(data))
        }
      })
      .catch(() => { }) // garder le localStorage en fallback
  }, [isAuthenticated])

  const toggleFavorite = (fav) => {
    setFavorites(prev => {
      const key = `${fav.kind}:${fav.label}`
      const exists = prev.some(f => `${f.kind}:${f.label}` === key)
      const next = exists
        ? prev.filter(f => `${f.kind}:${f.label}` !== key)
        : [...prev, fav]
      localStorage.setItem('maths_favorites', JSON.stringify(next))
      // Sync vers le serveur
      if (isAuthenticated) {
        fetch(`${API}/api/auth/maths-favorites`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ favorites: next })
        }).catch(() => { })
      }
      return next
    })
  }

  const isFavorite = (kind, label) => favorites.some(f => f.kind === kind && f.label === label)

  useEffect(() => {
    fetch(`${API}/api/maths`)
      .then(r => r.json())
      .then(d => {
        // Verifier qu'on a des donnees valides
        if (d.cours?.length > 0 || d.ds?.length > 0 || d.dm?.length > 0) {
          setData(d)
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const hasData = data && (data.cours?.length > 0 || data.ds?.length > 0 || data.progression?.length > 0)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/" className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: 'var(--text)' }}>Mathématiques</h1>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              TSI 1 - Lycée Monge 2025-26
              {data?.lastUpdated && (
                <span> · MAJ {new Date(data.lastUpdated).toLocaleDateString('fr-FR')}</span>
              )}
            </p>
          </div>
          <a href={BASE} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-xs flex items-center gap-1 transition-colors" style={{ color: 'var(--text-muted)' }}>
            Ancien site <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl overflow-x-auto scrollbar-hide" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            const isFavTab = t.id === 'favoris'
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center shrink-0 gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
                style={active
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { color: 'var(--text-muted)' }
                }
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t.label}
                {isFavTab && favorites.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                    style={{ background: active ? 'rgba(255,255,255,0.25)' : '#f59e0b', color: active ? '#fff' : '#fff' }}>
                    {favorites.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un cours, DS, DM, interro…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.875rem', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        )}

        {!loading && hasData && (
          <>
            {searchQuery.trim() ? (
              <SearchResults data={data} query={searchQuery.trim()} />
            ) : (
              <>
                {tab === 'progression' && <ProgressionTab data={data} />}
                {tab === 'cours' && <CoursTab data={data} onToggleFav={toggleFavorite} isFav={isFavorite} />}
                {tab === 'evaluations' && <EvaluationsTab data={data} onToggleFav={toggleFavorite} isFav={isFavorite} />}
                {tab === 'interros' && <InterrosTab data={data} onToggleFav={toggleFavorite} isFav={isFavorite} />}
                {tab === 'colles' && <CollesTab data={data} />}
                {tab === 'favoris' && <FavoritesTab favorites={favorites} onToggleFav={toggleFavorite} />}
              </>
            )}
          </>
        )}

        {!loading && !hasData && (
          <div className="text-center py-12 space-y-4">
            <p style={{ color: 'var(--text-muted)' }}>Les données ne sont pas encore disponibles.</p>
            <a href={`${BASE}/tsi1/tsi1.html`} target="_blank" rel="noopener noreferrer" className="tsi-btn-primary inline-flex">
              <ExternalLink className="w-4 h-4" />
              Voir l'ancien site
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
