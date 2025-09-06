import { useState, useEffect } from 'react'
import { documentsAPI, kollesAPI } from '../services/api'
import { Download, Calendar, ExternalLink, Link, AlertTriangle, Info } from 'lucide-react'
import { SecurePDFLink, openSecurePDFInNewTab } from '../utils/pdfUtils.jsx'
import { useClass } from '../contexts/ClassContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function Kolles() {
  const { currentClass } = useClass()
  const [kolles, setKolles] = useState([])
  const [planningDocument, setPlanningDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const weekDates = {
    1: '16 au 20 septembre', 2: '23 au 27 septembre', 3: '30 septembre au 4 octobre',
    4: '7 au 11 octobre', 5: '14 au 18 octobre', 6: '4 au 8 novembre',
    7: '12 au 16 novembre', 8: '18 au 22 novembre', 9: '25 au 29 novembre',
    10: '2 au 6 décembre', 11: '9 au 13 décembre', 12: '16 au 20 décembre',
    13: '6 au 10 janvier', 14: '13 au 17 janvier', 15: '27 au 31 janvier',
    16: '3 au 7 février', 17: '10 au 14 février', 18: '17 au 21 février',
    19: '10 au 14 mars', 20: '17 au 21 mars', 21: '24 au 28 mars',
    22: '31 mars au 4 avril', 23: '7 au 11 avril', 24: '14 au 18 avril',
    25: '5 au 9 mai', 26: '12 au 16 mai', 27: '19 au 23 mai', 28: '2 au 6 juin'
  }

  const trimesters = [
    { name: 'Premier trimestre', badge: 'bg-blue-100 text-blue-800', period: 'Sept - Déc', weeks: [1,2,3,4,5,6,7,8,9,10,11,12] },
    { name: 'Deuxième trimestre', badge: 'bg-yellow-100 text-yellow-800', period: 'Jan - Mar', weeks: [13,14,15,16,17,18,19,20,21] },
    { name: 'Troisième trimestre', badge: 'bg-green-100 text-green-800', period: 'Avr - Juin', weeks: [22,23,24,25,26,27,28] }
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [kollesData, activePlanningData] = await Promise.all([
        kollesAPI.getKolles(),
        kollesAPI.getActiveAnnualProgram()
      ])
      
      setKolles(kollesData)
      setPlanningDocument(activePlanningData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openKolle = (filename) => {
    const fileUrl = `/uploads/kolles/${filename}`
    // Utiliser le système blob sécurisé
    openSecurePDFInNewTab(fileUrl, filename)
  }

  if (loading) {
    return (
      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Chargement des programmes...</p>
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
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Khôlles {currentClass?.name || 'Classe'}</h1>
          <p className="text-xl mb-8 text-blue-100 max-w-3xl mx-auto">Planning annuel et programmes hebdomadaires des colles de mathématiques</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {planningDocument ? (
              <SecurePDFLink 
                fileUrl={planningDocument.file_url} 
                filename="Planning_kolles_annuel.pdf"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                <Calendar size={20} />
                Planning annuel
              </SecurePDFLink>
            ) : (
              <div className="inline-flex items-center gap-2 bg-gray-200 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
                <Calendar size={20} />
                Planning annuel (indisponible)
              </div>
            )}
            <a href="https://www.icolle.fr/lyceemonge/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 border border-blue-400 transition-colors">
              <Link size={20} />
              iColle
            </a>
          </div>
        </div>
      </section>

      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Planning et organisation</h2>
              <p className="text-gray-600 text-lg">Retrouvez toutes les informations concernant les khôlles</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Calendar size={32} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Planning annuel</h3>
                </div>
                <p className="text-gray-600 mb-4">Consultez le colloscope complet de l'année scolaire avec toutes les dates et créneaux</p>
                <div>
                  {planningDocument ? (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">{planningDocument.title}</h4>
                        <p className="text-sm text-gray-500">Année: {planningDocument.year}</p>
                      </div>
                      <SecurePDFLink 
                        fileUrl={planningDocument.file_url} 
                        filename="Planning_kolles_annuel.pdf"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Télécharger le PDF
                        <ExternalLink size={16} />
                      </SecurePDFLink>
                    </div>
                  ) : (
                    <div className="text-gray-500">Aucun planning disponible pour le moment</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <Link size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">iColle</h3>
                </div>
                <p className="text-gray-600 mb-4">Plateforme en ligne pour la gestion des khôlles et la consultation des notes</p>
                <div>
                  <a href="https://www.icolle.fr/lyceemonge/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-green-600 hover:text-green-800 font-medium">
                    Accéder à iColle
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Programmes des khôlles</h2>
              <p className="text-gray-600 text-lg">Programmes hebdomadaires - Année scolaire 2025-2026</p>
            </div>

            <div className="space-y-8">
              {trimesters.map(trimester => (
                <div key={trimester.name} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold text-gray-900">{trimester.name}</h3>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${trimester.badge}`}>{trimester.period}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {trimester.weeks.map(weekNum => {
                      const kolle = kolles.find(k => k.week_number == weekNum)
                      const dates = weekDates[weekNum] || 'Dates à définir'
                      
                      return (
                        <div key={weekNum} className={`p-4 rounded-lg border transition-colors ${
                          kolle 
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="mb-3">
                            <div className="font-semibold text-gray-900">Semaine {weekNum}</div>
                            <div className="text-sm text-gray-600">{dates}</div>
                          </div>
                          {kolle ? (
                            <button 
                              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors" 
                              onClick={() => openKolle(kolle.filename)}
                              title="Télécharger le programme"
                            >
                              <Download size={14} />
                              <span>Voir</span>
                            </button>
                          ) : (
                            <span className="text-sm text-gray-500 font-medium">À venir</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mt-8">
              <div className="flex gap-4 items-start">
                <div className="text-blue-600"><Info size={24} /></div>
                <div className="text-blue-800">
                  <p className="mb-2"><strong>Note :</strong> Les programmes hebdomadaires sont publiés au fur et à mesure de l'avancement dans le programme.</p>
                  <p>Consultez le planning annuel et la plateforme iColle pour toutes les informations pratiques.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}