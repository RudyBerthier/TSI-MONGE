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
  
  // Critiques
  { id: 'crit_oral', baseCost: 1000000, type: 'crit', value: 1 },
];

const ACHIEVEMENTS = [
  { id: 'semaine_integration', name: 'Semaine d\'intégration', description: 'Atteindre 1 000 clics totaux', threshold: 1000 },
  { id: 'admissible_mines', name: 'Admissible aux Mines', description: 'Atteindre 1 Milliard de clics', threshold: 1000000000 },
  { id: 'khagneux_repenti', name: 'Khâgneux repenti', description: 'Jouer après 48h depuis la création du compte', type: 'time' },
  { id: 'major_promo', name: 'Major de Promo', description: 'Atteindre la 1ère place du classement', type: 'rank' }
];

const recalculateUserStats = (profile) => {
  let baseClick = 1;
  let basePassive = 0;
  
  const counts = {};
  
  // Safe parse in case DB returns string
  let upgradesArr = profile.upgrades;
  if (typeof upgradesArr === 'string') {
    try { upgradesArr = JSON.parse(upgradesArr); } catch(e) { upgradesArr = []; }
  }
  
  for(const u of (upgradesArr || [])) {
    counts[u] = (counts[u] || 0) + 1;
  }
  
  for(const [id, count] of Object.entries(counts)) {
    const def = UPGRADES.find(u => u.id === id);
    if(def) {
      if(def.type === 'click') baseClick += def.value * count;
      if(def.type === 'passive') basePassive += def.value * count;
    }
  }
  
  const rebirths = parseInt(profile.rebirths) || 0;
  
  let achArr = profile.achievements;
  if (typeof achArr === 'string') {
    try { achArr = JSON.parse(achArr); } catch(e) { achArr = []; }
  }
  const numAchievements = (achArr || []).length;
  
  const multiplier = (1 + rebirths) * (1 + (numAchievements * 0.05));
  
  return {
    click_power: Math.floor(baseClick * multiplier),
    passive_pps: Math.floor(basePassive * multiplier)
  };
};

const checkAchievements = async (profile, supabase) => {
  let currentAchievements = profile.achievements;
  if (typeof currentAchievements === 'string') {
    try { currentAchievements = JSON.parse(currentAchievements); } catch(e) { currentAchievements = []; }
  }
  currentAchievements = currentAchievements || [];
  
  let newUnlocked = false;
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (!currentAchievements.includes(ach.id)) {
      let unlocked = false;
      if (ach.id === 'semaine_integration' || ach.id === 'admissible_mines') {
        if (parseInt(profile.total_clicks) >= ach.threshold) unlocked = true;
      }
      if (ach.id === 'khagneux_repenti' && profile.created_at) {
        const createdDate = new Date(profile.created_at);
        const now = new Date();
        const diffHours = (now - createdDate) / (1000 * 60 * 60);
        if (diffHours >= 48) unlocked = true;
      }
      if (ach.id === 'major_promo' && parseInt(profile.total_clicks) >= 1000) {
        // Fast check without heavy query if score is very low
        const { data: topUser } = await supabase.from('clicker_users').select('total_clicks').order('total_clicks', { ascending: false }).limit(1).single();
        if (topUser && parseInt(profile.total_clicks) >= parseInt(topUser.total_clicks)) unlocked = true;
      }

      if (unlocked) {
        currentAchievements.push(ach.id);
        newlyUnlocked.push(ach.id);
        newUnlocked = true;
      }
    }
  }

  return { newUnlocked, currentAchievements, newlyUnlocked };
};

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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    // --- SECURITY CHECK: Anti-Cheat Sync Validation ---
    const now = Date.now();
    const lastSyncTime = profile.last_sync ? new Date(profile.last_sync).getTime() : now - 3000;
    // Calculate seconds since last sync (min 3 seconds for regular interval)
    const diffSeconds = Math.max((now - lastSyncTime) / 1000, 3);
    
    // Max theoretical points = (PPS + (ClickPower * 15 max CPS * MaxCritMultiplier)) * (Elapsed time + 5s grace period)
    // Assuming max possible crits in 15 CPS window (which is extreme but mathematically possible)
    // Each crit is x10. So we just multiply click power max by 10 to be safe.
    const theoreticalMaxClickPower = parseInt(profile.click_power) * 10;
    const maxPossible = (parseInt(profile.passive_pps) + (theoreticalMaxClickPower * 15)) * (diffSeconds + 5);
    
    if (parseInt(earnedPoints) > maxPossible) {
      console.warn(`[ANTI-CHEAT] User ${userId} tried to sync ${earnedPoints} points. Max possible was ${maxPossible}.`);
      return res.status(400).json({ error: 'Montant de points invalide (triche détectée)' });
    }
    // ----------------------------------------------------

    const newPoints = parseInt(profile.points) + parseInt(earnedPoints);
    const newTotal = parseInt(profile.total_clicks) + parseInt(earnedPoints);

    profile.points = newPoints;
    profile.total_clicks = newTotal;
    const { newUnlocked, newlyUnlocked, currentAchievements } = await checkAchievements(profile, supabase);

    const updatePayload = {
      points: newPoints,
      total_clicks: newTotal,
      last_sync: new Date().toISOString()
    };

    if (newUnlocked) {
      profile.achievements = currentAchievements;
      updatePayload.achievements = currentAchievements;
      
      const newStats = recalculateUserStats(profile);
      updatePayload.click_power = newStats.click_power;
      updatePayload.passive_pps = newStats.passive_pps;
    }

    await supabase
      .from('clicker_users')
      .update(updatePayload)
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

    res.json({ success: true, newPoints, newGlobal, newlyUnlocked: newUnlocked ? newlyUnlocked : [] });
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

    // Safe parse
    let profileUpgrades = profile.upgrades;
    if (typeof profileUpgrades === 'string') {
      try { profileUpgrades = JSON.parse(profileUpgrades); } catch(e) { profileUpgrades = []; }
    }
    
    const count = (profileUpgrades || []).filter(id => id === upgradeId).length;
    if (count >= 100) {
      return res.status(400).json({ error: 'Niveau maximum atteint (100) pour cette amélioration' });
    }

    // Server-side cost calculation
    const scale = upgradeDef.type === 'crit' ? 1.85 : 1.15;
    const actualCost = Math.floor(upgradeDef.baseCost * Math.pow(scale, count));

    if (profile.points < actualCost) {
      return res.status(400).json({ error: 'Fonds insuffisants' });
    }

    const newPoints = profile.points - actualCost;
    profile.upgrades = [...(profileUpgrades || []), upgradeId];
    profile.points = newPoints;
    
    // Check if buying something pushes them to an achievement
    const { newUnlocked, newlyUnlocked, currentAchievements } = await checkAchievements(profile, supabase);
    if (newUnlocked) profile.achievements = currentAchievements;
    
    const newStats = recalculateUserStats(profile);

    const { data: updated, error: updErr } = await supabase
      .from('clicker_users')
      .update({
        points: newPoints,
        click_power: newStats.click_power,
        passive_pps: newStats.passive_pps,
        upgrades: profile.upgrades,
        achievements: profile.achievements
      })
      .eq('user_id', userId)
      .select()
      .single();

      if (updErr) throw updErr;

      res.json({ success: true, user: updated, newlyUnlocked: newlyUnlocked || [] });
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
    profile.rebirths = newRebirths;
    profile.points = 0;
    profile.upgrades = [];
    
    const newStats = recalculateUserStats(profile);

    const { data: updated, error: updErr } = await supabase
      .from('clicker_users')
      .update({
        points: 0,
        upgrades: [],
        rebirths: newRebirths,
        click_power: newStats.click_power,
        passive_pps: newStats.passive_pps
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
