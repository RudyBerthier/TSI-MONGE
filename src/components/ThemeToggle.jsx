import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg flex items-center justify-center transition-all ${className}`}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: isDark ? 'var(--accent-warm)' : 'var(--text-muted)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `rgba(var(--accent-rgb), 0.4)`
        e.currentTarget.style.background = 'var(--surface-3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--surface-2)'
      }}
      aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
