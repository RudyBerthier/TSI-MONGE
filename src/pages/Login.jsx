import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { Wrench, Home, Unlock } from 'lucide-react'
import { useClass } from '../contexts/ClassContext'

export function Login() {
  const { currentClass } = useClass()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await authAPI.verifyToken()
          navigate('/admin')
        } catch (error) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
    }
    
    checkExistingAuth()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login(formData.username, formData.password)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      navigate('/admin')
    } catch (error) {
      setError('Nom d\'utilisateur ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="bg-white p-12 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <Wrench size={32} /> Administration
          </h1>
          <p className="text-gray-600 text-sm">
            {currentClass?.name || 'Classe'} - Lycée Monge
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block mb-2 font-semibold text-gray-700">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-8">
            <label className="block mb-2 font-semibold text-gray-700">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 text-white border-none rounded-lg text-base font-semibold transition-all flex items-center justify-center gap-2 ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 cursor-pointer'
            }`}
          >
            {loading ? 'Connexion...' : <><Unlock size={20} /> Se connecter</>}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <a
            href="/"
            className="text-blue-600 no-underline text-sm hover:text-blue-800 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} /> Retour au site
          </a>
        </div>
      </div>
    </div>
  )
}