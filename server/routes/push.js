const express = require('express');
const webpush = require('web-push');
const { authenticateToken } = require('./auth');
const supabase = require('../config/supabase');

const router = express.Router();

// VAPID keys - In production, use environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BGH1lQSvJ8Med9E1XQ9a9RrGeAoePNTnMiOM0HvwGPAEKIa1N2q2jtNMGohnIF7lPzFHvXJmnVAgB8UunbqBpjo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'PCoKPJAl7WxlULXqj8SKU6ll2xD6ql4118i_7TXDyIY';

// Configure web-push
webpush.setVapidDetails(
  'mailto:contact@tsi-monge.fr',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription invalide' });
    }

    // Remove old subscription for this user if exists
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    // Add new subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    res.json({ success: true, message: 'Abonnement enregistre' });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Erreur lors de l\'abonnement' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Desabonnement effectue' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Erreur lors du desabonnement' });
  }
});

// Check subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ subscribed: (data || []).length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Send notification to specific user
async function sendNotificationToUser(userId, payload) {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;

    const subscription = {
      endpoint: data.endpoint,
      keys: data.keys
    };

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    // Remove invalid subscription
    if (error.statusCode === 410 || error.statusCode === 404) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
    }
    return false;
  }
}

// Send notification to multiple users
async function sendNotificationToUsers(userIds, payload) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendNotificationToUser(userId, payload))
  );
  return results;
}

// Send notification to all users except one
async function sendNotificationToAllExcept(excludeUserId, payload) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .neq('user_id', excludeUserId);

    if (error) throw error;

    const results = await Promise.allSettled(
      (subscriptions || []).map(sub => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: sub.keys
        };
        return webpush.sendNotification(subscription, JSON.stringify(payload))
          .catch(async (err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', sub.user_id);
            }
            throw err;
          });
      })
    );

    return results;
  } catch (error) {
    console.error('Error sending notifications:', error);
    return [];
  }
}

// Test endpoint (for development)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const success = await sendNotificationToUser(userId, {
      title: 'Test Notification',
      body: 'Les notifications fonctionnent !',
      icon: '/icon-192.svg',
      badge: '/favicon.svg',
      tag: 'test',
      data: { url: '/' }
    });

    if (success) {
      res.json({ success: true, message: 'Notification envoyee' });
    } else {
      res.status(404).json({ error: 'Pas d\'abonnement trouve' });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi' });
  }
});

module.exports = {
  router,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendNotificationToAllExcept
};
