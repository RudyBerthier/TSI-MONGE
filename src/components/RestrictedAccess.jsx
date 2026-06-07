import { Link, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'

export function RestrictedAccess({ 
  title = "Accès restreint", 
  message = "Connectez-vous pour accéder à ce contenu.",
  fallback = null 
}) {
  const location = useLocation()

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
            <LogIn size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h4 className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>{title}</h4>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            {message}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="tsi-btn-primary flex items-center justify-center gap-2">
              <LogIn size={18} />
              Connexion
            </Link>
            <Link to={`/register?redirect=${encodeURIComponent(location.pathname)}`} className="tsi-btn-ghost flex items-center justify-center">
              S'inscrire
            </Link>
          </div>
          {fallback && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              {fallback}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
