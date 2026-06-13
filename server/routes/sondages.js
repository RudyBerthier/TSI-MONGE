const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { sendNotificationToAllExcept } = require('./push');
const { logActivity } = require('../utils/logger');

// Construire la map des votants par option pour un sondage
async function buildVoters(poll) {
  const voters = {};
  poll.options.forEach(opt => { voters[opt] = []; });

  if (!poll.user_votes || Object.keys(poll.user_votes).length === 0) return voters;

  const isAnonymous = poll.description?.includes('<!--ANON-->');

  // Get all user IDs that voted
  const userIds = Object.keys(poll.user_votes);

  // Fetch user info from users table
  const { data: users } = await supabase
    .from('users')
    .select('id, username, avatar, google_avatar')
    .in('id', userIds);

  const usersMap = {};
  (users || []).forEach(u => { usersMap[u.id] = u; });

  for (const [userId, rawOption] of Object.entries(poll.user_votes)) {
    const optionsArray = Array.isArray(rawOption) ? rawOption : [rawOption];
    
    for (const rawOpt of optionsArray) {
      const isVoteAnon = rawOpt.endsWith('__ANON__');
      const option = isVoteAnon ? rawOpt.replace('__ANON__', '') : rawOpt;

      if (!voters[option]) continue;

      // Un vote est anonyme soit parce que l'utilisateur l'a choisi (__ANON__),
      // soit parce que c'est un vieux sondage globalement anonyme (isAnonymous)
      if (isAnonymous || isVoteAnon) {
        // Fake voter data for anonymous polls
        voters[option].push({
          id: `anon-${userId}-${option}`, // keeps it unique for rendering keys
          username: 'Anonyme',
          avatar: null
        });
      } else {
        const u = usersMap[userId];
        voters[option].push({
          id: userId,
          username: u?.username || 'Inconnu',
          avatar: u?.avatar || null,
          google_avatar: u?.google_avatar || null
        });
      }
    }
  }

  return voters;
}

// Helper: map DB row to frontend format
function mapPollToFrontend(row) {
  const isAnonymous = row.description?.includes('<!--ANON-->');
  const cleanDescription = row.description ? row.description.replace('<!--ANON-->', '').trim() : '';

  return {
    id: row.id,
    title: row.title,
    description: cleanDescription,
    isAnonymous: isAnonymous,
    isMultipleChoice: row.is_multiple_choice || false,
    expiresAt: row.expires_at || null,
    options: row.options,
    votes: row.votes,
    userVotes: row.user_votes,
    active: row.active,
    createdAt: row.created_at
  };
}

// GET /api/sondages — liste tous les sondages (actifs d'abord) avec votants
router.get('/', async (req, res) => {
  try {
    const { data: polls, error } = await supabase
      .from('polls')
      .select('*')
      .order('active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrichir chaque sondage avec les votants
    const enriched = await Promise.all((polls || []).map(async (row) => {
      const poll = mapPollToFrontend(row);
      const voters = await buildVoters(row);
      return {
        ...poll,
        voters,
        userVotes: undefined // ne pas exposer la map brute
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sondages — creer un sondage (admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, options, expiresAt, isMultipleChoice } = req.body;
    if (!title || !options || options.length < 2) {
      return res.status(400).json({ error: 'Titre et au moins 2 options requis' });
    }

    const votes = {};
    options.forEach(opt => { votes[opt] = 0; });

    const newPoll = {
      id: uuidv4(),
      title,
      description: description || '',
      options,
      votes,
      user_votes: {},
      expires_at: expiresAt || null,
      is_multiple_choice: isMultipleChoice || false,
      active: true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('polls')
      .insert(newPoll)
      .select()
      .single();

    if (error) throw error;

    // Send push notification to all users except the admin creator
    sendNotificationToAllExcept(req.user.id, {
      title: '📊 Nouveau Sondage',
      body: title,
      icon: '/icon-192.svg',
      badge: '/favicon.svg',
      tag: 'sondage',
      data: { url: '/sondages' }
    }).catch(console.error);

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'sondage.create',
      targetType: 'sondage',
      targetId: data.id,
      details: { title, options },
      req
    });

    res.json({ success: true, sondage: mapPollToFrontend(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/sondages/:id — modifier un sondage (admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const updates = {};
    if (title) updates.title = title;

    if (description !== undefined) {
      // Must fetch existing to preserve <!--ANON--> if present from old versions
      const { data: existing } = await supabase.from('polls').select('description').eq('id', req.params.id).single();
      if (existing && existing.description?.includes('<!--ANON-->')) {
        updates.description = `${description} <!--ANON-->`;
      } else {
        updates.description = description;
      }
    }

    const { data, error } = await supabase
      .from('polls')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Sondage non trouve' });

    res.json({ success: true, sondage: mapPollToFrontend(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sondages/:id — supprimer un sondage (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'sondage.delete',
      targetType: 'sondage',
      targetId: req.params.id,
      req
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/sondages/:id/toggle — ouvrir/fermer un sondage (admin)
router.patch('/:id/toggle', requireAuth, async (req, res) => {
  try {
    // First get current state
    const { data: poll, error: fetchError } = await supabase
      .from('polls')
      .select('active')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !poll) return res.status(404).json({ error: 'Sondage non trouve' });

    const { data, error } = await supabase
      .from('polls')
      .update({ active: !poll.active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, active: data.active });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sondages/my-votes — get all user votes by userId
router.get('/my-votes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.username;

    const { data: polls, error } = await supabase
      .from('polls')
      .select('id, user_votes');

    if (error) throw error;

    const votes = {};
    const anonVotes = {};

    for (const poll of (polls || [])) {
      const rawVote = poll.user_votes?.[userId];
      if (rawVote) {
        const voteArray = Array.isArray(rawVote) ? rawVote : [rawVote];
        const isAnon = voteArray.some(v => v.endsWith('__ANON__'));
        votes[poll.id] = voteArray.map(v => v.replace('__ANON__', ''));
        if (isAnon) {
          anonVotes[poll.id] = true;
        }
      }
    }

    res.json({ votes, anonVotes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sondages/:id/vote — voter ou changer de vote (par compte utilisateur)
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { option, options, isAnonymous } = req.body;
    const submittedOptions = options || (option ? [option] : []);

    if (submittedOptions.length === 0) return res.status(400).json({ error: 'Option requise' });

    const userId = req.user.id || req.user.username;

    // Get current poll
    const { data: poll, error: fetchError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !poll) return res.status(404).json({ error: 'Sondage non trouve' });
    if (!poll.active) return res.status(400).json({ error: 'Sondage ferme' });
    
    if (poll.expires_at && new Date() > new Date(poll.expires_at)) {
      return res.status(400).json({ error: 'Sondage expiré' });
    }

    if (!poll.is_multiple_choice && submittedOptions.length > 1) {
      return res.status(400).json({ error: 'Choix multiples non autorisés' });
    }

    for (const opt of submittedOptions) {
      if (!poll.options.includes(opt)) return res.status(400).json({ error: 'Option invalide' });
    }

    // Initialize if needed
    const votes = poll.votes || {};
    const userVotes = poll.user_votes || {};

    const rawPreviousOption = userVotes[userId];
    const previousOptions = Array.isArray(rawPreviousOption) ? rawPreviousOption : (rawPreviousOption ? [rawPreviousOption] : []);
    const cleanPreviousOptions = previousOptions.map(o => o.replace('__ANON__', ''));

    // Si changement de vote, decrementer l'ancien
    for (const prev of cleanPreviousOptions) {
      if (poll.options.includes(prev)) {
        votes[prev] = Math.max(0, (votes[prev] || 0) - 1);
      }
    }

    // Enregistrer le nouveau vote
    for (const opt of submittedOptions) {
      votes[opt] = (votes[opt] || 0) + 1;
    }
    
    // Si choix multiple, on stocke un tableau, sinon un string pour la compatibilité
    const finalVoteValue = poll.is_multiple_choice ? submittedOptions.map(o => isAnonymous ? `${o}__ANON__` : o) : (isAnonymous ? `${submittedOptions[0]}__ANON__` : submittedOptions[0]);
    userVotes[userId] = finalVoteValue;

    const { data: updated, error: updateError } = await supabase
      .from('polls')
      .update({ votes, user_votes: userVotes })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    const voters = await buildVoters(updated);

    const io = req.app.get('io');
    if (io) {
      io.emit('sondage:update', { id: updated.id, votes: updated.votes, voters });
    }

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'sondage.vote',
      targetType: 'sondage',
      targetId: req.params.id,
      details: { options: submittedOptions, isAnonymous, previousOptions: cleanPreviousOptions },
      req
    });

    // Retourner le vote clean pour le frontend
    res.json({ success: true, votes: updated.votes, voters, userVote: poll.is_multiple_choice ? submittedOptions : submittedOptions[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
