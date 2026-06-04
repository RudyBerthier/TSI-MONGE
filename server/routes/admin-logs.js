const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/logger');

// GET /api/admin/logs
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 40 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (search) {
      query = query.or(
        `actor_username.ilike.%${search}%,target_label.ilike.%${search}%,action.ilike.%${search}%`
      );
    }

    if (category) {
      query = query.ilike('action', `${category}.%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      logs: data || [],
      total: count || 0,
      page: pageNum,
      pages: Math.ceil((count || 0) / limitNum),
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/logs — purge tous les logs
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .not('id', 'is', null);
    if (error) throw error;

    // Log the action of clearing logs (this will be the only log remaining after the purge)
    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'admin.logs.clear',
      targetLabel: 'Purge des anciens logs d\'activité',
      req
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
