import { useState } from 'react'
import { useClass } from '../contexts/ClassContext'
import { GraduationCap, Users, ArrowRight, BookOpen, Calculator } from 'lucide-react'

export function ClassSelector() {
  const { availableClasses, selectClass } = useClass()
  const [selectedClassId, setSelectedClassId] = useState(null)

  const handleClassSelect = (classData) => {
    setSelectedClassId(classData.id)
  }

  const handleConfirm = () => {
    const selectedClass = availableClasses.find(cls => cls.id === selectedClassId)
    if (selectedClass) {
      selectClass(selectedClass)
    }
  }

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'from-blue-500 to-blue-600',
        border: 'border-blue-200',
        text: 'text-blue-600',
        hover: 'hover:border-blue-300 hover:bg-blue-50'
      },
      green: {
        bg: 'from-green-500 to-green-600',
        border: 'border-green-200',
        text: 'text-green-600',
        hover: 'hover:border-green-300 hover:bg-green-50'
      },
      purple: {
        bg: 'from-purple-500 to-purple-600',
        border: 'border-purple-200',
        text: 'text-purple-600',
        hover: 'hover:border-purple-300 hover:bg-purple-50'
      },
      red: {
        bg: 'from-red-500 to-red-600',
        border: 'border-red-200',
        text: 'text-red-600',
        hover: 'hover:border-red-300 hover:bg-red-50'
      },
      yellow: {
        bg: 'from-yellow-500 to-yellow-600',
        border: 'border-yellow-200',
        text: 'text-yellow-600',
        hover: 'hover:border-yellow-300 hover:bg-yellow-50'
      },
      indigo: {
        bg: 'from-indigo-500 to-indigo-600',
        border: 'border-indigo-200',
        text: 'text-indigo-600',
        hover: 'hover:border-indigo-300 hover:bg-indigo-50'
      }
    }
    return colorMap[color] || colorMap.blue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenue sur la plateforme
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Sélectionnez votre classe pour accéder aux ressources
          </p>
          <p className="text-gray-500">
            Cette sélection sera mémorisée sur cet ordinateur
          </p>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 justify-items-center">
          {availableClasses.map((classData) => {
            const colors = getColorClasses(classData.color)
            const isSelected = selectedClassId === classData.id
            
            return (
              <button
                key={classData.id}
                onClick={() => handleClassSelect(classData)}
                className={`w-full max-w-sm p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                  isSelected 
                    ? `${colors.border} bg-white shadow-lg scale-105 ring-4 ring-opacity-20 ring-${classData.color}-500`
                    : `border-gray-200 bg-white ${colors.hover} shadow-sm hover:shadow-md`
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${colors.bg} flex-shrink-0`}>
                    <BookOpen size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {classData.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {classData.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users size={14} />
                      <span>Classe préparatoire</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className={`p-2 rounded-full ${colors.text}`}>
                      <ArrowRight size={20} />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Confirmation Button */}
        <div className="text-center">
          <button
            onClick={handleConfirm}
            disabled={!selectedClassId}
            className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
              selectedClassId
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Calculator size={24} />
            {selectedClassId 
              ? `Accéder à ${availableClasses.find(c => c.id === selectedClassId)?.name}`
              : 'Sélectionnez une classe'
            }
            <ArrowRight size={20} />
          </button>
          
          {selectedClassId && (
            <p className="text-gray-500 text-sm mt-4">
              Vous pourrez changer de classe à tout moment depuis les paramètres
            </p>
          )}
        </div>
      </div>
    </div>
  )
}