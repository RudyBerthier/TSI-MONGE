import { Bell, BellOff, BellRing, AlertCircle, CheckCircle } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';

export function NotificationSettings({ isAuthenticated, token }) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    testNotification
  } = usePushNotifications(isAuthenticated, token);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Notifications non supportées sur ce navigateur</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <Bell className="w-4 h-4" />
        <span>Connectez-vous pour activer les notifications</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm">
        <BellOff className="w-4 h-4" />
        <span>Notifications bloquées dans les paramètres du navigateur</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <BellRing className="w-5 h-5 text-green-500" />
          ) : (
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
          <span className="font-medium text-gray-800 dark:text-gray-200">
            Notifications push
          </span>
        </div>

        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isSubscribed
              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Chargement...
            </span>
          ) : isSubscribed ? (
            'Désactiver'
          ) : (
            'Activer'
          )}
        </button>
      </div>

      {isSubscribed && (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Vous recevrez des notifications pour les messages, sondages, annonces et khôlles
          </span>
        </div>
      )}

      {isSubscribed && (
        <button
          onClick={testNotification}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Tester les notifications
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Compact version for header/navbar
export function NotificationToggle({ isAuthenticated, token }) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  } = usePushNotifications(isAuthenticated, token);

  if (!isSupported || !isAuthenticated || permission === 'denied') {
    return null;
  }

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${isSubscribed
          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30'
          : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
        }`}
      title={isSubscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
      ) : isSubscribed ? (
        <BellRing className="w-5 h-5" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
    </button>
  );
}

export default NotificationSettings;
