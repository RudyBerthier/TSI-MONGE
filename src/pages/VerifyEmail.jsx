import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Loader2, CheckCircle, RefreshCw, Shield, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''

  const { verifyEmail, resendCode, enable2FA, error, clearError } = useAuth()

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [success, setSuccess] = useState(false)
  const [show2FAPrompt, setShow2FAPrompt] = useState(false)
  const [enabling2FA, setEnabling2FA] = useState(false)
  const [localError, setLocalError] = useState('')

  const inputRefs = useRef([])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    if (!email) navigate('/register')
  }, [email, navigate])

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const newCode = [...code]; newCode[index] = value; setCode(newCode)
    setLocalError(''); clearError()
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (value && index === 5) {
      const fullCode = newCode.join('')
      if (fullCode.length === 6) handleVerify(fullCode)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode); inputRefs.current[5]?.focus(); handleVerify(pastedData)
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handleVerify = async (codeString) => {
    if (!codeString || codeString.length !== 6) return
    setLoading(true); setLocalError('')
    const result = await verifyEmail(email, codeString)
    setLoading(false)
    if (result.success) { setSuccess(true); setShow2FAPrompt(true) }
    else { setCode(['', '', '', '', '', '']); inputRefs.current[0]?.focus() }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true); setLocalError('')
    const result = await resendCode(email)
    setResending(false)
    if (result.success) { setResendCooldown(60); setCode(['', '', '', '', '', '']); inputRefs.current[0]?.focus() }
  }

  const displayError = localError || error

  const handleEnable2FA = async () => {
    setEnabling2FA(true)
    const result = await enable2FA()
    setEnabling2FA(false)
    if (result.success) navigate('/')
  }

  const codeInputStyle = (hasError) => ({
    fontFamily: 'var(--font-mono)',
    background: 'var(--surface-2)',
    border: `2px solid ${hasError ? '#ef4444' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    outline: 'none',
    width: '2.5rem',
    height: '3rem',
    textAlign: 'center',
    fontSize: '1.25rem',
    fontWeight: 700,
  })

  if (success && show2FAPrompt) {
    return (
      <div className="flex items-center justify-center p-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="p-8 text-center max-w-md w-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Compte vérifié !</h1>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
              <Shield className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Double authentification</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Protégez votre compte avec un code par email à chaque connexion.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleEnable2FA} disabled={enabling2FA} className="tsi-btn-primary disabled:opacity-50">
                {enabling2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Activer
              </button>
              <button onClick={() => navigate('/')} className="tsi-btn-ghost">
                Plus tard
              </button>
            </div>
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
          <Link to="/register" className="inline-flex items-center gap-2 mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={20} />
            Retour
          </Link>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
            <Mail className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text)' }}>Vérification email</h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            Un code à 6 chiffres a été envoyé à
          </p>
          <p className="font-medium" style={{ color: 'var(--accent)' }}>{email}</p>
        </div>

        {/* Code Input Card */}
        <div className="p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-center gap-2 sm:gap-3 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                style={{ ...codeInputStyle(!!displayError), width: undefined, height: undefined }}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold transition-all"
                disabled={loading}
              />
            ))}
          </div>

          {displayError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm text-center mb-4">
              {displayError}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 mb-4" style={{ color: 'var(--accent)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Vérification...</span>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              Vous n'avez pas reçu le code ?
            </p>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="inline-flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {resending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</>
              ) : resendCooldown > 0 ? (
                <><RefreshCw className="w-4 h-4" />Renvoyer ({resendCooldown}s)</>
              ) : (
                <><RefreshCw className="w-4 h-4" />Renvoyer le code</>
              )}
            </button>
          </div>

          <div className="mt-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Le code expire dans 15 minutes
          </div>
        </div>
      </div>
    </div>
  )
}
