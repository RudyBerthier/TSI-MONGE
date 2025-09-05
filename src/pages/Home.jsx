import { Link } from 'react-router-dom'
import { BookOpen, Target, School, Mail, Info, ExternalLink, ArrowRight } from 'lucide-react'

export function Home() {

  return (
    <>
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Documents pour les prépas TSI 1ère année</h1>
          <p className="text-xl mb-8 text-blue-100 max-w-3xl mx-auto">Lycée Monge, Chambéry - Site destiné aux étudiants en TSI 1 à Monge et aux colleurs</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/documents" className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              <BookOpen size={20} />
              Accéder aux cours
            </Link>
            <Link to="/kolles" className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 border border-blue-400 transition-colors">
              <Target size={20} />
              Planning khôlles
            </Link>
          </div>
        </div>
      </section>

      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Accès rapide</h2>
              <p className="text-gray-600 text-lg">Accédez rapidement aux différentes sections du site</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <School size={32} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Site du lycée Monge</h3>
                </div>
                <p className="text-gray-600 mb-4">Retrouvez toutes les informations officielles du lycée</p>
                <div>
                  <a href="https://www.lycee-monge.fr/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
                    Visiter le site
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <BookOpen size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Documents TSI 1</h3>
                </div>
                <p className="text-gray-600 mb-4">Cours, exercices et ressources pour la première année</p>
                <div>
                  <Link to="/documents" className="inline-flex items-center gap-2 text-green-600 hover:text-green-800 font-medium">
                    Voir les documents
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                    <Target size={32} className="text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Khôlles</h3>
                </div>
                <p className="text-gray-600 mb-4">Planning des colles et programmes hebdomadaires</p>
                <div>
                  <Link to="/kolles" className="inline-flex items-center gap-2 text-yellow-600 hover:text-yellow-800 font-medium">
                    Voir le planning
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Informations pratiques</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <Mail size={32} className="text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Contact</h3>
                </div>
                <div>
                  <p>
                    <a href="mailto:ameline.crida@ac-grenoble.fr" className="text-purple-600 hover:text-purple-800 font-medium">ameline.crida@ac-grenoble.fr</a>
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                    <Info size={32} className="text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">À propos</h3>
                </div>
                <p className="text-gray-600">Ce site regroupe tous les documents nécessaires pour suivre les cours de mathématiques en TSI 1ère année au lycée Monge de Chambéry.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}