import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FileText, Search, X, BookOpen, Calculator, Zap, Cog, Globe, PenTool } from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const MATIERES = [
  { id: 'maths',    label: 'Maths',        icon: Calculator, color: '#2563eb' },
  { id: 'physique', label: 'Physique',      icon: Zap,        color: '#059669' },
  { id: 'si',       label: 'SI',            icon: Cog,        color: '#d97706' },
  { id: 'info',     label: 'Info',          icon: BookOpen,   color: '#7c3aed' },
  { id: 'anglais',  label: 'Anglais',       icon: Globe,      color: '#db2777' },
  { id: 'francais', label: 'Français',      icon: PenTool,    color: '#0891b2' },
]

const CONCOURS = [
  {
    id: 'ccinp',
    name: 'CCINP',
    subtitle: 'ex-CCP · Concours Commun INP',
    accent: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.2)',
    site: 'https://www.ccinp.fr',
    annalesUrl: 'https://www.banquept.fr/annales.html',
    places: '~2 400 places',
    niveau: 'Accessible',
    niveauColor: '#16a34a',
    epreuves: [
      { matiere: 'maths',    label: 'Mathématiques' },
      { matiere: 'physique', label: 'Physique et Chimie' },
      { matiere: 'si',       label: 'Sciences Industrielles' },
      { matiere: 'anglais',  label: 'Anglais' },
      { matiere: 'francais', label: 'Français-LLCER' },
    ],
  },
  {
    id: 'centrale',
    name: 'Centrale-Supélec',
    subtitle: 'Filière TSI',
    accent: '#dc2626',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.2)',
    site: 'https://www.centralesupelec.fr',
    annalesUrl: 'https://www.concours-centrale-supelec.fr/Annales',
    places: '~800 places',
    niveau: 'Très sélectif',
    niveauColor: '#dc2626',
    epreuves: [
      { matiere: 'maths',    label: 'Mathématiques' },
      { matiere: 'si',       label: 'Sciences Industrielles' },
      { matiere: 'physique', label: 'Physique' },
      { matiere: 'info',     label: 'Informatique' },
      { matiere: 'anglais',  label: 'Anglais' },
      { matiere: 'francais', label: 'Français-LLCER' },
    ],
  },
  {
    id: 'mines',
    name: 'Mines-Ponts',
    subtitle: 'ex-Mines-Telecom · Filière TSI',
    accent: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
    site: 'https://www.concoursminesponts.fr',
    annalesUrl: 'https://www.concoursminesponts.fr/page-7/',
    places: '~600 places',
    niveau: 'Très sélectif',
    niveauColor: '#dc2626',
    epreuves: [
      { matiere: 'maths',    label: 'Mathématiques' },
      { matiere: 'physique', label: 'Physique' },
      { matiere: 'si',       label: 'Sciences Industrielles' },
      { matiere: 'info',     label: 'Informatique' },
      { matiere: 'anglais',  label: 'Anglais' },
      { matiere: 'francais', label: 'Français-LLCER' },
    ],
  },
  {
    id: 'e3a',
    name: 'E3A-Polytech',
    subtitle: 'Filière TSI',
    accent: '#0891b2',
    bg: 'rgba(8,145,178,0.08)',
    border: 'rgba(8,145,178,0.2)',
    site: 'https://www.e3a-polytech.fr',
    annalesUrl: 'https://www.e3a-polytech.fr/annales/',
    places: '~1 800 places',
    niveau: 'Accessible',
    niveauColor: '#16a34a',
    epreuves: [
      { matiere: 'maths',    label: 'Mathématiques' },
      { matiere: 'physique', label: 'Physique-Chimie' },
      { matiere: 'si',       label: 'Sciences Industrielles' },
      { matiere: 'anglais',  label: 'Anglais' },
      { matiere: 'francais', label: 'Français-LLCER' },
    ],
  },
]

const RESSOURCES = [
  {
    label: 'UPSTI',
    desc: 'Ressources pédagogiques TSI (cours, annales, TIPE)',
    url: 'https://www.upsti.fr',
    color: '#2563eb',
  },
  {
    label: 'La Banque des épreuves',
    desc: 'Annales officielles CCINP (ex-CCP) en ligne',
    url: 'https://www.banquept.fr',
    color: '#059669',
  },
  {
    label: 'Concours CCINP',
    desc: 'Site officiel — résultats, annales, inscriptions',
    url: 'https://www.ccinp.fr',
    color: '#2563eb',
  },
  {
    label: 'Centrale-Supélec',
    desc: 'Site officiel — annales et résultats',
    url: 'https://www.centralesupelec.fr',
    color: '#dc2626',
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function MatiereChip({ matiere, active, onClick }) {
  const Icon = matiere.icon
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
      style={active
        ? { background: matiere.color, color: '#fff', border: `1px solid ${matiere.color}` }
        : { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
      }
    >
      <Icon className="w-3 h-3" />
      {matiere.label}
    </button>
  )
}

function ConcoursCard({ concours, activeMatieres, searchQuery }) {
  const [open, setOpen] = useState(false)

  const epreuvesFiltrees = concours.epreuves.filter(ep => {
    const matchMatiere = activeMatieres.length === 0 || activeMatieres.includes(ep.matiere)
    const matchSearch = !searchQuery || ep.label.toLowerCase().includes(searchQuery.toLowerCase())
    return matchMatiere && matchSearch
  })

  // Si filtre actif et aucune épreuve ne correspond, ne pas afficher la carte
  if ((activeMatieres.length > 0 || searchQuery) && epreuvesFiltrees.length === 0) return null

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: 'var(--surface)', border: `1px solid ${open ? concours.border : 'var(--border)'}`, boxShadow: open ? `0 4px 20px ${concours.accent}18` : 'var(--shadow-card)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        {/* Color dot */}
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: concours.accent }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold" style={{ color: 'var(--text)' }}>{concours.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: concours.bg, color: concours.accent, border: `1px solid ${concours.border}` }}>
              {concours.places}
            </span>
            <span className="text-xs font-semibold" style={{ color: concours.niveauColor }}>
              {concours.niveau}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{concours.subtitle}</p>
        </div>

        {/* Épreuves count + arrow */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{concours.epreuves.length} épreuves</span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-200"
            style={{ background: 'var(--surface-2)', transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }} />
            </svg>
          </div>
        </div>
      </button>

      {/* Epreuves */}
      {open && (
        <div style={{ borderTop: `1px solid ${concours.border}` }}>
          <div className="p-4 space-y-2">
            {(epreuvesFiltrees.length > 0 ? epreuvesFiltrees : concours.epreuves).map((ep, i) => {
              const mat = MATIERES.find(m => m.id === ep.matiere)
              const Icon = mat?.icon || FileText
              const isFiltered = activeMatieres.length > 0 && !activeMatieres.includes(ep.matiere)
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl transition-opacity"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    opacity: isFiltered ? 0.35 : 1,
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: mat?.color || 'var(--text-muted)' }} />
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{ep.label}</span>
                  <a
                    href={concours.annalesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: concours.bg, color: concours.accent, border: `1px solid ${concours.border}` }}
                  >
                    <FileText className="w-3 h-3" />
                    Annales
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                </div>
              )
            })}
          </div>

          {/* Footer with site link */}
          <div className="px-4 pb-4">
            <a
              href={concours.site}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: concours.accent, color: '#fff' }}
            >
              Site officiel {concours.name}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Annales() {
  const [activeMatieres, setActiveMatieres] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  const toggleMatiere = (id) => {
    setActiveMatieres(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const hasFilter = activeMatieres.length > 0 || searchQuery

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/countdown" className="p-2 rounded-xl transition-colors" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Annales concours</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>CCINP · Centrale · Mines-Ponts · E3A — Filière TSI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Barre de recherche */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une épreuve…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.875rem', color: 'var(--text)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtres matières */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Filtrer par matière</p>
            {activeMatieres.length > 0 && (
              <button onClick={() => setActiveMatieres([])} className="text-xs" style={{ color: 'var(--accent)' }}>
                Tout afficher
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {MATIERES.map(m => (
              <MatiereChip
                key={m.id}
                matiere={m}
                active={activeMatieres.includes(m.id)}
                onClick={() => toggleMatiere(m.id)}
              />
            ))}
          </div>
        </div>

        {/* Concours */}
        <div className="space-y-3">
          {hasFilter && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {activeMatieres.length > 0 && `Filtré : ${activeMatieres.map(id => MATIERES.find(m => m.id === id)?.label).join(', ')}`}
            </p>
          )}
          {CONCOURS.map(c => (
            <ConcoursCard
              key={c.id}
              concours={c}
              activeMatieres={activeMatieres}
              searchQuery={searchQuery}
            />
          ))}
        </div>

        {/* Ressources utiles */}
        <div>
          <div className="tsi-section-label mb-3">
            <span>Ressources utiles</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RESSOURCES.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl transition-all hover:shadow-md group"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${r.color}18`, border: `1px solid ${r.color}30` }}>
                  <ExternalLink className="w-4 h-4" style={{ color: r.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.label}</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
