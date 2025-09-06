import { createContext, useContext, useState, useEffect } from 'react'
import { classAPI } from '../services/api'

const ClassContext = createContext()

// Liste des classes disponibles
export const AVAILABLE_CLASSES = [
  { 
    id: 'tsi1', 
    name: 'TSI 1ère année', 
    description: 'Technologie et Sciences Industrielles - 1ère année',
    color: 'blue'
  },
  { 
    id: 'tsi2', 
    name: 'TSI 2ème année', 
    description: 'Technologie et Sciences Industrielles - 2ème année',
    color: 'green'
  },
  { 
    id: 'mpsi', 
    name: 'MPSI', 
    description: 'Mathématiques, Physique et Sciences de l\'Ingénieur',
    color: 'purple'
  },
  { 
    id: 'mp', 
    name: 'MP', 
    description: 'Mathématiques, Physique',
    color: 'red'
  },
  { 
    id: 'pcsi', 
    name: 'PCSI', 
    description: 'Physique, Chimie et Sciences de l\'Ingénieur',
    color: 'yellow'
  },
  { 
    id: 'pc', 
    name: 'PC', 
    description: 'Physique, Chimie',
    color: 'indigo'
  }
]

export function ClassProvider({ children }) {
  const [currentClass, setCurrentClass] = useState(null)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [availableClasses, setAvailableClasses] = useState(AVAILABLE_CLASSES) // Fallback par défaut
  const [classesLoaded, setClassesLoaded] = useState(false)

  // Charger les classes depuis l'API
  useEffect(() => {
    const loadClasses = async () => {
      try {
        console.log('🏫 [DEBUG CONTEXT] Loading classes from API...')
        const classes = await classAPI.getAvailableClasses()
        console.log('🏫 [DEBUG CONTEXT] Classes loaded:', classes)
        if (classes && classes.length > 0) {
          setAvailableClasses(classes)
        }
      } catch (error) {
        console.error('🏫 [DEBUG CONTEXT] Error loading classes, using fallback:', error)
        // Garder les classes par défaut en cas d'erreur
      } finally {
        setClassesLoaded(true)
      }
    }
    
    loadClasses()
  }, [])

  // Charger la classe depuis localStorage quand les classes sont chargées
  useEffect(() => {
    if (!classesLoaded) return // Attendre que les classes soient chargées
    
    const savedClass = localStorage.getItem('selectedClass')
    const hasVisited = localStorage.getItem('hasVisitedBefore')
    
    console.log('🏫 [DEBUG CONTEXT] Checking saved class:', savedClass)
    
    if (savedClass) {
      // Vérifier que la classe sauvegardée existe toujours
      const classExists = availableClasses.find(cls => cls.id === savedClass)
      if (classExists) {
        console.log('🏫 [DEBUG CONTEXT] Found saved class:', classExists)
        setCurrentClass(classExists)
      } else {
        // La classe n'existe plus, forcer la sélection
        console.log('🏫 [DEBUG CONTEXT] Saved class not found, forcing selection')
        setIsFirstVisit(true)
        localStorage.removeItem('selectedClass')
      }
    } else if (!hasVisited) {
      // Première visite
      console.log('🏫 [DEBUG CONTEXT] First visit detected')
      setIsFirstVisit(true)
    } else {
      // Utilisateur revient mais n'a pas de classe sélectionnée
      console.log('🏫 [DEBUG CONTEXT] No saved class, forcing selection')
      setIsFirstVisit(true)
    }
    
    setLoading(false)
  }, [classesLoaded, availableClasses])

  // Fonction pour sélectionner une classe
  const selectClass = (classData) => {
    setCurrentClass(classData)
    setIsFirstVisit(false)
    localStorage.setItem('selectedClass', classData.id)
    localStorage.setItem('hasVisitedBefore', 'true')
    
    // Nettoyer les données spécifiques à l'ancienne classe si nécessaire
    localStorage.removeItem('progressionChapters')
  }

  // Fonction pour changer de classe
  const changeClass = () => {
    setIsFirstVisit(true)
    setCurrentClass(null)
  }

  // Fonction pour réinitialiser (admin)
  const resetClassSelection = () => {
    localStorage.removeItem('selectedClass')
    localStorage.removeItem('hasVisitedBefore')
    localStorage.removeItem('progressionChapters')
    setCurrentClass(null)
    setIsFirstVisit(true)
  }

  const value = {
    currentClass,
    availableClasses, // Utiliser les classes chargées depuis l'API
    isFirstVisit,
    loading: loading || !classesLoaded, // Loading tant que les classes ne sont pas chargées
    selectClass,
    changeClass,
    resetClassSelection
  }

  return (
    <ClassContext.Provider value={value}>
      {children}
    </ClassContext.Provider>
  )
}

export function useClass() {
  const context = useContext(ClassContext)
  if (!context) {
    throw new Error('useClass must be used within a ClassProvider')
  }
  return context
}

// Hook pour récupérer seulement les classes disponibles
export function useAvailableClasses() {
  const context = useContext(ClassContext)
  if (!context) {
    throw new Error('useAvailableClasses must be used within a ClassProvider')
  }
  return context.availableClasses
}