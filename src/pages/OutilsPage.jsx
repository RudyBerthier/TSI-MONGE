import { Link } from 'react-router-dom'
import { MessageCircle, ChefHat, Users, Target, Timer, Wrench, ArrowLeft, ChevronRight, Car, Film, BookOpen, MousePointer2 } from 'lucide-react'

const OTHER_NAV_ITEMS = [
  { href: '/forum', label: 'Forum', Icon: MessageCircle, color: '#7C3AED', description: 'Discute avec les autres élèves' },
  { href: '/cantine', label: 'Cantine', Icon: ChefHat, color: '#DC2626', description: 'Menu, notes et photos des repas' },
  { href: '/places', label: 'Plan classe', Icon: Users, color: '#059669', description: 'Où t\'asseoir en cours' },
  { href: '/outils/kanban', label: 'Suivi des DM', Icon: BookOpen, color: '#3B82F6', description: 'Devoirs de la classe (Kanban)', badge: 'Nouveau' },
  { href: '/pomodoro', label: 'Session Focus', Icon: Target, color: '#F59E0B', description: 'Minuteur pour rester concentré' },
  { href: '/countdown', label: 'Concours', Icon: Timer, color: '#0891B2', description: 'Compte à rebours jusqu\'aux épreuves' },
  { href: '/media', label: 'MongeFlix', Icon: Film, color: '#E50914', description: 'Films & Séries de la promo', badge: 'Nouveau' },
  { href: '/outils/clicker', label: 'Monge Clicker', Icon: MousePointer2, color: '#EAB308', description: 'Le jeu officiel du lycée', badge: 'Nouveau Jeu' },
]

export function OutilsPage() {
  const isMac = typeof window !== 'undefined' && window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? 'Cmd + K' : 'Ctrl + K';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '24px' }}>

      {/* Header (Standard Layout) */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                <ArrowLeft className="w-5 h-5" />
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
            Retrouve ici tous les outils secondaires de ton espace. N'oublie pas que tu peux utiliser le raccourci <kbd className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>{shortcutKey}</kbd> depuis n'importe quelle page pour y accéder plus rapidement !
          </p>
        </div>

        {/* List of tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OTHER_NAV_ITEMS.map(({ href, label, Icon, color, description, badge }, i) => (
            <Link
              key={href}
              to={href}
              viewTransition
              className="group rounded-2xl p-4 flex items-center gap-4 transition-all hover:-translate-y-1 relative"
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
                <h3 className="font-semibold text-sm mb-0.5 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  {label}
                </h3>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{description}</p>
              </div>

              {badge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10 uppercase tracking-wider border-[1.5px] border-white dark:border-slate-900 animate-pulse">
                  {badge === 'oui' ? 'Nouveau' : badge}
                </span>
              )}

              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
