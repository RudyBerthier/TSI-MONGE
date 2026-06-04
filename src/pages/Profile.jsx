import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Camera, Trash2, Lock, Check, X, Loader2, Bell, Shield, ShieldCheck, ShieldOff, Pencil, MessageSquare, MessageCircle, Users, Smartphone, Monitor, Clock, Link as LinkIcon, Palette, Moon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { NotificationSettings } from '../components/NotificationSettings'
import { CloseFriendsManager } from '../components/CloseFriendsManager'

export function Profile() {
  const { user, isAuthenticated, loading, updateProfile, uploadAvatar, deleteAvatar, changePassword, enable2FA, disable2FA, get2FAStatus, error, clearError, getToken } = useAuth()
  const { darkMode, toggleTheme, isDeepDark, toggleDeepDark, accentColor, setAccentColor, colorVariants, isCustomColor } = useTheme()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loadingAvatar, setLoadingAvatar] = useState(false)
  const [loadingUsername, setLoadingUsername] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [loading2FA, setLoading2FA] = useState(false)
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  const [disable2FAPassword, setDisable2FAPassword] = useState('')

  const [successMessage, setSuccessMessage] = useState('')
  const [localError, setLocalError] = useState('')

  const [bio, setBio] = useState('')
  const [links, setLinks] = useState({ instagram: '', github: '', linkedin: '', website: '' })
  const [loadingBio, setLoadingBio] = useState(false)

  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login', { state: { from: window.location.pathname } })
  }, [isAuthenticated, loading, navigate])

  useEffect(() => {
    if (user) {
      setNewUsername(user.username)
      setIs2FAEnabled(user.twoFactorEnabled || false)
      setBio(user.bio || '')
      setLinks(user.links || { instagram: '', github: '', linkedin: '', website: '' })
    }
  }, [user])

  useEffect(() => {
    const load2FAStatus = async () => {
      if (isAuthenticated) {
        const status = await get2FAStatus()
        setIs2FAEnabled(status.enabled)
      }
    }
    load2FAStatus()
  }, [isAuthenticated, get2FAStatus])

  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/auth/stats', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => { })
  }, [isAuthenticated, getToken])

  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch(() => { })
  }, [isAuthenticated, getToken])

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setLocalError('')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const showError = (msg) => {
    setLocalError(msg)
    setSuccessMessage('')
    setTimeout(() => setLocalError(''), 5000)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showError('L\'image ne doit pas dépasser 2 Mo'); return }
    setLoadingAvatar(true)
    const result = await uploadAvatar(file)
    setLoadingAvatar(false)
    if (result.success) showSuccess('Avatar mis à jour')
    else showError(result.error)
  }

  const handleDeleteAvatar = async () => {
    if (!user?.avatar) return
    setLoadingAvatar(true)
    const result = await deleteAvatar()
    setLoadingAvatar(false)
    if (result.success) showSuccess('Avatar supprimé')
    else showError(result.error)
  }

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername === user?.username) {
      setIsEditingUsername(false)
      return
    }
    setLoadingUsername(true)
    const result = await updateProfile({ username: newUsername.trim() })
    setLoadingUsername(false)
    if (result.success) {
      showSuccess('Pseudo mis à jour')
      setIsEditingUsername(false)
    } else {
      showError(result.error)
    }
  }

  const handleSaveProfile = async () => {
    setLoadingBio(true)
    const result = await updateProfile({
      bio,
      links,
      username: newUsername !== user?.username ? newUsername.trim() : undefined
    })
    setLoadingBio(false)
    if (result.success) { showSuccess('Profil mis à jour'); setIsEditingUsername(false) }
    else showError(result.error)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { showError('Les mots de passe ne correspondent pas'); return }
    if (newPassword.length < 8) { showError('Le mot de passe doit faire au moins 8 caractères'); return }
    setLoadingPassword(true)
    const result = await changePassword(currentPassword, newPassword)
    setLoadingPassword(false)
    if (result.success) {
      showSuccess('Mot de passe modifié')
      setIsChangingPassword(false)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } else showError(result.error)
  }

  const handleEnable2FA = async () => {
    setLoading2FA(true)
    const result = await enable2FA()
    setLoading2FA(false)
    if (result.success) { setIs2FAEnabled(true); showSuccess('Double authentification activée') }
    else showError(result.error)
  }

  const handleDisable2FA = async (e) => {
    e.preventDefault()
    if (user?.hasPassword !== false && !disable2FAPassword) { showError('Mot de passe requis'); return }
    setLoading2FA(true)
    const result = await disable2FA(user?.hasPassword === false ? '' : disable2FAPassword)
    setLoading2FA(false)
    if (result.success) {
      setIs2FAEnabled(false); setShowDisable2FA(false); setDisable2FAPassword('')
      showSuccess('Double authentification désactivée')
    } else showError(result.error)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  if (!user) return null

  const avatarUrl = user.avatar
    ? `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')}${user.avatar}`
    : user.google_avatar || user.googleAvatar || null

  const trinome = parseInt(localStorage.getItem('colloscope_trinome') || '0')

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="w-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-colors flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Mon profil</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">

        {/* ── Hero card ── */}
        <div className="mt-6 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          {/* Coloured top strip */}
          <div style={{ height: 80, background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #7c3aed) 100%)', opacity: 0.9 }} />

          <div className="px-6 pb-6">
            {/* Avatar — overlaps the strip */}
            <div className="flex items-end justify-between" style={{ marginTop: -44 }}>
              <div className="relative">
                <div
                  className="rounded-full border-4 overflow-hidden flex items-center justify-center"
                  style={{ width: 88, height: 88, borderColor: 'var(--surface)', background: 'var(--accent)', flexShrink: 0 }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {user.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                  {loadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Camera button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loadingAvatar}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--accent)', border: '2px solid var(--surface)' }}
                  title="Changer la photo"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange}
                  accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" />
              </div>

              {/* Delete avatar — only when a custom avatar is uploaded (not just Google's) */}
              {user?.avatar && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={loadingAvatar}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              )}
            </div>

            {/* Name + email */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className="tsi-input text-lg font-bold flex-1"
                      disabled={loadingUsername}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') { setIsEditingUsername(false); setNewUsername(user.username) } }}
                    />
                    <button onClick={handleSaveUsername} disabled={loadingUsername}
                      className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center">
                      {loadingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setIsEditingUsername(false); setNewUsername(user.username) }}
                      disabled={loadingUsername} className="p-2 rounded-lg tsi-btn-ghost flex items-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{user.username}</h2>
                    <button onClick={() => setIsEditingUsername(true)}
                      className="p-1 rounded-lg transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }} title="Modifier le pseudo">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
            </div>

            {/* Bio and Links Edit Form */}
            <div className="mt-8 pt-6 space-y-5" style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Biographie</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="tsi-input w-full resize-none h-24"
                  placeholder="Décrivez-vous en quelques mots..."
                  maxLength={150}
                />
                <div className="text-right text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{bio.length}/150</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Lien / Site web</label>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input type="url" value={links.website || ''} onChange={e => setLinks({ website: e.target.value })} placeholder="https://votre-lien.com" className="tsi-input flex-1" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={loadingBio}
                  className="w-full flex items-center justify-center gap-2 p-3 font-semibold rounded-xl transition-colors shadow-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {loadingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Mettre à jour le profil public
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatPill
                icon={<MessageSquare className="w-4 h-4" />}
                value={stats ? stats.messagesGroupe : '—'}
                label="Classe"
              />
              <StatPill
                icon={<MessageCircle className="w-4 h-4" />}
                value={stats ? stats.messagesDm : '—'}
                label="DMs"
              />
              <StatPill
                icon={<Users className="w-4 h-4" />}
                value={stats ? stats.messagesGroupePerso : '—'}
                label="Groupes"
              />
            </div>

            {/* Meta chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {trinome > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
                  Trinôme {trinome}
                </span>
              )}
              {memberSince && (
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  Membre depuis {memberSince}
                </span>
              )}
              {user.role === 'admin' && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-500 text-white">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toast messages */}
        {successMessage && (
          <div className="mt-4 rounded-xl p-3 flex items-center gap-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-300">{successMessage}</span>
          </div>
        )}
        {localError && (
          <div className="mt-4 rounded-xl p-3 flex items-center gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <X className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{localError}</span>
          </div>
        )}

        {/* ── Settings ── */}
        <div className="mt-6 space-y-3">

          {/* Sécurité - Mot de passe */}
          <Section icon={<Lock className="w-4 h-4" />} title="Sécurité">
            {user?.hasPassword === false ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Compte connecté via Google — gestion du mot de passe indisponible.
              </p>
            ) : isChangingPassword ? (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <Field label="Mot de passe actuel">
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    className="tsi-input w-full" required />
                </Field>
                <Field label="Nouveau mot de passe">
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="tsi-input w-full" required minLength={8} />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Minimum 8 caractères</p>
                </Field>
                <Field label="Confirmer le nouveau mot de passe">
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="tsi-input w-full" required />
                </Field>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={loadingPassword}
                    className="tsi-btn-primary flex items-center gap-2 disabled:opacity-50">
                    {loadingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button type="button" onClick={() => { setIsChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }}
                    className="tsi-btn-ghost">Annuler</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setIsChangingPassword(true)} className="tsi-btn-primary">
                Changer le mot de passe
              </button>
            )}
          </Section>

          {/* Double Authentification */}
          <Section icon={<Shield className="w-4 h-4" />} title="Double Authentification">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {is2FAEnabled
                  ? <ShieldCheck className="w-5 h-5 text-green-500" />
                  : <ShieldOff className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{is2FAEnabled ? 'Activée' : 'Désactivée'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {is2FAEnabled ? 'Code demandé à chaque connexion' : 'Protégez votre compte par email'}
                  </p>
                </div>
              </div>
              {!showDisable2FA && (
                <button onClick={is2FAEnabled ? () => setShowDisable2FA(true) : handleEnable2FA}
                  disabled={loading2FA}
                  className={`flex items-center gap-2 disabled:opacity-50 text-sm ${is2FAEnabled ? 'tsi-btn-danger' : 'tsi-btn-primary'}`}>
                  {loading2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : is2FAEnabled ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {is2FAEnabled ? 'Désactiver' : 'Activer'}
                </button>
              )}
            </div>

            {showDisable2FA && (
              <form onSubmit={handleDisable2FA} className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                {user?.hasPassword !== false && (
                  <Field label="Mot de passe pour confirmer">
                    <input type="password" value={disable2FAPassword} onChange={e => setDisable2FAPassword(e.target.value)}
                      placeholder="••••••••" className="tsi-input w-full" />
                  </Field>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={loading2FA || (user?.hasPassword !== false && !disable2FAPassword)}
                    className="tsi-btn-danger flex items-center gap-2 disabled:opacity-50">
                    {loading2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                    Désactiver
                  </button>
                  <button type="button" onClick={() => { setShowDisable2FA(false); setDisable2FAPassword('') }}
                    className="tsi-btn-ghost">Annuler</button>
                </div>
              </form>
            )}
          </Section>

          {/* Apparence / Thème */}
          <Section icon={<Palette className="w-4 h-4" />} title="Apparence">
            {/* Mode Sombre */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Mode Sombre</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Basculer en thème sombre ou clair</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Mode OLED */}
            {darkMode && (
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-white/5 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-black border border-gray-800 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Mode Profond (OLED)</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Contraste maximal avec fond noir pur</p>
                  </div>
                </div>
                <button
                  onClick={toggleDeepDark}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${isDeepDark ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isDeepDark ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            )}

            {/* Couleur d'accentuation */}
            <div>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Couleur d'accentuation</p>
              <div className="flex flex-wrap gap-3 items-center">
                {Object.entries(colorVariants).map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setAccentColor(key)}
                    className={`nav-btn p-1 rounded-full transition-all flex items-center justify-center`}
                    style={{
                      border: (!isCustomColor && accentColor === key) ? `2px solid ${darkMode ? color.darkHex : color.hex}` : '2px solid transparent',
                      padding: '2px'
                    }}
                    title={`Thème ${key}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full shadow-sm"
                      style={{ background: darkMode ? color.darkHex : color.hex }}
                    >
                      {(!isCustomColor && accentColor === key) && <Check className="w-4 h-4 text-white m-auto mt-2" />}
                    </div>
                  </button>
                ))}

                {/* Custom Color Picker */}
                <div
                  className="relative flex items-center justify-center rounded-full p-1"
                  style={{
                    border: isCustomColor ? `2px solid ${accentColor}` : '2px solid transparent',
                  }}
                  title="Couleur personnalisée"
                >
                  <label htmlFor="custom-color-picker" className="cursor-pointer w-8 h-8 rounded-full overflow-hidden shadow-sm relative group">
                    <input
                      id="custom-color-picker"
                      type="color"
                      value={isCustomColor ? accentColor : (darkMode ? colorVariants.blue.darkHex : colorVariants.blue.hex)}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="absolute inset-0 w-16 h-16 -top-4 -left-4 cursor-pointer"
                    />
                    {isCustomColor ? (
                      <Check className="w-4 h-4 text-white absolute top-2 left-2 pointer-events-none drop-shadow-md" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center">
                        <span className="text-white text-lg leading-none mt-[-2px]">+</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </Section>

          {/* Amis Proches */}
          <Section icon={<Users className="w-4 h-4" />} title="Amis Proches">
            <CloseFriendsManager />
          </Section>

          {/* Notifications */}
          <Section icon={<Bell className="w-4 h-4" />} title="Notifications">
            <NotificationSettings isAuthenticated={isAuthenticated} token={getToken()} />
          </Section>

          {/* Connexions récentes */}
          {sessions.length > 0 && (
            <Section icon={<Clock className="w-4 h-4" />} title="Connexions récentes">
              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <div key={s.id || i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}>
                      {s.device === 'Mobile'
                        ? <Smartphone className="w-4 h-4" />
                        : <Monitor className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {s.browser}{s.os ? ` · ${s.os}` : ''}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {s.ip} · {relativeTime(s.timestamp)}
                      </p>
                    </div>
                    {i === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
                        Récent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days}j`
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function StatPill({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3 rounded-xl"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--accent)' }}>{icon}</div>
      <span className="text-lg font-bold leading-none" style={{ color: 'var(--text)' }}>
        {value === '—' ? '—' : value?.toLocaleString?.() ?? value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>
        {icon}
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
