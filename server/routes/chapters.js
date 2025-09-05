const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('./auth');

const router = express.Router();

// Fonction helper pour lire les chapitres
async function readChapters() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'chapters.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture chapitres:', error);
    // Retourner les chapitres par défaut si le fichier n'existe pas
    return [
      { id: 'geometrie', name: 'Géométrie', icon: 'Compass', description: 'Vecteurs, repères, droites et plans' },
      { id: 'fonctions', name: 'Fonctions', icon: 'Activity', description: 'Étude de fonctions, dérivation' },
      { id: 'suites', name: 'Suites', icon: 'BarChart3', description: 'Suites numériques et convergence' },
      { id: 'ensembles', name: 'Ensembles et raisonnements', icon: 'Target', description: 'Logique mathématique et ensembles' },
      { id: 'probabilites', name: 'Probabilités', icon: 'Palette', description: 'Probabilités et statistiques' },
      { id: 'calculs', name: 'Calculs', icon: 'Calculator', description: 'Techniques de calcul' },
      { id: 'complexes', name: 'Nombres complexes', icon: 'Plus', description: 'Nombres complexes et applications' },
      { id: 'algebre', name: 'Algèbre', icon: 'BookOpen', description: 'Algèbre linéaire et matrices' }
    ];
  }
}

// Fonction helper pour écrire les chapitres
async function writeChapters(chapters) {
  const dataDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, 'chapters.json'),
    JSON.stringify(chapters, null, 2)
  );
}

// GET /api/chapters - Récupérer la liste des chapitres
router.get('/', async (req, res) => {
  try {
    const chapters = await readChapters();
    res.json(chapters);
  } catch (error) {
    console.error('Erreur récupération chapitres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/chapters - Ajouter un nouveau chapitre (admin uniquement)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }

    const { name, description, icon = 'BookOpen' } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ 
        error: 'Nom et description requis' 
      });
    }

    const chapters = await readChapters();
    
    // Générer un ID basé sur le nom
    const id = name.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Vérifier si l'ID existe déjà
    if (chapters.find(c => c.id === id)) {
      return res.status(400).json({ 
        error: 'Un chapitre avec ce nom existe déjà' 
      });
    }

    const newChapter = {
      id,
      name,
      description,
      icon
    };

    chapters.push(newChapter);
    await writeChapters(chapters);

    res.json({
      success: true,
      chapter: newChapter,
      message: 'Chapitre ajouté avec succès'
    });

  } catch (error) {
    console.error('Erreur ajout chapitre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/chapters/:id - Modifier un chapitre (admin uniquement)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }

    const chapterId = req.params.id;
    const { name, description, icon } = req.body;

    const chapters = await readChapters();
    const chapterIndex = chapters.findIndex(c => c.id === chapterId);

    if (chapterIndex === -1) {
      return res.status(404).json({ error: 'Chapitre non trouvé' });
    }

    const chapter = chapters[chapterIndex];

    // Mise à jour des champs
    if (name && name !== chapter.name) {
      chapter.name = name;
    }
    if (description && description !== chapter.description) {
      chapter.description = description;
    }
    if (icon && icon !== chapter.icon) {
      chapter.icon = icon;
    }

    chapters[chapterIndex] = chapter;
    await writeChapters(chapters);

    res.json({
      success: true,
      chapter,
      message: 'Chapitre modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur modification chapitre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/chapters/:id - Supprimer un chapitre (admin uniquement)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }

    const chapterId = req.params.id;
    const chapters = await readChapters();
    const chapterIndex = chapters.findIndex(c => c.id === chapterId);

    if (chapterIndex === -1) {
      return res.status(404).json({ error: 'Chapitre non trouvé' });
    }

    const deletedChapter = chapters[chapterIndex];
    chapters.splice(chapterIndex, 1);
    await writeChapters(chapters);

    res.json({
      success: true,
      message: `Chapitre "${deletedChapter.name}" supprimé avec succès`
    });

  } catch (error) {
    console.error('Erreur suppression chapitre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;