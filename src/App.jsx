import { createBrowserRouter, RouterProvider, useLocation, useOutlet } from 'react-router-dom'
import { lazy, Suspense, Component, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { CallProvider } from './contexts/CallContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Navbar } from './components/Navbar'
import { ChatWidget } from './components/ChatWidget'
import CallUI from './components/CallUI'
import { PWAUpdatePrompt, OfflineIndicator, InstallPrompt } from './components/PWAPrompt'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { MusicProvider } from './contexts/MusicContext'
import MiniPlayer from './components/widgets/MiniPlayer.jsx'
import { GlobalSearch } from './components/GlobalSearch'
import { ScrollToTop } from './components/ScrollToTop'
import { ErrorPage } from './pages/ErrorPage'
import { MyReviews } from './pages/MyReviews'
import { TransportPage } from './pages/TransportPage'

// Lazy loading des pages lourdes pour le code splitting
const IndexPage = lazy(() => import('./pages/IndexPage').then(m => ({ default: m.IndexPage })))
const Places = lazy(() => import('./pages/Places').then(m => ({ default: m.Places })))
const Sondages = lazy(() => import('./pages/Sondages').then(m => ({ default: m.Sondages })))
const EmploiDuTemps = lazy(() => import('./pages/EmploiDuTemps').then(m => ({ default: m.EmploiDuTemps })))
const Cantine = lazy(() => import('./pages/Cantine').then(m => ({ default: m.Cantine })))
const Forum = lazy(() => import('./pages/Forum').then(m => ({ default: m.Forum })))
const Countdown = lazy(() => import('./pages/Countdown').then(m => ({ default: m.Countdown })))
const Pomodoro = lazy(() => import('./pages/Pomodoro').then(m => ({ default: m.Pomodoro })))
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })))
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })))
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })))
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const UserProfile = lazy(() => import('./pages/UserProfile').then(m => ({ default: m.UserProfile })))
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })))
const Maths = lazy(() => import('./pages/Maths').then(m => ({ default: m.Maths })))
const Annales = lazy(() => import('./pages/Annales').then(m => ({ default: m.Annales })))
const Status = lazy(() => import('./pages/Status').then(m => ({ default: m.Status })))
const Meteo = lazy(() => import('./pages/Meteo').then(m => ({ default: m.Meteo })))
const Notes = lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })))
const Feed = lazy(() => import('./pages/social/Feed').then(m => ({ default: m.Feed })))
const Explore = lazy(() => import('./pages/social/Explore').then(m => ({ default: m.Explore })))
const Notifications = lazy(() => import('./pages/social/Notifications').then(m => ({ default: m.Notifications })))
const SocialProfile = lazy(() => import('./pages/social/SocialProfile').then(m => ({ default: m.SocialProfile })))
const Reels = lazy(() => import('./pages/social/Reels').then(m => ({ default: m.default })))
const GameRoom = lazy(() => import('./pages/social/GameRoom').then(m => ({ default: m.default })))
const Docs = lazy(() => import('./pages/Docs').then(m => ({ default: m.Docs })))
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })))
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail').then(m => ({ default: m.PlaylistDetail })))
const Wrapped = lazy(() => import('./pages/Wrapped').then(m => ({ default: m.Wrapped })))
const Kholleurs = lazy(() => import('./pages/Kholleurs').then(m => ({ default: m.Kholleurs })))
const OutilsPage = lazy(() => import('./pages/OutilsPage').then(m => ({ default: m.OutilsPage })))
const KanbanBoard = lazy(() => import('./pages/outils/KanbanBoard').then(m => ({ default: m.KanbanBoard })))
const MongeClicker = lazy(() => import('./pages/outils/MongeClicker').then(m => ({ default: m.default })))
const Poker = lazy(() => import('./pages/outils/Poker').then(m => ({ default: m.default })))
const CarpoolHub = lazy(() => import('./pages/carpool/CarpoolHub').then(m => ({ default: m.CarpoolHub })))
const CarpoolOffer = lazy(() => import('./pages/carpool/CarpoolOffer').then(m => ({ default: m.CarpoolOffer })))
const CarpoolHistory = lazy(() => import('./pages/carpool/CarpoolHistory').then(m => ({ default: m.CarpoolHistory })))
const CarpoolDetails = lazy(() => import('./pages/carpool/CarpoolDetails').then(m => ({ default: m.CarpoolDetails })))
const MediaHub = lazy(() => import('./pages/MediaHub').then(m => ({ default: m.MediaHub })))


const SocialLayout = lazy(() => import('./components/SocialLayout').then(m => ({ default: m.SocialLayout })))
import { PWAInstaller } from './components/PWAInstaller'

// ErrorBoundary pour capturer les erreurs React
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Une erreur est survenue</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              L'application a rencontré un problème inattendu.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Composant de chargement pour Suspense
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg)' }}>
      <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="w-32 h-3 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
    </div>
  )
}

function AnimatedOutlet() {
  const location = useLocation()
  const element = useOutlet()

  // For /social, group by root so the layout doesn't remount on sub-navigation.
  // For everything else, use the full pathname so each page change gets an animation.
  const isSocial = location.pathname.startsWith('/social')
  const animationKey = isSocial
    ? '/social'
    : location.pathname

  return (
    <AnimatePresence mode="wait" initial={false}>
      {element && (
        <motion.div
          key={animationKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 flex flex-col w-full"
        >
          <Suspense fallback={<PageLoader />}>
            {element}
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Components that need router context (like useLocation) are moved into a Layout Route
function AppLayout() {
  const { pathname } = useLocation()
  const hideNavbar = pathname.startsWith('/social') || pathname.startsWith('/outils/poker')
  const hideGlobalSearch = pathname.startsWith('/outils/poker')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showOfflineBanner, setShowOfflineBanner] = useState(!navigator.onLine)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setTimeout(() => setShowOfflineBanner(false), 3000)
    }
    const handleOffline = () => {
      setIsOffline(true)
      setShowOfflineBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <ErrorBoundary>
      {!hideNavbar && <Navbar />}
      <AnimatedOutlet />
      {!hideNavbar && <ChatWidget />}
      {!hideNavbar && <ScrollToTop />}
      <CallUI />

      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className={`fixed top-0 left-0 right-0 z-[100] p-2 text-center text-sm font-medium transition-colors duration-500 ${isOffline
          ? 'bg-red-500 text-white'
          : 'bg-green-500 text-white'
          }`}>
          {isOffline ? (
            <div className="flex items-center justify-center gap-2">
              <WifiOff className="w-4 h-4" />
              Vous êtes hors-ligne. Certaines fonctionnalités peuvent être indisponibles.
            </div>
          ) : (
            'Connexion rétablie'
          )}
        </div>
      )}

      <PWAUpdatePrompt />
      <OfflineIndicator />
      <InstallPrompt />
      <MiniPlayer />
      {!hideGlobalSearch && <GlobalSearch />}
    </ErrorBoundary>
  )
}

// Configuration du Router v7 avec View Transitions activées par défaut
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <IndexPage /> },
      { path: "places", element: <Places /> },
      { path: "sondages", element: <Sondages /> },
      { path: "emploi-du-temps", element: <EmploiDuTemps /> },
      { path: "cantine", element: <Cantine /> },
      { path: "forum", element: <Forum /> },
      { path: "countdown", element: <Countdown /> },
      { path: "pomodoro", element: <Pomodoro /> },
      { path: "register", element: <Register /> },
      { path: "verify-email", element: <VerifyEmail /> },
      { path: "login", element: <Login /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "admin", element: <Admin /> },
      { path: "maths", element: <Maths /> },
      { path: "annales", element: <Annales /> },
      { path: "meteo", element: <Meteo /> },
      { path: "notes", element: <Notes /> },
      { path: "profile", element: <Profile /> },
      { path: "status", element: <Status /> },
      { path: "docs", element: <Docs /> },
      { path: "library", element: <Library /> },
      { path: "library/:id", element: <PlaylistDetail /> },
      { path: "wrapped", element: <Wrapped /> },
      { path: "kholleurs", element: <Kholleurs /> },
      { path: "outils", element: <OutilsPage /> },
      { path: "outils/kanban", element: <KanbanBoard /> },
      { path: "outils/clicker", element: <MongeClicker /> },
      { path: "outils/poker", element: <Poker /> },
      { path: "mes-critiques", element: <MyReviews /> },
      { path: "media", element: <MediaHub /> },
      { path: "covoiturage", element: <CarpoolHub /> },
      { path: "covoiturage/historique", element: <CarpoolHistory /> },
      { path: "covoiturage/proposer", element: <CarpoolOffer /> },
      { path: "covoiturage/modifier/:id", element: <CarpoolOffer /> },
      { path: "covoiturage/:id", element: <CarpoolDetails /> },
      { path: "transport", element: <TransportPage /> },

      {
        path: "social",
        element: <SocialLayout />,
        children: [
          { index: true, element: <Feed /> },
          { path: "explore", element: <Explore /> },
          { path: "notifications", element: <Notifications /> },
          { path: "reels", element: <Reels /> },
          { path: "chat", element: <Chat /> },
          { path: "games", element: <GameRoom /> },
          { path: "profile", element: <SocialProfile /> },
          { path: "user/:identifier", element: <UserProfile /> }
        ]
      }
    ]
  }
])
function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <CallProvider>
              <MusicProvider>
                <RouterProvider router={router} />
              </MusicProvider>
            </CallProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
