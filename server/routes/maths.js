const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');
const supabase = require('../config/supabase');

const TSI1_URL = 'http://a-crida.toile-libre.org/tsi1/tsi1.html';
const COLLES_URL = 'http://a-crida.toile-libre.org/colles/colles.html';
const TSI1_BASE = 'https://a-crida.toile-libre.org/tsi1';
const COLLES_BASE = 'https://a-crida.toile-libre.org/colles';

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 heures

// Decode HTML entities (windows-1252 page)
function decodeEntities(str) {
  return str
    .replace(/&eacute;/g, 'e').replace(/&Eacute;/g, 'E')
    .replace(/&egrave;/g, 'e').replace(/&agrave;/g, 'a')
    .replace(/&ocirc;/g, 'o').replace(/&icirc;/g, 'i')
    .replace(/&ucirc;/g, 'u').replace(/&ecirc;/g, 'e')
    .replace(/&ccedil;/g, 'c').replace(/&amp;/g, '&')
    .replace(/&deg;/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').trim();
}

// Supprime les commentaires HTML pour ne garder que le contenu actif
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

// Extrait le contenu d'un <ul> en gerant les <ul> imbriques
function extractMenuAccordeon(html, startIndex) {
  let depth = 0, i = startIndex, contentStart = -1;
  while (i < html.length) {
    if (html.substring(i, i + 3).toLowerCase() === '<ul') {
      depth++;
      if (depth === 1) contentStart = html.indexOf('>', i) + 1;
    }
    if (html.substring(i, i + 5).toLowerCase() === '</ul>') {
      depth--;
      if (depth === 0) return html.substring(contentStart, i);
    }
    i++;
  }
  return html.substring(contentStart || startIndex);
}

// Scraper pour la page tsi1.html
async function scrapeTsi1Page() {
  const res = await fetch(TSI1_URL);
  const buffer = await res.arrayBuffer();
  const html = stripComments(new TextDecoder('windows-1252').decode(buffer));

  const cours = [];
  const ds = [];
  const dm = [];
  const interros = [];
  const ap = [];

  // ===== PROGRESSION =====
  const progression = [];
  const progHeaderIdx = html.search(/<ul\s+id="menu-progression">/i);
  if (progHeaderIdx >= 0) {
    const progContent = extractMenuAccordeon(html, progHeaderIdx);
    const itemRegex = /<li><a[^>]*><b>([^<]+)<\/b>\s*([^<]+)<\/a><\/li>/gi;
    let match;
    while ((match = itemRegex.exec(progContent)) !== null) {
      const rawBold = decodeEntities(match[1]).trim();
      const rawText = decodeEntities(match[2]).trim();

      const romanMatch = rawBold.match(/^([IVXLCDM]+)\./i);
      const roman = romanMatch ? romanMatch[1] : '';

      const sectionMatch = rawBold.match(/\.\s*([^0-9:]+)/);
      let section = sectionMatch ? sectionMatch[1].trim() : 'Général';
      if (section.toLowerCase().includes('ensembles')) section = 'Ensembles et raisonnements';
      else if (section.toLowerCase().includes('calcul')) section = 'Calculs';
      else if (section.toLowerCase().includes('fonction')) section = 'Fonctions';
      else if (section.toLowerCase().includes('complexes')) section = 'Nombres complexes';
      else if (section.toLowerCase().includes('suite')) section = 'Suites';
      else if (section.toLowerCase().includes('algeb') || section.toLowerCase().includes('algèb')) section = 'Algèbre';
      else if (section.toLowerCase().includes('geom') || section.toLowerCase().includes('géom')) section = 'Géométrie';
      else if (section.toLowerCase().includes('proba')) section = 'Probabilités';

      const title = rawText.replace(/^\s*:\s*/, '').trim();
      const subtitle = rawBold.replace(/^([IVXLCDM]+)\.\s*/i, '').replace(/\s*:\s*$/, '').trim();

      progression.push({ roman, section, title, subtitle });
    }
  }

  // ===== COURS =====
  // Structure: <b id="ancre_xxx">SectionName.</b> ... <ul id="menu-accordeon">
  // Avec <li><a>titre</a><ul><li><a href="file.pdf">Cours</a></li>...</ul></li>
  const sectionHeaderRegex = /<b\s+id="ancre[^"]*">([^<]+)<\/b>/gi;
  let match;
  while ((match = sectionHeaderRegex.exec(html)) !== null) {
    const sectionName = decodeEntities(match[1]).replace(/\.$/, '').trim();
    const afterHeader = html.substring(match.index + match[0].length);
    const ulMatch = afterHeader.match(/<ul\s+id="menu-accordeon">/i);
    if (!ulMatch) continue;
    const ulStart = match.index + match[0].length + ulMatch.index;
    const listContent = extractMenuAccordeon(html, ulStart);

    const chapterRegex = /<li>\s*<a>([^<]+)<\/a>\s*<ul>([\s\S]*?)<\/ul>/gi;
    let chMatch;
    while ((chMatch = chapterRegex.exec(listContent)) !== null) {
      const title = decodeEntities(chMatch[1]).replace(/^\d+\.\s*/, '').trim();
      const innerHtml = chMatch[2];
      
      const subchapters = {};
      let hasSubchapters = false;

      const pdfRegex = /<a\s+href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;
      let pdfMatch;
      while ((pdfMatch = pdfRegex.exec(innerHtml)) !== null) {
        const labelRaw = decodeEntities(pdfMatch[2]).trim();
        const labelLow = labelRaw.toLowerCase();
        const isExercice = labelLow.includes('exercice');
        const url = `${TSI1_BASE}/${pdfMatch[1]}`;

        const subMatch = labelRaw.match(/^([A-Z])\.\s*(.*?)(?:\.\s*Cours|\.\s*Exercices|\s*Cours|\s*Exercices|)$/i);

        if (subMatch) {
          hasSubchapters = true;
          const subLetter = subMatch[1].toUpperCase();
          let subTitlePart = labelRaw.replace(/\.?\s*Cours\s*$/i, '').replace(/\.?\s*Exercices\.?\s*$/i, '').trim();
          subTitlePart = subTitlePart.replace(/^[A-Z]\.\s*/i, '');
          
          if (!subchapters[subLetter]) {
            subchapters[subLetter] = { 
              title: `${title} - ${subLetter}. ${subTitlePart}`, 
              coursUrl: null, 
              exercicesUrl: null 
            };
          }
          if (isExercice) subchapters[subLetter].exercicesUrl = url;
          else subchapters[subLetter].coursUrl = url;
        } else {
          if (!subchapters['main']) {
            subchapters['main'] = { title, coursUrl: null, exercicesUrl: null };
          }
          if (isExercice) subchapters['main'].exercicesUrl = url;
          else subchapters['main'].coursUrl = url;
        }
      }

      if (hasSubchapters) {
        for (const key of Object.keys(subchapters)) {
          if (key === 'main') continue;
          const sub = subchapters[key];
          if (sub.coursUrl || sub.exercicesUrl) cours.push({ section: sectionName, title: sub.title, cours: sub.coursUrl, exercices: sub.exercicesUrl });
        }
        if (subchapters['main'] && (subchapters['main'].coursUrl || subchapters['main'].exercicesUrl)) {
           cours.push({ section: sectionName, title: subchapters['main'].title, cours: subchapters['main'].coursUrl, exercices: subchapters['main'].exercicesUrl });
        }
      } else if (subchapters['main']) {
        const main = subchapters['main'];
        if (main.coursUrl || main.exercicesUrl) cours.push({ section: sectionName, title: main.title, cours: main.coursUrl, exercices: main.exercicesUrl });
      }
    }
  }

  // ===== DS =====
  const dsHeaderIdx = html.search(/Devoirs en classe/i);
  if (dsHeaderIdx >= 0) {
    const afterDs = html.substring(dsHeaderIdx);
    const ulMatch = afterDs.match(/<ul\s+id="menu-accordeon">/i);
    if (ulMatch) {
      const dsContent = extractMenuAccordeon(html, dsHeaderIdx + ulMatch.index);
      const dsItemRegex = /<li>\s*<a>([^<]*)<\/a>\s*<ul>([\s\S]*?)<\/ul>/gi;
      let dsMatch;
      while ((dsMatch = dsItemRegex.exec(dsContent)) !== null) {
        const label = decodeEntities(dsMatch[1]).trim();
        if (!label.match(/DS\d+|CB/i)) continue;
        const inner = dsMatch[2];
        const numMatch = label.match(/DS(\d+)/i) || label.match(/(CB)/i);
        const num = numMatch ? numMatch[1] : null;
        if (!num) continue;
        const entry = { num, title: label, enonce: null, corrige: null };
        const linkRegex = /<a\s+href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;
        let lm;
        while ((lm = linkRegex.exec(inner)) !== null) {
          const txt = lm[2].toLowerCase();
          if (txt.includes('nonc')) entry.enonce = `${TSI1_BASE}/${lm[1]}`;
          else if (txt.includes('orrig')) entry.corrige = `${TSI1_BASE}/${lm[1]}`;
        }
        ds.push(entry);
      }
    }
  }

  // ===== DM =====
  const dmHeaderIdx = html.search(/Devoirs maison/i);
  if (dmHeaderIdx >= 0) {
    const afterDm = html.substring(dmHeaderIdx);
    const ulMatch = afterDm.match(/<ul\s+id="menu-accordeon">/i);
    if (ulMatch) {
      const dmContent = extractMenuAccordeon(html, dmHeaderIdx + ulMatch.index);
      const dmItemRegex = /<li>\s*<a>([^<]*)<\/a>\s*<ul>([\s\S]*?)<\/ul>/gi;
      let dmMatch;
      while ((dmMatch = dmItemRegex.exec(dmContent)) !== null) {
        const label = decodeEntities(dmMatch[1]).trim();
        const num = label.match(/DM(\d+)/i)?.[1];
        if (!num) continue;
        const inner = dmMatch[2];
        const entry = { num, title: `DM${num}`, enonce: null, corrige: null };
        const linkRegex = /<a\s+href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;
        let lm;
        while ((lm = linkRegex.exec(inner)) !== null) {
          const txt = lm[2].toLowerCase();
          if (txt.includes('nonc')) entry.enonce = `${TSI1_BASE}/${lm[1]}`;
          else if (txt.includes('orrig')) entry.corrige = `${TSI1_BASE}/${lm[1]}`;
        }
        dm.push(entry);
      }
    }
  }

  // ===== INTERROS =====
  const interroHeaderIdx = html.search(/<b>Interros<\/b>/i);
  if (interroHeaderIdx >= 0) {
    const afterInterro = html.substring(interroHeaderIdx);
    const ulMatch = afterInterro.match(/<ul\s+id="menu-accordeon">/i);
    if (ulMatch) {
      const interroContent = extractMenuAccordeon(html, interroHeaderIdx + ulMatch.index);
      const interroRegex = /<a\s+href="(interro(\d+)\.pdf)"[^>]*>([^<]*)<\/a>/gi;
      let iMatch;
      while ((iMatch = interroRegex.exec(interroContent)) !== null) {
        interros.push({
          num: iMatch[2],
          title: `Interro ${iMatch[2]}`,
          date: decodeEntities(iMatch[3]),
          url: `${TSI1_BASE}/${iMatch[1]}`
        });
      }
    }
  }

  // ===== AP =====
  // Chercher le <ul id="menu-accordeon"> qui contient des items AP
  const allUlRegex = /<ul\s+id="menu-accordeon">/gi;
  let ulMatch;
  while ((ulMatch = allUlRegex.exec(html)) !== null) {
    const content = extractMenuAccordeon(html, ulMatch.index);
    if (content.match(/<a>AP\d*\s*:/i) || content.match(/<a\s+href="AP[^"]*\.pdf"/i)) {
      // AP avec sous-items (accordeon)
      const apAccordeonRegex = /<li><a>([^<]+)<\/a>\s*<ul>([\s\S]*?)<\/ul>/gi;
      let apMatch;
      while ((apMatch = apAccordeonRegex.exec(content)) !== null) {
        const apTitle = decodeEntities(apMatch[1]).trim();
        const inner = apMatch[2];
        const items = [];
        const linkRegex = /<a\s+href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;
        let lm;
        while ((lm = linkRegex.exec(inner)) !== null) {
          items.push({ label: decodeEntities(lm[2]), url: `${TSI1_BASE}/${lm[1]}` });
        }
        if (items.length > 0) ap.push({ title: apTitle, url: items[0].url, extras: items.slice(1) });
      }
      // AP liens directs (strip nested <ul> to avoid duplicates)
      const contentNoNested = content.replace(/<ul>[\s\S]*?<\/ul>/gi, '');
      const apDirectRegex = /<li><a\s+href="([^"]+\.pdf)"[^>]*>([^<]+)<\/a>/gi;
      let apDirect;
      while ((apDirect = apDirectRegex.exec(contentNoNested)) !== null) {
        const title = decodeEntities(apDirect[2]).trim();
        if (!ap.find(a => a.url === `${TSI1_BASE}/${apDirect[1]}`)) {
          ap.push({ title, url: `${TSI1_BASE}/${apDirect[1]}`, extras: [] });
        }
      }
      break;
    }
  }

  // Trier
  ds.sort((a, b) => {
    if (a.num === 'CB') return 1;
    if (b.num === 'CB') return -1;
    return Number(a.num) - Number(b.num);
  });
  dm.sort((a, b) => Number(a.num) - Number(b.num));
  interros.sort((a, b) => Number(a.num) - Number(b.num));

  return { cours, ds, dm, interros, ap, progression };
}

// Scraper pour la page colles.html
async function scrapeCollesPage() {
  const res = await fetch(COLLES_URL);
  const buffer = await res.arrayBuffer();
  const html = stripComments(new TextDecoder('windows-1252').decode(buffer));

  const colles = { planning: null, semaines: [], icolleLien: null };

  // Chercher le planning annuel
  const planningMatch = html.match(/<a\s+href="(colloscope[^"]*\.pdf)"[^>]*>/i);
  if (planningMatch) {
    colles.planning = `${COLLES_BASE}/${planningMatch[1]}`;
  }

  // Extraire les semaines
  const semaineRegex = /<a\s+href="(semaine_(\d+)\.pdf)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  while ((match = semaineRegex.exec(html)) !== null) {
    const num = match[2];
    const label = match[3].trim().replace(/\.$/, '');
    // Extraire les dates entre parentheses
    const datesMatch = label.match(/\(([^)]+)\)/);
    colles.semaines.push({
      num,
      dates: datesMatch ? datesMatch[1] : '',
      url: `${COLLES_BASE}/${match[1]}`
    });
  }

  // Chercher le lien icolle
  const icolleMatch = html.match(/<a\s+href="(https?:\/\/[^"]*icolle[^"]*)"[^>]*>/i);
  if (icolleMatch) {
    colles.icolleLien = icolleMatch[1];
  }

  colles.semaines.sort((a, b) => Number(a.num) - Number(b.num));

  return colles;
}

// Scraper complet
async function scrapeAll() {
  console.log('[Maths] Demarrage du scraping...');

  const [tsi1, colles] = await Promise.all([
    scrapeTsi1Page(),
    scrapeCollesPage()
  ]);

  const result = {
    cours: tsi1.cours,
    ds: tsi1.ds,
    dm: tsi1.dm,
    interros: tsi1.interros,
    ap: tsi1.ap,
    progression: tsi1.progression,
    colles,
    last_updated: new Date().toISOString()
  };

  // Sauvegarder dans Supabase
  const { error } = await supabase
    .from('math_content')
    .upsert({
      id: 'main',
      cours: result.cours,
      ds: result.ds,
      dm: result.dm,
      interros: result.interros,
      ap: result.ap,
      progression: result.progression,
      colles: result.colles,
      last_updated: result.last_updated
    });

  if (error) {
    console.error('[Maths] Erreur sauvegarde Supabase:', error.message);
    throw error;
  }

  console.log(`[Maths] Scraping OK: ${result.cours.length} cours, ${result.ds.length} DS, ${result.dm.length} DM, ${result.interros.length} interros, ${result.colles.semaines.length} semaines colles`);
  return result;
}

// Auto-refresh
async function startAutoRefresh() {
  setTimeout(async () => {
    try {
      await scrapeAll();
    } catch (err) {
      console.error('[Maths] Erreur auto-refresh initial:', err.message);
    }
  }, 20000); // 20s apres demarrage

  setInterval(async () => {
    try {
      await scrapeAll();
    } catch (err) {
      console.error('[Maths] Erreur auto-refresh:', err.message);
    }
  }, REFRESH_INTERVAL);

  console.log(`[Maths] Auto-refresh configure toutes les ${REFRESH_INTERVAL / 1000 / 3600}h`);
}

startAutoRefresh();

// GET /api/maths - retourne les donnees scrapees
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('math_content')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error || !data) {
      return res.json({
        cours: [], ds: [], dm: [], interros: [], ap: [], progression: [], colles: { planning: null, semaines: [], icolleLien: null },
        lastUpdated: null
      });
    }

    res.json({
      cours: data.cours || [],
      ds: data.ds || [],
      dm: data.dm || [],
      interros: data.interros || [],
      ap: data.ap || [],
      progression: data.progression || [],
      colles: data.colles || { planning: null, semaines: [], icolleLien: null },
      lastUpdated: data.last_updated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/maths/refresh - actualisation manuelle (admin)
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const result = await scrapeAll();

    // Log the manual refresh action
    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'admin.maths.refresh',
      targetLabel: 'Actualisation manuelle du scraper Maths',
      req
    });

    res.json({
      success: true,
      message: 'Scraping reussi',
      stats: {
        cours: result.cours.length,
        ds: result.ds.length,
        dm: result.dm.length,
        interros: result.interros.length,
        colles: result.colles.semaines.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
