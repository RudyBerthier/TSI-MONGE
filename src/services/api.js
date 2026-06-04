const API_BASE = '/api'

// Helper function to get current class
const getCurrentClass = () => {
  return localStorage.getItem('selectedClass') || 'tsi1'
}

// Helper function for authenticated requests
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  const currentClass = getCurrentClass()
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Class-ID': currentClass, // Ajouter l'ID de classe dans les headers
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

// Helper function for authenticated fetch
const authenticatedFetch = async (url, options = {}) => {
  const headers = getAuthHeaders()
  
  // For FormData, don't set Content-Type (let browser set it)
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })
}

export const authAPI = {
  async login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    if (!response.ok) throw new Error('Erreur de connexion')
    return response.json()
  },

  async logout() {
    const response = await authenticatedFetch(`${API_BASE}/auth/logout`, {
      method: 'POST'
    })
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return response.json()
  },

  async verifyToken() {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Pas de token')
    
    const response = await authenticatedFetch(`${API_BASE}/auth/verify`)
    if (!response.ok) throw new Error('Token invalide')
    return response.json()
  },

  async getUsers() {
    const response = await authenticatedFetch(`${API_BASE}/auth/users`)
    if (!response.ok) throw new Error('Erreur lors du chargement des utilisateurs')
    return response.json()
  },

  async addUser(userData) {
    const response = await authenticatedFetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      body: JSON.stringify(userData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de l\'ajout de l\'utilisateur')
    }
    return response.json()
  },

  async updateUser(userId, userData) {
    const response = await authenticatedFetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la modification de l\'utilisateur')
    }
    return response.json()
  },

  async deleteUser(userId) {
    const response = await authenticatedFetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la suppression de l\'utilisateur')
    }
    return response.json()
  }
}


// API pour la gestion des paramètres du site
export const settingsAPI = {
  async getSettings() {
    const response = await authenticatedFetch(`${API_BASE}/settings`)
    if (!response.ok) throw new Error('Erreur lors du chargement des paramètres')
    return response.json()
  },

  async updateSettings(settings) {
    const response = await authenticatedFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la mise à jour des paramètres')
    }
    return response.json()
  }
}

export const adminLogsAPI = {
  async getLogs({ search = '', category = '', page = 1 } = {}) {
    const params = new URLSearchParams({ page, limit: 40 })
    if (search)   params.set('search', search)
    if (category) params.set('category', category)
    const response = await authenticatedFetch(`${API_BASE}/admin/logs?${params}`)
    if (!response.ok) throw new Error('Erreur chargement logs')
    return response.json()
  },

  async clearLogs() {
    const response = await authenticatedFetch(`${API_BASE}/admin/logs`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Erreur suppression logs')
    return response.json()
  },
}
