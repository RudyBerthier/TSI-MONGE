const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'general';
    const dir = path.join(__dirname, '..', 'uploads', 'documents', category);
    
    // Créer le dossier s'il n'existe pas
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    const filename = `${timestamp}_${originalName}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Seuls les PDF, DOC et DOCX sont acceptés.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// Fonction helper pour lire/écrire les données
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

// GET /api/documents - Liste tous les documents organisés par catégorie
router.get('/', async (req, res) => {
  try {
    const documents = await readDocuments();
    
    // Organiser par catégorie
    const organized = {};
    documents.forEach(doc => {
      if (!organized[doc.category]) {
        organized[doc.category] = [];
      }
      organized[doc.category].push({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        category: doc.category,
        type: doc.type,
        file_url: `/uploads/documents/${doc.category}/${doc.filename}`,
        created_at: doc.created_at
      });
    });
    
    res.json(organized);
  } catch (error) {
    console.error('Erreur lecture documents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/documents - Upload d'un nouveau document
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { category, type, title } = req.body;
    
    if (!req.file || !category || !type || !title) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        required: ['file', 'category', 'type', 'title']
      });
    }
    
    const documents = await readDocuments();
    
    const newDocument = {
      id: uuidv4(),
      title,
      filename: req.file.filename,
      category,
      type,
      file_path: req.file.path,
      file_size: req.file.size,
      created_at: new Date().toISOString()
    };
    
    documents.push(newDocument);
    await writeDocuments(documents);
    
    res.json({ 
      success: true, 
      document: {
        ...newDocument,
        file_url: `/uploads/documents/${category}/${req.file.filename}`
      }
    });
    
  } catch (error) {
    console.error('Erreur upload document:', error);
    res.status(500).json({ error: 'Erreur upload' });
  }
});

// GET /api/documents/:id - Détails d'un document
router.get('/:id', async (req, res) => {
  try {
    const documents = await readDocuments();
    const document = documents.find(doc => doc.id === req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }
    
    res.json({
      ...document,
      file_url: `/uploads/documents/${document.category}/${document.filename}`
    });
  } catch (error) {
    console.error('Erreur récupération document:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/documents/:id - Modification d'un document
router.put('/:id', async (req, res) => {
  try {
    const { title, category, type } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }
    
    const documents = await readDocuments();
    const documentIndex = documents.findIndex(doc => doc.id === req.params.id);
    
    if (documentIndex === -1) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }
    
    // Mettre à jour le document
    documents[documentIndex] = {
      ...documents[documentIndex],
      title: title.trim(),
      category: category || documents[documentIndex].category,
      type: type || documents[documentIndex].type,
      updated_at: new Date().toISOString()
    };
    
    await writeDocuments(documents);
    
    res.json({ 
      success: true, 
      message: 'Document modifié avec succès',
      document: {
        ...documents[documentIndex],
        file_url: `/uploads/documents/${documents[documentIndex].category}/${documents[documentIndex].filename}`
      }
    });
    
  } catch (error) {
    console.error('Erreur modification document:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/documents/:id - Suppression d'un document
router.delete('/:id', async (req, res) => {
  try {
    const documents = await readDocuments();
    const documentIndex = documents.findIndex(doc => doc.id === req.params.id);
    
    if (documentIndex === -1) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }
    
    const document = documents[documentIndex];
    
    // Supprimer le fichier physique
    try {
      await fs.unlink(document.file_path);
    } catch (fileError) {
      console.warn('Fichier déjà supprimé ou introuvable:', fileError.message);
    }
    
    // Supprimer de la base de données
    documents.splice(documentIndex, 1);
    await writeDocuments(documents);
    
    res.json({ success: true, message: 'Document supprimé' });
    
  } catch (error) {
    console.error('Erreur suppression document:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

// GET /api/documents/download/:filename - Télécharger un fichier
router.get('/download/*', (req, res) => {
  const filePath = req.params[0]; // Récupère tout après /download/
  const fullPath = path.join(__dirname, '..', 'uploads', filePath);
  
  // Vérifier que le fichier existe
  if (fsSync.existsSync(fullPath)) {
    res.sendFile(fullPath);
  } else {
    res.status(404).json({ error: 'Fichier non trouvé' });
  }
});

// GET /api/documents/stats - Statistiques
router.get('/admin/stats', async (req, res) => {
  try {
    const documents = await readDocuments();
    
    const stats = {
      total: documents.length,
      by_category: {},
      by_type: {}
    };
    
    documents.forEach(doc => {
      // Par catégorie
      stats.by_category[doc.category] = (stats.by_category[doc.category] || 0) + 1;
      // Par type
      stats.by_type[doc.type] = (stats.by_type[doc.type] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur stats documents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;