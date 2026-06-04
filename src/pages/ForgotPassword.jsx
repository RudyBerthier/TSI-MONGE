import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function ForgotPassword() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword, error, clearError } = useAuth()

  const [step, setStep] = useState('email') // 'email' | 'code' | 'success'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  const inputRefs = useRef([])

  const displayError = localError || error

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email) { setLocalError('Email requis'); return }
    setLoading(true); setLocalError(''); clearError()
    const result = await forgotPassword(email)
    setLoading(false)
    if (result.success) setStep('code')
  }

  const handleCodeChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const newCode = [...code]; newCode[index] = value; setCode(newCode)
    setLocalError(''); clearError()
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleCodePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) { setCode(pastedData.split('')); inputRefs.current[5]?.focus() }
  }

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handleReset = async (e) => {
    e.preventDefault()
    const codeStr = code.join('')
    if (codeStr.length !== 6) { setLocalError('Entrez le code à 6 chiffres'); return }
    if (newPassword.length < 8) { setLocalError('Le mot de passe doit faire au moins 8 caractères'); return }
    if (newPassword !== confirmPassword) { setLocalError('Les mots de passe ne correspondent pas'); return }
    setLoading(true); setLocalError(''); clearError()
    const result = await resetPassword(email, codeStr, newPassword)
    setLoading(false)
    if (result.success) { setStep('success') } else { setCode(['', '', '', '', '', '']); inputRefs.current[0]?.focus() }
  }

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center p-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="p-8 text-center max-w-md w-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Mot de passe modifié !</h1>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <Link to="/login" className="tsi-btn-primary inline-flex">
            Se connecter
          </Link>
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
            to="/login"
            className="inline-flex items-center gap-2 mb-6 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={20} />
            Retour à la connexion
          </Link>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
            <KeyRound className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text)' }}>
            {step === 'email' ? 'Mot de passe oublié' : 'Réinitialisation'}
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            {step === 'email'
              ? 'Entrez votre email pour recevoir un code'
              : <>Code envoyé à <span style={{ color: 'var(--accent)' }} className="font-medium">{email}</span></>
            }
          </p>
        </div>

        {/* Form Card */}
        <div className="p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setLocalError(''); clearError() }}
                    placeholder="votre@email.com"
                    className="tsi-input pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {displayError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {displayError}
                </div>
              )}

              <button type="submit" disabled={loading} className="tsi-btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Envoi...</> : 'Envoyer le code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Code de vérification
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      onPaste={handleCodePaste}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold transition-all"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--surface-2)',
                        border: `2px solid var(--border)`,
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                      disabled={loading}
                    />
                  ))}
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                  Le code expire dans 15 minutes
                </p>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setLocalError(''); clearError() }}
                    placeholder="Min. 8 caractères"
                    className="tsi-input pl-10 pr-12"
                    required
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirmer */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(''); clearError() }}
                    placeholder="Confirmez"
                    className="tsi-input pl-10"
                    required
                  />
                  {confirmPassword && newPassword === confirmPassword && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>

              {displayError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {displayError}
                </div>
              )}

              <button type="submit" disabled={loading} className="tsi-btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Réinitialisation...</> : 'Réinitialiser le mot de passe'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setCode(['', '', '', '', '', '']); setNewPassword(''); setConfirmPassword(''); setLocalError(''); clearError() }}
                className="w-full text-center text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Renvoyer un code
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
