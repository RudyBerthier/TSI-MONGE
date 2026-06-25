const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

const UPGRADES = [
  // Clic (PPC)
  { id: 'stylo', baseCost: 50, type: 'click', value: 1 },
  { id: 'cafe', baseCost: 500, type: 'click', value: 5 },
  { id: 'calculatrice', baseCost: 5000, type: 'click', value: 25 },
  { id: 'livre_maths', baseCost: 50000, type: 'click', value: 100 },
  { id: 'blouse', baseCost: 250000, type: 'click', value: 500 },
  { id: 'soudure_parfaite', baseCost: 2500000, type: 'click', value: 10000 },
  { id: 'copion_trousse', baseCost: 10000000, type: 'click', value: 50000 },
  { id: 'hack_wifi', baseCost: 50000000, type: 'click', value: 250000 },

  // Passif (PPS)
  { id: 'delegue', baseCost: 100, type: 'passive', value: 1 },
  { id: 'numworks', baseCost: 1000, type: 'passive', value: 10 },
  { id: 'prof_absent', baseCost: 10000, type: 'passive', value: 100 },
  { id: 'sujet_fuite', baseCost: 100000, type: 'passive', value: 1500 },
  { id: 'major_promo', baseCost: 500000, type: 'passive', value: 8000 },
  { id: 'corrige_erreur', baseCost: 2500000, type: 'passive', value: 40000 },
  { id: 'cles_lycee', baseCost: 15000000, type: 'passive', value: 250000 },
  { id: 'parcoursup', baseCost: 100000000, type: 'passive', value: 1000000 },
  { id: 'x_ens', baseCost: 1000000000, type: 'passive', value: 10000000 },

  // Rebirth / Late Game
  { id: 'ia_quantique', baseCost: 1000000000, type: 'click', value: 5000000 },
  { id: 'ferme_minage_cdi', baseCost: 5000000000, type: 'passive', value: 25000000 },
  { id: 'controle_mental', baseCost: 50000000000, type: 'click', value: 100000000 },
  { id: 'cerveau_merieux', baseCost: 250000000000, type: 'passive', value: 1000000000 },
  { id: 'fusion_monge', baseCost: 500000000000, type: 'click', value: 5000000000 },
  { id: 'dieu_prepa', baseCost: 5000000000000, type: 'passive', value: 25000000000 },
];

// --- User Lock Mechanism for Race Conditions ---
const userLocks = new Map();

const acquireLock = async (userId) => {
  if (!userLocks.has(userId)) {
    userLocks.set(userId, Promise.resolve());
  }
  const currentPromise = userLocks.get(userId);
  let resolveNext;
  const nextPromise = new Promise(resolve => {
    resolveNext = resolve;
  });
  userLocks.set(userId, currentPromise.then(() => nextPromise));
  await currentPromise;
  return resolveNext;
};
// -----------------------------------------------

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

    const releaseLock = await acquireLock(userId);
    try {
      // 1. Mettre à jour l'utilisateur (points et total)
      const { data: profile, error } = await supabase
      .from('clicker_users')
      .select('points, total_clicks, click_power, passive_pps, last_sync')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    // --- SECURITY CHECK: Anti-Cheat Sync Validation ---
    const now = Date.now();
    const lastSyncTime = profile.last_sync ? new Date(profile.last_sync).getTime() : now - 3000;
    // Calculate seconds since last sync (min 3 seconds for regular interval)
    const diffSeconds = Math.max((now - lastSyncTime) / 1000, 3);
    
    // Max theoretical points = (PPS + (ClickPower * 15 max CPS)) * (Elapsed time + 5s grace period)
    const maxPossible = (parseInt(profile.passive_pps) + (parseInt(profile.click_power) * 15)) * (diffSeconds + 5);
    
    if (parseInt(earnedPoints) > maxPossible) {
      console.warn(`[ANTI-CHEAT] User ${userId} tried to sync ${earnedPoints} points. Max possible was ${maxPossible}.`);
      return res.status(400).json({ error: 'Montant de points invalide (triche détectée)' });
    }
    // ----------------------------------------------------

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
    } finally {
      releaseLock();
    }
  } catch (error) {
    console.error('Erreur Clicker Sync:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Acheter un upgrade
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.user.id;
    const { upgradeId } = req.body;

    const upgradeDef = UPGRADES.find(u => u.id === upgradeId);
    if (!upgradeDef) {
      return res.status(400).json({ error: 'Amélioration introuvable' });
    }

    const releaseLock = await acquireLock(userId);
    try {
      const { data: profile, error } = await supabase
        .from('clicker_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const count = (profile.upgrades || []).filter(id => id === upgradeId).length;
    if (count >= 100) {
      return res.status(400).json({ error: 'Niveau maximum atteint (100) pour cette amélioration' });
    }

    // Server-side cost calculation
    const actualCost = Math.floor(upgradeDef.baseCost * Math.pow(1.15, count));

    if (profile.points < actualCost) {
      return res.status(400).json({ error: 'Fonds insuffisants' });
    }

    const currentRebirths = parseInt(profile.rebirths) || 0;
    const multiplier = 1 + currentRebirths;

    const newPoints = profile.points - actualCost;
    const clickPowerBonus = upgradeDef.type === 'click' ? upgradeDef.value : 0;
    const passivePpsBonus = upgradeDef.type === 'passive' ? upgradeDef.value : 0;
    
    const newClickPower = profile.click_power + (clickPowerBonus * multiplier);
    const newPps = profile.passive_pps + (passivePpsBonus * multiplier);
    
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
    } finally {
      releaseLock();
    }
  } catch (error) {
    console.error('Erreur Clicker Upgrade:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- SKIN ---
router.post('/skin', async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    const { error } = await supabase
      .from('clicker_users')
      .update({ custom_cookie_url: url || null })
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, url });
  } catch (error) {
    console.error('Erreur Clicker Skin:', error);
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
