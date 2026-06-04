const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/logger');
const { sendNotificationToAllExcept } = require('./push');

// Helper: map DB row to frontend format
function mapRequestToFrontend(row) {
  return {
    id: row.id,
    trinome: row.student_name,
    matiere: row.original_date,
    currentDay: row.original_time,
    currentHour: row.original_colleur,
    requestedDay: row.requested_date,
    requestedHour: row.requested_time,
    isCustomDate: row.reason === 'true',
    status: row.status,
    adminNote: row.updated_at ? undefined : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/kholle-requests - Get all requests
router.get('/', async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('kholle_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to frontend format preserving original field names
    const result = (requests || []).map(row => ({
      id: row.id,
      trinome: row.student_name,
      matiere: row.original_date,
      currentDay: row.original_time,
      currentHour: row.original_colleur,
      requestedDay: row.requested_date,
      requestedHour: row.requested_time,
      isCustomDate: row.reason === 'true',
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/kholle-requests - Create a new request
router.post('/', async (req, res) => {
  try {
    const { trinome, matiere, currentDay, currentHour, requestedDay, requestedHour, isCustomDate } = req.body;

    if (!trinome || !matiere || !currentDay || !currentHour || !requestedDay || !requestedHour) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    const newRequest = {
      id: Date.now().toString(),
      student_name: trinome,
      original_date: matiere,
      original_time: currentDay,
      original_colleur: currentHour,
      requested_date: requestedDay,
      requested_time: requestedHour,
      reason: isCustomDate ? 'true' : 'false',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('kholle_requests')
      .insert(newRequest)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      trinome: data.student_name,
      matiere: data.original_date,
      currentDay: data.original_time,
      currentHour: data.original_colleur,
      requestedDay: data.requested_date,
      requestedHour: data.requested_time,
      isCustomDate: data.reason === 'true',
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/kholle-requests/:id/approve - Approve a request (admin)
router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('kholle_requests')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Demande non trouvee' });

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'kholle.approve', targetType: 'kholle_request', targetId: id, targetLabel: `${data.student_name} — ${data.original_date}`, req });
    sendNotificationToAllExcept(req.user.id, {
      title: '✅ Échange de Khôlle validé',
      body: `${data.student_name} (${data.original_date})`,
      icon: '/icon-192.svg',
      badge: '/favicon.svg',
      tag: 'kholle-request',
      data: { url: '/emploi-du-temps' }
    }).catch(console.error);

    res.json({
      id: data.id,
      trinome: data.student_name,
      matiere: data.original_date,
      currentDay: data.original_time,
      currentHour: data.original_colleur,
      requestedDay: data.requested_date,
      requestedHour: data.requested_time,
      isCustomDate: data.reason === 'true',
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/kholle-requests/:id/reject - Reject a request (admin)
router.put('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('kholle_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Demande non trouvee' });

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'kholle.reject', targetType: 'kholle_request', targetId: id, targetLabel: `${data.student_name} — ${data.original_date}`, req });
    res.json({
      id: data.id,
      trinome: data.student_name,
      matiere: data.original_date,
      currentDay: data.original_time,
      currentHour: data.original_colleur,
      requestedDay: data.requested_date,
      requestedHour: data.requested_time,
      isCustomDate: data.reason === 'true',
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/kholle-requests/:id - Delete a request (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('kholle_requests')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Demande non trouvee' });

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'kholle.delete', targetType: 'kholle_request', targetId: id, targetLabel: data.student_name, req });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
