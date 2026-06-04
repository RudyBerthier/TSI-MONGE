import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

// Wrap navigator.serviceWorker.ready in a timeout to avoid hanging forever on iOS
function getServiceWorkerReady(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Service Worker non disponible (timeout). Assurez-vous que l\'application est installée sur l\'écran d\'accueil.'));
    }, timeoutMs);

    navigator.serviceWorker.ready.then((reg) => {
      clearTimeout(timer);
      resolve(reg);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function usePushNotifications(isAuthenticated, token) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator &&
                      'PushManager' in window &&
                      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check subscription status when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token || !isSupported) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/push/status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setIsSubscribed(data.subscribed);
        }
      } catch (err) {
        console.error('Error checking push status:', err);
      }
    };

    checkStatus();
  }, [isAuthenticated, token, isSupported]);

  // Get VAPID public key
  const getVapidPublicKey = async () => {
    const response = await fetch(`${API_URL}/api/push/vapid-public-key`);
    const data = await response.json();
    return data.publicKey;
  };

  // Convert base64 to Uint8Array for applicationServerKey
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !isAuthenticated || !token) {
      setError('Notifications non disponibles');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Permission refusée');
        setIsLoading(false);
        return false;
      }

      // Wait for service worker with timeout — avoids infinite hang on iOS
      let registration;
      try {
        registration = await getServiceWorkerReady(10000);
      } catch (swErr) {
        // On iOS Safari in dev or first-install, try registering SW manually
        try {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          // Give it a moment to activate
          await new Promise((res) => setTimeout(res, 1500));
          registration = await getServiceWorkerReady(8000);
        } catch (regErr) {
          setError('Service Worker non prêt. Sur iPhone, installez d\'abord l\'app via "Ajouter à l\'écran d\'accueil", puis réessayez.');
          setIsLoading(false);
          return false;
        }
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Send subscription to server
      const response = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        throw new Error('Erreur serveur lors de l\'enregistrement');
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      setError(err.message || 'Erreur lors de l\'abonnement');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, isAuthenticated, token]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isAuthenticated || !token) return false;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await getServiceWorkerReady(5000).catch(() => null);

      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Notify server
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setError(err.message || 'Erreur lors du désabonnement');
      setIsLoading(false);
      return false;
    }
  }, [isAuthenticated, token]);

  // Test notification
  const testNotification = useCallback(async () => {
    if (!isAuthenticated || !token) return false;

    try {
      const response = await fetch(`${API_URL}/api/push/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (err) {
      console.error('Test notification error:', err);
      return false;
    }
  }, [isAuthenticated, token]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    testNotification
  };
}

export default usePushNotifications;
