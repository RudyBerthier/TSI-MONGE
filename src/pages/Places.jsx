import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Calendar, Users, Edit, Save, X, Settings, RotateCcw, MapPin, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Places() {
  const { user, getToken } = useAuth()
  const isAuthenticated = user?.role === 'admin'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [highlightedSeats, setHighlightedSeats] = useState([])
  const [classId, setClassId] = useState('tsi1')

  // Admin state
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState(null)
  const [editStartDate, setEditStartDate] = useState('')

  // Charger les données
  const loadData = () => {
    setLoading(true)
    fetch(`/api/places/${classId}`)
      .then(res => res.json())
      .then(result => {
        setData(result)
        setEditStartDate(result.startDate)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [classId])

  // Recherche — surligne TOUS les résultats correspondants
  const handleSearch = (name) => {
    setSearchName(name)
    if (!name.trim() || !data) {
      setHighlightedSeats([])
      return
    }
    const lower = name.toLowerCase()
    const layout = data.layout
    const matches = []
    for (const section of ['left', 'center', 'right']) {
      for (let row = 0; row < layout[section].length; row++) {
        for (let pos = 0; pos < layout[section][row].length; pos++) {
          if (layout[section][row][pos] && layout[section][row][pos].toLowerCase().includes(lower)) {
            matches.push({ section, row, pos, name: layout[section][row][pos] })
          }
        }
      }
    }
    setHighlightedSeats(matches)
  }

  const isHighlighted = (section, row, pos) => {
    return highlightedSeats.some(s => s.section === section && s.row === row && s.pos === pos)
  }

  const sectionLabel = (s) => s === 'left' ? 'gauche' : s === 'right' ? 'droite' : 'centre'

  const startEdit = () => {
    fetch(`/api/places/${classId}/base`)
      .then(res => res.json())
      .then(result => {
        setEditData(JSON.parse(JSON.stringify(result.layout)))
        setEditStartDate(result.startDate)
        setEditMode(true)
      })
  }

  const saveEdit = () => {
    fetch(`/api/places/${classId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ layout: editData, startDate: editStartDate })
    })
      .then(res => res.json())
      .then(() => {
        setEditMode(false)
        setEditData(null)
        loadData()
      })
  }

  const updateSeatName = (section, row, pos, name) => {
    const newData = JSON.parse(JSON.stringify(editData))
    newData[section][row][pos] = name
    setEditData(newData)
  }

  // Calcul prochaine rotation (lundi prochain)
  const getNextMonday = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? 1 : 8 - day
    const next = new Date(now)
    next.setDate(now.getDate() + diff)
    return next.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Compter les places occupées
  const countOccupied = () => {
    if (!data) return 0
    let count = 0
    for (const section of ['left', 'center', 'right']) {
      for (const row of data.layout[section]) {
        for (const seat of row) {
          if (seat && seat.trim()) count++
        }
      }
    }
    return count
  }

  // Taille des sièges — assez petit sur mobile pour éviter le scroll horizontal
  const seatClass = 'w-[40px] min-h-[30px] sm:w-[72px] sm:min-h-[44px] md:w-24 md:min-h-[48px]'
  const seatText = 'text-[6px] sm:text-[11px] md:text-sm leading-tight'

  // Rendu d'un siège
  const renderSeat = (section, rowIdx, pos) => {
    if (editMode && editData) {
      const val = editData[section]?.[rowIdx]?.[pos] || ''
      return (
        <input
          key={`${section}-${rowIdx}-${pos}`}
          type="text"
          value={val}
          onChange={(e) => updateSeatName(section, rowIdx, pos, e.target.value)}
          placeholder="Nom"
          className={`${seatClass} ${seatText} text-center border-2 border-blue-300 rounded-md sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 px-0`}
        />
      )
    }

    const name = data?.layout?.[section]?.[rowIdx]?.[pos] || ''
    const highlighted = isHighlighted(section, rowIdx, pos)
    const empty = !name.trim()

    return (
      <div
        key={`${section}-${rowIdx}-${pos}`}
        className={`${seatClass} ${seatText} flex items-center justify-center font-medium rounded-md sm:rounded-lg border-2 transition-all duration-300 select-none`}
        style={highlighted
          ? { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }
          : empty
            ? { background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }
            : { background: 'rgba(var(--accent-rgb), 0.06)', borderColor: 'rgba(var(--accent-rgb), 0.2)', color: 'var(--text)' }
        }
      >
        <span className="px-px text-center break-words overflow-hidden">{empty ? '—' : name}</span>
      </div>
    )
  }

  // Rendu d'une rangée
  const renderRow = (rowIdx) => {
    const hasCenter = rowIdx < 4

    return (
      <div key={rowIdx} className="flex items-center justify-center gap-px sm:gap-1.5 md:gap-2 mb-1 sm:mb-2.5">
        {/* Gauche */}
        <div className="flex gap-px sm:gap-1">
          {[0, 1].map(pos => renderSeat('left', rowIdx, pos))}
        </div>

        <div className="w-1 sm:w-3 md:w-5 shrink-0" />

        {/* Centre */}
        {hasCenter ? (
          <div className="flex gap-px sm:gap-1">
            {[0, 1, 2, 3].map(pos => renderSeat('center', rowIdx, pos))}
          </div>
        ) : (
          <div className="flex gap-px sm:gap-1 invisible">
            {[0, 1, 2, 3].map(pos => (
              <div key={pos} className={seatClass} />
            ))}
          </div>
        )}

        <div className="w-1 sm:w-3 md:w-5 shrink-0" />

        {/* Droite */}
        <div className="flex gap-px sm:gap-1">
          {[0, 1].map(pos => renderSeat('right', rowIdx, pos))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="animate-pulse text-lg" style={{ color: 'var(--text-muted)' }}>Chargement du plan de classe...</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="transition-colors p-1" style={{ color: 'var(--accent)' }}>
                <ArrowLeft size={22} />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <MapPin size={22} className="hidden sm:block" style={{ color: 'var(--accent)' }} />
                  Plan de Classe
                </h1>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                  Semaine {data?.currentWeek || 0} — Depuis le {data?.startDate ? new Date(data.startDate).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
            </div>

            <div className="relative">
              <select
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setEditMode(false) }}
                className="appearance-none font-bold pl-3 pr-8 py-2 rounded-xl text-sm cursor-pointer focus:outline-none"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <option value="tsi1">TSI 1</option>
                <option value="tsi2">TSI 2</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
        <div className="mb-6 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Chercher votre nom..."
              value={searchName}
              onChange={(e) => handleSearch(e.target.value)}
              className="tsi-input pl-10"
            />
          </div>
          {searchName && highlightedSeats.length === 0 && (
            <p className="text-red-500 text-xs mt-1.5 text-center">Nom non trouvé</p>
          )}
        </div>

        {/* Mode édition banner */}
        {editMode && (
          <div className="mb-4 bg-yellow-100 border-2 border-yellow-300 rounded-xl p-3 text-center">
            <p className="text-yellow-800 font-medium text-sm">
              Mode édition — Disposition de base (semaine 0)
            </p>
          </div>
        )}

        <div className="rounded-2xl p-3 sm:p-6 md:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-center py-2 sm:py-3 rounded-xl mb-4 sm:mb-6" style={{ background: 'rgba(var(--accent-rgb), 0.06)', border: '2px solid rgba(var(--accent-rgb), 0.15)' }}>
            <span className="font-semibold text-[10px] sm:text-sm tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Tableau</span>
          </div>

          {/* Places */}
          <div className="flex flex-col items-center">
            {[0, 1, 2, 3, 4].map(rowIdx => renderRow(rowIdx))}
          </div>

          {/* Légende */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-6 text-[9px] sm:text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-slate-700" /> Occupé
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600" /> Libre
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-amber-200 border border-amber-400" /> Recherche
            </span>
          </div>
        </div>

        {/* Infos */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Calendar className="shrink-0" style={{ color: 'var(--accent)' }} size={20} />
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Semaine actuelle</div>
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{data?.currentWeek || 0}</div>
            </div>
          </div>
          <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <RotateCcw className="shrink-0" style={{ color: 'var(--accent)' }} size={20} />
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Prochaine rotation</div>
              <div className="font-bold text-gray-800 dark:text-white text-sm capitalize">{getNextMonday()}</div>
            </div>
          </div>
          <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Users className="shrink-0" style={{ color: 'var(--accent)' }} size={20} />
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Places occupées</div>
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{countOccupied()} / 36</div>
            </div>
          </div>
        </div>

        {/* Admin Panel */}
        {isAuthenticated && (
          <div className="mt-6 rounded-2xl p-4 sm:p-5" style={{ background: 'var(--surface)', border: '2px solid rgba(var(--accent-rgb), 0.3)', boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Settings size={18} className="shrink-0" />
              Administration des places
            </h2>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Date de début :</label>
                <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} disabled={!editMode} className="tsi-input text-sm py-1.5 disabled:opacity-60" />
              </div>

              {!editMode ? (
                <button onClick={startEdit} className="tsi-btn-primary text-sm py-1.5 px-4" style={{ background: '#d97706' }}>
                  <Edit size={14} />
                  Modifier les noms
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="tsi-btn-primary text-sm py-1.5 px-4" style={{ background: '#059669' }}>
                    <Save size={14} />
                    Sauvegarder
                  </button>
                  <button onClick={() => { setEditMode(false); setEditData(null) }} className="tsi-btn-ghost text-sm py-1.5 px-4">
                    <X size={14} />
                    Annuler
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Les places tournent automatiquement chaque semaine (un rang vers l'avant). En mode édition, vous modifiez la disposition de base (semaine 0). La rotation est calculée automatiquement depuis la date de début.
            </p>
          </div>
        )}
      </div>

      <div className="text-center py-6">
        <Link to="/" className="text-sm font-medium transition-colors" style={{ color: 'var(--accent)' }}>
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
