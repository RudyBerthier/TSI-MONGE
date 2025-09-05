import { useState, useEffect } from 'react'
import { Upload, Settings, LogOut, Home, FileText, Target, BarChart3, Wrench, Calendar, FolderPlus, Edit3, Trash2, Plus, BookOpen, Users, Palette, Calculator, Compass, Activity, TrendingUp, Hash, Brain, Dice6, Zap, Type, X, UserPlus, CheckCircle, Clock, PlayCircle, CheckSquare, ArrowUp, ArrowDown, School, GraduationCap } from 'lucide-react'

const categories = {
  geometrie: { name: 'Géométrie', icon: <Compass size={24} /> },
  calculs: { name: 'Calculs', icon: <Calculator size={24} /> },
  fonctions: { name: 'Fonctions', icon: <TrendingUp size={24} /> },
  suites: { name: 'Suites', icon: <Hash size={24} /> },
  ensembles: { name: 'Ensembles et raisonnements', icon: <Brain size={24} /> },
  probabilites: { name: 'Probabilités', icon: <Dice6 size={24} /> },
  complexes: { name: 'Nombres complexes', icon: <Zap size={24} /> },
  algebre: { name: 'Algèbre', icon: <Type size={24} /> }
}
import { documentsAPI, kollesAPI, authAPI, chaptersAPI, classAPI, progressionAPI } from '../services/api'
import { useClass, AVAILABLE_CLASSES } from '../contexts/ClassContext'
import { useNavigate } from 'react-router-dom'

export function Admin() {
  const { currentClass, resetClassSelection } = useClass()
  const [stats, setStats] = useState({ documents: 0, themes: 8, kolles: 0, evaluations: 0 })
  const [activeTab, setActiveTab] = useState('documents')
  const [selectedAdminClass, setSelectedAdminClass] = useState(null) // Classe sélectionnée pour l'admin
  const [adminMode, setAdminMode] = useState('classSelection') // 'classSelection' ou 'classManagement'
  const [availableClasses, setAvailableClasses] = useState(AVAILABLE_CLASSES)
  const [showClassModal, setShowClassModal] = useState(false)
  const [classModalMode, setClassModalMode] = useState('add')
  const [selectedClassData, setSelectedClassData] = useState(null)
  const [documents, setDocuments] = useState([])
  const [kolles, setKolles] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [showGenericDeleteModal, setShowGenericDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [deleteAction, setDeleteAction] = useState(null)
  const [annualPrograms, setAnnualPrograms] = useState([])
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [documentModalMode, setDocumentModalMode] = useState('edit')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showKolleEditModal, setShowKolleEditModal] = useState(false)
  const [selectedKolle, setSelectedKolle] = useState(null)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [chapterModalMode, setChapterModalMode] = useState('add')
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [showAnnualProgramModal, setShowAnnualProgramModal] = useState(false)
  const [selectedAnnualProgram, setSelectedAnnualProgram] = useState(null)
  const [showKolleModal, setShowKolleModal] = useState(false)
  const [kolleModalMode, setKolleModalMode] = useState('edit')
  const [progressionChapters, setProgressionChapters] = useState([
    { id: 'geometrie-1', title: 'I. Géométrie 1', subtitle: 'Vecteurs, bases et repères', status: 'en-cours', order: 1 },
    { id: 'calculs-1', title: 'II. Calculs 1', subtitle: 'Trigonométrie', status: 'en-cours', order: 2 },
    { id: 'fonctions-1', title: 'III. Fonctions 1', subtitle: 'Généralités et structure', status: 'en-cours', order: 3 },
    { id: 'suites-1', title: 'IV. Suites 1', subtitle: 'Définitions et propriétés', status: 'a-venir', order: 4 },
    { id: 'algebre-1', title: 'V. Algèbre 1', subtitle: 'Polynômes et fractions rationnelles', status: 'a-venir', order: 5 },
    { id: 'geometrie-2', title: 'VI. Géométrie 2', subtitle: 'Géométrie dans l\'espace', status: 'a-venir', order: 6 },
    { id: 'calculs-2', title: 'VII. Calculs 2', subtitle: 'Dérivation et intégration', status: 'a-venir', order: 7 },
    { id: 'fonctions-2', title: 'VIII. Fonctions 2', subtitle: 'Fonctions usuelles', status: 'a-venir', order: 8 }
  ])
  const [chapters, setChapters] = useState([
    { id: 'geometrie', name: 'Géométrie', icon: 'Compass', description: 'Vecteurs, repères, droites et plans' },
    { id: 'fonctions', name: 'Fonctions', icon: 'Activity', description: 'Étude de fonctions, dérivation' },
    { id: 'suites', name: 'Suites', icon: 'BarChart3', description: 'Suites numériques et convergence' },
    { id: 'ensembles', name: 'Ensembles et raisonnements', icon: 'Target', description: 'Logique mathématique et ensembles' },
    { id: 'probabilites', name: 'Probabilités', icon: 'Palette', description: 'Probabilités et statistiques' },
    { id: 'calculs', name: 'Calculs', icon: 'Calculator', description: 'Techniques de calcul' },
    { id: 'complexes', name: 'Nombres complexes', icon: 'Plus', description: 'Nombres complexes et applications' },
    { id: 'algebre', name: 'Algèbre', icon: 'BookOpen', description: 'Algèbre linéaire et matrices' }
  ])
  const [chapterSortBy, setChapterSortBy] = useState('name')
  const navigate = useNavigate()

  useEffect(() => {
    checkAuthentication()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments()
      loadKolles()
      loadUsers()
      loadChapters()
      loadAnnualPrograms()
    }
  }, [isAuthenticated])

  const checkAuthentication = async () => {
    try {
      await authAPI.verifyToken()
      setIsAuthenticated(true)
      loadStats()
    } catch (error) {
      // Rediriger vers la page de login si non authentifié
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const [docStats, kolleStats] = await Promise.all([
        documentsAPI.getDocumentStats(),
        kollesAPI.getKolleStats()
      ])
      
      // Compter les évaluations (DS, DM, AP, Interro)
      const docsData = await documentsAPI.getDocuments()
      let evaluationsCount = 0
      
      // Traiter les données selon le format (objet ou tableau)
      if (Array.isArray(docsData)) {
        evaluationsCount = docsData.filter(doc => ['ds', 'dm', 'ap', 'interro'].includes(doc.type)).length
      } else if (typeof docsData === 'object') {
        // Si c'est un objet groupé par catégorie
        Object.values(docsData).forEach(categoryDocs => {
          if (Array.isArray(categoryDocs)) {
            evaluationsCount += categoryDocs.filter(doc => ['ds', 'dm', 'ap', 'interro'].includes(doc.type)).length
          }
        })
      }
      
      setStats({
        documents: docStats.total,
        themes: Object.keys(docStats.by_category || {}).length || 8,
        kolles: kolleStats.total,
        evaluations: evaluationsCount
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      const docs = await documentsAPI.getDocuments()
      setDocuments(docs)
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const loadKolles = async () => {
    try {
      const kollesList = await kollesAPI.getKolles()
      setKolles(kollesList)
    } catch (error) {
      console.error('Error loading kolles:', error)
    }
  }

  const handleDocumentSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      await documentsAPI.uploadDocument(formData)
      alert('Document ajouté avec succès !')
      e.target.reset()
      loadStats() // Recharger les statistiques
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Erreur lors de l\'upload: ' + error.message)
    }
  }

  const handleKolleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      await kollesAPI.uploadKolle(formData)
      alert('Programme de khôlle ajouté avec succès !')
      e.target.reset()
      loadStats() // Recharger les statistiques
    } catch (error) {
      console.error('Error uploading kolle program:', error)
      alert('Erreur lors de l\'upload: ' + error.message)
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      navigate('/login')
    }
  }

  const deleteDocument = async (id) => {
    try {
      await documentsAPI.deleteDocument(id)
      loadStats()
      loadDocuments()
      alert('Document supprimé avec succès !')
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const deleteKolle = async (id) => {
    try {
      await kollesAPI.deleteKolle(id)
      loadStats()
      loadKolles()
      alert('Programme supprimé avec succès !')
    } catch (error) {
      console.error('Error deleting kolle:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const editDocument = async (doc) => {
    setDocumentModalMode('edit')
    setSelectedDocument(doc)
    setShowDocumentModal(true)
  }

  const handleDocumentModalSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const documentData = {
      title: formData.get('title'),
      category: formData.get('category'),
      type: formData.get('type')
    }

    try {
      await documentsAPI.updateDocument(selectedDocument.id, documentData)
      alert(`Document "${selectedDocument.title}" modifié avec succès !`)
      setShowDocumentModal(false)
      loadDocuments()
      loadStats()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const editKolle = async (kolle) => {
    setSelectedKolle(kolle)
    setKolleModalMode('edit')
    setShowKolleModal(true)
  }

  const handleKolleModalSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const kolleData = {
      week_dates: formData.get('week_dates')
    }

    try {
      await kollesAPI.updateKolle(selectedKolle.id, kolleData)
      alert(`Dates du programme semaine ${selectedKolle.week_number} modifiées avec succès !`)
      setShowKolleModal(false)
      loadKolles()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const loadChapters = async () => {
    try {
      const chaptersList = await chaptersAPI.getChapters()
      setChapters(chaptersList)
    } catch (error) {
      console.error('Error loading chapters:', error)
    }
  }

  const editChapter = async (chapter) => {
    setSelectedChapter(chapter)
    setChapterModalMode('edit')
    setShowChapterModal(true)
  }

  const deleteChapter = async (chapterId) => {
    try {
      await chaptersAPI.deleteChapter(chapterId)
      alert('Chapitre supprimé avec succès !')
      loadChapters()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const addChapter = async () => {
    setSelectedChapter(null)
    setChapterModalMode('add')
    setShowChapterModal(true)
  }

  const handleChapterModalSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const chapterData = {
      name: formData.get('name'),
      description: formData.get('description'),
      icon: 'BookOpen'
    }

    try {
      if (chapterModalMode === 'add') {
        await chaptersAPI.addChapter(chapterData)
        alert('Nouveau chapitre ajouté avec succès !')
      } else {
        await chaptersAPI.updateChapter(selectedChapter.id, chapterData)
        alert('Chapitre modifié avec succès !')
      }
      setShowChapterModal(false)
      loadChapters()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const editUser = (user) => {
    setModalMode('edit')
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const addUser = () => {
    setModalMode('add')
    setSelectedUser(null)
    setShowUserModal(true)
  }

  const loadUsers = async () => {
    try {
      const usersList = await authAPI.getUsers()
      setUsers(usersList)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleUserSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const userData = {
      username: formData.get('username'),
      password: formData.get('password'),
      role: formData.get('role')
    }

    try {
      if (modalMode === 'add') {
        await authAPI.addUser(userData)
        alert('Utilisateur ajouté avec succès !')
      } else {
        // Mode édition - ne pas envoyer le mot de passe s'il est vide
        if (!userData.password) {
          delete userData.password
        }
        await authAPI.updateUser(selectedUser.id, userData)
        alert('Utilisateur modifié avec succès !')
      }
      setShowUserModal(false)
      loadUsers()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const confirmDeleteUser = (user) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const showGenericDeleteConfirm = (item, action, type) => {
    setItemToDelete({...item, type})
    setDeleteAction(() => action)
    setShowGenericDeleteModal(true)
  }

  const handleDeleteUser = async () => {
    try {
      await authAPI.deleteUser(userToDelete.id)
      alert(`Utilisateur "${userToDelete.username}" supprimé avec succès !`)
      setShowDeleteModal(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const handleGenericDelete = async () => {
    try {
      await deleteAction()
      setShowGenericDeleteModal(false)
      setItemToDelete(null)
      setDeleteAction(null)
    } catch (error) {
      alert('Erreur lors de la suppression: ' + error.message)
    }
  }

  const loadAnnualPrograms = async () => {
    try {
      const programsList = await kollesAPI.getAnnualPrograms()
      setAnnualPrograms(programsList)
    } catch (error) {
      console.error('Error loading annual programs:', error)
    }
  }

  const handleAnnualProgramSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      await kollesAPI.uploadAnnualProgram(formData)
      alert('Programme annuel ajouté avec succès !')
      e.target.reset()
      loadAnnualPrograms()
    } catch (error) {
      console.error('Error uploading annual program:', error)
      alert('Erreur lors de l\'upload: ' + error.message)
    }
  }

  const deleteAnnualProgram = async (id) => {
    try {
      await kollesAPI.deleteAnnualProgram(id)
      alert('Programme annuel supprimé avec succès !')
      loadAnnualPrograms()
    } catch (error) {
      console.error('Error deleting annual program:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const editAnnualProgram = async (program) => {
    setSelectedAnnualProgram(program)
    setShowAnnualProgramModal(true)
  }

  const handleAnnualProgramModalSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const programData = {
      title: formData.get('title'),
      year: formData.get('year')
    }

    try {
      await kollesAPI.updateAnnualProgram(selectedAnnualProgram.id, programData)
      alert('Programme annuel modifié avec succès !')
      setShowAnnualProgramModal(false)
      loadAnnualPrograms()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const toggleAnnualProgram = async (programId) => {
    try {
      await kollesAPI.toggleAnnualProgram(programId)
      alert('Programme annuel activé avec succès !')
      loadAnnualPrograms()
    } catch (error) {
      console.error('Error toggling annual program:', error)
      alert('Erreur lors de l\'activation')
    }
  }

  // Charger la progression depuis l'API
  const loadProgression = async () => {
    if (!selectedAdminClass) return
    
    try {
      const progression = await progressionAPI.getProgression(selectedAdminClass.id)
      if (progression && progression.chapters) {
        setProgressionChapters(progression.chapters)
        localStorage.setItem('progressionChapters', JSON.stringify(progression.chapters))
      }
    } catch (error) {
      console.log('Pas de progression sauvegardée, utilisation des valeurs par défaut')
      // Garder les valeurs par défaut
    }
  }

  // Fonctions de gestion de la progression
  const updateChapterStatus = async (chapterId, newStatus) => {
    if (!selectedAdminClass) return
    
    const updatedChapters = progressionChapters.map(chapter => 
      chapter.id === chapterId 
        ? { ...chapter, status: newStatus }
        : chapter
    )
    setProgressionChapters(updatedChapters)
    
    try {
      await progressionAPI.updateChapterStatus(selectedAdminClass.id, chapterId, newStatus)
      // Sauvegarder dans localStorage pour synchroniser avec la page Documents
      localStorage.setItem('progressionChapters', JSON.stringify(updatedChapters))
      console.log(`Statut du chapitre ${chapterId} mis à jour: ${newStatus}`)
    } catch (error) {
      console.error('Error updating chapter status:', error)
      // Revenir à l'état précédent en cas d'erreur
      setProgressionChapters(progressionChapters)
    }
  }

  const moveChapterUp = async (chapterId) => {
    if (!selectedAdminClass) return
    
    const chapters = [...progressionChapters]
    const index = chapters.findIndex(c => c.id === chapterId)
    if (index > 0) {
      const temp = chapters[index].order
      chapters[index].order = chapters[index - 1].order
      chapters[index - 1].order = temp
      const sortedChapters = chapters.sort((a, b) => a.order - b.order)
      
      setProgressionChapters(sortedChapters)
      
      try {
        await progressionAPI.updateChapterOrder(selectedAdminClass.id, sortedChapters)
        localStorage.setItem('progressionChapters', JSON.stringify(sortedChapters))
      } catch (error) {
        console.error('Error updating chapter order:', error)
        console.log('Erreur lors du changement d\'ordre, fonctionnement en mode local')
        // Revenir à l'état précédent
        setProgressionChapters(progressionChapters)
      }
    }
  }

  const moveChapterDown = async (chapterId) => {
    if (!selectedAdminClass) return
    
    const chapters = [...progressionChapters]
    const index = chapters.findIndex(c => c.id === chapterId)
    if (index < chapters.length - 1) {
      const temp = chapters[index].order
      chapters[index].order = chapters[index + 1].order
      chapters[index + 1].order = temp
      const sortedChapters = chapters.sort((a, b) => a.order - b.order)
      
      setProgressionChapters(sortedChapters)
      
      try {
        await progressionAPI.updateChapterOrder(selectedAdminClass.id, sortedChapters)
        localStorage.setItem('progressionChapters', JSON.stringify(sortedChapters))
      } catch (error) {
        console.error('Error updating chapter order:', error)
        console.log('Erreur lors du changement d\'ordre, fonctionnement en mode local')
        // Revenir à l'état précédent
        setProgressionChapters(progressionChapters)
      }
    }
  }

  const updateProgressionFromDocuments = async () => {
    // Logique automatique : si un chapitre a des documents, il passe en "en-cours"
    if (!documents || Object.keys(documents).length === 0 || !selectedAdminClass) return

    const updatedChapters = progressionChapters.map(chapter => {
      const categoryKey = chapter.id.split('-')[0] // Ex: 'geometrie-1' -> 'geometrie'
      const hasDocuments = documents[categoryKey] && documents[categoryKey].length > 0
      
      if (hasDocuments && chapter.status === 'a-venir') {
        return { ...chapter, status: 'en-cours' }
      }
      return chapter
    })

    setProgressionChapters(updatedChapters)
    
    try {
      await progressionAPI.updateProgression(selectedAdminClass.id, { chapters: updatedChapters })
      localStorage.setItem('progressionChapters', JSON.stringify(updatedChapters))
    } catch (error) {
      console.error('Error updating progression from documents:', error)
      // Continuer même en cas d'erreur API, pour permettre le fonctionnement hors ligne
    }
  }

  // Mise à jour automatique quand les documents changent
  useEffect(() => {
    updateProgressionFromDocuments()
  }, [documents])

  // Fonctions de gestion des classes
  const deleteClass = async (classId) => {
    try {
      await classAPI.deleteClass(classId)
      setAvailableClasses(prev => prev.filter(c => c.id !== classId))
      alert('Classe supprimée avec succès !')
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Erreur lors de la suppression de la classe')
    }
  }

  const handleClassModalSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const classData = {
      id: formData.get('id'),
      name: formData.get('name'),
      description: formData.get('description'),
      color: formData.get('color')
    }

    try {
      if (classModalMode === 'add') {
        await classAPI.createClass(classData)
        setAvailableClasses(prev => [...prev, classData])
        alert('Classe ajoutée avec succès !')
      } else {
        await classAPI.updateClass(selectedClassData.id, classData)
        setAvailableClasses(prev => prev.map(c => 
          c.id === selectedClassData.id ? { ...c, ...classData } : c
        ))
        alert('Classe modifiée avec succès !')
      }
      setShowClassModal(false)
    } catch (error) {
      console.error('Error managing class:', error)
      alert('Erreur lors de la gestion de la classe')
    }
  }

  // Fonctions de gestion des modes admin
  const selectClassForAdmin = (classData) => {
    setSelectedAdminClass(classData)
    setAdminMode('classManagement')
    // Charger les données de cette classe spécifique
    loadDocuments()
    loadKolles()
    loadProgression()
  }

  const backToClassSelection = () => {
    setAdminMode('classSelection')
    setSelectedAdminClass(null)
    setActiveTab('documents')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // La redirection est gérée dans checkAuthentication
  }

  // Interface de sélection de classe pour l'admin
  const renderClassSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Settings size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Administration Multi-Classes
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Sélectionnez une classe à administrer
          </p>
          <p className="text-gray-500">
            Gestion des documents, khôlles, évaluations et progressions par classe
          </p>
        </div>

        {/* Actions globales */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => {
              setSelectedClassData(null)
              setClassModalMode('add')
              setShowClassModal(true)
            }}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Créer une nouvelle classe
          </button>
          
          <button 
            onClick={logout}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {availableClasses.map((classData) => {
            const getColorClasses = (color) => {
              const colorMap = {
                blue: { bg: 'from-blue-500 to-blue-600', border: 'border-blue-200', hover: 'hover:border-blue-300' },
                green: { bg: 'from-green-500 to-green-600', border: 'border-green-200', hover: 'hover:border-green-300' },
                purple: { bg: 'from-purple-500 to-purple-600', border: 'border-purple-200', hover: 'hover:border-purple-300' },
                red: { bg: 'from-red-500 to-red-600', border: 'border-red-200', hover: 'hover:border-red-300' },
                yellow: { bg: 'from-yellow-500 to-yellow-600', border: 'border-yellow-200', hover: 'hover:border-yellow-300' },
                indigo: { bg: 'from-indigo-500 to-indigo-600', border: 'border-indigo-200', hover: 'hover:border-indigo-300' }
              }
              return colorMap[color] || colorMap.blue
            }
            
            const colors = getColorClasses(classData.color)
            
            return (
              <div key={classData.id} className={`group relative bg-white rounded-xl border-2 ${colors.border} ${colors.hover} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
                {/* Actions flottantes */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedClassData(classData)
                      setClassModalMode('edit')
                      setShowClassModal(true)
                    }}
                    className="p-2 bg-white rounded-lg shadow-md text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Êtes-vous sûr de vouloir supprimer la classe ${classData.name} ?`)) {
                        deleteClass(classData.id)
                      }
                    }}
                    className="p-2 bg-white rounded-lg shadow-md text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <button
                  onClick={() => selectClassForAdmin(classData)}
                  className="w-full p-6 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${colors.bg} flex-shrink-0`}>
                      <School size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {classData.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {classData.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <FileText size={14} />
                          <span>Documents</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Khôlles</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 size={14} />
                          <span>Progression</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <School size={24} className="text-blue-600" />
              <h3 className="font-semibold text-gray-800">Classes configurées</h3>
            </div>
            <div className="text-3xl font-bold text-blue-600">{availableClasses.length}</div>
            <div className="text-gray-500 text-sm">classes disponibles</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap size={24} className="text-green-600" />
              <h3 className="font-semibold text-gray-800">Classes actives</h3>
            </div>
            <div className="text-3xl font-bold text-green-600">{availableClasses.length}</div>
            <div className="text-gray-500 text-sm">prêtes à utiliser</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <Users size={24} className="text-purple-600" />
              <h3 className="font-semibold text-gray-800">Filières</h3>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {new Set(availableClasses.map(c => c.id.replace(/\d+$/, ''))).size}
            </div>
            <div className="text-gray-500 text-sm">types de classes</div>
          </div>
        </div>
      </div>
    </div>
  )

  // Interface de gestion d'une classe spécifique
  const renderClassManagement = () => (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header Admin */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-black text-white p-6 shadow-2xl border-b-4 border-indigo-500">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={backToClassSelection}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors shadow-lg"
              title="Retour aux classes"
            >
              <Home size={24} className="text-white" />
            </button>
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg">
              <Wrench size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Administration - {selectedAdminClass?.name}</h1>
              <p className="text-slate-300 text-sm">{selectedAdminClass?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <Home size={16} /> Voir le site
            </a>
            <button 
              onClick={logout}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-8">
        {/* Main Content Section */}
        <div className="lg:col-span-2 bg-white rounded-xl p-8 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-gray-100">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <FileText size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Gestion des contenus
            </h2>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
              { id: 'evaluations', label: 'Évaluations', icon: <Target size={18} /> },
              { id: 'kolles', label: 'Khôlles', icon: <Calendar size={18} /> },
              { id: 'chapters', label: 'Chapitres', icon: <BookOpen size={18} /> },
              { id: 'progression', label: 'Progression', icon: <BarChart3 size={18} /> },
              { id: 'classes', label: 'Classes', icon: <School size={18} /> },
              { id: 'settings', label: 'Paramètres', icon: <Settings size={18} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'documents') loadDocuments()
                  if (tab.id === 'kolles') loadKolles()
                }}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'documents' && (
            <div>
              <div style={{
                background: '#f8f9fa',
                padding: '2rem',
                borderRadius: '8px',
                marginBottom: '2rem'
              }}>
                <h3><FolderPlus size={20} /> Ajouter un document</h3>

                <form onSubmit={handleDocumentSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#333' }}>
                        Thématique
                      </label>
                      <select 
                        name="category" 
                        required
                        style={{ width: '100%', padding: '1rem', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '0.95rem' }}
                      >
                        <option value="">Choisir une thématique</option>
                        <option value="geometrie">Géométrie</option>
                        <option value="fonctions">Fonctions</option>
                        <option value="suites">Suites</option>
                        <option value="ensembles">Ensembles et raisonnements</option>
                        <option value="probabilites">Probabilités</option>
                        <option value="calculs">Calculs</option>
                        <option value="complexes">Nombres complexes</option>
                        <option value="algebre">Algèbre</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#333' }}>
                        Type
                      </label>
                      <select 
                        name="type" 
                        required
                        style={{ width: '100%', padding: '1rem', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '0.95rem' }}
                      >
                        <option value="">Choisir un type</option>
                        <option value="cours">Cours</option>
                        <option value="exercices">Exercices</option>
                        <option value="complement">Complément</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#333' }}>
                      Titre du document
                    </label>
                    <input 
                      type="text" 
                      name="title" 
                      placeholder="Ex: Chapitre 1 - Vecteurs" 
                      required
                      style={{ width: '100%', padding: '1rem', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 hover:border-indigo-400 transition-all duration-300 bg-white">
                    <div className="text-lg text-gray-600 mb-2 flex items-center justify-center gap-2">
                      <Upload size={24} className="text-indigo-500" />
                      Cliquez pour sélectionner le fichier
                    </div>
                    <small className="text-gray-500">Formats: PDF, DOC, DOCX (max 10 Mo)</small>
                    <input 
                      type="file" 
                      name="file" 
                      accept=".pdf,.doc,.docx" 
                      required
                      className="w-full mt-4 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Upload size={20} />
                    Ajouter le document
                  </button>
                </form>
              </div>

              {/* Documents List */}
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                    <FileText size={20} className="text-white" />
                  </div>
                  Documents existants
                </h3>
                
                <div className="space-y-4">
                  {(!documents || (Array.isArray(documents) ? documents.length === 0 : Object.keys(documents).length === 0)) ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Aucun document chargé. Cliquez sur "Charger" pour voir les documents.</p>
                      <button 
                        onClick={loadDocuments}
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                      >
                        Charger les documents
                      </button>
                    </div>
                  ) : (
                    (Array.isArray(documents) ? documents : Object.values(documents).flat()).map((doc, index) => (
                      <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                              <FileText size={24} className="text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800">{doc.title || 'Document sans titre'}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                                  {categories[doc.category]?.name || doc.category || 'Non catégorisé'}
                                </span>
                                <span className="text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded-full">
                                  {doc.type || 'Document'}
                                </span>
                                {doc.filename && (
                                  <span className="text-xs text-gray-500">{doc.filename}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => editDocument(doc)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                            >
                              <Edit3 size={16} />
                              <span className="text-sm">Modifier</span>
                            </button>
                            <button 
                              onClick={() => showGenericDeleteConfirm(doc, () => deleteDocument(doc.id), 'document')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                            >
                              <Trash2 size={16} />
                              <span className="text-sm">Supprimer</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evaluations' && (
            <div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-xl mb-8 border border-orange-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                    <Target size={20} className="text-white" />
                  </div>
                  Ajouter une évaluation
                </h3>
                <form onSubmit={handleDocumentSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Type d'évaluation
                      </label>
                      <select 
                        name="type" 
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                      >
                        <option value="">Choisir un type</option>
                        <option value="ds">Devoir surveillé</option>
                        <option value="dm">Devoir maison</option>
                        <option value="ap">Activité pratique</option>
                        <option value="interro">Interrogation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Thématique
                      </label>
                      <select 
                        name="category" 
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                      >
                        <option value="">Choisir une thématique</option>
                        <option value="geometrie">Géométrie</option>
                        <option value="fonctions">Fonctions</option>
                        <option value="suites">Suites</option>
                        <option value="ensembles">Ensembles et raisonnements</option>
                        <option value="probabilites">Probabilités</option>
                        <option value="calculs">Calculs</option>
                        <option value="complexes">Nombres complexes</option>
                        <option value="algebre">Algèbre</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Titre
                    </label>
                    <input 
                      type="text" 
                      name="title" 
                      placeholder="Ex: DS n°1 - Vecteurs" 
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                    />
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 hover:border-indigo-400 transition-all duration-300 bg-white">
                    <div className="text-lg text-gray-600 mb-2 flex items-center justify-center gap-2">
                      <Upload size={24} className="text-indigo-500" />
                      Cliquez pour sélectionner le fichier
                    </div>
                    <small className="text-gray-500">Formats: PDF, DOC, DOCX (max 10 Mo)</small>
                    <input 
                      type="file" 
                      name="file" 
                      accept=".pdf,.doc,.docx" 
                      required
                      className="w-full mt-4 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                  <button 
                    type="submit" 
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Upload size={16} />
                    Ajouter l'évaluation
                  </button>
                </form>
              </div>

              {/* Evaluations List */}
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                    <Target size={20} className="text-white" />
                  </div>
                  Évaluations existantes
                </h3>
                
                <div className="space-y-4">
                  {(!documents || (Array.isArray(documents) ? documents.length === 0 : Object.keys(documents).length === 0)) ? (
                    <div className="text-center py-12 text-gray-500">
                      <Target size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Aucune évaluation chargée. Cliquez sur "Charger" pour voir les évaluations.</p>
                      <button 
                        onClick={loadDocuments}
                        className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                      >
                        Charger les évaluations
                      </button>
                    </div>
                  ) : (
                    (Array.isArray(documents) ? documents : Object.values(documents).flat()).filter(doc => ['ds', 'dm', 'ap', 'interro'].includes(doc.type)).map((evaluation, index) => (
                      <div key={index} className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg">
                              <Target size={24} className="text-orange-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800">{evaluation.title || 'Évaluation sans titre'}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-600 bg-orange-200 px-2 py-1 rounded-full">
                                  {{
                                    'ds': 'Devoir surveillé',
                                    'dm': 'Devoir maison',
                                    'ap': 'Activité pratique',
                                    'interro': 'Interrogation'
                                  }[evaluation.type] || evaluation.type}
                                </span>
                                <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                                  {categories[evaluation.category]?.name || evaluation.category || 'Non catégorisé'}
                                </span>
                                {evaluation.filename && (
                                  <span className="text-xs text-gray-500">{evaluation.filename}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => editDocument(evaluation)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                            >
                              <Edit3 size={16} />
                              <span className="text-sm">Modifier</span>
                            </button>
                            <button 
                              onClick={() => showGenericDeleteConfirm(evaluation, () => deleteDocument(evaluation.id), 'évaluation')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                            >
                              <Trash2 size={16} />
                              <span className="text-sm">Supprimer</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kolles' && (
            <div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-xl mb-8 border border-blue-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg">
                    <Calendar size={20} className="text-white" />
                  </div>
                  Ajouter un programme de khôlle
                </h3>
                <form onSubmit={handleKolleSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Numéro de semaine (1-28)
                    </label>
                    <input 
                      type="number" 
                      name="week_number" 
                      min="1" 
                      max="28" 
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Dates
                    </label>
                    <input 
                      type="text" 
                      name="week_dates" 
                      placeholder="Ex: du 16 au 20 septembre" 
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 hover:border-blue-400 transition-all duration-300 bg-white">
                    <div className="text-lg text-gray-600 mb-2 flex items-center justify-center gap-2">
                      <Calendar size={24} className="text-blue-500" />
                      Programme de la semaine (PDF)
                    </div>
                    <small className="text-gray-500">Le titre et les dates seront générés automatiquement</small>
                    <input 
                      type="file" 
                      name="file" 
                      accept=".pdf" 
                      required
                      className="w-full mt-4 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <button 
                    type="submit" 
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '1rem 2rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Upload size={20} />
                    Ajouter le programme
                  </button>
                </form>
              </div>

              {/* Kolles List */}
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg">
                    <Calendar size={20} className="text-white" />
                  </div>
                  Programmes de khôlles existants
                </h3>
                
                <div className="space-y-4">
                  {kolles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Aucun programme de khôlle chargé. Cliquez sur "Charger" pour voir les programmes.</p>
                      <button 
                        onClick={loadKolles}
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                      >
                        Charger les programmes
                      </button>
                    </div>
                  ) : (
                    kolles.map((kolle, index) => (
                      <div key={index} className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                              <Calendar size={24} className="text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800">
                                Semaine {kolle.week_number} - {kolle.week_dates || 'Dates non spécifiées'}
                              </h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-600 bg-blue-200 px-2 py-1 rounded-full">
                                  Programme de khôlle
                                </span>
                                {kolle.filename && (
                                  <span className="text-xs text-gray-500">{kolle.filename}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => editKolle(kolle)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                            >
                              <Edit3 size={16} />
                              <span className="text-sm">Modifier</span>
                            </button>
                            <button 
                              onClick={() => showGenericDeleteConfirm(kolle, () => deleteKolle(kolle.id), 'programme de khôlle')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                            >
                              <Trash2 size={16} />
                              <span className="text-sm">Supprimer</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Annual Programs Section */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-xl mb-8 border border-purple-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                    <BookOpen size={20} className="text-white" />
                  </div>
                  Programmes annuels de khôlles
                </h3>
                
                <form onSubmit={handleAnnualProgramSubmit} className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Titre du programme
                      </label>
                      <input 
                        type="text" 
                        name="title" 
                        placeholder="Ex: Programme khôlles 2024-2025" 
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Année scolaire
                      </label>
                      <input 
                        type="text" 
                        name="year" 
                        placeholder="Ex: 2024-2025" 
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Upload size={18} />
                        Ajouter
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-all duration-300 bg-white">
                    <div className="text-lg text-gray-600 mb-2 flex items-center justify-center gap-2">
                      <Upload size={24} className="text-purple-500" />
                      Programme annuel (PDF)
                    </div>
                    <small className="text-gray-500">Fichier contenant le programme complet des khôlles pour l'année</small>
                    <input 
                      type="file" 
                      name="file" 
                      accept=".pdf" 
                      required
                      className="w-full mt-4 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>
                </form>

                {/* Annual Programs List */}
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                  <h4 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                      <BookOpen size={20} className="text-white" />
                    </div>
                    Programmes annuels existants
                  </h4>
                  
                  <div className="space-y-4">
                    {annualPrograms.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Aucun programme annuel chargé. Cliquez sur "Charger" pour voir les programmes.</p>
                        <button 
                          onClick={loadAnnualPrograms}
                          className="mt-4 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                        >
                          Charger les programmes annuels
                        </button>
                      </div>
                    ) : (
                      annualPrograms.map((program, index) => (
                        <div key={index} className={`${program.isActive ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'} p-6 rounded-lg border hover:shadow-md transition-all duration-300`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 ${program.isActive ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-purple-100 to-indigo-100'} rounded-lg`}>
                                <BookOpen size={24} className={`${program.isActive ? 'text-green-600' : 'text-purple-600'}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <h5 className="text-lg font-semibold text-gray-800">{program.title}</h5>
                                  {program.isActive && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">ACTIF</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className={`text-sm text-gray-600 ${program.isActive ? 'bg-green-200' : 'bg-purple-200'} px-2 py-1 rounded-full`}>
                                    {program.year}
                                  </span>
                                  {program.filename && (
                                    <span className="text-xs text-gray-500">{program.filename}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!program.isActive && (
                                <button 
                                  onClick={() => toggleAnnualProgram(program.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                                >
                                  <CheckCircle size={16} />
                                  <span className="text-sm">Activer</span>
                                </button>
                              )}
                              <button 
                                onClick={() => editAnnualProgram(program)}
                                className={`p-2 ${program.isActive ? 'text-green-600 hover:bg-green-50' : 'text-purple-600 hover:bg-purple-50'} rounded-lg transition-colors duration-200 flex items-center gap-1`}
                              >
                                <Edit3 size={16} />
                                <span className="text-sm">Modifier</span>
                              </button>
                              <button 
                                onClick={() => showGenericDeleteConfirm(program, () => deleteAnnualProgram(program.id), 'programme annuel')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center gap-1"
                              >
                                <Trash2 size={16} />
                                <span className="text-sm">Supprimer</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chapters' && (
            <div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-8 rounded-xl mb-8 border border-emerald-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg">
                    <BookOpen size={20} className="text-white" />
                  </div>
                  Gestion des chapitres
                </h3>
                
                {/* Add New Chapter Form */}
                <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-emerald-600" />
                    Ajouter un nouveau chapitre
                  </h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.target)
                    const chapterData = {
                      name: formData.get('name'),
                      description: formData.get('description'),
                      icon: 'BookOpen'
                    }
                    
                    try {
                      await chaptersAPI.addChapter(chapterData)
                      alert('Nouveau chapitre ajouté avec succès !')
                      e.target.reset()
                      loadChapters()
                    } catch (error) {
                      alert('Erreur: ' + error.message)
                    }
                  }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                      type="text" 
                      name="name"
                      placeholder="Nom du chapitre" 
                      required
                      className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    />
                    <input 
                      type="text" 
                      name="description"
                      placeholder="Description" 
                      required
                      className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    />
                    <button 
                      type="submit"
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Ajouter
                    </button>
                  </form>
                </div>

                {/* Chapters Sorting */}
                <div className="mb-6 flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-700">
                    Liste des chapitres ({chapters.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Trier par:</label>
                    <select 
                      value={chapterSortBy} 
                      onChange={(e) => setChapterSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 text-sm"
                    >
                      <option value="name">Nom A-Z</option>
                      <option value="name-desc">Nom Z-A</option>
                      <option value="id">ID</option>
                      <option value="description">Description</option>
                    </select>
                  </div>
                </div>

                {/* Chapters List */}
                <div className="grid gap-4">
                  {chapters.sort((a, b) => {
                    switch(chapterSortBy) {
                      case 'name':
                        return a.name.localeCompare(b.name);
                      case 'name-desc':
                        return b.name.localeCompare(a.name);
                      case 'id':
                        return a.id.localeCompare(b.id);
                      case 'description':
                        return (a.description || '').localeCompare(b.description || '');
                      default:
                        return 0;
                    }
                  }).map((chapter, index) => {
                    const IconComponent = {
                      Compass,
                      Activity,
                      BarChart3,
                      Target,
                      Palette,
                      Calculator,
                      Plus,
                      BookOpen
                    }[chapter.icon] || BookOpen

                    return (
                      <div key={chapter.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg">
                              <IconComponent size={24} className="text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800">{chapter.name}</h4>
                              <p className="text-gray-600 text-sm">{chapter.description}</p>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full mt-1 inline-block">ID: {chapter.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => editChapter(chapter)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => showGenericDeleteConfirm(chapter, () => deleteChapter(chapter.id), 'chapitre')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'progression' && (
            <div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-xl mb-8 border border-indigo-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                    <BarChart3 size={20} className="text-white" />
                  </div>
                  Gestion de la progression annuelle
                </h3>
                
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <PlayCircle size={20} className="text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-blue-800">Mise à jour automatique</h4>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Les chapitres passent automatiquement de "À venir" à "En cours" dès qu'un document est ajouté dans cette thématique.
                  </p>
                  <button 
                    onClick={updateProgressionFromDocuments}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Actualiser maintenant
                  </button>
                </div>

                {/* Liste des chapitres de progression */}
                <div className="space-y-4">
                  {progressionChapters.sort((a, b) => a.order - b.order).map((chapter) => {
                    const statusConfig = {
                      'termine': { bg: 'bg-green-100', text: 'text-green-800', label: 'Terminé', icon: <CheckSquare size={16} />, color: 'green' },
                      'en-cours': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En cours', icon: <Clock size={16} />, color: 'yellow' },
                      'a-venir': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'À venir', icon: <PlayCircle size={16} />, color: 'blue' }
                    }[chapter.status]
                    
                    return (
                      <div key={chapter.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1">
                              <button 
                                onClick={() => moveChapterUp(chapter.id)}
                                disabled={chapter.order === 1}
                                className={`p-1 rounded transition-colors ${
                                  chapter.order === 1 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                }`}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button 
                                onClick={() => moveChapterDown(chapter.id)}
                                disabled={chapter.order === progressionChapters.length}
                                className={`p-1 rounded transition-colors ${
                                  chapter.order === progressionChapters.length 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                }`}
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800">{chapter.title}</h4>
                              <p className="text-gray-600 text-sm">{chapter.subtitle}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Sélecteur de statut */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Statut :</span>
                              <select
                                value={chapter.status}
                                onChange={(e) => updateChapterStatus(chapter.id, e.target.value)}
                                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                  statusConfig.color === 'green' 
                                    ? 'border-green-200 focus:border-green-500 focus:ring-green-200 bg-green-50' 
                                    : statusConfig.color === 'yellow'
                                    ? 'border-yellow-200 focus:border-yellow-500 focus:ring-yellow-200 bg-yellow-50'
                                    : 'border-blue-200 focus:border-blue-500 focus:ring-blue-200 bg-blue-50'
                                }`}
                              >
                                <option value="a-venir">À venir</option>
                                <option value="en-cours">En cours</option>
                                <option value="termine">Terminé</option>
                              </select>
                            </div>
                            
                            {/* Badge de statut visuel */}
                            <div className={`flex items-center gap-2 px-3 py-2 ${statusConfig.bg} ${statusConfig.text} rounded-full font-medium text-sm`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Statistiques de progression */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckSquare size={24} className="text-green-600" />
                      <h4 className="font-semibold text-green-800">Chapitres terminés</h4>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {progressionChapters.filter(c => c.status === 'termine').length}
                    </div>
                    <div className="text-green-600 text-sm">sur {progressionChapters.length} chapitres</div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock size={24} className="text-yellow-600" />
                      <h4 className="font-semibold text-yellow-800">En cours</h4>
                    </div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {progressionChapters.filter(c => c.status === 'en-cours').length}
                    </div>
                    <div className="text-yellow-600 text-sm">chapitres actifs</div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <PlayCircle size={24} className="text-blue-600" />
                      <h4 className="font-semibold text-blue-800">À venir</h4>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {progressionChapters.filter(c => c.status === 'a-venir').length}
                    </div>
                    <div className="text-blue-600 text-sm">chapitres planifiés</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-xl mb-8 border border-cyan-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg">
                    <School size={20} className="text-white" />
                  </div>
                  Gestion des classes
                </h3>
                
                {/* Classe actuelle */}
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <GraduationCap size={24} className="text-green-600" />
                        <h4 className="font-semibold text-green-800">Classe actuelle</h4>
                      </div>
                      <p className="text-green-700">
                        <strong>{currentClass?.name || 'Aucune classe sélectionnée'}</strong>
                      </p>
                      {currentClass?.description && (
                        <p className="text-green-600 text-sm">{currentClass.description}</p>
                      )}
                    </div>
                    <button 
                      onClick={resetClassSelection}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Changer de classe
                    </button>
                  </div>
                </div>

                {/* Liste des classes disponibles */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-700">
                      Classes disponibles ({availableClasses.length})
                    </h4>
                    <button 
                      onClick={() => {
                        setSelectedClassData(null)
                        setClassModalMode('add')
                        setShowClassModal(true)
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Ajouter une classe
                    </button>
                  </div>
                  
                  <div className="grid gap-4">
                    {availableClasses.map((classData) => {
                      const isCurrentClass = currentClass?.id === classData.id
                      
                      return (
                        <div key={classData.id} className={`p-6 rounded-lg border transition-all duration-300 ${
                          isCurrentClass 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 bg-white hover:shadow-md'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                isCurrentClass ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                <School size={24} className={isCurrentClass ? 'text-green-600' : 'text-gray-600'} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-lg font-semibold text-gray-800">{classData.name}</h4>
                                  {isCurrentClass && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">ACTUELLE</span>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm">{classData.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">ID: {classData.id}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Couleur: {classData.color}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedClassData(classData)
                                  setClassModalMode('edit')
                                  setShowClassModal(true)
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              >
                                <Edit3 size={18} />
                              </button>
                              {!isCurrentClass && (
                                <button 
                                  onClick={() => showGenericDeleteConfirm(classData, () => deleteClass(classData.id), 'classe')}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Statistiques par classe */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <School size={24} className="text-blue-600" />
                      <h4 className="font-semibold text-blue-800">Classes configurées</h4>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {availableClasses.length}
                    </div>
                    <div className="text-blue-600 text-sm">classes disponibles</div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <GraduationCap size={24} className="text-green-600" />
                      <h4 className="font-semibold text-green-800">Classe active</h4>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {currentClass?.name || 'Aucune'}
                    </div>
                    <div className="text-green-600 text-sm">sélectionnée actuellement</div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Users size={24} className="text-purple-600" />
                      <h4 className="font-semibold text-purple-800">Types de classes</h4>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">
                      {new Set(availableClasses.map(c => c.id.replace(/\d+$/, ''))).size}
                    </div>
                    <div className="text-purple-600 text-sm">filières différentes</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-8 rounded-xl mb-8 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-gray-500 to-slate-600 rounded-lg">
                    <Settings size={20} className="text-white" />
                  </div>
                  Paramètres de l'administration
                </h3>
                
                <div className="grid gap-6">
                  {/* Site Configuration */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Settings size={18} className="text-gray-600" />
                      Configuration du site
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du site</label>
                        <input 
                          type="text" 
                          defaultValue="TSI 1 Mathématiques - Lycée Monge Chambéry"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Année scolaire</label>
                        <input 
                          type="text" 
                          defaultValue="2024-2025"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* User Management */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Users size={18} className="text-gray-600" />
                      Gestion des utilisateurs
                    </h4>
                    <div className="space-y-4">
                      {users.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users size={48} className="mx-auto mb-4 text-gray-300" />
                          <p>Aucun utilisateur chargé</p>
                          <button 
                            onClick={loadUsers}
                            className="mt-2 text-blue-600 hover:text-blue-700"
                          >
                            Charger les utilisateurs
                          </button>
                        </div>
                      ) : (
                        users.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-800">{user.username}</p>
                              <p className="text-sm text-gray-600">
                                Rôle: <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.role === 'admin' 
                                    ? 'bg-red-100 text-red-600' 
                                    : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {user.role}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => editUser(user)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => confirmDeleteUser(user)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      <button 
                        onClick={addUser}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <UserPlus size={18} />
                        Ajouter un utilisateur
                      </button>
                    </div>
                  </div>

                  {/* System Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <BarChart3 size={18} className="text-gray-600" />
                      Informations système
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">v2.1</div>
                        <div className="text-sm text-gray-600">Version</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">99%</div>
                        <div className="text-sm text-gray-600">Uptime</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{stats.documents + stats.evaluations}</div>
                        <div className="text-sm text-gray-600">Fichiers</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">2.3GB</div>
                        <div className="text-sm text-gray-600">Stockage</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Statistics */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-gray-100">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <BarChart3 size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                Statistiques
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl text-center border border-blue-200 hover:shadow-md transition-all duration-300">
                <div className="text-3xl font-bold text-indigo-600 mb-2">
                  {stats.documents}
                </div>
                <div className="text-gray-600 text-sm font-medium">
                  Documents
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-100 p-6 rounded-xl text-center border border-orange-200 hover:shadow-md transition-all duration-300">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {stats.evaluations}
                </div>
                <div className="text-gray-600 text-sm font-medium">
                  Évaluations
                </div>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-100 p-6 rounded-xl text-center border border-cyan-200 hover:shadow-md transition-all duration-300">
                <div className="text-3xl font-bold text-cyan-600 mb-2">
                  {stats.kolles}
                </div>
                <div className="text-gray-600 text-sm font-medium">
                  Khôlles
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-6 rounded-xl text-center border border-purple-200 hover:shadow-md transition-all duration-300">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  8
                </div>
                <div className="text-gray-600 text-sm font-medium">
                  Thématiques
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-gray-100">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Target size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                Accès rapide
              </h3>
            </div>
            <div className="flex flex-col gap-4">
              <a href="/documents" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white no-underline px-6 py-4 rounded-lg text-center font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105">
                <FileText size={20} /> Page documents
              </a>
              <a href="/kolles" className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white no-underline px-6 py-4 rounded-lg text-center font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105">
                <Calendar size={20} /> Page khôlles
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {modalMode === 'add' ? 'Ajouter un utilisateur' : 'Modifier l\'utilisateur'}
              </h3>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUserSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom d'utilisateur
                </label>
                <input 
                  type="text" 
                  name="username" 
                  defaultValue={selectedUser?.username || ''}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe {modalMode === 'edit' ? '(laisser vide pour ne pas changer)' : ''}
                </label>
                <input 
                  type="password" 
                  name="password" 
                  required={modalMode === 'add'}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rôle
                </label>
                <select 
                  name="role" 
                  defaultValue={selectedUser?.role || 'user'}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              
              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  {modalMode === 'add' ? 'Ajouter' : 'Modifier'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Confirmer la suppression
              </h3>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.username}</strong> ?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Cette action est irréversible.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handleDeleteUser}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Supprimer
              </button>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Delete Modal */}
      {showGenericDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Confirmer la suppression
              </h3>
              <button 
                onClick={() => setShowGenericDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer {itemToDelete?.type ? `ce ${itemToDelete.type}` : 'cet élément'} <strong>{itemToDelete?.title || itemToDelete?.name || itemToDelete?.filename || 'sans titre'}</strong> ?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Cette action est irréversible.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handleGenericDelete}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Supprimer
              </button>
              <button 
                onClick={() => setShowGenericDeleteModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Edit Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Modifier le document
              </h3>
              <button 
                onClick={() => setShowDocumentModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleDocumentModalSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre du document
                </label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={selectedDocument?.title || ''}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Thématique
                </label>
                <select 
                  name="category" 
                  defaultValue={selectedDocument?.category || ''}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="">Choisir une thématique</option>
                  <option value="geometrie">Géométrie</option>
                  <option value="fonctions">Fonctions</option>
                  <option value="suites">Suites</option>
                  <option value="ensembles">Ensembles et raisonnements</option>
                  <option value="probabilites">Probabilités</option>
                  <option value="calculs">Calculs</option>
                  <option value="complexes">Nombres complexes</option>
                  <option value="algebre">Algèbre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <select 
                  name="type" 
                  defaultValue={selectedDocument?.type || ''}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="">Choisir un type</option>
                  <option value="cours">Cours</option>
                  <option value="exercices">Exercices</option>
                  <option value="complement">Complément</option>
                  <option value="ds">Devoir surveillé</option>
                  <option value="dm">Devoir maison</option>
                  <option value="ap">Activité pratique</option>
                  <option value="interro">Interrogation</option>
                </select>
              </div>
              
              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Edit3 size={18} />
                  Modifier
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDocumentModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kolle Edit Modal */}
      {showKolleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Modifier le programme de khôlle
              </h3>
              <button 
                onClick={() => setShowKolleModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleKolleModalSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Semaine
                </label>
                <input 
                  type="text" 
                  value={`Semaine ${selectedKolle?.week_number || ''}`}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dates
                </label>
                <input 
                  type="text" 
                  name="week_dates" 
                  defaultValue={selectedKolle?.week_dates || ''}
                  placeholder="Ex: du 16 au 20 septembre"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Edit3 size={18} />
                  Modifier
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowKolleModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {chapterModalMode === 'add' ? 'Ajouter un chapitre' : 'Modifier le chapitre'}
              </h3>
              <button 
                onClick={() => setShowChapterModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleChapterModalSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du chapitre
                </label>
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={selectedChapter?.name || ''}
                  placeholder="Ex: Géométrie"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea 
                  name="description" 
                  defaultValue={selectedChapter?.description || ''}
                  placeholder="Ex: Vecteurs, repères, droites et plans"
                  required
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {chapterModalMode === 'add' ? <Plus size={18} /> : <Edit3 size={18} />}
                  {chapterModalMode === 'add' ? 'Ajouter' : 'Modifier'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowChapterModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Annual Program Edit Modal */}
      {showAnnualProgramModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Modifier le programme annuel
              </h3>
              <button 
                onClick={() => setShowAnnualProgramModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAnnualProgramModalSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre du programme
                </label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={selectedAnnualProgram?.title || ''}
                  placeholder="Ex: Programme khôlles 2024-2025"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Année scolaire
                </label>
                <input 
                  type="text" 
                  name="year" 
                  defaultValue={selectedAnnualProgram?.year || ''}
                  placeholder="Ex: 2024-2025"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Edit3 size={18} />
                  Modifier
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAnnualProgramModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {classModalMode === 'add' ? 'Ajouter une classe' : 'Modifier la classe'}
              </h3>
              <button 
                onClick={() => setShowClassModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleClassModalSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Identifiant de la classe
                </label>
                <input 
                  type="text" 
                  name="id" 
                  defaultValue={selectedClassData?.id || ''}
                  placeholder="Ex: tsi1, mpsi, pc..."
                  required
                  disabled={classModalMode === 'edit'}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200 disabled:bg-gray-100"
                />
                {classModalMode === 'edit' && (
                  <p className="text-xs text-gray-500 mt-1">L'identifiant ne peut pas être modifié</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de la classe
                </label>
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={selectedClassData?.name || ''}
                  placeholder="Ex: TSI 1ère année"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea 
                  name="description" 
                  defaultValue={selectedClassData?.description || ''}
                  placeholder="Ex: Technologie et Sciences Industrielles - 1ère année"
                  required
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Couleur du thème
                </label>
                <select 
                  name="color" 
                  defaultValue={selectedClassData?.color || 'blue'}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                >
                  <option value="blue">Bleu</option>
                  <option value="green">Vert</option>
                  <option value="purple">Violet</option>
                  <option value="red">Rouge</option>
                  <option value="yellow">Jaune</option>
                  <option value="indigo">Indigo</option>
                  <option value="pink">Rose</option>
                  <option value="gray">Gris</option>
                </select>
              </div>
              
              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {classModalMode === 'add' ? <Plus size={18} /> : <Edit3 size={18} />}
                  {classModalMode === 'add' ? 'Ajouter' : 'Modifier'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowClassModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-all duration-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  // Return principal qui décide quelle interface afficher
  return adminMode === 'classSelection' ? renderClassSelection() : renderClassManagement()
}