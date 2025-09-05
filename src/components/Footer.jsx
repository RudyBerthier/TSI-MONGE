import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <p className="text-gray-300">&copy; 2025 TSI 1 Mathématiques - Lycée Monge Chambéry</p>
          </div>
          <ul className="flex space-x-6 mt-4 md:mt-0">
            <li><Link to="/" className="text-gray-300 hover:text-white transition-colors">Accueil</Link></li>
            <li><a href="https://www.lycee-monge.fr/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Site du lycée</a></li>
            <li><a href="https://www.icolle.fr/lyceemonge/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">iColle</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}