import { Link, useLocation } from 'react-router-dom'
import { Play, Activity, MessageCircle, Moon, Sun, Monitor, Menu, X, ArrowRight, User, LogOut, FileText, Briefcase, PlusCircle, CheckCircle, LogIn, Shield, BookOpen, BarChart2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { UserAvatar } from './UserAvatar'

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()

  return (
    <header className="tsi-nav">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-4">

          {/* ── Logo ────────────────────────────────── */}
          <Link viewTransition to="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group vt-name-header">
            <div className="flex items-center gap-0.5 tsi-display text-lg sm:text-xl font-bold tracking-tight select-none">
              <span style={{ color: 'var(--accent)' }}>TSI</span>
              <span style={{ color: 'var(--text)', opacity: 0.35 }}>·</span>
              <span style={{ color: 'var(--text)' }}>MONGE</span>
            </div>

            {/* Separator */}
            <div
              className="hidden sm:block w-px h-5 mx-1"
              style={{ background: 'var(--border)' }}
            />

            {/* Subtitle */}
            <span
              className="hidden md:block text-xs tracking-widest uppercase tsi-mono"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
            >
              Chambéry
            </span>
          </Link>

          {/* ── Right side ──────────────────────────── */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1 flex-1">
            <ThemeToggle />

            {/* Status link — toujours visible */}
            <Link
              to="/status"
              title="État des services"
              aria-label="État des services"
              className="p-2 rounded-lg transition-all flex items-center justify-center min-w-0"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(16,185,129,0.1)'
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'
                e.currentTarget.style.color = '#10b981'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface-2)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <Activity size={16} />
            </Link>

            {/* Docs link */}
            <Link
              to="/docs"
              title="Documentation"
              aria-label="Documentation"
              className="p-2 rounded-lg transition-all flex items-center justify-center min-w-0"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(56,189,248,0.1)'
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'
                e.currentTarget.style.color = '#38bdf8'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface-2)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <BookOpen size={16} />
            </Link>

            {/* Kholleurs rating link */}
            <Link
              to="/kholleurs"
              title="Avis Kholleurs"
              aria-label="Avis Kholleurs"
              className="p-2 rounded-lg transition-all flex items-center justify-center min-w-0"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(234,179,8,0.1)'
                e.currentTarget.style.borderColor = 'rgba(234,179,8,0.3)'
                e.currentTarget.style.color = '#eab308'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface-2)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <BarChart2 size={16} />
            </Link>

            {isAuthenticated ? (
              <>
                {/* Admin link — admin only */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    title="Administration"
                    aria-label="Administration"
                    className="p-2 rounded-lg transition-all flex items-center justify-center min-w-0"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
                    }}
                  >
                    <Shield size={16} />
                  </Link>
                )}

                {/* Notes shortcut */}
                <Link
                  to="/notes"
                  title="Mes notes"
                  aria-label="Mes notes"
                  className="p-2 rounded-lg transition-all flex items-center justify-center min-w-0"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
                    e.currentTarget.style.color = '#6366F1'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--surface-2)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  <FileText size={16} />
                </Link>

                {/* Avatar + name — desktop */}
                <Link
                  viewTransition
                  to="/profile"
                  className="hidden sm:flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all vt-name-avatar shrink-0"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `rgba(var(--accent-rgb), 0.4)`
                    e.currentTarget.style.background = 'var(--surface-3)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--surface-2)'
                  }}
                >
                  <UserAvatar user={user} size={24} />
                  <span
                    className="text-sm font-medium"
                    style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}
                  >
                    {user?.username}
                  </span>
                </Link>

                {/* Avatar only — mobile */}
                <Link
                  viewTransition
                  to="/profile"
                  className="sm:hidden flex items-center justify-center vt-name-avatar shrink-0"
                  aria-label="Mon profil"
                >
                  <UserAvatar user={user} size={32} border />
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  title="Déconnexion"
                  aria-label="Se déconnecter"
                  className="p-2 rounded-lg transition-all flex items-center justify-center min-w-0"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
                    e.currentTarget.style.color = '#ef4444'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--surface-2)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                state={{ from: location.pathname }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Connexion</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

