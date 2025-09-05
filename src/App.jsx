import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Documents } from './pages/Documents'
import { Kolles } from './pages/Kolles'
import { Admin } from './pages/Admin'
import { Login } from './pages/Login'
import { ClassProvider, useClass } from './contexts/ClassContext'
import { ClassSelector } from './components/ClassSelector'

function AppContent() {
  const { currentClass, isFirstVisit, loading } = useClass()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (isFirstVisit || !currentClass) {
    return <ClassSelector />
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/documents" element={<Layout><Documents /></Layout>} />
        <Route path="/kolles" element={<Layout><Kolles /></Layout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <ClassProvider>
      <AppContent />
    </ClassProvider>
  )
}

export default App
