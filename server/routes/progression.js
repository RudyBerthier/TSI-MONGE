const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Fonction helper pour lire les progressions
async function readProgressions() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'progressions.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function writeProgressions(progressions) {
  const dataDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, 'progressions.json'),
    JSON.stringify(progressions, null, 2)
  );
}

// Fonction helper pour lire les chapitres
async function readChapters() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'chapters.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// GET /api/progression/:classId - Récupérer la progression d'une classe
router.get('/:classId', async (req, res) => {
  try {
    const classId = req.params.classId;
    const progressions = await readProgressions();
    
    if (!progressions[classId]) {
      // Créer une progression par défaut basée sur les chapitres existants
      const chapters = await readChapters();
      const defaultProgression = {
        classId,
        chapters: chapters.map((chapter, index) => ({
          id: chapter.id,
          title: chapter.title,
          description: chapter.description,
          order: index + 1,
          status: 'a-venir' // 'a-venir', 'en-cours', 'termine'
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      progressions[classId] = defaultProgression;
      await writeProgressions(progressions);
    }
    
    res.json(progressions[classId]);
  } catch (error) {
    console.error('Erreur récupération progression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/progression/:classId - Mettre à jour la progression d'une classe
router.put('/:classId', async (req, res) => {
  try {
    const classId = req.params.classId;
    const progressionData = req.body;
    
    if (!progressionData || !progressionData.chapters) {
      return res.status(400).json({ error: 'Données de progression manquantes' });
    }
    
    const progressions = await readProgressions();
    
    progressions[classId] = {
      classId,
      ...progressionData,
      updated_at: new Date().toISOString()
    };
    
    await writeProgressions(progressions);
    
    res.json({ 
      success: true, 
      message: 'Progression mise à jour avec succès',
      progression: progressions[classId]
    });
    
  } catch (error) {
    console.error('Erreur mise à jour progression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/progression/:classId/chapters/:chapterId/status - Mettre à jour le statut d'un chapitre
router.put('/:classId/chapters/:chapterId/status', async (req, res) => {
  try {
    const { classId, chapterId } = req.params;
    const { status } = req.body;
    
    if (!status || !['a-venir', 'en-cours', 'termine'].includes(status)) {
      return res.status(400).json({ 
        error: 'Statut invalide',
        validStatuses: ['a-venir', 'en-cours', 'termine']
      });
    }
    
    const progressions = await readProgressions();
    const allChapters = await readChapters();
    
    // Initialiser la progression si elle n'existe pas
    if (!progressions[classId]) {
      progressions[classId] = {
        classId,
        chapters: allChapters.map((chapter, index) => ({
          id: chapter.id,
          name: chapter.name,
          description: chapter.description,
          status: 'a-venir',
          order: index + 1
        })),
        updated_at: new Date().toISOString()
      };
    }
    
    // Synchroniser avec les chapitres de l'API si nécessaire
    const existingChapterIds = progressions[classId].chapters.map(ch => ch.id);
    const missingChapters = allChapters.filter(ch => !existingChapterIds.includes(ch.id));
    
    if (missingChapters.length > 0) {
      // Ajouter les chapitres manquants
      missingChapters.forEach((chapter, index) => {
        progressions[classId].chapters.push({
          id: chapter.id,
          name: chapter.name,
          description: chapter.description,
          status: 'a-venir',
          order: progressions[classId].chapters.length + index + 1
        });
      });
    }
    
    // Mettre à jour le statut du chapitre
    const chapterIndex = progressions[classId].chapters.findIndex(
      chapter => chapter.id === chapterId
    );
    
    if (chapterIndex === -1) {
      return res.status(404).json({ error: 'Chapitre non trouvé dans la progression' });
    }
    
    progressions[classId].chapters[chapterIndex].status = status;
    progressions[classId].updated_at = new Date().toISOString();
    
    await writeProgressions(progressions);
    
    res.json({ 
      success: true, 
      message: 'Statut du chapitre mis à jour avec succès',
      chapterId,
      status,
      chapter: progressions[classId].chapters[chapterIndex]
    });
    
  } catch (error) {
    console.error('Erreur mise à jour statut chapitre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/progression/:classId/order - Mettre à jour l'ordre des chapitres
router.put('/:classId/order', async (req, res) => {
  try {
    const classId = req.params.classId;
    const { chapters } = req.body;
    
    if (!chapters || !Array.isArray(chapters)) {
      return res.status(400).json({ error: 'Liste des chapitres manquante ou invalide' });
    }
    
    const progressions = await readProgressions();
    const allChapters = await readChapters();
    
    // Initialiser la progression si elle n'existe pas
    if (!progressions[classId]) {
      progressions[classId] = {
        classId,
        chapters: allChapters.map((chapter, index) => ({
          id: chapter.id,
          name: chapter.name,
          description: chapter.description,
          status: 'a-venir',
          order: index + 1
        })),
        updated_at: new Date().toISOString()
      };
    }
    
    // Mettre à jour l'ordre des chapitres
    progressions[classId].chapters = chapters.map((chapter, index) => ({
      ...chapter,
      order: index + 1
    }));
    progressions[classId].updated_at = new Date().toISOString();
    
    await writeProgressions(progressions);
    
    res.json({ 
      success: true, 
      message: 'Ordre des chapitres mis à jour avec succès',
      chapters: progressions[classId].chapters
    });
    
  } catch (error) {
    console.error('Erreur mise à jour ordre chapitres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/progression/:classId/reset - Réinitialiser la progression d'une classe
router.post('/:classId/reset', async (req, res) => {
  try {
    const classId = req.params.classId;
    const progressions = await readProgressions();
    
    // Récupérer les chapitres par défaut
    const chapters = await readChapters();
    
    const resetProgression = {
      classId,
      chapters: chapters.map((chapter, index) => ({
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        order: index + 1,
        status: 'a-venir'
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    progressions[classId] = resetProgression;
    await writeProgressions(progressions);
    
    res.json({ 
      success: true, 
      message: 'Progression réinitialisée avec succès',
      progression: progressions[classId]
    });
    
  } catch (error) {
    console.error('Erreur réinitialisation progression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/progression/:classId - Supprimer la progression d'une classe
router.delete('/:classId', async (req, res) => {
  try {
    const classId = req.params.classId;
    const progressions = await readProgressions();
    
    if (!progressions[classId]) {
      return res.status(404).json({ error: 'Progression non trouvée pour cette classe' });
    }
    
    delete progressions[classId];
    await writeProgressions(progressions);
    
    res.json({ 
      success: true, 
      message: 'Progression supprimée avec succès',
      classId
    });
    
  } catch (error) {
    console.error('Erreur suppression progression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/progression - Liste toutes les progressions
router.get('/', async (req, res) => {
  try {
    const progressions = await readProgressions();
    res.json(progressions);
  } catch (error) {
    console.error('Erreur récupération progressions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;