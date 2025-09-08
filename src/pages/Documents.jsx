import { useState, useEffect } from 'react'
import { documentsAPI, progressionAPI, chaptersAPI } from '../services/api'
import { useClass } from '../contexts/ClassContext'
import { Download, Compass, TrendingUp, Hash, Brain, Dice6, Calculator, Zap, Type, FileText, AlertTriangle, BookOpen, SortAsc, BarChart3, Target, Home, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { SecurePDFLink } from '../utils/pdfUtils.jsx'

// Fonction pour créer les catégories dynamiquement depuis les chapitres de l'API
const createCategoriesFromChapters = (chapters) => {
  const categories = {}
  chapters.forEach(chapter => {
    categories[chapter.id] = {
      name: chapter.name,
      icon: <BookOpen size={24} />,
      desc: chapter.description || 'Chapitre ajouté depuis l\'administration'
    }
  })
  return categories
}

const typeLabels = {
  cours: 'Cours',
  exercices: 'Exercices',
  ds: 'DS',
  dm: 'DM',
  ap: 'AP',
  interro: 'Interrogation'
}

export function Documents() {
  const { currentClass } = useClass()
  const [documents, setDocuments] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('en-cours')
  const [activeEvalTab, setActiveEvalTab] = useState('ds')
  const [evaluations, setEvaluations] = useState({})
  const [selectedChapter, setSelectedChapter] = useState('')
  const [showAllEvals, setShowAllEvals] = useState(false)
  const [evalSortBy, setEvalSortBy] = useState('chapitre')
  const [expandedCategories, setExpandedCategories] = useState('')
  const [categories, setCategories] = useState({})
  const [progressionChapters, setProgressionChapters] = useState([])
  const [progressionStatus, setProgressionStatus] = useState({})
  const [progressionLoading, setProgressionLoading] = useState(true)

  // Fonction pour charger la progression et les chapitres depuis l'API
  const loadProgression = async () => {
    if (!currentClass?.id) return
    
    try {
      setProgressionLoading(true)
      
      // Charger les chapitres depuis l'API
      const chapters = await chaptersAPI.getChapters()
      const dynamicCategories = createCategoriesFromChapters(chapters)
      setCategories(dynamicCategories)
      
      // Charger la progression
      const progression = await progressionAPI.getProgression(currentClass.id)
      
      if (progression && progression.chapters) {
        // Synchroniser les chapitres avec l'API chapters
        const synchronizedChapters = chapters.map(chapter => {
          const savedChapter = progression.chapters.find(p => p.id === chapter.id)
          return {
            id: chapter.id,
            name: chapter.name,
            description: chapter.description,
            status: savedChapter?.status || 'a-venir',
            order: savedChapter?.order || chapters.indexOf(chapter) + 1
          }
        }).sort((a, b) => a.order - b.order)
        
        setProgressionChapters(synchronizedChapters)
        
        const statusMap = {}
        synchronizedChapters.forEach(chapter => {
          statusMap[chapter.id] = chapter.status
        })
        setProgressionStatus(statusMap)
      } else {
        // Pas de progression sauvegardée, utiliser les chapitres par défaut
        const defaultChapters = chapters.map((chapter, index) => ({
          id: chapter.id,
          name: chapter.name,
          description: chapter.description,
          status: 'a-venir',
          order: index + 1
        }))
        setProgressionChapters(defaultChapters)
        
        const statusMap = {}
        defaultChapters.forEach(chapter => {
          statusMap[chapter.id] = 'a-venir'
        })
        setProgressionStatus(statusMap)
      }
    } catch (error) {
      // Garder les valeurs par défaut en cas d'erreur
    } finally {
      setProgressionLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
    loadProgression() // Charger les chapitres au démarrage
  }, [])

  // Charger la progression quand la classe change
  useEffect(() => {
    if (currentClass) {
      loadProgression()
    }
  }, [currentClass])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const data = await documentsAPI.getDocuments()
      
      // Séparer les documents et évaluations
      const docs = {}
      const evals = { ds: [], dm: [], ap: [], interro: [], kolles: [] }
      
      if (Array.isArray(data)) {
        // Si data est un tableau, grouper par catégorie
        data.forEach(item => {
          if (['ds', 'dm', 'ap', 'interro'].includes(item.type)) {
            evals[item.type].push(item)
          } else {
            const category = item.category || 'autres'
            if (!docs[category]) docs[category] = []
            docs[category].push(item)
          }
        })
      } else if (typeof data === 'object') {
        // Si data est un objet groupé par catégorie
        Object.entries(data).forEach(([category, items]) => {
          const regularDocs = []
          items.forEach(item => {
            if (['ds', 'dm', 'ap', 'interro'].includes(item.type)) {
              evals[item.type].push(item)
            } else {
              regularDocs.push(item)
            }
          })
          if (regularDocs.length > 0) {
            docs[category] = regularDocs
          }
        })
      }
      
      setDocuments(docs)
      setEvaluations(evals)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sortDocuments = (docs, sortType) => {
    if (sortType === 'alphabetical') {
      return [...docs].sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortType === 'recent') {
      return [...docs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortType === 'type') {
      return [...docs].sort((a, b) => a.type.localeCompare(b.type))
    }
    return docs
  }

  const getSortedCategories = () => {
    // Créer une liste complète de toutes les catégories, même si elles sont vides
    const allCategoriesWithDocs = Object.keys(categories).map(categoryKey => [
      categoryKey, 
      documents[categoryKey] || []
    ])
    
    if (sortBy === 'document-count') {
      return allCategoriesWithDocs.sort((a, b) => b[1].length - a[1].length)
    } else if (sortBy === 'alphabetical') {
      return allCategoriesWithDocs.sort((a, b) => 
        categories[a[0]]?.name.localeCompare(categories[b[0]]?.name || '') || 0
      )
    } else if (sortBy === 'en-cours') {
      // Tri par statut de progression : "en cours" en premier
      return allCategoriesWithDocs.sort((a, b) => {
        const statusA = progressionStatus[a[0]] || progressionStatus[`${a[0]}-1`] || 'a-venir'
        const statusB = progressionStatus[b[0]] || progressionStatus[`${b[0]}-1`] || 'a-venir'
        const statusOrder = { 'en-cours': 0, 'termine': 1, 'a-venir': 2 }
        
        const orderA = statusOrder[statusA] !== undefined ? statusOrder[statusA] : 2
        const orderB = statusOrder[statusB] !== undefined ? statusOrder[statusB] : 2
        
        return orderA - orderB
      })
    } else { // ordre du programme
      const programOrder = ['geometrie', 'calculs', 'fonctions', 'suites', 'ensembles', 'probabilites', 'complexes', 'algebre']
      return allCategoriesWithDocs.sort((a, b) => {
        const indexA = programOrder.indexOf(a[0])
        const indexB = programOrder.indexOf(b[0])
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
    }
  }
  
  const getEvaluationCount = (type) => {
    return evaluations[type]?.length || 0
  }

  const sortEvaluations = (evals) => {
    let filteredEvals = []
    
    if (showAllEvals) {
      // Afficher toutes les évaluations de tous les types
      filteredEvals = Object.values(evaluations).flat().filter(Boolean)
    } else {
      // Afficher seulement les évaluations du type actuel
      if (!Array.isArray(evals)) return []
      filteredEvals = [...evals]
    }
    
    // Filtrer par chapitre sélectionné si nécessaire
    if (selectedChapter && evalSortBy === 'chapitre') {
      filteredEvals = filteredEvals.filter(evaluation => evaluation.category === selectedChapter)
    }
    
    return filteredEvals.sort((a, b) => {
      if (evalSortBy === 'date') {
        return new Date(b.created_at) - new Date(a.created_at)
      } else if (evalSortBy === 'chapitre') {
        const categoryA = categories[a.category]?.name || a.category || ''
        const categoryB = categories[b.category]?.name || b.category || ''
        return categoryA.localeCompare(categoryB)
      }
      return 0
    })
  }

  const getAvailableChapters = () => {
    let evals = []
    if (showAllEvals) {
      // Prendre toutes les évaluations de tous les types
      evals = Object.values(evaluations).flat().filter(Boolean)
    } else {
      // Prendre seulement les évaluations du type actuel
      evals = evaluations[activeEvalTab] || []
    }
    
    
    const chapters = [...new Set(evals.map(evaluation => evaluation.category))].filter(Boolean)
    
    // Si aucun chapitre trouvé, retourner tous les chapitres disponibles
    if (chapters.length === 0) {
      return Object.keys(categories).map(categoryKey => ({
        key: categoryKey,
        name: categories[categoryKey]?.name || categoryKey
      }))
    }
    
    return chapters.map(categoryKey => ({
      key: categoryKey,
      name: categories[categoryKey]?.name || categoryKey
    }))
  }

  if (loading) {
    return (
      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Chargement des documents...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-12 text-red-600">
            <div className="mb-4"><AlertTriangle size={32} /></div>
            <p>Erreur: {error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">Documents {currentClass?.name || 'Classe'}</h1>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-blue-100 max-w-3xl mx-auto px-4">Lycée Monge, Chambéry - Cours, exercices et ressources pour réussir en mathématiques</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href="#documents" className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm sm:text-base">
              <BookOpen size={18} className="sm:w-5 sm:h-5" />
              Accéder aux cours
            </a>
            <a href="/kolles" className="inline-flex items-center justify-center gap-2 bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-blue-600 border border-blue-400 transition-colors text-sm sm:text-base">
              <Target size={18} className="sm:w-5 sm:h-5" />
              Planning khôlles
            </a>
          </div>
        </div>
      </section>

      <main className="py-8 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section progression */}
          <section className="mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Progression annuelle
                {currentClass && (
                  <span className="text-base sm:text-lg font-normal text-blue-600 ml-2 block sm:inline">({currentClass.name})</span>
                )}
              </h2>
              <p className="text-gray-600 text-base sm:text-lg px-4">Suivez l'avancement du programme de mathématiques tout au long de l'année</p>
            </div>
            
            {progressionLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement de la progression...</p>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {progressionChapters.sort((a, b) => {
                const statusOrder = { 'en-cours': 0, 'termine': 1, 'a-venir': 2 }
                const orderA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 2
                const orderB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 2
                return orderA - orderB || a.order - b.order
              }).map((chapter) => {
                const statusConfig = {
                  'termine': { bg: 'bg-green-100', text: 'text-green-800', label: 'Terminé' },
                  'en-cours': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En cours' },
                  'a-venir': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'À venir' }
                }[chapter.status]
                
                return (
                  <div key={chapter.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white rounded-lg shadow-md border border-gray-100 gap-3 sm:gap-0">
                    <div className="flex-1">
                      <strong className="text-sm sm:text-base">Chapitre {chapter.order} - {chapter.name}</strong>
                      {chapter.description && chapter.description.trim() !== '' && (
                        <span className="text-gray-600 ml-1 text-sm sm:text-base block sm:inline">: {chapter.description}</span>
                      )}
                    </div>
                    <span className={`px-3 py-1 ${statusConfig.bg} ${statusConfig.text} text-xs sm:text-sm font-medium rounded-full self-start sm:self-auto`}>
                      {statusConfig.label}
                    </span>
                  </div>
                )
              })}
            </div>
            )}
          </section>

          {/* Section documents principaux */}
          <section id="documents" className="mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Documents par thématique</h2>
              <p className="text-gray-600 text-base sm:text-lg px-4">Accédez rapidement aux cours et exercices organisés par domaine</p>
            </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-8">
            <span className="text-gray-700 font-medium text-sm sm:text-base">Trier par :</span>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                className={`px-3 sm:px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 text-sm sm:text-base ${
                  sortBy === 'en-cours' 
                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSortBy('en-cours')}
              >
                <Target size={16} /> <span className="hidden sm:inline">En cours</span><span className="sm:hidden">En cours</span>
              </button>
              <button
                className={`px-3 sm:px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 text-sm sm:text-base ${
                  sortBy === 'alphabetical' 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSortBy('alphabetical')}
              >
                <SortAsc size={16} /> <span className="hidden sm:inline">Alphabétique</span><span className="sm:hidden">A-Z</span>
              </button>
              <button
                className={`px-3 sm:px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 text-sm sm:text-base ${
                  sortBy === 'document-count' 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSortBy('document-count')}
              >
                <BarChart3 size={16} /> <span className="hidden sm:inline">Nb documents</span><span className="sm:hidden">Nb</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {getSortedCategories().map(([categoryKey, categoryDocs]) => {
              const categoryInfo = categories[categoryKey]
              if (!categoryInfo) return null
              
              return (
                <div key={categoryKey} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                  <div 
                    className="flex items-center mb-4 cursor-pointer"
                    onClick={() => setExpandedCategories(prev => ({
                      ...prev,
                      [categoryKey]: !prev[categoryKey]
                    }))}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 text-blue-600">
                      {categoryInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="truncate">{categoryInfo.name}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full self-start sm:self-auto">{categoryDocs.length}</span>
                      </h3>
                      <div className="text-sm text-gray-500 mb-1">
                        {categoryInfo.desc}
                      </div>
                      <div className="text-xs text-gray-400">
                        {categoryDocs.length} document{categoryDocs.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4 text-blue-600">
                      {expandedCategories[categoryKey] ? 
                        <ChevronUp size={18} className="sm:w-5 sm:h-5" /> : 
                        <ChevronDown size={18} className="sm:w-5 sm:h-5" />
                      }
                    </div>
                  </div>
                  
                  {expandedCategories[categoryKey] && (
                    <ul className="space-y-2">
                      {categoryDocs.length > 0 ? (
                        sortDocuments(categoryDocs, 'alphabetical').map((doc) => (
                          <li key={doc.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{doc.title}</div>
                                  <div className="text-xs sm:text-sm text-gray-500">
                                    {typeLabels[doc.type] || doc.type}
                                  </div>
                                </div>
                              </div>
                              <SecurePDFLink
                                fileUrl={doc.file_url}
                                filename={`${doc.title}.pdf`}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                              >
                                <Download size={16} />
                              </SecurePDFLink>
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
                          Aucun document disponible pour ce chapitre
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          </section>

          {/* Section évaluations */}
          <section className="mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Évaluations</h2>
              <p className="text-gray-600 text-base sm:text-lg px-4">Devoirs, interrogations et activités pratiques</p>
            </div>

            {/* Onglets pour les évaluations */}
            {!showAllEvals && (
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-6 sm:mb-8 bg-gray-100 p-2 rounded-lg overflow-x-auto">
                <button 
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1 sm:gap-2 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
                    activeEvalTab === 'ds' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveEvalTab('ds')}
                >
                  <FileText size={16} /> <span className="hidden sm:inline">Devoirs en classe</span><span className="sm:hidden">DS</span>
                </button>
                <button 
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1 sm:gap-2 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
                    activeEvalTab === 'dm' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveEvalTab('dm')}
                >
                  <Home size={16} /> <span className="hidden sm:inline">Devoirs maison</span><span className="sm:hidden">DM</span>
                </button>
                <button 
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1 sm:gap-2 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
                    activeEvalTab === 'ap' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveEvalTab('ap')}
                >
                  <BookOpen size={16} /> <span className="hidden sm:inline">Activités pratiques</span><span className="sm:hidden">AP</span>
                </button>
                <button 
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1 sm:gap-2 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
                    activeEvalTab === 'interro' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveEvalTab('interro')}
                >
                  <Zap size={16} /> <span className="hidden sm:inline">Interrogations</span><span className="sm:hidden">Interro</span>
                </button>
              </div>
            )}

            {/* Contenu des évaluations */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Trier par :</span>
                  <div className="flex flex-wrap gap-2">
                  <button 
                    className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                      evalSortBy === 'date' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setEvalSortBy('date')
                      setSelectedChapter('')
                    }}
                  >
                    <Calendar size={16} /> Date
                  </button>
                  <button 
                    className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                      evalSortBy === 'chapitre' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setEvalSortBy('chapitre')}
                  >
                    <BookOpen size={16} /> Chapitre
                  </button>
                  <button 
                    className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                      showAllEvals 
                        ? 'bg-green-50 text-green-600' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setShowAllEvals(!showAllEvals)
                      if (!showAllEvals) {
                        setSelectedChapter('')
                      }
                    }}
                  >
                    <Target size={16} /> <span className="hidden sm:inline">{showAllEvals ? 'Masquer' : 'Tout afficher'}</span><span className="sm:hidden">{showAllEvals ? 'Tout' : 'Tout'}</span>
                  </button>
                  </div>
                </div>
                
                {evalSortBy === 'chapitre' && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <span className="text-gray-700 font-medium text-sm">Chapitre :</span>
                    <select
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(e.target.value)}
                      className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-white"
                    >
                      <option value="">Tous les chapitres</option>
                      {getAvailableChapters().map(chapter => (
                        <option key={chapter.key} value={chapter.key}>
                          {chapter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                <div className="md:col-span-1">
                  <div className="text-center p-4 sm:p-6 bg-blue-50 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-lg sm:text-xl font-semibold text-blue-600 mb-2">
                      {showAllEvals ? (
                        <><Target size={20} /> <span className="text-center">Toutes les évaluations</span></>
                      ) : (
                        <>
                          {activeEvalTab === 'ds' && <><FileText size={20} /> <span className="hidden sm:inline">Devoirs en classe</span><span className="sm:hidden">DS</span></>}
                          {activeEvalTab === 'dm' && <><Home size={20} /> <span className="hidden sm:inline">Devoirs maison</span><span className="sm:hidden">DM</span></>}
                          {activeEvalTab === 'ap' && <><BookOpen size={20} /> <span className="hidden sm:inline">Activités pratiques</span><span className="sm:hidden">AP</span></>}
                          {activeEvalTab === 'interro' && <><Zap size={20} /> <span className="hidden sm:inline">Interrogations</span><span className="sm:hidden">Interro</span></>}
                        </>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">
                      {showAllEvals ? 'Tous types d\'évaluations confondus' : (
                        <>
                          {activeEvalTab === 'ds' && 'Sujets de DS, corrections et barèmes'}
                          {activeEvalTab === 'dm' && 'Devoirs à faire à la maison'}
                          {activeEvalTab === 'ap' && 'Travaux pratiques et projets'}
                          {activeEvalTab === 'interro' && 'Interrogations courtes et rapides'}
                        </>
                      )}
                    </p>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                      {showAllEvals ? 
                        Object.values(evaluations).reduce((total, evals) => total + (evals?.length || 0), 0) : 
                        getEvaluationCount(activeEvalTab)
                      }
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {showAllEvals ? 'évaluations au total' : `documents ${activeEvalTab.toUpperCase()}`}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="space-y-3">
                    {sortEvaluations(evaluations[activeEvalTab]).map((evaluation) => (
                      <div key={evaluation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{evaluation.title}</h4>
                          <div className="text-xs sm:text-sm text-gray-600 flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            {showAllEvals && (
                              <>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  {typeLabels[evaluation.type] || evaluation.type}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span className="truncate">{categories[evaluation.category]?.name || evaluation.category}</span>
                            <span>•</span>
                            <span className="whitespace-nowrap">{new Date(evaluation.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <SecurePDFLink
                          fileUrl={evaluation.file_url}
                          filename={`${evaluation.title}.pdf`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors self-end sm:self-auto flex-shrink-0"
                        >
                          <Download size={16} />
                        </SecurePDFLink>
                      </div>
                    )) || (
                      <div className="text-center py-6 sm:py-8 text-gray-500">
                        <p className="text-sm sm:text-base">Aucune évaluation disponible pour le moment.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {Object.keys(documents).length === 0 && Object.keys(evaluations).every(key => evaluations[key]?.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              <p>Aucun document disponible pour le moment.</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}