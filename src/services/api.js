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
  async getDocuments() {
    const response = await fetch(`${API_BASE}/documents`)
    if (!response.ok) throw new Error('Erreur lors du chargement des documents')
    return response.json()
  },

  async uploadDocument(formData) {
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
  async getKolles() {
    const response = await fetch(`${API_BASE}/kolles`)
    if (!response.ok) throw new Error('Erreur lors du chargement des programmes de khôlles')
    return response.json()
  },

  async uploadKolle(formData) {
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

  async getAnnualPrograms() {
    const response = await fetch(`${API_BASE}/kolles/annual-programs`)
    if (!response.ok) throw new Error('Erreur lors du chargement des programmes annuels')
    return response.json()
  },

  async uploadAnnualProgram(formData) {
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

  async getActiveAnnualProgram() {
    const response = await fetch(`${API_BASE}/kolles/annual-programs/active`)
    if (!response.ok) throw new Error('Erreur lors du chargement du programme annuel actif')
    return response.json()
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
    try {
      const response = await fetch(`${API_BASE}/classes`)
      if (!response.ok) throw new Error('API non disponible')
      return response.json()
    } catch (error) {
      // Fallback vers les classes par défaut si l'API n'est pas disponible
      console.log('API classes non disponible, utilisation des classes par défaut')
      return [
        { id: 'tsi1', name: 'TSI 1ère année', description: 'Technologie et Sciences Industrielles - 1ère année', color: 'blue' },
        { id: 'tsi2', name: 'TSI 2ème année', description: 'Technologie et Sciences Industrielles - 2ème année', color: 'green' },
        { id: 'mpsi', name: 'MPSI', description: 'Mathématiques, Physique et Sciences de l\'Ingénieur', color: 'purple' },
        { id: 'mp', name: 'MP', description: 'Mathématiques, Physique', color: 'red' },
        { id: 'pcsi', name: 'PCSI', description: 'Physique, Chimie et Sciences de l\'Ingénieur', color: 'yellow' },
        { id: 'pc', name: 'PC', description: 'Physique, Chimie', color: 'indigo' }
      ]
    }
  },

  async createClass(classData) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/classes`, {
        method: 'POST',
        body: JSON.stringify(classData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création de la classe')
      }
      return response.json()
    } catch (error) {
      // Mode simulation pour développement
      console.log('Mode simulation: classe créée localement')
      return { success: true, class: classData }
    }
  },

  async updateClass(classId, classData) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/classes/${classId}`, {
        method: 'PUT', 
        body: JSON.stringify(classData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la modification de la classe')
      }
      return response.json()
    } catch (error) {
      // Mode simulation pour développement
      console.log('Mode simulation: classe modifiée localement')
      return { success: true, class: { ...classData, id: classId } }
    }
  },

  async deleteClass(classId) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/classes/${classId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression de la classe')
      }
      return response.json()
    } catch (error) {
      // Mode simulation pour développement
      console.log('Mode simulation: classe supprimée localement')
      return { success: true, deleted: classId }
    }
  },

  async getClassStats(classId) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/classes/${classId}/stats`)
      if (!response.ok) throw new Error('Erreur lors du chargement des statistiques de la classe')
      return response.json()
    } catch (error) {
      // Statistiques par défaut
      return {
        documents: 0,
        kolles: 0,
        evaluations: 0,
        chapters: 8
      }
    }
  }
}

export const progressionAPI = {
  async getProgression(classId) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/progression/${classId}`)
      if (!response.ok) throw new Error('API non disponible')
      return response.json()
    } catch (error) {
      console.log('API progression non disponible, utilisation du localStorage')
      // Fallback vers localStorage
      const saved = localStorage.getItem(`progression_${classId}`)
      if (saved) {
        return JSON.parse(saved)
      }
      return null // Pas de progression sauvegardée
    }
  },

  async updateProgression(classId, progressionData) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/progression/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(progressionData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour de la progression')
      }
      return response.json()
    } catch (error) {
      console.log('Mode simulation: progression sauvegardée localement')
      // Sauvegarder localement
      localStorage.setItem(`progression_${classId}`, JSON.stringify(progressionData))
      return { success: true, progression: progressionData }
    }
  },

  async updateChapterStatus(classId, chapterId, status) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/progression/${classId}/chapters/${chapterId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour du statut du chapitre')
      }
      return response.json()
    } catch (error) {
      console.log('Mode simulation: statut du chapitre mis à jour localement')
      // Mise à jour locale
      const saved = localStorage.getItem(`progression_${classId}`)
      if (saved) {
        const progression = JSON.parse(saved)
        if (progression.chapters) {
          progression.chapters = progression.chapters.map(chapter =>
            chapter.id === chapterId ? { ...chapter, status } : chapter
          )
          localStorage.setItem(`progression_${classId}`, JSON.stringify(progression))
        }
      }
      return { success: true, chapterId, status }
    }
  },

  async updateChapterOrder(classId, chapters) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/progression/${classId}/order`, {
        method: 'PUT',
        body: JSON.stringify({ chapters })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour de l\'ordre des chapitres')
      }
      return response.json()
    } catch (error) {
      console.log('Mode simulation: ordre des chapitres mis à jour localement')
      // Mise à jour locale
      const progression = { chapters }
      localStorage.setItem(`progression_${classId}`, JSON.stringify(progression))
      return { success: true, chapters }
    }
  },

  async resetProgression(classId) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/progression/${classId}/reset`, {
        method: 'POST'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la réinitialisation de la progression')
      }
      return response.json()
    } catch (error) {
      console.log('Mode simulation: progression réinitialisée localement')
      // Réinitialisation locale
      localStorage.removeItem(`progression_${classId}`)
      return { success: true, reset: true }
    }
  }
}