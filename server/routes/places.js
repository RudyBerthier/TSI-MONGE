const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');

const getDefaultLayout = () => ({
  left: [['', ''], ['', ''], ['', ''], ['', ''], ['', '']],
  center: [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']],
  right: [['', ''], ['', ''], ['', ''], ['', ''], ['', '']]
});

// Calcul du nombre de semaines depuis la date de debut
function getWeeksSince(startDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = now - start;
  return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
}

// Rotation d'un tableau de n positions vers l'avant
function rotateArray(arr, n) {
  if (!arr || arr.length === 0) return arr;
  const len = arr.length;
  const shift = ((n % len) + len) % len;
  if (shift === 0) return arr.map(row => [...row]);
  return [...arr.slice(shift), ...arr.slice(0, shift)].map(row => [...row]);
}

// GET /api/places/:classId - Layout actuel avec rotation appliquee
router.get('/:classId', async (req, res) => {
  try {
    const classId = req.params.classId;

    const { data, error } = await supabase
      .from('seating_layouts')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (error || !data) {
      return res.json({
        classId,
        startDate: new Date().toISOString().split('T')[0],
        currentWeek: 0,
        layout: getDefaultLayout()
      });
    }

    const weeks = getWeeksSince(data.start_date);

    const rotatedLayout = {
      left: rotateArray(data.layout.left, weeks),
      center: rotateArray(data.layout.center, weeks),
      right: rotateArray(data.layout.right, weeks)
    };

    res.json({
      classId,
      startDate: data.start_date,
      currentWeek: weeks,
      layout: rotatedLayout
    });
  } catch (error) {
    console.error('Erreur places:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/places/:classId/base - Layout de base sans rotation (pour l'admin)
router.get('/:classId/base', async (req, res) => {
  try {
    const classId = req.params.classId;

    const { data, error } = await supabase
      .from('seating_layouts')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (error || !data) {
      return res.json({
        classId,
        startDate: new Date().toISOString().split('T')[0],
        layout: getDefaultLayout()
      });
    }

    res.json({
      classId,
      startDate: data.start_date,
      layout: data.layout
    });
  } catch (error) {
    console.error('Erreur places base:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/places/:classId - Mettre a jour le layout de base (admin)
router.put('/:classId', requireAuth, async (req, res) => {
  try {
    const classId = req.params.classId;
    const { layout, startDate } = req.body;

    // First try to get existing data for defaults
    const { data: existing } = await supabase
      .from('seating_layouts')
      .select('*')
      .eq('class_id', classId)
      .single();

    const upsertData = {
      class_id: classId,
      start_date: startDate || existing?.start_date || new Date().toISOString().split('T')[0],
      layout: layout || existing?.layout || getDefaultLayout(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('seating_layouts')
      .upsert(upsertData);

    if (error) throw error;

    res.json({ success: true, message: 'Places mises a jour' });
  } catch (error) {
    console.error('Erreur update places:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
