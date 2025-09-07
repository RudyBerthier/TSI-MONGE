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

export const documentsAPI = {
  async getDocuments(classFilter = null) {
    const currentClass = classFilter || getCurrentClass()
    console.log('📄 [DEBUG API] getDocuments called with classFilter:', classFilter, 'using class:', currentClass)
    const response = await fetch(`${API_BASE}/documents?class=${currentClass}`)
    if (!response.ok) throw new Error('Erreur lors du chargement des documents')
    return response.json()
  },

  async uploadDocument(formData, classOverride = null) {
    const currentClass = classOverride || getCurrentClass()
    formData.append('class', currentClass)
    const response = await authenticatedFetch(`${API_BASE}/documents`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) throw new Error('Erreur lors de l\'upload du document')
    return response.json()
  },

  async updateDocument(id, data) {
    const response = await authenticatedFetch(`${API_BASE}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Erreur lors de la modification du document')
    return response.json()
  },

  async deleteDocument(id) {
    const response = await authenticatedFetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Erreur lors de la suppression du document')
    return response.json()
  },

  async getDocumentStats() {
    const response = await authenticatedFetch(`${API_BASE}/documents/admin/stats`)
    if (!response.ok) throw new Error('Erreur lors du chargement des statistiques')
    return response.json()
  }
}

export const kollesAPI = {
  async getKolles(classFilter = null) {
    const currentClass = classFilter || getCurrentClass()
    console.log('📚 [DEBUG API] getKolles called with classFilter:', classFilter, 'using class:', currentClass)
    const response = await fetch(`${API_BASE}/kolles?class=${currentClass}`)
    if (!response.ok) throw new Error('Erreur lors du chargement des programmes de khôlles')
    return response.json()
  },

  async uploadKolle(formData, classOverride = null) {
    const currentClass = classOverride || getCurrentClass()
    formData.append('class', currentClass)
    const response = await authenticatedFetch(`${API_BASE}/kolles`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) throw new Error('Erreur lors de l\'upload du programme')
    return response.json()
  },

  async updateKolle(id, data) {
    const response = await authenticatedFetch(`${API_BASE}/kolles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Erreur lors de la modification du programme')
    return response.json()
  },

  async deleteKolle(id) {
    const response = await authenticatedFetch(`${API_BASE}/kolles/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Erreur lors de la suppression du programme')
    return response.json()
  },

  async getKolleStats() {
    const response = await authenticatedFetch(`${API_BASE}/kolles/admin/stats`)
    if (!response.ok) throw new Error('Erreur lors du chargement des statistiques')
    return response.json()
  },

  async getAnnualPrograms(classFilter = null) {
    const currentClass = classFilter || getCurrentClass()
    console.log('📅 [DEBUG API] getAnnualPrograms called with classFilter:', classFilter, 'using class:', currentClass)
    const response = await fetch(`${API_BASE}/kolles/annual-programs?class=${currentClass}`)
    if (!response.ok) throw new Error('Erreur lors du chargement des programmes annuels')
    return response.json()
  },

  async uploadAnnualProgram(formData, classOverride = null) {
    const currentClass = classOverride || getCurrentClass()
    formData.append('class', currentClass)
    console.log('📅 [DEBUG API] uploadAnnualProgram for class:', currentClass)
    const response = await authenticatedFetch(`${API_BASE}/kolles/annual-programs`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) throw new Error('Erreur lors de l\'upload du programme annuel')
    return response.json()
  },

  async updateAnnualProgram(id, data) {
    const response = await authenticatedFetch(`${API_BASE}/kolles/annual-programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Erreur lors de la modification du programme annuel')
    return response.json()
  },

  async deleteAnnualProgram(id) {
    const response = await authenticatedFetch(`${API_BASE}/kolles/annual-programs/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Erreur lors de la suppression du programme annuel')
    return response.json()
  },

  async toggleAnnualProgram(id) {
    const response = await authenticatedFetch(`${API_BASE}/kolles/annual-programs/${id}/toggle`, {
      method: 'PATCH'
    })
    if (!response.ok) throw new Error('Erreur lors de l\'activation du programme annuel')
    return response.json()
  },

  async getActiveAnnualProgram(classId = null) {
    const url = classId 
      ? `${API_BASE}/kolles/annual-programs/active?class=${classId}`
      : `${API_BASE}/kolles/annual-programs/active`
    
    console.log('🔍 [DEBUG API] Fetching active annual programs from:', url)
    const response = await fetch(url)
    if (!response.ok) {
      console.log('❌ [DEBUG API] Failed to fetch active annual programs:', response.status, response.statusText)
      throw new Error('Erreur lors du chargement des programmes annuels actifs')
    }
    const data = await response.json()
    console.log('📋 [DEBUG API] Active annual programs response:', data)
    
    // Si une classe est spécifiée, retourner le premier programme trouvé (ou null)
    // Si pas de classe, retourner tous les programmes actifs
    if (classId) {
      return data && data.length > 0 ? data[0] : null
    } else {
      return data
    }
  }
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

export const chaptersAPI = {
  async getChapters() {
    const response = await fetch(`${API_BASE}/chapters`)
    if (!response.ok) throw new Error('Erreur lors du chargement des chapitres')
    return response.json()
  },

  async addChapter(chapterData) {
    const response = await authenticatedFetch(`${API_BASE}/chapters`, {
      method: 'POST',
      body: JSON.stringify(chapterData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de l\'ajout du chapitre')
    }
    return response.json()
  },

  async updateChapter(chapterId, chapterData) {
    const response = await authenticatedFetch(`${API_BASE}/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(chapterData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la modification du chapitre')
    }
    return response.json()
  },

  async deleteChapter(chapterId) {
    const response = await authenticatedFetch(`${API_BASE}/chapters/${chapterId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la suppression du chapitre')
    }
    return response.json()
  }
}

export const classAPI = {
  async getAvailableClasses() {
    console.log('🌐 [DEBUG API] Appel GET /api/classes...')
    console.log('🌐 [DEBUG API] URL complète:', `${API_BASE}/classes`)
    try {
      const response = await fetch(`${API_BASE}/classes`)
      console.log('🌐 [DEBUG API] Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [DEBUG API] Réponse d\'erreur:', errorText)
        throw new Error(`Erreur lors du chargement des classes: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ [DEBUG API] Données JSON reçues:', data)
      console.log('✅ [DEBUG API] Type des données:', typeof data, 'Array:', Array.isArray(data))
      return data
    } catch (error) {
      console.error('❌ [DEBUG API] Erreur dans getAvailableClasses:', error)
      throw error
    }
  },

  async createClass(classData) {
    const response = await authenticatedFetch(`${API_BASE}/classes`, {
      method: 'POST',
      body: JSON.stringify(classData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la création de la classe')
    }
    return response.json()
  },

  async updateClass(classId, classData) {
    const response = await authenticatedFetch(`${API_BASE}/classes/${classId}`, {
      method: 'PUT', 
      body: JSON.stringify(classData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la modification de la classe')
    }
    return response.json()
  },

  async deleteClass(classId) {
    const response = await authenticatedFetch(`${API_BASE}/classes/${classId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la suppression de la classe')
    }
    return response.json()
  },

  async getClassStats(classId) {
    const response = await authenticatedFetch(`${API_BASE}/classes/${classId}/stats`)
    if (!response.ok) throw new Error('Erreur lors du chargement des statistiques de la classe')
    return response.json()
  }
}

export const progressionAPI = {
  async getProgression(classId) {
    const response = await authenticatedFetch(`${API_BASE}/progression/${classId}`)
    if (!response.ok) throw new Error('Erreur lors du chargement de la progression')
    return response.json()
  },

  async updateProgression(classId, progressionData) {
    const response = await authenticatedFetch(`${API_BASE}/progression/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(progressionData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la mise à jour de la progression')
    }
    return response.json()
  },

  async updateChapterStatus(classId, chapterId, status) {
    const response = await authenticatedFetch(`${API_BASE}/progression/${classId}/chapters/${chapterId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la mise à jour du statut du chapitre')
    }
    return response.json()
  },

  async updateChapterOrder(classId, chapters) {
    const response = await authenticatedFetch(`${API_BASE}/progression/${classId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ chapters })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la mise à jour de l\'ordre des chapitres')
    }
    return response.json()
  },

  async resetProgression(classId) {
    const response = await authenticatedFetch(`${API_BASE}/progression/${classId}/reset`, {
      method: 'POST'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la réinitialisation de la progression')
    }
    return response.json()
  }
}

// API pour la gestion des paramètres du site
export const settingsAPI = {
  async getSettings() {
    console.log('⚙️ [DEBUG API] getSettings called')
    const response = await authenticatedFetch(`${API_BASE}/settings`)
    if (!response.ok) throw new Error('Erreur lors du chargement des paramètres')
    return response.json()
  },

  async updateSettings(settings) {
    console.log('⚙️ [DEBUG API] updateSettings called with:', settings)
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