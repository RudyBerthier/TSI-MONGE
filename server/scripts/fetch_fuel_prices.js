const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function fetchAndParseFuelPrices() {
  console.log('🔄 Démarrage de la récupération des prix des carburants...');
  
  const tempDir = path.join(__dirname, '../../tmp_fuel');
  const zipFile = path.join(tempDir, 'jour.zip');
  const dataFile = path.join(__dirname, '../data/fuel_prices.json');
  
  try {
    // Créer le dossier temporaire
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Télécharger le fichier
    console.log('⬇️ Téléchargement des données (donnees.roulez-eco.fr)...');
    execSync(`curl -sL -o "${zipFile}" "https://donnees.roulez-eco.fr/opendata/jour"`);
    
    // Extraire le ZIP
    console.log('📦 Extraction de l\'archive...');
    execSync(`unzip -o -q "${zipFile}" -d "${tempDir}"`);
    
    // Trouver le fichier XML extrait
    const files = fs.readdirSync(tempDir);
    const xmlFile = files.find(f => f.endsWith('.xml'));
    
    if (!xmlFile) {
      throw new Error('Fichier XML introuvable dans l\'archive ZIP.');
    }
    
    const xmlPath = path.join(tempDir, xmlFile);
    console.log(`📄 Analyse du fichier: ${xmlFile}`);
    
    // Lire et analyser le XML avec une Regex rapide (le fichier fait ~15MB)
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    
    const prices = {
      'Gazole': [],
      'SP95': [],
      'E85': [],
      'GPLc': [],
      'E10': [],
      'SP98': []
    };
    
    const regex = /<prix nom="([^"]+)"[^>]*valeur="([^"]+)"/g;
    let match;
    
    while ((match = regex.exec(xmlContent)) !== null) {
      const nom = match[1];
      const valeur = parseFloat(match[2]);
      
      if (prices[nom] && !isNaN(valeur) && valeur > 0) {
        prices[nom].push(valeur);
      }
    }
    
    // Calculer les moyennes
    const averages = {};
    for (const [fuelType, values] of Object.entries(prices)) {
      if (values.length > 0) {
        // Filtrer les valeurs aberrantes (ex: < 0.5 ou > 3.0, sauf E85/GPLc qui sont bas)
        let filtered = values;
        if (fuelType !== 'E85' && fuelType !== 'GPLc') {
          filtered = values.filter(v => v > 1.0 && v < 3.0);
        } else {
          filtered = values.filter(v => v > 0.4 && v < 1.5);
        }
        
        if (filtered.length > 0) {
          const sum = filtered.reduce((a, b) => a + b, 0);
          averages[fuelType] = Number((sum / filtered.length).toFixed(3));
        }
      }
    }
    
    averages['last_updated'] = new Date().toISOString();
    
    // Sauvegarder dans server/data
    const dataDir = path.dirname(dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(dataFile, JSON.stringify(averages, null, 2));
    console.log('✅ Prix des carburants mis à jour avec succès :');
    console.log(averages);
    
    // Nettoyer
    execSync(`rm -rf "${tempDir}"`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des prix :', error);
  }
}

// Si exécuté directement (node fetch_fuel_prices.js)
if (require.main === module) {
  fetchAndParseFuelPrices();
}

module.exports = { fetchAndParseFuelPrices };
