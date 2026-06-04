const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

// Optional auth: sets req.user if a valid token is present, but does not reject unauthenticated requests
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/cantine');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, 'cantine-' + uniqueSuffix + '-' + safeName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max (PDFs can be larger)
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images et PDFs sont autorises'));
    }
  }
});

// Helper: map DB row to frontend format
function mapReviewToFrontend(row) {
  return {
    id: row.id,
    pseudo: row.pseudo,
    note: row.note,
    commentaire: row.commentaire,
    plat: row.plat,
    images: row.images || [],
    reactions: row.reactions || {},
    createdAt: row.created_at
  };
}

// GET /api/cantine/avis - Get all reviews
router.get('/avis', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('cantine_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((reviews || []).map(mapReviewToFrontend));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cantine/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('cantine_reviews')
      .select('note');

    if (error) throw error;

    const avis = reviews || [];

    if (avis.length === 0) {
      return res.json({
        total: 0,
        moyenne: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const total = avis.length;
    const somme = avis.reduce((acc, a) => acc + a.note, 0);
    const moyenne = somme / total;

    // Distribution des notes
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    avis.forEach(a => {
      if (a.note >= 1 && a.note <= 5) {
        distribution[a.note]++;
      }
    });

    res.json({ total, moyenne, distribution });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cantine/upload - Upload images
router.post('/upload', upload.array('images', 3), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucune image uploadee' });
    }

    const images = req.files.map(file => ({
      url: `/uploads/cantine/${file.filename}`,
      name: file.originalname
    }));

    res.json({ success: true, images });
  } catch (err) {
    console.error('Error uploading images:', err);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// POST /api/cantine/avis - Add a new review
router.post('/avis', async (req, res) => {
  try {
    const { pseudo, note, commentaire, plat, images } = req.body;

    if (!note || note < 1 || note > 5) {
      return res.status(400).json({ error: 'Note requise (1-5)' });
    }

    const newReview = {
      id: Date.now().toString(),
      pseudo: pseudo?.trim() || 'Anonyme',
      note: Math.round(note),
      commentaire: commentaire?.trim() || '',
      plat: plat?.trim() || '',
      images: images || [],
      reactions: {},
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cantine_reviews')
      .insert(newReview)
      .select()
      .single();

    // Si on a un utilisateur authentifié, on l'utilise
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let actorId = null;
    let actorUsername = newReview.pseudo;
    if (token) {
      try {
        const user = jwt.verify(token, JWT_SECRET);
        actorId = user.id;
        actorUsername = user.username;
      } catch (e) { }
    }

    logActivity({
      actorId: actorId,
      actorUsername: actorUsername,
      action: 'cantine.review.create',
      targetType: 'cantine_review',
      targetId: data?.id,
      details: { note, commentaire, plat },
      req: req
    });

    res.status(201).json(mapReviewToFrontend(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cantine/avis/:id - Delete a review (admin or own post)
router.delete('/avis/:id', optionalAuth, async (req, res) => {
  const authorPseudo = req.headers['x-author-pseudo'];
  const isAdmin = req.user?.role === 'admin';

  try {
    const { id } = req.params;

    // First get the review to check permissions
    const { data: avis, error: fetchError } = await supabase
      .from('cantine_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !avis) {
      return res.status(404).json({ error: 'Avis non trouve' });
    }

    // Verifier les permissions : admin ou auteur original
    if (!isAdmin) {
      if (!authorPseudo || authorPseudo.toLowerCase() !== avis.pseudo?.toLowerCase()) {
        return res.status(401).json({ error: 'Non autorise - vous ne pouvez supprimer que vos propres avis' });
      }
    }

    const { error: deleteError } = await supabase
      .from('cantine_reviews')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    logActivity({
      actorId: req.user?.id || null,
      actorUsername: req.user?.username || authorPseudo || 'Anonyme',
      action: 'cantine.review.delete',
      targetType: 'cantine_review',
      targetId: id,
      details: { pseudo: avis.pseudo, commentaire: avis.commentaire },
      req: req
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ─── MENU (OCR extraction + admin upload + Facebook API) ─────────────────────

const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const FACEBOOK_PAGE_URL = process.env.FACEBOOK_PAGE_URL || 'https://www.facebook.com/LyceeG.Mongeofficielle';
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || '';

// ─── Menu text parser: converts raw OCR text into structured menu ────────────
// Output: { Lundi: { midi: [{category, title, labels}], soir: [...] }, ... }
function parseMenuText(rawText) {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const catOrder = ['Entrées', 'Plats', 'Accompagnements', 'Desserts'];

  // Category detection from food item content
  const categoryFromContent = {
    'Entrées': /(?:taboul[eé]|salade|crudité|concombre|carottes?\s*r[aâ]p[eé]|mac[eé]doine|betterave|c[eé]leri|[oœ]eufs?\s*(?:dur|mimosa|mayo)|p[aâ]t[eé]|terrine|melon|avocat|potage|soupe|velout[eé]|surimi|mortadelle|feuilleté|duo\s*de\s*crudité|p[êe]che\s*au\s*thon)/i,
    'Plats': /poulet|dinde|b[oœ]uf|veau|porc|saumon|cabillaud|colin|merlu|steak|burger|couscous|lasagne|omelette|paupiette|cordon\s*bleu|chipolata|brochette|filet|escalope|r[oô]ti|hachis|bolognaise|blanquette|colombo|tajine|nugget|saucisse|merguez|poisson|meuni[eè]re|thon|brandade|jambon|encornet|normandin|pav[eé]|saut[eé]|cr[eé]pinette|kebab|calamars?|fricadelle/i,
    'Accompagnements': /(?:riz|bl[eé]|p[aâ]tes|penne|macaroni|frites?|pur[eé]e|semoule|haricots?\s*(?:verts?|beurre|plats)|pommes?\s*de\s*terre|jardini[eè]re|ratatouille|courgette|gratin|coquillettes|boulgour|lentilles|flageolets|petits?\s*pois|po[eê]l[eé]e|jeunes?\s*carottes?|chou-fleur|brocolis?|nouilles?)/i,
    'Desserts': /yaourt|mousse|tarte|flan|g[aâ]teau|cr[eè]me|compote|fruit|p[aâ]tisserie|biscuit|brownie|clafoutis|crumble|[eé]clair|paris[\s-]*brest|tiramisu|panna|glace|sorbet|petits?\s*suisses?|cocktail\s*de\s*fruits|fromage|beignet|ananas|p[êe]che/i,
  };

  // ─── Clean & split ─────────────────────────────────────────────────────
  const text = rawText.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/  +/g, ' ').trim();
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ─── Noise filter ──────────────────────────────────────────────────────
  const isNoise = (line) => {
    if (line.length < 3) return true;
    if (/^\d[\d\s.,€]*$/.test(line)) return true;
    const specialCount = (line.match(/[^a-zA-ZÀ-ÿ\s,./\-'àâäéèêëïîôùûüÿçœæ]/g) || []).length;
    if (specialCount > line.length * 0.3) return true;
    if (/^[@©®™\(\)\[\]\{\}<>|=_\-\*\+#§]+$/i.test(line.replace(/\s/g, ''))) return true;
    if (line.length < 8 && /^[A-Z\s\d@©®\(\)><\-=\*]+$/.test(line) && !days.some(d => line.toUpperCase().includes(d.toUpperCase()))) return true;
    if (/^[,.\-;:!?@©®<>|=\*\+#]/.test(line)) return true;
    if (/menu\s+(de\s+la|du)|semaine\s+du|restauration|scolaire|gestionnaire|proviseur|bon\s*week/i.test(line)) return true;
    if (/©|®|™|dispo|S\dD/i.test(line)) return true;
    if (line.length < 5 && !/^riz$|^bl[eé]$|^pain$/i.test(line)) return true;
    if (/^(?:poisson|viande|bio|local|fait maison|est|le|la|les|du|de|au|et|ou|en)$/i.test(line.trim())) return true;
    if (line === line.toUpperCase() && line.length < 15 && !days.some(d => d.toUpperCase() === line.trim().toUpperCase())) return true;
    return false;
  };

  // ─── Parse: collect all items per day as a flat list ────────────────────
  const rawMenu = { Lundi: [], Mardi: [], Mercredi: [], Jeudi: [], Vendredi: [] };
  let dayIndex = 0;
  let lastMaxCategory = 0; // 0=Entrée, 1=Plats, 2=Accompagnements, 3=Desserts
  let itemId = 1;

  const cleanLines = rawLines.filter(l => !isNoise(l));
  const filteredLines = cleanLines.filter(l => !/^(?:midi|soir|matin|goûter)$/i.test(l.trim()));

  for (const line of filteredLines) {
    // If there is an explicit day mentioned and we haven't seen it recently, we could use it.
    // However, OCR often mangles "Mardi" to "Br" and "Jeudi" to "eu". 
    // We will rely purely on the Category progression heuristic, which is highly robust for tabular menus.

    // Split by "/", OCR sometimes merges the two columns with a slash or space.
    const subItems = line.split(/\s*\/\s*/).filter(s => s.trim().length > 2);

    for (const raw of subItems) {
      let trimmed = raw.trim();

      // Strip mangled day names at the start of a food string, like "eu Chou-fleur" -> "Chou-fleur"
      const unPrefixed = trimmed.replace(/^(lundi|mardi|mercredi|jeudi|vendredi|br|eu|;)\s+/i, '');
      if (unPrefixed.length > 3) trimmed = unPrefixed;

      if (isNoise(trimmed)) continue;

      let category = 'Plats';
      if (categoryFromContent['Entrées'].test(trimmed)) category = 'Entrées';
      else if (categoryFromContent['Accompagnements'].test(trimmed)) category = 'Accompagnements';
      else if (categoryFromContent['Desserts'].test(trimmed)) category = 'Desserts';
      else if (categoryFromContent['Plats'].test(trimmed)) category = 'Plats';
      else if (/^fromage/i.test(trimmed)) category = 'Desserts';

      const catIdx = catOrder.indexOf(category);

      // --- Heuristic Day Transition ---
      // If we were at Accompagnements(2) or Desserts(3) and drop down to Entrées(0) or Plats(1), it's a new day!
      if (lastMaxCategory >= 2 && catIdx <= 1) {
        dayIndex = Math.min(dayIndex + 1, 4); // Move to next day
        lastMaxCategory = catIdx; // Reset progression
      } else {
        lastMaxCategory = Math.max(lastMaxCategory, catIdx);
      }

      const currentDay = days[dayIndex];
      const title = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

      if (rawMenu[currentDay].some(e => e.title.toLowerCase() === title.toLowerCase())) continue;

      // Assign meal randomly for now, we will split them 50/50 later
      rawMenu[currentDay].push({
        id: String(itemId++),
        category,
        title,
        labels: detectLabels(trimmed),
        meal: 'midi', // temporary
      });
    }
  }

  // ─── Structure as { day: { midi: [...], soir: [...] } } ────────────────
  const menu = {};

  for (const [day, items] of Object.entries(rawMenu)) {
    // Since columns were read horizontally, the items are perfectly sorted organically by category
    // For a given day, we just split the flat list in two chunks (Midi and Soir)
    // Heuristic: first ~60% = midi, rest = soir (midi usually has more items/entrées)
    let midiItems = [];
    let soirItems = [];

    // We can be smarter: if we have 2 entrées, the 1st is midi, 2nd is soir.
    // If we have 2 plats, 1st is midi, 2nd is soir.
    const byCategory = { Entrées: [], Plats: [], Accompagnements: [], Desserts: [] };
    items.forEach(i => byCategory[i.category].push(i));

    ['Entrées', 'Plats', 'Accompagnements', 'Desserts'].forEach(cat => {
      const arr = byCategory[cat];
      if (arr.length === 1) {
        midiItems.push(arr[0]);
      } else if (arr.length > 1) {
        // Split them. E.g if 3 desserts, 2 in Midi, 1 in Soir
        const split = Math.ceil(arr.length / 2);
        arr.slice(0, split).forEach(i => midiItems.push(i));
        arr.slice(split).forEach(i => soirItems.push(i));
      }
    });

    const sortByCat = (a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
    midiItems.sort(sortByCat).forEach(i => i.meal = 'midi');
    soirItems.sort(sortByCat).forEach(i => i.meal = 'soir');

    menu[day] = { midi: midiItems, soir: soirItems };
  }

  return menu;
}

// Detect labels from item text
function detectLabels(text) {
  const labels = [];
  if (/bio|biologique/i.test(text)) labels.push('Bio');
  if (/v[eé]g[eé]tarien|v[eé]g[eé]tal/i.test(text)) labels.push('Végétarien');
  if (/poisson|cabillaud|saumon|thon|msc/i.test(text)) labels.push('Poisson');
  if (/maison|fait.maison/i.test(text)) labels.push('Fait maison');
  if (/local|fran[çc]ais/i.test(text)) labels.push('Local');
  return labels;
}

// Extract text from image using Tesseract OCR
async function ocrFromImage(imagePath) {
  console.log(`[Menu OCR] Processing image: ${imagePath}`);
  const { data: { text } } = await Tesseract.recognize(imagePath, 'fra', {
    logger: m => { if (m.status === 'recognizing text') console.log(`[Menu OCR] ${Math.round(m.progress * 100)}%`); }
  });
  console.log(`[Menu OCR] Extracted ${text.length} chars from image`);
  return text;
}

// Extract text from PDF
async function textFromPDF(pdfPath) {
  console.log(`[Menu OCR] Processing PDF: ${pdfPath}`);
  const pdfBuffer = await fs.readFile(pdfPath);
  const data = await pdfParse(pdfBuffer);
  console.log(`[Menu OCR] Extracted ${data.text.length} chars from PDF`);
  return data.text;
}

// GET /api/cantine/menu — Get the structured menu (JSON by day)
router.get('/menu', async (req, res) => {
  try {
    const { data: menu, error } = await supabase
      .from('cantine_menu')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !menu) {
      return res.json({ menu: null, imageUrl: null, facebookUrl: FACEBOOK_PAGE_URL });
    }

    // Parse the stored menu JSON
    let parsedMenu = null;
    try {
      parsedMenu = typeof menu.post_text === 'string' ? JSON.parse(menu.post_text) : menu.post_text;
    } catch {
      parsedMenu = null;
    }

    res.json({
      menu: parsedMenu,
      imageUrl: menu.image_url,
      weekLabel: menu.week_label,
      fetchedAt: menu.fetched_at,
      facebookUrl: FACEBOOK_PAGE_URL,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cantine/menu-upload — Admin: upload menu image/PDF → OCR → structured menu
router.post('/menu-upload', optionalAuth, upload.single('menu'), async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin requis' });
  }

  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });

  const filePath = req.file.path;
  const imageUrl = `/uploads/cantine/${req.file.filename}`;
  const weekLabel = req.body.weekLabel || `Menu de la semaine du ${new Date().toLocaleDateString('fr-FR')}`;

  try {
    // Extract text based on file type
    let rawText = '';
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.pdf') {
      rawText = await textFromPDF(filePath);
    } else {
      rawText = await ocrFromImage(filePath);
    }

    // Parse into structured menu
    const structuredMenu = parseMenuText(rawText);
    const dayCount = Object.keys(structuredMenu).length;
    const itemCount = Object.values(structuredMenu).flat().length;

    console.log(`[Menu OCR] Parsed menu: ${dayCount} days, ${itemCount} items`);

    // Save to DB (store menu JSON in post_text)
    await supabase.from('cantine_menu').insert({
      week_label: weekLabel,
      image_url: imageUrl,
      post_text: JSON.stringify(structuredMenu),
      source_url: 'upload_ocr',
    });

    res.json({
      success: true,
      imageUrl,
      menu: structuredMenu,
      rawText: rawText.substring(0, 500),
      stats: { days: dayCount, items: itemCount },
    });
  } catch (error) {
    console.error('[Menu OCR] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
