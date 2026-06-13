import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock,
  Zap, Wifi, Server, Shield, MessageSquare, BookOpen, Calendar,
  Users, Bell, Music, Loader2, Lock
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
const REFRESH_INTERVAL = 30

// Mapping nom d'icône (venant du registre serveur) → composant Lucide
const ICON_MAP = {
  Server, Shield, Calendar, MessageSquare, Users, Zap, Wifi,
  BookOpen, Bell, Music, Activity,
}

// ─── Utilitaires ────────────────────────────────────────────────────────────

function getStatusFromCode(httpStatus) {
  if (!httpStatus) return 'down'
  if (httpStatus < 500) return 'up'   // 2xx, 3xx, 4xx (401/403 = route UP)
  return 'degraded'
}

async function checkRoute(testPath, requiresAuth, token) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)
  const start = performance.now()
  try {
    const headers = {}
    if (requiresAuth && token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}${testPath}`, {
      signal: controller.signal,
      headers,
      cache: 'no-store',
    })
    const latency = Math.round(performance.now() - start)
    clearTimeout(timeout)
    return { status: getStatusFromCode(res.status), latency, httpStatus: res.status }
  } catch (err) {
    clearTimeout(timeout)
    const latency = Math.round(performance.now() - start)
    return {
      status: 'down',
      latency,
      httpStatus: null,
      error: err.name === 'AbortError' ? 'Timeout' : 'Réseau',
    }
  }
}

// Groupe les routes par leur champ `group` en préservant l'ordre d'apparition
function groupRoutes(routes) {
  const map = new Map()
  for (const route of routes) {
    if (!map.has(route.group)) map.set(route.group, { label: route.group, icon: route.icon, routes: [] })
    map.get(route.group).routes.push(route)
  }
  return [...map.values()]
}

// ─── Composants UI ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const configs = {
    checking:        { label: 'Vérification',    dot: 'animate-pulse', color: 'var(--text-muted)', bg: 'var(--surface-3)',          icon: null },
    up:              { label: 'Opérationnel',     dot: '',              color: '#10b981',            bg: 'rgba(16,185,129,0.12)',     icon: null },
    degraded:        { label: 'Dégradé',          dot: '',              color: '#f59e0b',            bg: 'rgba(245,158,11,0.12)',     icon: null },
    down:            { label: 'Indisponible',     dot: '',              color: '#ef4444',            bg: 'rgba(239,68,68,0.12)',      icon: null },
    unauthenticated: { label: 'Non connecté',     dot: '',              color: 'var(--text-muted)', bg: 'var(--surface-3)',           icon: Lock  },
  }
  const c = configs[status] ?? configs.down
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color }}>
      {c.icon
        ? <c.icon size={11} />
        : <span className={`w-1.5 h-1.5 rounded-full bg-current ${c.dot}`} />
      }
      {c.label}
    </span>
  )
}

function LatencyBar({ latency }) {
  if (!latency) return null
  const color = latency < 300 ? '#10b981' : latency < 800 ? '#f59e0b' : '#ef4444'
  const pct = Math.min(100, (latency / 2000) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tsi-mono" style={{ color: 'var(--text-muted)', minWidth: '3rem' }}>
        {latency}ms
      </span>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export function Status() {
  const { getToken } = useAuth()
  const { connected: socketConnected } = useSocket()

  // Registre chargé depuis le serveur
  const [registry, setRegistry] = useState([])
  const [registryError, setRegistryError] = useState(false)

  // Résultats des pings : { [key]: { status, latency, httpStatus, error } }
  const [results, setResults] = useState({})
  const [lastChecked, setLastChecked] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const checkingRef = useRef(false)

  // 1. Charger le registre depuis le serveur
  const loadRegistry = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/status/routes`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRegistry(data)
      setRegistryError(false)
      return data
    } catch {
      setRegistryError(true)
      return []
    }
  }, [])

  // 2. Pinger toutes les routes du registre
  const runChecks = useCallback(async (routeList) => {
    if (checkingRef.current) return
    checkingRef.current = true
    setIsChecking(true)

    const token = getToken?.() || localStorage.getItem('token')
    const hasToken = !!token

    // Initialise tous en "checking" (ou "unauthenticated" immédiatement)
    const initial = {}
    routeList.forEach(r => {
      initial[r.key] = r.requiresAuth && !hasToken
        ? { status: 'unauthenticated' }
        : { status: 'checking' }
    })
    setResults(initial)

    // Pings en parallèle — saute les routes auth si pas de token
    await Promise.all(
      routeList.map(async (route) => {
        if (route.requiresAuth && !hasToken) return // skip, déjà défini
        const result = await checkRoute(route.testPath, route.requiresAuth, token)
        setResults(prev => ({ ...prev, [route.key]: result }))
      })
    )

    setLastChecked(new Date())
    setIsChecking(false)
    checkingRef.current = false
    setCountdown(REFRESH_INTERVAL)
  }, [getToken])

  // 3. Refresh complet : recharge le registre ET pinge
  const refresh = useCallback(async () => {
    const routes = await loadRegistry()
    if (routes.length > 0) await runChecks(routes)
  }, [loadRegistry, runChecks])

  // Chargement initial
  useEffect(() => { refresh() }, [])

  // Countdown auto-refresh
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { refresh(); return REFRESH_INTERVAL }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [refresh])

  // ─── Calculs globaux ─────────────────────────────────────────────────────
  const allResults = Object.values(results)
  const checkedResults = allResults.filter(r => r.status !== 'unauthenticated')
  const totalUp       = checkedResults.filter(r => r.status === 'up').length
  const totalDown     = checkedResults.filter(r => r.status === 'down').length
  const totalDegraded = checkedResults.filter(r => r.status === 'degraded').length
  const isStillChecking = checkedResults.some(r => r.status === 'checking')

  const globalStatus = (() => {
    if (registryError)       return { label: 'Impossible de joindre le serveur', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', Icon: XCircle }
    if (allResults.length === 0 || isStillChecking) return { label: 'Vérification en cours…',          color: 'var(--text-muted)', bg: 'var(--surface-2)',          Icon: Clock }
    if (totalDown > 0)       return { label: `${totalDown} service${totalDown > 1 ? 's' : ''} indisponible${totalDown > 1 ? 's' : ''}`,  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    Icon: XCircle }
    if (totalDegraded > 0)   return { label: `${totalDegraded} service${totalDegraded > 1 ? 's' : ''} dégradé${totalDegraded > 1 ? 's' : ''}`, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', Icon: AlertTriangle }
    return { label: 'Tous les services sont opérationnels', color: '#10b981', bg: 'rgba(16,185,129,0.08)', Icon: CheckCircle2 }
  })()

  const groups = groupRoutes(registry)

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8" style={{ animation: 'tsi-entrance 0.4s ease both' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}>
                  <Activity size={18} />
                </div>
                <h1 className="text-2xl font-bold tsi-display" style={{ color: 'var(--text)' }}>
                  État des services
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Statut en temps réel de toutes les routes de l'API TSI·MONGE
                {registry.length > 0 && (
                  <span className="ml-2 tsi-mono" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                    ({registry.length} routes)
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={() => { setCountdown(REFRESH_INTERVAL); refresh() }}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shrink-0"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">
                {isChecking ? 'Vérification…' : `Actualiser (${countdown}s)`}
              </span>
              <span className="sm:hidden">{countdown}s</span>
            </button>
          </div>
        </div>

        {/* Bandeau global */}
        <div className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 transition-colors duration-500"
          style={{
            background: globalStatus.bg,
            border: `1px solid ${globalStatus.color}30`,
            animation: 'tsi-entrance 0.5s ease both',
            animationDelay: '0.05s',
          }}>
          <div className="flex items-center gap-3">
            <globalStatus.Icon size={22} style={{ color: globalStatus.color }} />
            <span className="font-semibold text-sm sm:text-base" style={{ color: globalStatus.color }}>
              {globalStatus.label}
            </span>
          </div>
          {lastChecked && (
            <span className="text-xs tsi-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
              {lastChecked.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        {/* Compteurs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
          style={{ animation: 'tsi-entrance 0.5s ease both', animationDelay: '0.1s' }}>
          {[
            { label: 'Opérationnels', value: totalUp,       color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
            { label: 'Indisponibles', value: totalDown,     color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
            { label: 'Dégradés',      value: totalDegraded, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            { label: 'WebSocket',
              value: socketConnected ? '✓' : '✗',
              color: socketConnected ? '#10b981' : '#ef4444',
              bg:    socketConnected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
              <div className="text-2xl font-bold tsi-mono mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Erreur registre */}
        {registryError && (
          <div className="rounded-2xl p-6 text-center mb-6"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <XCircle size={28} className="mx-auto mb-2" style={{ color: '#ef4444' }} />
            <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
              Impossible de charger le registre des routes
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Vérifiez que le serveur est démarré sur {API_BASE}
            </p>
          </div>
        )}

        {/* Chargement initial */}
        {!registryError && registry.length === 0 && (
          <div className="space-y-4">
            {[1,2,3].map(g => (
              <div key={g}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
                  <div className="w-24 h-3 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  {[1,2,3].map(r => (
                    <div key={r} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: r > 1 ? '1px solid var(--border)' : undefined }}>
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-32 h-3.5 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                        <div className="w-48 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                      </div>
                      <div className="w-20 h-6 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Groupes de routes */}
        {groups.length > 0 && (
          <div className="space-y-6">
            {groups.map((group, gi) => {
              const GroupIcon = ICON_MAP[group.icon] ?? Server
              const groupResults = group.routes.map(r => results[r.key]?.status).filter(Boolean)
              const upCount = groupResults.filter(s => s === 'up').length
              const groupChecking = groupResults.some(s => s === 'checking')
              const groupDown = groupResults.some(s => s === 'down')
              const groupAllUp = groupResults.length > 0 && groupResults.every(s => s === 'up')

              return (
                <div key={group.label}
                  style={{ animation: 'tsi-entrance 0.5s ease both', animationDelay: `${0.15 + gi * 0.05}s` }}>

                  {/* En-tête groupe */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}>
                      <GroupIcon size={14} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest tsi-mono"
                      style={{ color: 'var(--text-muted)' }}>
                      {group.label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="text-xs tsi-mono" style={{
                      color: groupChecking ? 'var(--text-muted)' : groupDown ? '#ef4444' : groupAllUp ? '#10b981' : '#f59e0b'
                    }}>
                      {groupChecking ? '…' : `${upCount}/${group.routes.length}`}
                    </span>
                  </div>

                  {/* Table routes */}
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    {group.routes.map((route, ri) => {
                      const result = results[route.key] || { status: 'checking' }
                      const dotColor = {
                        up: '#10b981', degraded: '#f59e0b', down: '#ef4444',
                        checking: 'var(--text-muted)', unauthenticated: 'var(--border)'
                      }[result.status] ?? 'var(--text-muted)'

                      return (
                        <div key={route.key}
                          className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 transition-colors"
                          style={{ borderTop: ri > 0 ? '1px solid var(--border)' : undefined }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Dot */}
                          <div className={`w-2 h-2 rounded-full shrink-0 ${result.status === 'checking' ? 'animate-pulse' : ''}`}
                            style={{ background: dotColor }} />

                          {/* Nom + endpoint */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                                {route.name}
                              </span>
                              {route.requiresAuth && (
                                <span className="text-xs px-1.5 py-0.5 rounded tsi-mono"
                                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                                  auth
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <code className="text-xs tsi-mono hidden sm:inline truncate max-w-[220px]"
                                style={{ color: 'var(--text-muted)' }}>
                                {route.testPath}
                              </code>
                              <span className="hidden sm:inline text-xs" style={{ color: 'var(--border)' }}>·</span>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {route.description}
                              </span>
                            </div>
                          </div>

                          {/* HTTP code ou erreur */}
                          <span className="text-xs tsi-mono hidden md:block shrink-0"
                            style={{ color: result.error ? '#ef4444' : 'var(--text-muted)' }}>
                            {result.error ?? (result.httpStatus ? `HTTP ${result.httpStatus}` : '')}
                          </span>

                          {/* Latence */}
                          <div className="hidden sm:block shrink-0">
                            {result.latency
                              ? <LatencyBar latency={result.latency} />
                              : <div className="w-16 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--surface-3)' }} />
                            }
                          </div>

                          {/* Badge */}
                          <div className="shrink-0">
                            <StatusBadge status={result.status} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* WebSocket (hors registre, toujours présent) */}
        {registry.length > 0 && (
          <div className="mt-6"
            style={{ animation: 'tsi-entrance 0.5s ease both', animationDelay: `${0.15 + groups.length * 0.05}s` }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}>
                <Wifi size={14} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest tsi-mono"
                style={{ color: 'var(--text-muted)' }}>
                Temps réel
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${socketConnected ? '' : 'animate-pulse'}`}
                  style={{ background: socketConnected ? '#10b981' : '#ef4444' }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>WebSocket</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs tsi-mono hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                      {API_BASE}/socket.io
                    </code>
                    <span className="hidden sm:inline text-xs" style={{ color: 'var(--border)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Connexion Socket.io temps-réel
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={socketConnected ? 'up' : 'down'} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {registry.length > 0 && (
          <div className="mt-10 text-center"
            style={{ animation: 'tsi-entrance 0.5s ease both', animationDelay: '0.5s' }}>
            <p className="text-xs tsi-mono" style={{ color: 'var(--text-muted)' }}>
              Actualisation automatique toutes les {REFRESH_INTERVAL}s · {registry.length} routes surveillées
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
