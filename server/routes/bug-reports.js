const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

// Helper: decode custom JWT and return user id + username
function decodeToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET); // { id, username, email, role }
  } catch { return null; }
}

async function isAdmin(authHeader) {
  const decoded = decodeToken(authHeader);
  if (!decoded?.id) return false;
  const { data } = await supabase.from('users').select('role').eq('id', decoded.id).single();
  return data?.role === 'admin' || decoded.username === 'rudy' || decoded.username === 'Rudy';
}

// POST /api/bug-reports - Submit a new bug/feature report
router.post('/', async (req, res) => {
  try {
    const { type, title, description, url, user_agent } = req.body;
    
    // Auth is optional
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!type || !title || !description) {
      return res.status(400).json({ error: 'Type, title, and description are required' });
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .insert([{
        user_id: userId,
        type,
        title,
        description,
        url,
        user_agent,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating bug report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bug-reports - Admin only: List all reports
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!await isAdmin(req.headers.authorization)) {
      return res.status(403).json({ error: 'Unauthorized: Admins only' });
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .select(`
        *,
        users (
          username,
          avatar
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/bug-reports/:id - Admin only: Update status/notes
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!await isAdmin(req.headers.authorization)) {
      return res.status(403).json({ error: 'Unauthorized: Admins only' });
    }

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (status !== undefined) updates.status = status;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const { data, error } = await supabase
      .from('bug_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating bug report:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/bug-reports/:id - Admin only: Delete report
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!await isAdmin(req.headers.authorization)) {
      return res.status(403).json({ error: 'Unauthorized: Admins only' });
    }

    const { error } = await supabase
      .from('bug_reports')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
