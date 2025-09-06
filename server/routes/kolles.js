const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configuration multer pour les programmes de khôlles
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'kolles');
    
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const weekNumber = req.body.week_number;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `semaine_${weekNumber}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés pour les programmes de khôlles.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Fonction helper pour lire/écrire les données
async function readKolles() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'kolles.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeKolles(kolles) {
  await fs.writeFile(
    path.join(__dirname, '..', 'data', 'kolles.json'),
    JSON.stringify(kolles, null, 2)
  );
}

// GET /api/kolles - Liste tous les programmes de khôlles
router.get('/', async (req, res) => {
  try {
    const kolles = await readKolles();
    const { class: filterClass } = req.query;
    
    // Filtrer par classe si spécifié
    let filteredKolles = kolles;
    if (filterClass) {
      filteredKolles = kolles.filter(kolle => kolle.class === filterClass);
    }
    
    // Trier par numéro de semaine
    filteredKolles.sort((a, b) => a.week_number - b.week_number);
    
    const formattedKolles = filteredKolles.map(kolle => ({
      id: kolle.id,
      week_number: kolle.week_number,
      week_dates: kolle.week_dates,
      class: kolle.class,
      filename: kolle.filename,
      file_url: `/uploads/kolles/${kolle.filename}`,
      created_at: kolle.created_at
    }));
    
    res.json(formattedKolles);
  } catch (error) {
    console.error('Erreur lecture khôlles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/kolles - Upload d'un nouveau programme de khôlle
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { week_number, week_dates, class: kolleClass } = req.body;
    
    if (!req.file || !week_number || !week_dates || !kolleClass) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        required: ['file', 'week_number', 'week_dates', 'class']
      });
    }
    
    // Valider le numéro de semaine
    const weekNum = parseInt(week_number);
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 28) {
      return res.status(400).json({ 
        error: 'Numéro de semaine invalide (doit être entre 1 et 28)' 
      });
    }
    
    const kolles = await readKolles();
    
    // Vérifier si une khôlle existe déjà pour cette semaine
    const existingKolle = kolles.find(k => k.week_number === weekNum);
    if (existingKolle) {
      // Supprimer l'ancien fichier
      try {
        await fs.unlink(existingKolle.file_path);
      } catch (fileError) {
        console.warn('Ancien fichier déjà supprimé:', fileError.message);
      }
      
      // Supprimer l'ancienne entrée
      const index = kolles.findIndex(k => k.week_number === weekNum);
      kolles.splice(index, 1);
    }
    
    const newKolle = {
      id: uuidv4(),
      week_number: weekNum,
      week_dates: week_dates.trim(),
      class: kolleClass,
      filename: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      created_at: new Date().toISOString()
    };
    
    kolles.push(newKolle);
    await writeKolles(kolles);
    
    res.json({ 
      success: true, 
      kolle: {
        ...newKolle,
        file_url: `/uploads/kolles/${req.file.filename}`
      }
    });
    
  } catch (error) {
    console.error('Erreur upload khôlle:', error);
    res.status(500).json({ error: 'Erreur upload' });
  }
});

// GET /api/kolles/week/:weekNumber - Programme pour une semaine spécifique
router.get('/week/:weekNumber', async (req, res) => {
  try {
    const weekNum = parseInt(req.params.weekNumber);
    if (isNaN(weekNum)) {
      return res.status(400).json({ error: 'Numéro de semaine invalide' });
    }
    
    const kolles = await readKolles();
    const kolle = kolles.find(k => k.week_number === weekNum);
    
    if (!kolle) {
      return res.status(404).json({ error: 'Aucun programme pour cette semaine' });
    }
    
    res.json({
      ...kolle,
      file_url: `/uploads/kolles/${kolle.filename}`
    });
  } catch (error) {
    console.error('Erreur récupération khôlle par semaine:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/kolles/download/:filename - Télécharger un fichier khôlle
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const fullPath = path.join(__dirname, '..', 'uploads', 'kolles', filename);
  
  // Vérifier que le fichier existe
  if (fsSync.existsSync(fullPath)) {
    res.sendFile(fullPath);
  } else {
    res.status(404).json({ error: 'Fichier non trouvé' });
  }
});

// GET /api/kolles/admin/stats - Statistiques des khôlles
router.get('/admin/stats', async (req, res) => {
  try {
    const kolles = await readKolles();
    
    const stats = {
      total: kolles.length,
      weeks_covered: kolles.map(k => k.week_number).sort((a, b) => a - b),
      latest_week: kolles.length > 0 ? Math.max(...kolles.map(k => k.week_number)) : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur stats khôlles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction helper pour lire/écrire les programmes annuels
async function readAnnualPrograms() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'annual_programs.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeAnnualPrograms(programs) {
  const dataDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, 'annual_programs.json'),
    JSON.stringify(programs, null, 2)
  );
}

// Configuration multer pour les programmes annuels
const annualProgramStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'annual_programs');
    
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `programme_annuel_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const uploadAnnualProgram = multer({
  storage: annualProgramStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés pour les programmes annuels.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// GET /api/kolles/annual-programs - Liste des programmes annuels
router.get('/annual-programs', async (req, res) => {
  try {
    const programs = await readAnnualPrograms();
    const { class: filterClass } = req.query;
    
    console.log('📚 [DEBUG SERVER] GET annual-programs with class filter:', filterClass);
    console.log('📚 [DEBUG SERVER] Total programs before filtering:', programs.length);
    
    // Filtrer par classe si spécifié
    let filteredPrograms = programs;
    if (filterClass) {
      filteredPrograms = programs.filter(program => program.class === filterClass);
    }
    
    console.log('📚 [DEBUG SERVER] Programs after filtering:', filteredPrograms.length);
    
    const formattedPrograms = filteredPrograms.map(program => ({
      id: program.id,
      title: program.title,
      year: program.year,
      filename: program.filename,
      class: program.class,
      file_url: `/uploads/annual_programs/${program.filename}`,
      isActive: program.isActive || false,
      created_at: program.created_at
    }));
    
    res.json(formattedPrograms);
  } catch (error) {
    console.error('Erreur lecture programmes annuels:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/kolles/annual-programs - Upload d'un nouveau programme annuel
router.post('/annual-programs', uploadAnnualProgram.single('file'), async (req, res) => {
  try {
    const { title, year, class: programClass } = req.body;
    
    console.log('📚 [DEBUG SERVER] POST annual-program:', { title, year, programClass });
    
    if (!req.file || !title || !year || !programClass) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        required: ['file', 'title', 'year', 'class']
      });
    }
    
    const programs = await readAnnualPrograms();
    
    const newProgram = {
      id: uuidv4(),
      title: title.trim(),
      year: year.trim(),
      class: programClass.trim(),
      filename: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      isActive: false,
      created_at: new Date().toISOString()
    };
    
    programs.push(newProgram);
    await writeAnnualPrograms(programs);
    
    res.json({ 
      success: true, 
      program: {
        ...newProgram,
        file_url: `/uploads/annual_programs/${req.file.filename}`
      }
    });
    
  } catch (error) {
    console.error('Erreur upload programme annuel:', error);
    res.status(500).json({ error: 'Erreur upload' });
  }
});

// PUT /api/kolles/annual-programs/:id - Modifier un programme annuel
router.put('/annual-programs/:id', async (req, res) => {
  try {
    const { title, year } = req.body;
    const programs = await readAnnualPrograms();
    const programIndex = programs.findIndex(p => p.id === req.params.id);
    
    if (programIndex === -1) {
      return res.status(404).json({ error: 'Programme annuel non trouvé' });
    }
    
    const program = programs[programIndex];
    
    if (title) program.title = title.trim();
    if (year) program.year = year.trim();
    program.updated_at = new Date().toISOString();
    
    programs[programIndex] = program;
    await writeAnnualPrograms(programs);
    
    res.json({
      success: true,
      program: {
        ...program,
        file_url: `/uploads/annual_programs/${program.filename}`
      }
    });
    
  } catch (error) {
    console.error('Erreur modification programme annuel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/kolles/annual-programs/:id - Suppression d'un programme annuel
router.delete('/annual-programs/:id', async (req, res) => {
  try {
    const programs = await readAnnualPrograms();
    const programIndex = programs.findIndex(p => p.id === req.params.id);
    
    if (programIndex === -1) {
      return res.status(404).json({ error: 'Programme annuel non trouvé' });
    }
    
    const program = programs[programIndex];
    
    // Supprimer le fichier physique
    try {
      await fs.unlink(program.file_path);
    } catch (fileError) {
      console.warn('Fichier déjà supprimé ou introuvable:', fileError.message);
    }
    
    // Supprimer de la base de données
    programs.splice(programIndex, 1);
    await writeAnnualPrograms(programs);
    
    res.json({ success: true, message: 'Programme annuel supprimé' });
    
  } catch (error) {
    console.error('Erreur suppression programme annuel:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

// PATCH /api/kolles/annual-programs/:id/toggle - Activer/désactiver un programme annuel
router.patch('/annual-programs/:id/toggle', async (req, res) => {
  try {
    const programs = await readAnnualPrograms();
    const programIndex = programs.findIndex(p => p.id === req.params.id);
    
    if (programIndex === -1) {
      return res.status(404).json({ error: 'Programme annuel non trouvé' });
    }
    
    // Récupérer la classe du programme à activer
    const targetClass = programs[programIndex].class;
    console.log('📚 [DEBUG SERVER] Toggling program for class:', targetClass);
    
    // Désactiver seulement les autres programmes de la MÊME classe
    programs.forEach(program => {
      if (program.class === targetClass && program.id !== req.params.id) {
        program.isActive = false;
        console.log('📚 [DEBUG SERVER] Deactivating program:', program.id, 'for class:', program.class);
      }
    });
    
    // Activer le programme sélectionné
    programs[programIndex].isActive = true;
    programs[programIndex].updated_at = new Date().toISOString();
    console.log('📚 [DEBUG SERVER] Activated program:', req.params.id, 'for class:', targetClass);
    
    await writeAnnualPrograms(programs);
    
    res.json({
      success: true,
      message: 'Programme annuel activé avec succès',
      program: {
        ...programs[programIndex],
        file_url: `/uploads/annual_programs/${programs[programIndex].filename}`
      }
    });
    
  } catch (error) {
    console.error('Erreur activation programme annuel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/kolles/annual-programs/active - Récupérer le programme annuel actif
router.get('/annual-programs/active', async (req, res) => {
  try {
    const programs = await readAnnualPrograms();
    const activeProgram = programs.find(p => p.isActive);
    
    if (!activeProgram) {
      return res.json(null);
    }
    
    res.json({
      ...activeProgram,
      file_url: `/uploads/annual_programs/${activeProgram.filename}`
    });
  } catch (error) {
    console.error('Erreur récupération programme actif:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/kolles/:id - Détails d'un programme de khôlle
router.get('/:id', async (req, res) => {
  try {
    const kolles = await readKolles();
    const kolle = kolles.find(k => k.id === req.params.id);
    
    if (!kolle) {
      return res.status(404).json({ error: 'Programme de khôlle non trouvé' });
    }
    
    res.json({
      ...kolle,
      file_url: `/uploads/kolles/${kolle.filename}`
    });
  } catch (error) {
    console.error('Erreur récupération khôlle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/kolles/:id - Modification d'un programme de khôlle
router.put('/:id', async (req, res) => {
  try {
    const { week_dates } = req.body;
    
    if (!week_dates) {
      return res.status(400).json({ error: 'Les dates de la semaine sont requises' });
    }
    
    const kolles = await readKolles();
    const kolleIndex = kolles.findIndex(k => k.id === req.params.id);
    
    if (kolleIndex === -1) {
      return res.status(404).json({ error: 'Programme de khôlle non trouvé' });
    }
    
    // Mettre à jour le programme
    kolles[kolleIndex] = {
      ...kolles[kolleIndex],
      week_dates: week_dates.trim(),
      updated_at: new Date().toISOString()
    };
    
    await writeKolles(kolles);
    
    res.json({ 
      success: true, 
      message: 'Programme de khôlle modifié avec succès',
      kolle: {
        ...kolles[kolleIndex],
        file_url: `/uploads/kolles/${kolles[kolleIndex].filename}`
      }
    });
    
  } catch (error) {
    console.error('Erreur modification khôlle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/kolles/:id - Suppression d'un programme de khôlle
router.delete('/:id', async (req, res) => {
  try {
    const kolles = await readKolles();
    const kolleIndex = kolles.findIndex(k => k.id === req.params.id);
    
    if (kolleIndex === -1) {
      return res.status(404).json({ error: 'Programme de khôlle non trouvé' });
    }
    
    const kolle = kolles[kolleIndex];
    
    // Supprimer le fichier physique
    try {
      await fs.unlink(kolle.file_path);
    } catch (fileError) {
      console.warn('Fichier déjà supprimé ou introuvable:', fileError.message);
    }
    
    // Supprimer de la base de données
    kolles.splice(kolleIndex, 1);
    await writeKolles(kolles);
    
    res.json({ success: true, message: 'Programme de khôlle supprimé' });
    
  } catch (error) {
    console.error('Erreur suppression khôlle:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

module.exports = router;