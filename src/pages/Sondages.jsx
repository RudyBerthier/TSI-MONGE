import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, Plus, Trash2, X, Check, Lock, Unlock, LogIn, Settings, Ghost } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Sondages() {
  const { user, isAuthenticated, getToken } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [sondages, setSondages] = useState([])
  const [loading, setLoading] = useState(true)
  const [votedIds, setVotedIds] = useState({})
  // Nouveau sondage
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newOptions, setNewOptions] = useState(['', ''])

  const loadSondages = () => {
    fetch('/api/sondages')
      .then(res => res.json())
      .then(data => { setSondages(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const [anonMode, setAnonMode] = useState({})

  // Charger les votes de l'utilisateur connecté
  const loadUserVotes = () => {
    const token = getToken()
    if (!token) return
    fetch('/api/sondages/my-votes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.votes) setVotedIds(data.votes)
        if (data.anonVotes) {
          // Si l'utilisateur a voté anonymement dans le passé, on restaure la case à cocher
          setAnonMode(prev => ({ ...prev, ...data.anonVotes }))
        }
      })
      .catch(err => console.error('Error loading votes:', err))
  }

  useEffect(() => {
    loadSondages()
    loadUserVotes()
  }, [isAuthenticated])

  // Voter ou changer de vote (par compte utilisateur)
  const handleVote = (sondageId, option) => {
    if (!isAuthenticated) return
    const previousVote = votedIds[sondageId]
    if (previousVote === option) return

    fetch(`/api/sondages/${sondageId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ option, isAnonymous: anonMode[sondageId] || false })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setVotedIds(prev => ({ ...prev, [sondageId]: result.userVote }))
          setSondages(prev => prev.map(s =>
            s.id === sondageId ? { ...s, votes: result.votes, voters: result.voters } : s
          ))
        }
      })
  }

  const createSondage = () => {
    const filteredOptions = newOptions.filter(o => o.trim())
    if (!newTitle.trim() || filteredOptions.length < 2) {
      alert('Il faut un titre et au moins 2 options')
      return
    }
    fetch('/api/sondages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ title: newTitle, description: newDesc, options: filteredOptions })
    })
      .then(res => res.json())
      .then(() => {
        setNewTitle('')
        setNewDesc('')
        setNewOptions(['', ''])
        setShowForm(false)
        loadSondages()
      })
  }

  const deleteSondage = (id) => {
    if (!confirm('Supprimer ce sondage ?')) return
    fetch(`/api/sondages/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    }).then(() => loadSondages())
  }

  const toggleSondage = (id) => {
    fetch(`/api/sondages/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    }).then(() => loadSondages())
  }

  const addOption = () => setNewOptions([...newOptions, ''])
  const removeOption = (i) => {
    if (newOptions.length <= 2) return
    setNewOptions(newOptions.filter((_, idx) => idx !== i))
  }
  const updateOption = (i, val) => {
    const copy = [...newOptions]
    copy[i] = val
    setNewOptions(copy)
  }

  // Calculs pour un sondage
  const totalVotes = (s) => Object.values(s.votes).reduce((a, b) => a + b, 0)
  const percent = (s, opt) => {
    const total = totalVotes(s)
    return total === 0 ? 0 : Math.round((s.votes[opt] / total) * 100)
  }
  const maxVotes = (s) => Math.max(...Object.values(s.votes))

  const actifs = sondages.filter(s => s.active)
  const termines = sondages.filter(s => !s.active)

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="animate-pulse text-lg" style={{ color: 'var(--text-muted)' }}>Chargement des sondages...</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <Link to="/" className="transition-colors p-1" style={{ color: 'var(--accent)' }}>
              <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <BarChart3 size={22} className="hidden sm:block" style={{ color: 'var(--accent)' }} />
                Sondages
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                {actifs.length} actif{actifs.length > 1 ? 's' : ''} — {termines.length} terminé{termines.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-4">
        {!isAuthenticated && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
                <LogIn size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Connectez-vous pour voter aux sondages.
              </p>
              <div className="flex gap-2 justify-center">
                <Link to="/login" className="tsi-btn-primary text-sm">
                  <LogIn size={16} />
                  Connexion
                </Link>
                <Link to="/register" className="tsi-btn-ghost text-sm">
                  S'inscrire
                </Link>
              </div>
            </div>
          </div>
        )}

        {sondages.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <BarChart3 size={48} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            <p style={{ color: 'var(--text-muted)' }}>Aucun sondage pour le moment</p>
          </div>
        )}

        {/* Sondages actifs */}
        {actifs.map(s => {
          const voted = votedIds[s.id]
          const total = totalVotes(s)
          const max = maxVotes(s)

          return (
            <div key={s.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    {s.title}
                    {s.isAnonymous && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"><Ghost size={10} /> Anonyme</span>}
                  </h3>
                  {isAdmin && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => toggleSondage(s.id)} className="text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 p-1" title="Fermer">
                        <Lock size={16} />
                      </button>
                      <button onClick={() => deleteSondage(s.id)} className="text-red-500 hover:text-red-600 dark:text-red-400 p-1" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {s.description && <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{s.description}</p>}

                <div className="space-y-2">
                  {s.options.map(opt => {
                    const pct = percent(s, opt)
                    const isMax = s.votes[opt] === max && max > 0
                    const isMyVote = voted === opt
                    const optionVoters = s.voters?.[opt] || []

                    return (
                      <div key={opt}>
                        <button
                          onClick={() => isAuthenticated && handleVote(s.id, opt)}
                          disabled={!isAuthenticated || isMyVote}
                          className="w-full text-left rounded-xl p-2.5 sm:p-3 transition-all relative overflow-hidden"
                          style={{
                            border: `2px solid ${isMyVote ? 'var(--accent)' : 'var(--border)'}`,
                            cursor: !isAuthenticated || isMyVote ? 'default' : 'pointer',
                            opacity: !isAuthenticated ? 0.8 : 1,
                          }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 transition-all duration-500 rounded-xl"
                            style={{ width: `${pct}%`, background: isMax ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--surface-2)' }}
                          />
                          <div className="relative flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isMyVote && <Check size={16} className="shrink-0" style={{ color: 'var(--accent)' }} />}
                              <span className="text-sm sm:text-base truncate" style={{ color: isMyVote ? 'var(--accent)' : 'var(--text)', fontWeight: isMyVote ? 600 : 400 }}>
                                {opt}
                              </span>
                            </div>
                            <span className="text-xs sm:text-sm shrink-0" style={{ color: isMax && total > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isMax && total > 0 ? 700 : 400 }}>
                              {pct}% <span style={{ color: 'var(--text-muted)' }}>({s.votes[opt]})</span>
                            </span>
                          </div>
                        </button>

                        {/* Avatars des votants */}
                        {optionVoters.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 ml-2 flex-wrap">
                            {optionVoters.slice(0, 8).map(v => {
                              const isGhost = v.username === 'Anonyme' && !v.avatar;
                              const content = v.avatar ? (
                                <img src={`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')}${v.avatar}`} alt="" className="w-full h-full object-cover" />
                              ) : v.google_avatar ? (
                                <img src={v.google_avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
                                  {isGhost ? <Ghost size={12} /> : (v.username?.[0]?.toUpperCase() || '?')}
                                </div>
                              );

                              const className = "w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shrink-0 hover:opacity-80 transition-opacity";

                              return isGhost ? (
                                <div key={v.id} className={className} title="Anonyme">
                                  {content}
                                </div>
                              ) : (
                                <Link key={v.id} to={`/social/user/${v.username}`} className={className} title={v.username}>
                                  {content}
                                </Link>
                              );
                            })}
                            {optionVoters.length > 8 && (
                              <span className="text-[10px] text-gray-400 ml-1">+{optionVoters.length - 8}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Option for Individual Anonymity Toggle Before Voting */}
                {isAuthenticated && !voted && total === 0 && (
                  <div className="mt-4 flex justify-end">
                    <label
                      className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border border-gray-200 dark:border-slate-700"
                      style={{ width: 'fit-content' }}
                      title="Masquer votre pseudo et photo de profil pour ce vote"
                    >
                      <input
                        type="checkbox"
                        checked={anonMode[s.id] || false}
                        onChange={(e) => setAnonMode(prev => ({ ...prev, [s.id]: e.target.checked }))}
                        className="checkbox checkbox-xs checkbox-primary rounded"
                      />
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        <Ghost size={14} className={anonMode[s.id] ? "text-indigo-500" : "text-gray-400"} />
                        Voter de manière anonyme
                      </div>
                    </label>
                  </div>
                )}
                {isAuthenticated && voted && anonMode[s.id] && (
                  <div className="mt-3 flex justify-end">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                      <Ghost size={12} />
                      Vous avez voté anonymement
                    </div>
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{total} vote{total > 1 ? 's' : ''}</span>
                  {voted && <span style={{ color: 'var(--accent)' }}>Vous avez voté</span>}
                  {!isAuthenticated && (
                    <Link to="/login" className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                      <LogIn size={12} />
                      Connectez-vous pour voter
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Sondages terminés */}
        {termines.length > 0 && (
          <>
            <div className="pt-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Terminés</h2>
            </div>
            {termines.map(s => {
              const total = totalVotes(s)
              const max = maxVotes(s)

              return (
                <div key={s.id} className="rounded-2xl overflow-hidden opacity-75" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        {s.title}
                        {s.isAnonymous && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100/50 text-indigo-700/70 dark:bg-indigo-900/10 dark:text-indigo-300/50 border border-indigo-200/50 dark:border-indigo-800/30"><Ghost size={10} /> Anonyme</span>}
                      </h3>
                      {isAdmin && (
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => toggleSondage(s.id)} className="text-green-500 hover:text-green-600 dark:text-green-400 p-1" title="Réouvrir">
                            <Unlock size={16} />
                          </button>
                          <button onClick={() => deleteSondage(s.id)} className="text-red-500 hover:text-red-600 dark:text-red-400 p-1" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {s.options.map(opt => {
                        const pct = percent(s, opt)
                        const isMax = s.votes[opt] === max && max > 0
                        const optionVoters = s.voters?.[opt] || []

                        return (
                          <div key={opt}>
                            <div className="rounded-lg p-2 relative overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                              <div
                                className="absolute inset-y-0 left-0"
                                style={{ width: `${pct}%`, background: isMax ? 'rgba(var(--accent-rgb), 0.07)' : 'var(--surface-2)' }}
                              />
                              <div className="relative flex items-center justify-between gap-2">
                                <span className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{opt}</span>
                                <span className="text-xs shrink-0" style={{ color: isMax ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isMax ? 700 : 400 }}>
                                  {pct}% ({s.votes[opt]})
                                </span>
                              </div>
                            </div>
                            {optionVoters.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 ml-2 flex-wrap">
                                {optionVoters.slice(0, 8).map(v => {
                                  const content = v.avatar ? (
                                    <img src={`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')}${v.avatar}`} alt="" className="w-full h-full object-cover" />
                                  ) : v.google_avatar ? (
                                    <img src={v.google_avatar} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[8px] font-bold">
                                      {s.isAnonymous ? <Ghost size={10} /> : (v.username?.[0]?.toUpperCase() || '?')}
                                    </div>
                                  );

                                  const className = "w-5 h-5 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shrink-0 hover:opacity-80 transition-opacity";

                                  return s.isAnonymous ? (
                                    <div key={v.id} className={className} title="Anonyme">
                                      {content}
                                    </div>
                                  ) : (
                                    <Link key={v.id} to={`/social/user/${v.username}`} className={className} title={v.username}>
                                      {content}
                                    </Link>
                                  );
                                })}
                                {optionVoters.length > 8 && (
                                  <span className="text-[10px] text-gray-400 ml-1">+{optionVoters.length - 8}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <p className="mt-2 text-xs text-gray-400">{total} vote{total > 1 ? 's' : ''} — Terminé</p>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Admin — Formulaire nouveau sondage */}
        {isAdmin && (
          <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--surface)', border: '2px solid rgba(var(--accent-rgb), 0.3)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Settings size={18} className="shrink-0" />
                Administration
              </h2>
              {!showForm && (
                <button onClick={() => setShowForm(true)} className="tsi-btn-primary text-xs sm:text-sm py-1.5 px-3 sm:px-4 shrink-0">
                  <Plus size={14} />
                  <span className="hidden sm:inline">Nouveau sondage</span>
                  <span className="sm:hidden">Nouveau</span>
                </button>
              )}
            </div>

            {showForm && (
              <div className="space-y-3">
                <input type="text" placeholder="Titre du sondage" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="tsi-input" />
                <input type="text" placeholder="Description (optionnel)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="tsi-input" />

                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Options :</p>
                  {newOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => updateOption(i, e.target.value)} className="tsi-input flex-1" />
                      {newOptions.length > 2 && (
                        <button onClick={() => removeOption(i)} className="p-1 text-red-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addOption} className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    <Plus size={14} /> Ajouter une option
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={createSondage} className="tsi-btn-primary text-sm py-1.5 px-4">
                    <Check size={14} />
                    Créer
                  </button>
                  <button onClick={() => { setShowForm(false); setNewTitle(''); setNewDesc(''); setNewOptions(['', '']); setNewIsAnonymous(false) }} className="tsi-btn-ghost text-sm py-1.5 px-4">
                    Annuler
                  </button>
                </div>
              </div>
            )}
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

