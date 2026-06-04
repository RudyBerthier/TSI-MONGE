import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

const API_URL = '/api/auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userSettings, setUserSettings] = useState({})

  const fetchUserSettings = async (token) => {
    try {
      const res = await fetch(`${API_URL}/user-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const settings = await res.json()
        setUserSettings(settings)
        // Synchroniser vers le localStorage pour que la valeur par défaut des autres Contextes au refresh soit correcte
        if (settings.theme) localStorage.setItem('theme', settings.theme)
        if (settings.deepDark !== undefined) localStorage.setItem('deepDark', settings.deepDark)
        if (settings.accentColor) localStorage.setItem('accentColor', settings.accentColor)
        if (settings.tsi_dashboard_order) localStorage.setItem('tsi_dashboard_order', JSON.stringify(settings.tsi_dashboard_order))
        if (settings.colloscope_trinome !== undefined) localStorage.setItem('colloscope_trinome', settings.colloscope_trinome.toString())
        if (settings.cantine_pseudo !== undefined) localStorage.setItem('cantine_pseudo', settings.cantine_pseudo)
        if (settings.subject_colors !== undefined) localStorage.setItem('subject_colors', JSON.stringify(settings.subject_colors))
      }
    } catch (err) { console.error(err) }
  }

  const updateUserSettings = async (patch) => {
    // Mise à jour optimiste
    setUserSettings(prev => {
      const updated = { ...prev, ...patch }
      // On met aussi à jour le localStorage pour que ce soit direct
      if (patch.theme !== undefined) localStorage.setItem('theme', patch.theme)
      if (patch.deepDark !== undefined) localStorage.setItem('deepDark', patch.deepDark)
      if (patch.accentColor !== undefined) localStorage.setItem('accentColor', patch.accentColor)
      if (patch.tsi_dashboard_order !== undefined) localStorage.setItem('tsi_dashboard_order', JSON.stringify(patch.tsi_dashboard_order))
      if (patch.colloscope_trinome !== undefined) localStorage.setItem('colloscope_trinome', patch.colloscope_trinome.toString())
      if (patch.cantine_pseudo !== undefined) localStorage.setItem('cantine_pseudo', patch.cantine_pseudo)
      if (patch.subject_colors !== undefined) localStorage.setItem('subject_colors', JSON.stringify(patch.subject_colors))
      return updated
    })

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch(`${API_URL}/user-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(patch)
      })
    } catch (err) {
      console.error('Erreur update settings:', err)
    }
  }

  // Vérifier le token au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_URL}/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          // Mettre à jour le localStorage avec les dernières données
          localStorage.setItem('user', JSON.stringify(data.user))
          await fetchUserSettings(token)
        } else if (res.status === 401 || res.status === 403) {
          // Token invalide ou expiré, on déconnecte
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUserSettings({})
        } else {
          // Erreur serveur temporelle (500, 502, 503 pendant un déploiement)
          // On garde le token mais on charge l'utilisateur depuis le cache local s'il existe
          console.warn(`Serveur injoignable (${res.status}), session conservée en cache`)
          const cachedUser = localStorage.getItem('user')
          if (cachedUser) {
            setUser(JSON.parse(cachedUser))
          }
        }
      } catch (err) {
        console.error('Erreur vérification auth:', err)
        // Erreur réseau (ex: pas d'internet, serveur complétement down)
        // Garder l'utilisateur connecté via le cache local
        const cachedUser = localStorage.getItem('user')
        if (cachedUser) {
          setUser(JSON.parse(cachedUser))
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Inscription
  const register = async (email, username, password) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription')
      }

      return { success: true, email: data.email, message: data.message }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Vérification email
  const verifyEmail = async (email, code) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Code invalide')
      }

      // Sauvegarder le token et l'utilisateur
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      await fetchUserSettings(data.token)

      return { success: true, user: data.user }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Renvoyer le code
  const resendCode = async (email) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du renvoi')
      }

      return { success: true, message: data.message }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Mot de passe oublié - demander un code
  const forgotPassword = async (email) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      return { success: true, message: data.message }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Réinitialiser le mot de passe avec le code
  const resetPassword = async (email, code, newPassword) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      return { success: true, message: data.message }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Connexion
  const login = async (identifier, password) => {
    setError(null)
    try {
      const isEmail = identifier.includes('@')
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isEmail ? 'email' : 'username']: identifier,
          password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de connexion')
      }

      // Vérifier si 2FA est requise
      if (data.requires2FA) {
        return { success: true, requires2FA: true, email: data.email, message: data.message }
      }

      // Sauvegarder le token et l'utilisateur
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      await fetchUserSettings(data.token)

      return { success: true, user: data.user }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Connexion via Google (accepte credential ou access_token)
  const loginWithGoogle = async (tokenData) => {
    setError(null)
    try {
      const body = typeof tokenData === 'string'
        ? { credential: tokenData }
        : { access_token: tokenData.access_token }
      const res = await fetch(`${API_URL}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de connexion Google')
      }

      if (data.requires2FA) {
        return { success: true, requires2FA: true, email: data.email, message: data.message }
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      await fetchUserSettings(data.token)

      return { success: true, user: data.user, accountLinked: data.accountLinked }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Vérifier le code 2FA pour la connexion
  const verifyLogin2FA = async (email, code) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Code invalide')
      }

      // Sauvegarder le token et l'utilisateur
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      return { success: true, user: data.user }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Activer la 2FA directement
  const enable2FA = async () => {
    setError(null)
    const token = getToken()
    if (!token) return { success: false, error: 'Non connecté' }

    try {
      const res = await fetch(`${API_URL}/2fa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      // Mettre à jour l'utilisateur local
      if (user) {
        const updatedUser = { ...user, twoFactorEnabled: true }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      }

      return { success: true, message: data.message }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Désactiver la 2FA
  const disable2FA = async (password) => {
    setError(null)
    const token = getToken()
    if (!token) return { success: false, error: 'Non connecté' }

    try {
      const res = await fetch(`${API_URL}/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      // Mettre à jour l'utilisateur local
      if (user) {
        const updatedUser = { ...user, twoFactorEnabled: false }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      }

      return { success: true, message: data.message }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Vérifier le statut 2FA
  const get2FAStatus = async () => {
    const token = getToken()
    if (!token) return { enabled: false }

    try {
      const res = await fetch(`${API_URL}/2fa/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        return await res.json()
      }
      return { enabled: false }
    } catch (err) {
      return { enabled: false }
    }
  }

  // Déconnexion
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setUserSettings({})
  }

  // Obtenir le token
  const getToken = () => localStorage.getItem('token')

  // Obtenir le profil complet
  const getProfile = async () => {
    const token = getToken()
    if (!token) return null

    try {
      const res = await fetch(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        return await res.json()
      }
      return null
    } catch (err) {
      console.error('Erreur récupération profil:', err)
      return null
    }
  }

  // Mettre à jour le profil
  const updateProfile = async (data) => {
    setError(null)
    const token = getToken()
    if (!token) return { success: false, error: 'Non connecté' }

    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la mise à jour')
      }

      // Mettre à jour le token et l'utilisateur
      if (result.token) {
        localStorage.setItem('token', result.token)
      }
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user))
        setUser(result.user)
      }

      return { success: true, user: result.user }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Upload d'avatar
  const uploadAvatar = async (file) => {
    setError(null)
    const token = getToken()
    if (!token) return { success: false, error: 'Non connecté' }

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch(`${API_URL}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de l\'upload')
      }

      // Mettre à jour l'avatar dans l'utilisateur
      const updatedUser = { ...user, avatar: result.avatar }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)

      return { success: true, avatar: result.avatar }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Supprimer l'avatar
  const deleteAvatar = async () => {
    setError(null)
    const token = getToken()
    if (!token) return { success: false, error: 'Non connecté' }

    try {
      const res = await fetch(`${API_URL}/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression')
      }

      // Mettre à jour l'utilisateur
      const updatedUser = { ...user, avatar: null }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)

      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Changer le mot de passe
  const changePassword = async (currentPassword, newPassword) => {
    setError(null)
    const token = getToken()
    if (!token) return { success: false, error: 'Non connecté' }

    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors du changement de mot de passe')
      }

      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    verifyEmail,
    resendCode,
    forgotPassword,
    resetPassword,
    login,
    loginWithGoogle,
    verifyLogin2FA,
    enable2FA,
    disable2FA,
    get2FAStatus,
    logout,
    getToken,
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    userSettings,
    updateUserSettings,
    clearError: () => setError(null)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
