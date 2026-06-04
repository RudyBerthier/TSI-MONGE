const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// --- Leaderboard API ---

/**
 * GET /api/games/leaderboard/:game
 * Fetch top 10 scores for a given game
 */
router.get('/leaderboard/:game', async (req, res) => {
  try {
    const { game } = req.params;
    
    // For Snake, we sort by high_score descending.
    // For others (tic-tac-toe, etc.), we sort by elo_score or wins descending.
    let orderByColumn = 'elo_score';
    if (game === 'snake') {
      orderByColumn = 'high_score';
    } else {
      orderByColumn = 'wins'; // Simple alternative: just rank by raw wins
    }

    const { data: scores, error } = await supabase
      .from('game_scores')
      .select(`
        *,
        users:user_id ( id, username, avatar )
      `)
      .eq('game', game)
      .order(orderByColumn, { ascending: false })
      .limit(10);

    if (error) {
      console.error(`[Leaderboard API] Supabase error for ${game}:`, error);
      return res.status(500).json({ error: error.message });
    }

    // Check if we matched anything. If standard users join via nested select, they come as `users` object or array
    // Formatting mapping:
    const formattedScores = (scores || []).map(score => {
      // Depending on Supabase setup, 'users' might be an object or an array of objects
      const user = Array.isArray(score.users) ? score.users[0] : score.users;
      return {
        ...score,
        username: user?.username || 'Utilisateur inconnu',
        avatar: user?.avatar || null
      };
    });

    res.json(formattedScores);
  } catch (error) {
    console.error('[Leaderboard API]', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

/**
 * POST /api/games/score
 * Submit a score for a solo game (e.g. Snake)
 * Body: { game: 'snake', score: 100 }
 * Requires Auth token (handled in main depending on middleware)
 */
router.post('/score', async (req, res) => {
  try {
    const { game, score } = req.body;
    const userId = req.user?.id; // Assuming auth middleware places user here

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!game || score === undefined) {
      return res.status(400).json({ error: 'Missing game or score' });
    }

    // 1. Fetch current score to see if it's a new high score
    const { data: currentRecord, error: fetchError } = await supabase
      .from('game_scores')
      .select('high_score')
      .eq('user_id', userId)
      .eq('game', game)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: fetchError.message });
    }

    if (currentRecord) {
      // Update if higher
      if (score > currentRecord.high_score) {
        const { error: updateError } = await supabase
          .from('game_scores')
          .update({ high_score: score, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('game', game);
          
        if (updateError) throw updateError;
        return res.json({ message: 'New high score!', isNewHigh: true });
      } else {
        return res.json({ message: 'Score recorded, not a high score', isNewHigh: false });
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('game_scores')
        .insert({
          user_id: userId,
          game: game,
          high_score: score
        });
        
      if (insertError) throw insertError;
      return res.json({ message: 'First high score recorded!', isNewHigh: true });
    }

  } catch (err) {
    console.error('[Score API]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
