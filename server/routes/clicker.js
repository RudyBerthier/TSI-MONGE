const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Get global and user state
router.get('/state', async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch Global Score
    const { data: globalData, error: globalErr } = await supabase
      .from('clicker_global')
      .select('total_clicks')
      .eq('id', 1)
      .single();

    if (globalErr && globalErr.code !== 'PGRST116') throw globalErr;

    // Fetch User Profile
    let { data: userProfile, error: userErr } = await supabase
      .from('clicker_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userErr && userErr.code === 'PGRST116') {
      // Create user profile
      const { data: newUser, error: createErr } = await supabase
        .from('clicker_users')
        .insert({ user_id: userId })
        .select()
        .single();
      
      if (createErr) throw createErr;
      userProfile = newUser;
    } else if (userErr) {
      throw userErr;
    }

    // Calcul du revenu passif hors ligne
    if (userProfile.passive_pps > 0 && userProfile.last_sync) {
      const now = new Date();
      const lastSync = new Date(userProfile.last_sync);
      const diffSeconds = Math.floor((now - lastSync) / 1000);
      
      if (diffSeconds > 60) {
        // Au moins 1 minute d'absence pour calculer
        const offlineGains = diffSeconds * userProfile.passive_pps;
        
        // Update en base
        const { data: updated, error: updErr } = await supabase
          .from('clicker_users')
          .update({
            points: userProfile.points + offlineGains,
            total_clicks: userProfile.total_clicks + offlineGains,
            last_sync: now.toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();
          
        if (!updErr) {
          userProfile = updated;
          
          // Mettre à jour le global aussi (on the backend)
          // We can just query it and add
          const { data: globalData } = await supabase.from('clicker_global').select('total_clicks').eq('id', 1).single();
          const newGlobal = (Number(globalData?.total_clicks || 0)) + Number(offlineGains);
          await supabase.from('clicker_global').update({ total_clicks: newGlobal }).eq('id', 1);
        }
      }
    }

    res.json({
      global: globalData?.total_clicks || 0,
      user: userProfile
    });

  } catch (error) {
    console.error('Erreur Clicker State:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Sync clicks
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    const { earnedPoints, totalClicks } = req.body;

    if (!earnedPoints || earnedPoints <= 0) return res.json({ success: true });

    // 1. Mettre à jour l'utilisateur (points et total)
    const { data: profile, error } = await supabase
      .from('clicker_users')
      .select('points, total_clicks')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const newPoints = parseInt(profile.points) + parseInt(earnedPoints);
    const newTotal = parseInt(profile.total_clicks) + parseInt(earnedPoints);

    await supabase
      .from('clicker_users')
      .update({
        points: newPoints,
        total_clicks: newTotal,
        last_sync: new Date().toISOString()
      })
      .eq('user_id', userId);

    // 2. Mettre à jour le global (avec une fonction RPC idéale, ou sinon update)
    // As we can't easily rely on RPC if not created, we fetch and update.
    const { data: globalData } = await supabase.from('clicker_global').select('total_clicks').eq('id', 1).single();
    const newGlobal = (globalData?.total_clicks || 0) + parseInt(earnedPoints);
    
    await supabase.from('clicker_global').update({ total_clicks: newGlobal }).eq('id', 1);

    // 3. Emettre un broadcast Socket.IO pour tout le monde
    const io = req.app.get('io');
    if (io) {
      io.emit('clicker:global_update', newGlobal);
    }

    res.json({ success: true, newPoints, newGlobal });
  } catch (error) {
    console.error('Erreur Clicker Sync:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Acheter un upgrade
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.user.id;
    const { upgradeId, cost, clickPowerBonus, passivePpsBonus } = req.body;

    const { data: profile, error } = await supabase
      .from('clicker_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    if (profile.points < cost) {
      return res.status(400).json({ error: 'Fonds insuffisants' });
    }

    const currentRebirths = parseInt(profile.rebirths) || 0;
    const multiplier = 1 + currentRebirths;

    const newPoints = profile.points - cost;
    const newClickPower = profile.click_power + ((clickPowerBonus || 0) * multiplier);
    const newPps = profile.passive_pps + ((passivePpsBonus || 0) * multiplier);
    
    const upgrades = [...(profile.upgrades || [])];
    upgrades.push(upgradeId);

    const { data: updated, error: updErr } = await supabase
      .from('clicker_users')
      .update({
        points: newPoints,
        click_power: newClickPower,
        passive_pps: newPps,
        upgrades: upgrades
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updErr) throw updErr;

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('Erreur Clicker Upgrade:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rebirth
router.post('/rebirth', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from('clicker_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const currentRebirths = parseInt(profile.rebirths) || 0;
    // Cost: 1 Trillion base, x10 each rebirth
    const rebirthCost = 1000000000000 * Math.pow(10, currentRebirths);

    if (profile.points < rebirthCost) {
      return res.status(400).json({ error: 'Fonds insuffisants pour un Rebirth' });
    }

    const newRebirths = currentRebirths + 1;
    const newMultiplier = 1 + newRebirths;

    const { data: updated, error: updErr } = await supabase
      .from('clicker_users')
      .update({
        points: 0,
        click_power: 1 * newMultiplier,
        passive_pps: 0,
        upgrades: [],
        rebirths: newRebirths
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updErr) throw updErr;

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('Erreur Clicker Rebirth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clicker_users')
      .select('total_clicks, user_id, rebirths, users:user_id(username, avatar, google_avatar)')
      .order('total_clicks', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erreur Clicker Leaderboard:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
