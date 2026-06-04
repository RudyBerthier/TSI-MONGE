import React, { useState } from 'react'
import { Bug, Lightbulb, X, Send } from 'lucide-react'

export default function BugReportModal({ onClose }) {
  const [type, setType] = useState('bug') // 'bug' or 'feature_request'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type,
          title,
          description,
          url: window.location.href,
          user_agent: navigator.userAgent
        })
      })

      if (!res.ok) throw new Error('Erreur lors de l\'envoi')

      setSuccess(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative" style={{ background: 'var(--surface)' }}>
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text)' }}>
            {type === 'bug' ? <Bug className="text-red-500" size={20} /> : <Lightbulb className="text-amber-500" size={20} />}
            Signaler un problème
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Send size={32} className="text-green-500" />
            </div>
            <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>Merci !</h3>
            <p style={{ color: 'var(--text-muted)' }}>Ton signalement a bien été envoyé aux développeurs.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Type Selection */}
            <div className="flex gap-3">
              <button type="button" onClick={() => setType('bug')}
                className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${type === 'bug' ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400 shadow-sm' : 'border-transparent'}`}
                style={{ ...(type !== 'bug' && { background: 'var(--surface-3)', color: 'var(--text-muted)' }) }}>
                <Bug size={24} />
                <span className="text-sm font-medium">C'est un Bug</span>
              </button>
              
              <button type="button" onClick={() => setType('feature_request')}
                className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${type === 'feature_request' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm' : 'border-transparent'}`}
                style={{ ...(type !== 'feature_request' && { background: 'var(--surface-3)', color: 'var(--text-muted)' }) }}>
                <Lightbulb size={24} />
                <span className="text-sm font-medium">Une Idée</span>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Titre</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Impossible d'ouvrir la messagerie"
                className="tsi-input w-full px-4 py-2.5 rounded-xl transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détaille ce qu'il s'est passé ou explique ton idée..."
                className="tsi-input w-full px-4 py-3 rounded-xl min-h-[120px] resize-y transition-all"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !title.trim() || !description.trim()}
              className="tsi-btn-primary w-full py-3 justify-center text-white font-bold text-base rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
            
          </form>
        )}
      </div>
    </div>
  )
}
