import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Unlock, UserPlus, Shield, KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'

function GoogleButton({ text, onSuccess, onError }) {
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setGoogleLoading(false)
      onSuccess(tokenResponse)
    },
    onError: () => {
      setGoogleLoading(false)
      onError?.()
    },
    onNonOAuthError: () => {
      setGoogleLoading(false)
    }
  })

  return (
    <button
      type="button"
      onClick={() => { setGoogleLoading(true); googleLogin() }}
      disabled={googleLoading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium disabled:opacity-50 transition-colors"
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

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const redirectParams = searchParams.get('redirect')
  const { login, loginWithGoogle, verifyLogin2FA, user, loading: authLoading, error, clearError } = useAuth()

  const [formData, setFormData] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [linkedMessage, setLinkedMessage] = useState('')

  // État 2FA
  const [requires2FA, setRequires2FA] = useState(false)
  const [email2FA, setEmail2FA] = useState('')
  const [code2FA, setCode2FA] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    if (user && location.pathname === '/login') {
      const from = redirectParams || location.state?.from || '/'
      navigate(from, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setLocalError('')
    clearError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.identifier || !formData.password) {
      setLocalError('Tous les champs sont requis')
      return
    }

    setLoading(true)
    const result = await login(formData.identifier, formData.password)
    setLoading(false)

    if (result.success) {
      if (result.requires2FA) {
        setRequires2FA(true)
        setEmail2FA(result.email)
      } else {
        const from = redirectParams || location.state?.from || '/'
        navigate(from, { replace: true })
      }
    }
  }

  const handleVerify2FA = async (e) => {
    e.preventDefault()

    if (!code2FA || code2FA.length !== 6) {
      setLocalError('Entrez le code à 6 chiffres')
      return
    }

    setLoading(true)
    const result = await verifyLogin2FA(email2FA, code2FA)
    setLoading(false)

    if (result.success) {
      const from = redirectParams || location.state?.from || '/'
      navigate(from)
    }
  }

  const handleBack = () => {
    setRequires2FA(false)
    setCode2FA('')
    setLocalError('')
    clearError()
  }

  const displayError = localError || error

  if (authLoading) {
    return (
      <div className="flex items-center justify-center" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  // Formulaire de vérification 2FA
  if (requires2FA) {
    return (
      <div className="flex items-center justify-center p-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 mb-6 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft size={20} />
              Retour
            </button>
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text)' }}>Vérification 2FA</h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
              Un code a été envoyé à<br />
              <span className="font-medium" style={{ color: 'var(--text)' }}>{email2FA}</span>
            </p>
          </div>

          {/* Form Card */}
          <div className="p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
            <form onSubmit={handleVerify2FA} className="space-y-5">
              {/* Code Input */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Code de vérification
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={code2FA}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setCode2FA(val)
                      setLocalError('')
                      clearError()
                    }}
                    placeholder="000000"
                    className="tsi-input pl-10 text-center text-2xl tracking-widest"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Le code expire dans 10 minutes
                </p>
              </div>

              {/* Error */}
              {displayError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                  {displayError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || code2FA.length !== 6}
                className="tsi-btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Unlock size={20} />
                    Valider
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-6 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={20} />
            Retour à l'accueil
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text)' }}>Connexion</h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Accédez à votre compte TSI Monge</p>
        </div>

        {/* Form Card */}
        <div className="p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email/Username */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Email ou nom d'utilisateur
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder="email@example.com ou pseudo"
                  className="tsi-input pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="tsi-input pl-10 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {displayError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="tsi-btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <Unlock size={20} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--border)' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>ou</span>
            </div>
          </div>

          {/* Linked Message */}
          {linkedMessage && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-3 rounded-xl text-sm mt-4">
              {linkedMessage}
            </div>
          )}

          {/* Google Sign-In */}
          <GoogleButton
            text="Se connecter avec Google"
            onSuccess={async (tokenResponse) => {
              setLoading(true)
              setLocalError('')
              setLinkedMessage('')
              clearError()
              const result = await loginWithGoogle(tokenResponse)
              setLoading(false)
              if (result.success) {
                if (result.requires2FA) {
                  setRequires2FA(true)
                  setEmail2FA(result.email)
                } else if (result.accountLinked) {
                  setLinkedMessage('Votre compte Google a été lié à votre compte existant. Vous pouvez désormais vous connecter avec Google ou avec votre email et mot de passe.')
                  const from = redirectParams || location.state?.from || '/'
                  setTimeout(() => navigate(from), 4000)
                } else {
                  const from = redirectParams || location.state?.from || '/'
                  navigate(from)
                }
              }
            }}
            onError={() => setLocalError('Erreur lors de la connexion Google')}
          />

          {/* Forgot Password */}
          <div className="mt-4 text-center">
            <Link to={`/forgot-password${redirectParams ? `?redirect=${encodeURIComponent(redirectParams)}` : ''}`} state={location.state} className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Register Link */}
          <div className="mt-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Pas encore de compte ?{' '}
            <Link to={`/register${redirectParams ? `?redirect=${encodeURIComponent(redirectParams)}` : ''}`} state={location.state} className="hover:underline font-medium inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <UserPlus size={16} />
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
