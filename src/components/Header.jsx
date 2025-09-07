import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Compass, Menu, X, ChevronDown, Settings, Shield } from 'lucide-react'
import { useClass } from '../contexts/ClassContext'

export function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [classDropdownOpen, setClassDropdownOpen] = useState(false)
  const { currentClass, changeClass } = useClass()

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              <Compass size={24} />
              <span className="hidden sm:block">{currentClass?.name || 'Prépa Maths'}</span>
              <span className="sm:hidden">{currentClass?.id?.toUpperCase() || 'Prépa'}</span>
            </Link>
            
            {/* Sélecteur de classe */}
            <div className="relative">
              <button
                onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings size={16} />
                <ChevronDown size={16} />
              </button>
              
              {classDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Classe actuelle
                    </div>
                    <div className="px-3 py-2 text-sm text-gray-900 border-b border-gray-100">
                      {currentClass?.name || 'Non sélectionnée'}
                    </div>
                    <button
                      onClick={() => {
                        changeClass()
                        setClassDropdownOpen(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Changer de classe
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            <ul className="flex list-none gap-6 items-center">
              <li>
                <Link 
                  to="/" 
                  className={`text-gray-600 font-medium px-4 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 ${
                    isActive('/') ? 'text-blue-600 bg-blue-50' : ''
                  }`}
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link 
                  to="/documents" 
                  className={`text-gray-600 font-medium px-4 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 ${
                    isActive('/documents') ? 'text-blue-600 bg-blue-50' : ''
                  }`}
                >
                  Documents
                </Link>
              </li>
              <li>
                <Link 
                  to="/kolles" 
                  className={`text-gray-600 font-medium px-4 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 ${
                    isActive('/kolles') ? 'text-blue-600 bg-blue-50' : ''
                  }`}
                >
                  Khôlles
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.lycee-monge.fr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 font-medium px-4 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50"
                >
                  Lycée
                </a>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className={`text-gray-600 font-medium px-4 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2 ${
                    isActive('/login') ? 'text-blue-600 bg-blue-50' : ''
                  }`}
                >
                  <Shield size={16} />
                  Administration
                </Link>
              </li>
            </ul>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to="/" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block text-gray-600 font-medium px-4 py-3 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 ${
                      isActive('/') ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/documents" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block text-gray-600 font-medium px-4 py-3 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 ${
                      isActive('/documents') ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    Documents
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/kolles" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block text-gray-600 font-medium px-4 py-3 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 ${
                      isActive('/kolles') ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    Khôlles
                  </Link>
                </li>
                <li>
                  <a 
                    href="https://www.lycee-monge.fr/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-gray-600 font-medium px-4 py-3 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50"
                  >
                    Lycée
                  </a>
                </li>
                <li>
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block text-gray-600 font-medium px-4 py-3 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2 ${
                      isActive('/login') ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <Shield size={16} />
                    Administration
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}