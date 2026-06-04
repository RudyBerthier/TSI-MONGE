const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'fetch_pronote.py');
const TIMETABLE_FILE = path.join(__dirname, '..', 'data', 'pronote_timetable.json');

// Refresh interval: toutes les 2 heures (en ms)
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

let isRefreshing = false;
let lastRefreshError = null;

// Fonction pour upserter les donnees dans Supabase apres fetch
async function syncToSupabase() {
  let raw;
  try {
    raw = await fs.readFile(TIMETABLE_FILE, 'utf-8');
  } catch (e) {
    console.error('[Pronote] Impossible de lire le fichier timetable:', e.message);
    return;
  }

  const data = JSON.parse(raw);
  const courses = data.courses || [];
  const lastUpdated = data.lastUpdated || new Date().toISOString();

  // Grouper les cours par weekStart
  const byWeek = {};
  for (const course of courses) {
    const w = course.weekStart;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(course);
  }

  const rows = Object.entries(byWeek).map(([week_start, weekCourses]) => ({
    week_start,
    courses: weekCourses,
    last_updated: lastUpdated,
  }));

  if (rows.length === 0) {
    console.log('[Pronote] Aucune donnee a synchroniser.');
    return;
  }

  // Recuperer les semaines deja presentes dans Supabase
  const { data: existing } = await supabase
    .from('pronote_timetable')
    .select('week_start');

  const existingWeeks = new Set((existing || []).map(r => r.week_start));

  const toInsert = rows.filter(r => !existingWeeks.has(r.week_start));
  const toUpdate = rows.filter(r => existingWeeks.has(r.week_start));

  // Mettre a jour les semaines existantes
  for (const row of toUpdate) {
    const { error } = await supabase
      .from('pronote_timetable')
      .update({ courses: row.courses, last_updated: row.last_updated })
      .eq('week_start', row.week_start);
    if (error) console.error(`[Pronote] Erreur update ${row.week_start}:`, error.message);
  }

  // Inserer les nouvelles semaines
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('pronote_timetable')
      .insert(toInsert);
    if (error) console.error('[Pronote] Erreur insert:', error.message);
  }

  console.log(`[Pronote] Supabase: ${toUpdate.length} maj, ${toInsert.length} inseres.`);
}

// Fonction pour executer le script Python
function runPronoteScript() {
  return new Promise((resolve, reject) => {
    if (isRefreshing) {
      return reject(new Error('Actualisation deja en cours'));
    }

    isRefreshing = true;
    lastRefreshError = null;

    console.log('[Pronote] Demarrage de la synchronisation...');

    const python = spawn('python3', [SCRIPT_PATH], {
      cwd: path.join(__dirname, '..'),
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', async (code) => {
      isRefreshing = false;

      if (code === 0) {
        console.log('[Pronote] Synchronisation reussie');
        console.log(stdout);
        await syncToSupabase();
        resolve({ success: true, output: stdout });
      } else {
        const errorMsg = stderr || stdout || `Code de sortie: ${code}`;
        console.error('[Pronote] Erreur de synchronisation:', errorMsg);
        lastRefreshError = errorMsg;
        reject(new Error(errorMsg));
      }
    });

    python.on('error', (err) => {
      isRefreshing = false;
      lastRefreshError = err.message;
      console.error('[Pronote] Erreur d\'execution:', err.message);
      reject(err);
    });
  });
}

// Retry avec backoff exponentiel pour les erreurs reseau
async function runWithRetry(maxRetries = 3, initialDelay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await runPronoteScript();
      return; // Succes, on sort
    } catch (err) {
      const isNetworkError = err.message && (
        err.message.includes('NameResolutionError') ||
        err.message.includes('Failed to resolve') ||
        err.message.includes('nodename nor servname') ||
        err.message.includes('ConnectionError') ||
        err.message.includes('Max retries exceeded')
      );

      if (isNetworkError && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // 5s, 10s, 20s...
        console.log(`[Pronote] Erreur reseau, nouvelle tentative dans ${delay / 1000}s (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err; // Erreur non-reseau ou derniere tentative
      }
    }
  }
}

// Auto-refresh au demarrage puis toutes les X heures
async function startAutoRefresh() {
  // Premier refresh au demarrage (apres 15 secondes pour laisser le reseau s'etablir)
  setTimeout(async () => {
    try {
      await runWithRetry(3, 5000); // 3 tentatives avec backoff
    } catch (err) {
      console.error('[Pronote] Erreur auto-refresh initial apres retries:', err.message);
    }
  }, 15000);

  // Puis toutes les X heures
  setInterval(async () => {
    try {
      await runWithRetry(2, 3000); // 2 tentatives pour les refreshs periodiques
    } catch (err) {
      console.error('[Pronote] Erreur auto-refresh:', err.message);
    }
  }, REFRESH_INTERVAL);

  console.log(`[Pronote] Auto-refresh configure toutes les ${REFRESH_INTERVAL / 1000 / 60} minutes`);
}

// Demarrer l'auto-refresh
startAutoRefresh();

// GET /api/pronote/timetable?weekStart=2026-02-02
router.get('/timetable', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart requis (format YYYY-MM-DD)' });
    }

    const { data, error } = await supabase
      .from('pronote_timetable')
      .select('*')
      .eq('week_start', weekStart)
      .single();

    if (error || !data) {
      return res.json({
        courses: [],
        lastUpdated: null,
        message: "Aucun emploi du temps disponible pour cette semaine."
      });
    }

    res.json({
      courses: data.courses || [],
      lastUpdated: data.last_updated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pronote/status — statut de la synchronisation
router.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pronote_timetable')
      .select('last_updated, courses')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({
        synced: false,
        lastUpdated: null,
        courseCount: 0,
        isRefreshing,
        lastError: lastRefreshError,
      });
    }

    // Count total courses across all weeks
    const { data: allRows, error: countError } = await supabase
      .from('pronote_timetable')
      .select('courses');

    let courseCount = 0;
    if (!countError && allRows) {
      courseCount = allRows.reduce((acc, row) => acc + (row.courses || []).length, 0);
    }

    res.json({
      synced: true,
      lastUpdated: data.last_updated,
      courseCount,
      isRefreshing,
      lastError: lastRefreshError,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pronote/sync-local — synchronise le fichier JSON local vers Supabase (admin)
router.post('/sync-local', requireAuth, async (req, res) => {
  try {
    await syncToSupabase();
    res.json({ success: true, message: 'Donnees locales synchronisees dans Supabase.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/pronote/refresh — actualisation manuelle (admin)
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const result = await runPronoteScript();
    res.json({
      success: true,
      message: 'Synchronisation reussie',
      output: result.output,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
