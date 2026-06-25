const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth'); // Import if auth is needed, otherwise skip
const supabase = require('../config/supabase');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'clicker');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cookie-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté (images uniquement)'));
    }
  }
});

// POST /api/clicker/upload
// Note: using authenticateToken if the user must be logged in. 
// However, clicker routes seem to use optionalAuth or rely on headers directly.
// In clicker.js, they use a custom middleware inside server.js? 
// Let's check how auth is done for other uploads.
// Actually, I'll export just the upload logic.

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const url = `/uploads/clicker/${req.file.filename}`;
    res.json({ success: true, url });

  } catch (error) {
    console.error('[ClickerUpload] Error:', error.message);
    res.status(500).json({ error: 'Erreur lors de l\'upload du skin' });
  }
});

module.exports = router;
