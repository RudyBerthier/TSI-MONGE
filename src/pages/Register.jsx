import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, User, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'

function GoogleButton({ text, onSuccess, onError }) {
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => { setGoogleLoading(false); onSuccess(tokenResponse) },
    onError: () => { setGoogleLoading(false); onError?.() },
    onNonOAuthError: () => { setGoogleLoading(false) }
  })

  return (
    <button
      type="button"
      onClick={() => { setGoogleLoading(true); googleLogin() }}
      disabled={googleLoading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
    >
      {googleLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      {text}
    </button>
  )
}

export function Register() {
  const navigate = useNavigate()
  const { register, loginWithGoogle, error, clearError } = useAuth()

  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setLocalError(''); clearError()
  }

  const validateForm = () => {
    if (!formData.email || !formData.username || !formData.password) { setLocalError('Tous les champs sont requis'); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setLocalError('Email invalide'); return false }
    if (formData.username.length < 3 || formData.username.length > 20) { setLocalError('Le nom d\'utilisateur doit faire entre 3 et 20 caractères'); return false }
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) { setLocalError('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'); return false }
    if (formData.password.length < 8) { setLocalError('Le mot de passe doit faire au moins 8 caractères'); return false }
    if (formData.password !== formData.confirmPassword) { setLocalError('Les mots de passe ne correspondent pas'); return false }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    const result = await register(formData.email, formData.username, formData.password)
    setLoading(false)
    if (result.success) navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`)
  }

  const getPasswordStrength = () => {
    const { password } = formData
    if (!password) return { strength: 0, label: '', color: '' }
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    if (strength <= 2) return { strength, label: 'Faible', color: 'bg-red-500' }
    if (strength <= 3) return { strength, label: 'Moyen', color: 'bg-yellow-500' }
    return { strength, label: 'Fort', color: 'bg-green-500' }
  }

  const passwordStrength = getPasswordStrength()
  const displayError = localError || error

  return (
    <div className="flex items-center justify-center p-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={20} />
            Retour à l'accueil
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text)' }}>Créer un compte</h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Rejoignez TSI Monge</p>
        </div>

        {/* Form Card */}
        <div className="p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="votre@email.com" className="tsi-input pl-10" required />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Nom d'utilisateur</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="pseudo" className="tsi-input pl-10" required />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="tsi-input pl-10 pr-12" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength.color === 'bg-red-500' ? 'text-red-500' : passwordStrength.color === 'bg-yellow-500' ? 'text-yellow-600' : 'text-green-500'}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="tsi-input pl-10 pr-12" required />
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            {displayError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{displayError}</div>
            )}

            <button type="submit" disabled={loading} className="tsi-btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Création du compte...</> : 'Créer mon compte'}
            </button>
          </form>

          {/* Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>ou</span>
            </div>
          </div>

          <GoogleButton
            text="S'inscrire avec Google"
            onSuccess={async (tokenResponse) => {
              setLoading(true); setLocalError(''); clearError()
              const result = await loginWithGoogle(tokenResponse)
              setLoading(false)
              if (result.success && !result.requires2FA) navigate('/')
            }}
            onError={() => setLocalError('Erreur lors de la connexion Google')}
          />

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Déjà un compte ?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
