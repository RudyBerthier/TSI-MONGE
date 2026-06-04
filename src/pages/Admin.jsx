import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authAPI, settingsAPI, adminLogsAPI } from '../services/api'
import {
  ArrowLeft, Shield, BarChart3, Activity, Users, Settings,
  Search, Filter, Trash2, ChevronLeft, ChevronRight,
  UserPlus, Edit3, X, Save, Clock, User, Hash, AlertTriangle,
  RefreshCw, CheckCircle, Mail, ShieldAlert
} from 'lucide-react'
import { VerifiedBadge } from '../components/VerifiedBadge'
import AdminBugReports from './admin/AdminBugReports'

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'logs', label: 'Logs', icon: Activity },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'bugs', label: 'Bugs/Retours', icon: ShieldAlert },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

const LOG_CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'admin', label: 'Admin' },
  { value: 'auth', label: 'Auth' },
  { value: 'events', label: 'Événements' },
  { value: 'maths', label: 'Maths' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function Admin() {
  const { user, getToken } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState(() =>
    localStorage.getItem('admin_tab') || 'dashboard'
  )

  // Dashboard
  const [stats, setStats] = useState(null)

  // Logs
  const [logs, setLogs] = useState([])
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsSearch, setLogsSearch] = useState('')
  const [logsCategory, setLogsCategory] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)
  const [expandedLogIds, setExpandedLogIds] = useState(new Set())

  const toggleLogDetails = (id) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Users
  const [usersList, setUsersList] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'user', is_verified: false })

  // Settings
  const [settings, setSettings] = useState({ siteName: '', schoolYear: '', announcementMessage: '', announcementActive: false })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Tab persistence
  const switchTab = (tab) => {
    setActiveTab(tab)
    localStorage.setItem('admin_tab', tab)
  }

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const [usersRes, logsRes] = await Promise.all([
        authAPI.getUsers(),
        adminLogsAPI.getLogs({ page: 1 }),
      ])
      setStats({
        users: Array.isArray(usersRes) ? usersRes.length : 0,
        logs: logsRes?.total || 0,
        admins: Array.isArray(usersRes) ? usersRes.filter(u => u.role === 'admin').length : 0,
      })
    } catch { setStats({ users: 0, logs: 0, admins: 0 }) }
  }, [])

  const loadLogs = useCallback(async (page = 1) => {
    setLogsLoading(true)
    try {
      const data = await adminLogsAPI.getLogs({ search: logsSearch, category: logsCategory, page })
      setLogs(data.logs || [])
      setLogsPage(data.page || 1)
      setLogsTotalPages(data.totalPages || 1)
    } catch { setLogs([]) }
    setLogsLoading(false)
  }, [logsSearch, logsCategory])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const data = await authAPI.getUsers()
      setUsersList(Array.isArray(data) ? data : [])
    } catch { setUsersList([]) }
    setUsersLoading(false)
  }, [])

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const data = await settingsAPI.getSettings()
      setSettings({
        siteName: data.siteName || '',
        schoolYear: data.schoolYear || '',
        announcementMessage: data.announcementMessage || '',
        announcementActive: data.announcementActive === 'true' || data.announcementActive === true,
      })
    } catch { }
    setSettingsLoading(false)
  }, [])

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'dashboard') loadStats()
    if (activeTab === 'logs') loadLogs(1)
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'settings') loadSettings()
  }, [activeTab, isAdmin, loadStats, loadLogs, loadUsers, loadSettings])

  // ── User CRUD ────────────────────────────────────────────────────────────

  const openAddUser = () => {
    setEditingUser(null)
    setUserForm({ username: '', email: '', password: '', role: 'user', is_verified: false })
    setShowUserModal(true)
  }

  const openEditUser = (u) => {
    setEditingUser(u)
    setUserForm({ username: u.username, email: u.email || '', password: '', role: u.role || 'user', is_verified: u.is_verified || false })
    setShowUserModal(true)
  }

  const saveUser = async () => {
    try {
      if (editingUser) {
        const data = { username: userForm.username, email: userForm.email, role: userForm.role, is_verified: userForm.is_verified }
        if (userForm.password) data.password = userForm.password
        await authAPI.updateUser(editingUser.id, data)
      } else {
        await authAPI.addUser(userForm)
      }
      setShowUserModal(false)
      loadUsers()
      if (activeTab === 'dashboard') loadStats()
    } catch (e) {
      alert(e.message)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try {
      await authAPI.deleteUser(id)
      loadUsers()
      if (activeTab === 'dashboard') loadStats()
    } catch (e) { alert(e.message) }
  }

  // ── Settings save ────────────────────────────────────────────────────────

  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      await settingsAPI.updateSettings(settings)
    } catch (e) { alert(e.message) }
    setSettingsSaving(false)
  }

  // ── Clear logs ───────────────────────────────────────────────────────────

  const clearLogs = async () => {
    if (!confirm('Supprimer tous les logs ?')) return
    try {
      await adminLogsAPI.clearLogs()
      loadLogs(1)
      if (activeTab === 'dashboard') loadStats()
    } catch (e) { alert(e.message) }
  }

  // ── Guard ────────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Shield size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Accès refusé</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Vous devez être administrateur.</p>
          <Link to="/" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-1 transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
                <ArrowLeft size={22} />
              </Link>
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-red-500" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Administration</h1>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500 font-semibold border border-red-500/20">
              {user?.username}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                  style={active
                    ? { background: 'var(--surface)', color: 'var(--accent)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { color: 'var(--text-muted)' }
                  }
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── DASHBOARD ──────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Utilisateurs', value: stats?.users ?? '…', icon: Users, color: '#3b82f6' },
                { label: 'Admins', value: stats?.admins ?? '…', icon: Shield, color: '#ef4444' },
                { label: 'Logs', value: stats?.logs ?? '…', icon: Activity, color: '#8b5cf6' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <s.icon size={24} className="mx-auto mb-2" style={{ color: s.color }} />
                  <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent logs preview */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>Activité récente</h3>
                <button onClick={() => switchTab('logs')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  Voir tout →
                </button>
              </div>
              {logs.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune activité récente</p>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Activity size={14} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          <span className="font-bold">{log.actor_username || '?'}</span> — {log.action}
                        </div>
                        {log.target_label && (
                          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{log.target_label}</div>
                        )}
                      </div>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOGS ───────────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={logsSearch}
                  onChange={e => setLogsSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadLogs(1)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <select
                value={logsCategory}
                onChange={e => { setLogsCategory(e.target.value); }}
                className="px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                {LOG_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <button onClick={() => loadLogs(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                <Search size={16} />
              </button>
              <button onClick={clearLogs} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>

            {/* Log list */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {logsLoading ? (
                <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                  Chargement...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Aucun log</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {logs.map(log => (
                    <React.Fragment key={log.id}>
                    <div className="px-4 py-3 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <User size={14} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm" style={{ color: 'var(--text)' }}>
                          <span className="font-bold">{log.actor_username || '?'}</span>
                          <span className="mx-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
                            {log.action}
                          </span>
                        </div>
                        {log.target_label && (
                          <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{log.target_label}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleLogDetails(log.id); }}
                            className="mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--accent)' }}
                          >
                            {expandedLogIds.has(log.id) ? 'Masquer' : 'Détails'}
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedLogIds.has(log.id) && log.details && (
                      <div className="px-4 py-3 border-t text-xs overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        <pre className="font-mono whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button disabled={logsPage <= 1} onClick={() => loadLogs(logsPage - 1)}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30" style={{ color: 'var(--accent)' }}>
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {logsPage} / {logsTotalPages}
                </span>
                <button disabled={logsPage >= logsTotalPages} onClick={() => loadLogs(logsPage + 1)}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30" style={{ color: 'var(--accent)' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── USERS ──────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>
                {usersList.length} utilisateur{usersList.length > 1 ? 's' : ''}
              </h3>
              <button onClick={openAddUser}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                <UserPlus size={16} /> Ajouter
              </button>
            </div>

            {usersLoading ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="mx-auto mb-2 animate-spin" /> Chargement...
              </div>
            ) : (
              <div className="space-y-2">
                {usersList.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: u.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: u.role === 'admin' ? '#ef4444' : '#3b82f6' }}>
                      {(u.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{u.username}</span>
                        {u.is_verified && <VerifiedBadge size="sm" />}
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                            ADMIN
                          </span>
                        )}
                      </div>
                      {u.email && <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditUser(u)} className="p-2 rounded-lg hover:bg-blue-500/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <Edit3 size={16} />
                      </button>
                      {u.id !== user?.id && (
                        <button onClick={() => deleteUser(u.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BUGS & RETOURS ─────────────────────────────────────────── */}
        {activeTab === 'bugs' && (
          <AdminBugReports />
        )}

        {/* ── SETTINGS ───────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Settings size={18} /> Paramètres du site
              </h3>

              {settingsLoading ? (
                <div className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Nom du site</label>
                    <input
                      type="text"
                      value={settings.siteName}
                      onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
                    <input
                      type="text"
                      value={settings.schoolYear}
                      onChange={e => setSettings(s => ({ ...s, schoolYear: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </div>

                  <hr style={{ borderColor: 'var(--border)' }} />

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Message d'annonce</label>
                    <textarea
                      value={settings.announcementMessage}
                      onChange={e => setSettings(s => ({ ...s, announcementMessage: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      placeholder="Pas d'annonce active..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSettings(s => ({ ...s, announcementActive: !s.announcementActive }))}
                      className="relative w-11 h-6 rounded-full transition-colors"
                      style={{ background: settings.announcementActive ? 'var(--accent)' : 'var(--surface-3)' }}
                    >
                      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                        style={{ left: settings.announcementActive ? '22px' : '2px' }} />
                    </button>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>
                      Annonce {settings.announcementActive ? 'activée' : 'désactivée'}
                    </span>
                  </div>

                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium mt-2 transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    <Save size={16} />
                    {settingsSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── User Modal ──────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 rounded-lg hover:bg-black/10" style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Nom d'utilisateur</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>E-mail</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  Mot de passe {editingUser && '(laisser vide pour ne pas changer)'}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Rôle</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none" style={{ color: 'var(--text)' }}>
                  <VerifiedBadge size="md" />
                  Profil vérifié
                </label>
                <button
                  type="button"
                  onClick={() => setUserForm(f => ({ ...f, is_verified: !f.is_verified }))}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${userForm.is_verified ? 'bg-blue-500' : 'bg-gray-300 dark:bg-zinc-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${userForm.is_verified ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowUserModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                Annuler
              </button>
              <button onClick={saveUser}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                {editingUser ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}