import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, RefreshCw, Wifi, WifiOff, X } from 'lucide-react'

// PWA Update Prompt
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
          <RefreshCw size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">Mise à jour disponible</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Une nouvelle version est prête à être installée
          </p>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg touch-small"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
        >
          Mettre à jour
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

// Offline Indicator
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOffline, setShowOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showOffline) return null

  return (
    <div className="offline-indicator flex items-center justify-center gap-2">
      <WifiOff size={16} />
      <span>Vous êtes hors ligne</span>
    </div>
  )
}

// Install Prompt for iOS and other browsers
export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) return // Don't show for 7 days after dismissal
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(iOS)

    if (iOS) {
      // Show iOS install prompt after delay
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // For other browsers, listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  if (!showPrompt) return null

  return (
    <div className="pwa-install-banner animate-slide-up">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Download size={24} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Installer TSI Monge</h3>
          <p className="text-sm opacity-90 truncate">
            {isIOS
              ? "Appuyez sur Partager puis 'Sur l'écran d'accueil'"
              : "Accédez rapidement depuis votre écran d'accueil"
            }
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            Installer
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-small flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
