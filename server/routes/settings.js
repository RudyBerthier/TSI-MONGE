const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { sendNotificationToAllExcept } = require('./push');
const { logActivity } = require('../utils/logger');

// Paramètres par défaut
const DEFAULT_SETTINGS = {
  siteName: 'TSI 1 Mathématiques - Lycée Monge Chambéry',
  schoolYear: '2024-2025',
  lastUpdated: new Date().toISOString()
};

// GET /api/settings - Récupérer les paramètres du site
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value, updated_at');

    if (error) throw error;

    if (!data || data.length === 0) {
      // Insert defaults
      const rows = [
        { key: 'siteName', value: DEFAULT_SETTINGS.siteName },
        { key: 'schoolYear', value: DEFAULT_SETTINGS.schoolYear }
      ];
      await supabase.from('site_settings').upsert(rows);
      return res.json(DEFAULT_SETTINGS);
    }

    const settings = {};
    for (const row of data) {
      settings[row.key] = row.value;
    }
    settings.lastUpdated = data[0]?.updated_at || new Date().toISOString();

    res.json(settings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

// PUT /api/settings - Mettre à jour les paramètres du site
router.put('/', async (req, res) => {
  try {
    const { siteName, schoolYear, announcementMessage, announcementActive } = req.body;

    if (!siteName || !schoolYear) {
      return res.status(400).json({ error: 'Le nom du site et l\'année scolaire sont requis' });
    }

    const now = new Date().toISOString();
    const rows = [
      { key: 'siteName', value: siteName.trim(), updated_at: now },
      { key: 'schoolYear', value: schoolYear.trim(), updated_at: now }
    ];

    if (announcementMessage !== undefined) {
      rows.push({ key: 'announcementMessage', value: announcementMessage.trim(), updated_at: now });
    }
    if (announcementActive !== undefined) {
      rows.push({ key: 'announcementActive', value: announcementActive ? 'true' : 'false', updated_at: now });
    }

    const { error } = await supabase.from('site_settings').upsert(rows);
    if (error) throw error;

    const settings = {
      siteName: siteName.trim(),
      schoolYear: schoolYear.trim(),
      announcementMessage: announcementMessage !== undefined ? announcementMessage.trim() : undefined,
      announcementActive: announcementActive !== undefined ? (announcementActive ? 'true' : 'false') : undefined,
      lastUpdated: now
    };

    if (announcementActive && announcementMessage) {
      sendNotificationToAllExcept(req.user?.id || 'admin', {
        title: '📢 Annonce',
        body: announcementMessage.trim(),
        icon: '/icon-192.svg',
        badge: '/favicon.svg',
        tag: 'annonce',
        data: { url: '/' }
      }).catch(console.error);
    }

    logActivity({
      actorId: req.user?.id,
      actorUsername: req.user?.username,
      action: 'admin.settings.update',
      targetLabel: 'Mise à jour des paramètres du site',
      req
    });

    res.json({ message: 'Paramètres mis à jour avec succès', settings });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

module.exports = router;
