const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Fonction helper pour lire les données des classes
async function readClasses() {
  const filePath = path.join(__dirname, '..', 'data', 'classes.json');
  console.log('📁 [DEBUG SERVER] Tentative de lecture du fichier:', filePath);
  
  try {
    const data = await fs.readFile(filePath, 'utf8');
    console.log('📁 [DEBUG SERVER] Fichier lu avec succès, contenu:', data);
    const parsedData = JSON.parse(data);
    console.log('📁 [DEBUG SERVER] Données parsées:', parsedData);
    return parsedData;
  } catch (error) {
    console.log('⚠️ [DEBUG SERVER] Erreur de lecture fichier (probablement fichier inexistant):', error.message);
    // Si le fichier n'existe pas, retourner les classes par défaut
    const defaultClasses = {
      'tsi1': { 
        id: 'tsi1', 
        name: 'TSI 1', 
        description: 'Première année de Technologie et Sciences Industrielles', 
        color: 'blue',
        active: true 
      },
      'tsi2': { 
        id: 'tsi2', 
        name: 'TSI 2', 
        description: 'Deuxième année de Technologie et Sciences Industrielles', 
        color: 'green',
        active: true 
      },
      'mpsi': { 
        id: 'mpsi', 
        name: 'MPSI', 
        description: 'Mathématiques, Physique et Sciences de l\'Ingénieur', 
        color: 'purple',
        active: true 
      },
      'mp': { 
        id: 'mp', 
        name: 'MP', 
        description: 'Mathématiques et Physique', 
        color: 'indigo',
        active: true 
      },
      'pcsi': { 
        id: 'pcsi', 
        name: 'PCSI', 
        description: 'Physique, Chimie et Sciences de l\'Ingénieur', 
        color: 'red',
        active: true 
      },
      'pc': { 
        id: 'pc', 
        name: 'PC', 
        description: 'Physique et Chimie', 
        color: 'yellow',
        active: true 
      }
    };
    console.log('📝 [DEBUG SERVER] Création des classes par défaut:', defaultClasses);
    await writeClasses(defaultClasses);
    console.log('💾 [DEBUG SERVER] Classes par défaut sauvegardées');
    return defaultClasses;
  }
}

async function writeClasses(classes) {
  const dataDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, 'classes.json'),
    JSON.stringify(classes, null, 2)
  );
}

// Fonction helper pour lire les documents
async function readDocuments() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'documents.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeDocuments(documents) {
  await fs.writeFile(
    path.join(__dirname, '..', 'data', 'documents.json'),
    JSON.stringify(documents, null, 2)
  );
}

// Fonction helper pour lire les kolles
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

// GET /api/classes - Liste toutes les classes
router.get('/', async (req, res) => {
  console.log('🚀 [DEBUG SERVER] GET /api/classes - Début de la requête')
  try {
    console.log('📖 [DEBUG SERVER] Lecture des classes depuis le fichier...')
    const classes = await readClasses();
    console.log('📖 [DEBUG SERVER] Classes lues:', classes)
    console.log('📖 [DEBUG SERVER] Type des classes:', typeof classes)
    
    const classesArray = Object.values(classes);
    console.log('📖 [DEBUG SERVER] Classes converties en array:', classesArray)
    console.log('📖 [DEBUG SERVER] Nombre de classes:', classesArray.length)
    
    console.log('✅ [DEBUG SERVER] Envoi de la réponse JSON')
    res.json(classesArray);
  } catch (error) {
    console.error('❌ [DEBUG SERVER] Erreur lecture classes:', error);
    console.error('❌ [DEBUG SERVER] Stack trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/classes - Créer une nouvelle classe
router.post('/', async (req, res) => {
  try {
    const { id, name } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        required: ['id', 'name']
      });
    }
    
    const classes = await readClasses();
    
    if (classes[id]) {
      return res.status(409).json({ error: 'Cette classe existe déjà' });
    }
    
    classes[id] = {
      id: id.toLowerCase(),
      name,
      active: true,
      created_at: new Date().toISOString()
    };
    
    await writeClasses(classes);
    
    res.json({ 
      success: true, 
      message: 'Classe créée avec succès',
      class: classes[id]
    });
    
  } catch (error) {
    console.error('Erreur création classe:', error);
    res.status(500).json({ error: 'Erreur création' });
  }
});

// PUT /api/classes/:id - Modifier une classe
router.put('/:id', async (req, res) => {
  try {
    const { name, active } = req.body;
    
    if (!name && active === undefined) {
      return res.status(400).json({ error: 'Aucune donnée à modifier' });
    }
    
    const classes = await readClasses();
    
    if (!classes[req.params.id]) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }
    
    // Mettre à jour la classe
    if (name) classes[req.params.id].name = name;
    if (active !== undefined) classes[req.params.id].active = active;
    classes[req.params.id].updated_at = new Date().toISOString();
    
    await writeClasses(classes);
    
    res.json({ 
      success: true, 
      message: 'Classe modifiée avec succès',
      class: classes[req.params.id]
    });
    
  } catch (error) {
    console.error('Erreur modification classe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/classes/:id - Supprimer une classe et tout son contenu
router.delete('/:id', async (req, res) => {
  try {
    const classId = req.params.id;
    const classes = await readClasses();
    
    if (!classes[classId]) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }
    
    // Supprimer tous les documents de cette classe
    const documents = await readDocuments();
    const documentsToKeep = documents.filter(doc => doc.class !== classId);
    const documentsDeleted = documents.length - documentsToKeep.length;
    
    // Supprimer tous les kolles de cette classe
    const kolles = await readKolles();
    const kollesToKeep = kolles.filter(kolle => kolle.class !== classId);
    const kollesDeleted = kolles.length - kollesToKeep.length;
    
    // Supprimer les fichiers physiques des documents
    const documentsToDelete = documents.filter(doc => doc.class === classId);
    for (const doc of documentsToDelete) {
      try {
        await fs.unlink(doc.file_path);
      } catch (fileError) {
        console.warn(`Fichier déjà supprimé ou introuvable: ${doc.file_path}`, fileError.message);
      }
    }
    
    // Supprimer les fichiers physiques des kolles
    const kollesToDelete = kolles.filter(kolle => kolle.class === classId);
    for (const kolle of kollesToDelete) {
      try {
        await fs.unlink(kolle.file_path);
      } catch (fileError) {
        console.warn(`Fichier déjà supprimé ou introuvable: ${kolle.file_path}`, fileError.message);
      }
    }
    
    // Supprimer la classe
    delete classes[classId];
    
    // Sauvegarder les modifications
    await Promise.all([
      writeClasses(classes),
      writeDocuments(documentsToKeep),
      writeKolles(kollesToKeep)
    ]);
    
    res.json({ 
      success: true, 
      message: 'Classe supprimée avec succès',
      deleted: {
        class: classId,
        documents: documentsDeleted,
        kolles: kollesDeleted
      }
    });
    
  } catch (error) {
    console.error('Erreur suppression classe:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

// GET /api/classes/:id/stats - Statistiques d'une classe
router.get('/:id/stats', async (req, res) => {
  try {
    const classId = req.params.id;
    const classes = await readClasses();
    
    if (!classes[classId]) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }
    
    const documents = await readDocuments();
    const kolles = await readKolles();
    
    const classDocuments = documents.filter(doc => doc.class === classId);
    const classKolles = kolles.filter(kolle => kolle.class === classId);
    
    const stats = {
      class: classes[classId],
      documents: {
        total: classDocuments.length,
        by_category: {},
        by_type: {}
      },
      kolles: {
        total: classKolles.length
      }
    };
    
    // Statistiques documents par catégorie et type
    classDocuments.forEach(doc => {
      stats.documents.by_category[doc.category] = (stats.documents.by_category[doc.category] || 0) + 1;
      stats.documents.by_type[doc.type] = (stats.documents.by_type[doc.type] || 0) + 1;
    });
    
    res.json(stats);
    
  } catch (error) {
    console.error('Erreur stats classe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;