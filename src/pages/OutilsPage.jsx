import { Link } from 'react-router-dom'
import { MessageCircle, ChefHat, Users, Target, Timer, Wrench, ArrowLeft, ChevronRight, Car } from 'lucide-react'

const OTHER_NAV_ITEMS = [
  { href: '/forum', label: 'Forum', Icon: MessageCircle, color: '#7C3AED', description: 'Discute avec les autres élèves' },
  { href: '/cantine', label: 'Cantine', Icon: ChefHat, color: '#DC2626', description: 'Menu, notes et photos des repas' },
  { href: '/places', label: 'Plan classe', Icon: Users, color: '#059669', description: 'Où t\'asseoir en cours' },
  { href: '/pomodoro', label: 'Session Focus', Icon: Target, color: '#F59E0B', description: 'Minuteur pour rester concentré' },
  { href: '/countdown', label: 'Concours', Icon: Timer, color: '#0891B2', description: 'Compte à rebours jusqu\'aux épreuves' },
]

export function OutilsPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '90px' }}>

      {/* Header (Standard Layout) */}
      <div className="sticky top-0 z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="transition-colors p-1" style={{ color: 'var(--accent)' }}>
                <ArrowLeft size={22} />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <Wrench size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Autres Outils</h1>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vie étudiante & ressources</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in-up">

        {/* Helper Card */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Retrouve ici tous les outils secondaires de ton espace. N'oublie pas que tu peux utiliser le raccourci <kbd className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>Cmd + K</kbd> depuis n'importe quelle page pour y accéder plus rapidement !
          </p>
        </div>

        {/* List of tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OTHER_NAV_ITEMS.map(({ href, label, Icon, color, description }, i) => (
            <Link
              key={href}
              to={href}
              viewTransition
              className="group rounded-2xl p-4 flex items-center gap-4 transition-all hover:-translate-y-1"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                animationDelay: `${i * 50}ms`
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 0 1px ${color}22`,
              }}>
                <Icon size={24} style={{ color }} className="group-hover:scale-110 transition-transform" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>{label}</h3>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{description}</p>
              </div>

              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
