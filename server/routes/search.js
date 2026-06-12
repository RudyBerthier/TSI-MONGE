const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken } = require('./auth');

// GET /api/search?q=query
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchQuery = `%${q}%`;

    // 1. Cherche dans chat_messages (Global chat)
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .ilike('content', searchQuery)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error searching messages:', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Manual lookup for users
    const userIds = [...new Set(messages.map(m => m.user_id).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, username, avatar_url').in('id', userIds);
    const userMap = {};
    if (users) {
      users.forEach(u => userMap[u.id] = u);
    }

    const results = messages.map(msg => {
      const user = userMap[msg.user_id] || {};
      return {
        id: `chat_${msg.id}`,
        type: 'chat',
        title: 'Message du Chat Général',
        content: msg.content,
        created_at: msg.created_at,
        author: user.username || 'Utilisateur inconnu',
        avatar: user.avatar_url,
        path: `/chat?msg=${msg.id}`
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Search route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
