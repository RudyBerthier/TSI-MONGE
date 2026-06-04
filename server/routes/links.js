const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/logger');

// GET - Récupérer toutes les cartes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quick_links')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Transform to match frontend expected format
    const links = (data || []).map(link => ({
      id: link.id,
      title: link.title,
      description: link.description,
      url: link.url,
      icon: link.icon,
      emoji: link.emoji
    }));

    res.json({ links });
  } catch (error) {
    console.error('Erreur lors de la récupération des liens:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Sauvegarder toutes les cartes (protégé par authentification)
router.post('/', requireAuth, async (req, res) => {
  try {
    const links = req.body;

    // Delete all existing links and replace
    await supabase.from('quick_links').delete().not('id', 'is', null);

    if (links && links.length > 0) {
      const rows = links.map((link, index) => ({
        title: link.title,
        description: link.description,
        url: link.url,
        icon: link.icon,
        emoji: link.emoji,
        display_order: index
      }));

      const { error } = await supabase.from('quick_links').insert(rows);
      if (error) throw error;
    }

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'links.save', details: { count: links?.length ?? 0 }, req });
    res.json({ success: true, message: 'Données sauvegardées avec succès' });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
