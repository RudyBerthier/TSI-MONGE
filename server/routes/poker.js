const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
  { 
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  }
);

// Get recent hand history for the logged in user
router.get('/my-history', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const { data, error } = await supabase
      .from('poker_hands')
      .select('id, room_id, created_at, pot, winners, players')
      .contains('players', `[{"id":"${userId}"}]`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific hand by ID
router.get('/hand/:handId', async (req, res) => {
  try {
    const { handId } = req.params;

    const { data, error } = await supabase
      .from('poker_hands')
      .select('*')
      .eq('id', handId)
      .single();

    if (error) {
      console.error(error);
      return res.status(404).json({ error: 'Hand not found' });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
