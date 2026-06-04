import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if we haven't dismissed it recently
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      const now = new Date().getTime();
      if (!dismissed || (now - parseInt(dismissed)) > 7 * 24 * 60 * 60 * 1000) { // Ask again after 7 days
         setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', new Date().getTime().toString());
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-4 z-50 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Installer l'application</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              Accédez rapidement à TSI-MONGE depuis votre écran d'accueil et profitez du mode hors-ligne.
            </p>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1 -mt-1 -mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={handleDismiss} className="flex-1 py-2 px-4 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
          Plus tard
        </button>
        <button onClick={handleInstallClick} className="flex-1 py-2 px-4 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
          Installer
        </button>
      </div>
    </div>
  );
}
