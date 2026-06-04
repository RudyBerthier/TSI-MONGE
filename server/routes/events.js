const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/logger');

// Helper: map DB row to frontend format
function mapEventToFrontend(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    matiere: row.matiere,
    jour: row.jour,
    heure: row.heure,
    salle: row.salle,
    description: row.description,
    weekNum: row.week_num,
    recurring: row.recurring || false
  };
}

// GET /api/events — tous les evenements + recurring
router.get('/', async (req, res) => {
  try {
    const { data: allEvents, error } = await supabase
      .from('events')
      .select('*');

    if (error) throw error;

    const events = [];
    const recurring = [];

    for (const row of (allEvents || [])) {
      const evt = mapEventToFrontend(row);
      if (row.recurring) {
        recurring.push(evt);
      } else {
        events.push(evt);
      }
    }

    res.json({ events, recurring });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events — creer un evenement (admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, title, matiere, jour, heure, salle, weekNum, description, recurring } = req.body;
    if (!type || !title || !matiere || !jour || !heure) {
      return res.status(400).json({ error: 'type, title, matiere, jour et heure requis' });
    }

    const newEvent = {
      id: crypto.randomUUID(),
      type,
      title,
      matiere,
      jour,
      heure,
      salle: salle || '',
      description: description || '',
      recurring: !!recurring,
      week_num: recurring ? null : weekNum,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('events')
      .insert(newEvent)
      .select()
      .single();

    if (error) throw error;

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'events.create', targetType: 'event', targetId: data.id, targetLabel: title, req });
    res.json(mapEventToFrontend(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/events/:id — modifier un evenement (admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, matiere, jour, heure, salle, weekNum, description, recurring } = req.body;

    const updates = {
      type,
      title,
      matiere,
      jour,
      heure,
      salle: salle || '',
      description: description || '',
      recurring: !!recurring,
      week_num: recurring ? null : weekNum
    };

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Evenement non trouve' });

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'events.update', targetType: 'event', targetId: id, targetLabel: title, req });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:id — supprimer un evenement (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Evenement non trouve' });

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'events.delete', targetType: 'event', targetId: id, targetLabel: data.title, req });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
