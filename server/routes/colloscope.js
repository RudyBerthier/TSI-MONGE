const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/logger');

// GET /api/colloscope — toutes les infos colleurs
router.get('/', async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('colloscope')
      .select('*');

    if (error) throw error;

    // Reconstruct the {code: kholles} map
    const colleurs = {};
    for (const row of (rows || [])) {
      colleurs[row.code] = row.kholles;
    }

    res.json(colleurs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/colloscope/:code — modifier les infos d'un code (admin)
// code = "MP 1", "MSA 3", etc.
router.put('/:code', requireAuth, async (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code);
    const { kholles } = req.body;
    if (!kholles || !Array.isArray(kholles)) {
      return res.status(400).json({ error: 'kholles (tableau) requis' });
    }

    const { error } = await supabase
      .from('colloscope')
      .upsert({ code, kholles });

    if (error) throw error;

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'admin.colloscope.update',
      targetType: 'colloscope',
      targetLabel: `Mise à jour du colloscope pour le groupe ${code}`,
      req
    });

    res.json({ success: true, code, kholles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
