const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const SETTINGS_FILE = path.join(__dirname, '../data/site_settings.json');

// Paramètres par défaut
const DEFAULT_SETTINGS = {
  siteName: 'TSI 1 Mathématiques - Lycée Monge Chambéry',
  schoolYear: '2024-2025',
  lastUpdated: new Date().toISOString()
};

// Fonction pour lire les paramètres
async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('📄 [INFO] Fichier settings non trouvé, création avec valeurs par défaut');
    // Si le fichier n'existe pas, créer avec les valeurs par défaut
    await writeSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

// Fonction pour écrire les paramètres
async function writeSettings(settings) {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log('💾 [SUCCESS] Paramètres sauvegardés:', settings);
  } catch (error) {
    console.error('❌ [ERROR] Erreur lors de la sauvegarde des paramètres:', error);
    throw error;
  }
}

// GET /api/settings - Récupérer les paramètres du site
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Récupération des paramètres du site');
    const settings = await readSettings();
    res.json(settings);
  } catch (error) {
    console.error('❌ [ERROR] Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

// PUT /api/settings - Mettre à jour les paramètres du site
router.put('/', async (req, res) => {
  try {
    console.log('💾 [DEBUG] Mise à jour des paramètres du site:', req.body);
    
    const { siteName, schoolYear } = req.body;
    
    // Validation
    if (!siteName || !schoolYear) {
      return res.status(400).json({ error: 'Le nom du site et l\'année scolaire sont requis' });
    }
    
    const settings = {
      siteName: siteName.trim(),
      schoolYear: schoolYear.trim(),
      lastUpdated: new Date().toISOString()
    };
    
    await writeSettings(settings);
    
    res.json({ 
      message: 'Paramètres mis à jour avec succès',
      settings 
    });
  } catch (error) {
    console.error('❌ [ERROR] Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

module.exports = router;