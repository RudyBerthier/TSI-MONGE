import { createContext, useContext, useState, useEffect } from 'react'

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

  // Charger la classe depuis localStorage au démarrage
  useEffect(() => {
    const savedClass = localStorage.getItem('selectedClass')
    const hasVisited = localStorage.getItem('hasVisitedBefore')
    
    if (savedClass) {
      // Vérifier que la classe sauvegardée existe toujours
      const classExists = AVAILABLE_CLASSES.find(cls => cls.id === savedClass)
      if (classExists) {
        setCurrentClass(classExists)
      } else {
        // La classe n'existe plus, forcer la sélection
        setIsFirstVisit(true)
        localStorage.removeItem('selectedClass')
      }
    } else if (!hasVisited) {
      // Première visite
      setIsFirstVisit(true)
    } else {
      // Utilisateur revient mais n'a pas de classe sélectionnée
      setIsFirstVisit(true)
    }
    
    setLoading(false)
  }, [])

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
    availableClasses: AVAILABLE_CLASSES,
    isFirstVisit,
    loading,
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