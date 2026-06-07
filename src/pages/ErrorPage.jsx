import React from 'react'
import { useRouteError, Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Home, FileQuestion } from 'lucide-react'

export function ErrorPage() {
  const error = useRouteError()
  console.error(error)

  const is404 = error?.status === 404

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: is404 ? 'rgba(79, 70, 229, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: is404 ? 'var(--accent)' : '#ef4444' }}>
        {is404 ? <FileQuestion size={48} /> : <AlertTriangle size={48} />}
      </div>
      
      <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
        {is404 ? 'Page Introuvable' : 'Oups ! Une erreur est survenue.'}
      </h1>
      
      <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
        {is404 
          ? "La page que vous cherchez n'existe pas ou a été déplacée." 
          : error?.statusText || error?.message || "Un problème inattendu s'est produit. L'équipe TSI Monge a été notifiée."}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <ArrowLeft size={20} />
          Retour
        </button>
        <Link 
          to="/"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 shadow-lg hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}
        >
          <Home size={20} />
          Accueil
        </Link>
      </div>
      
      {/* Dev stack trace si on est en dev */}
      {process.env.NODE_ENV === 'development' && !is404 && error?.stack && (
        <div className="mt-12 p-4 rounded-xl text-left overflow-auto max-w-2xl w-full text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <pre>{error.stack}</pre>
        </div>
      )}
    </div>
  )
}
