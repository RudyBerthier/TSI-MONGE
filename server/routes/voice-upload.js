const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authenticateToken } = require('./auth')

const router = express.Router()

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'voice')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm;codecs=opus']

const fileFilter = (req, file, cb) => {
  const base = file.mimetype.split(';')[0].trim()
  if (ALLOWED_AUDIO_TYPES.includes(base)) cb(null, true)
  else cb(new Error('Type audio non supporté'), false)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const filename = `${req.user?.id || 'anon'}_${Date.now()}.webm`
    cb(null, filename)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
})

router.post('/', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier audio fourni' })

    const rawDuration = parseFloat(req.body.duration)
    const duration = isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0

    let waveform = []
    try {
      const parsed = JSON.parse(req.body.waveform || '[]')
      if (Array.isArray(parsed)) waveform = parsed
    } catch {
      return res.status(400).json({ error: 'Waveform JSON invalide' })
    }

    res.json({
      url: `/uploads/voice/${req.file.filename}`,
      mimetype: req.file.mimetype,
      duration,
      waveform
    })
  } catch (err) {
    console.error('[VoiceUpload] Error:', err.message)
    res.status(500).json({ error: 'Erreur interne du serveur' })
  }
})

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 10MB)' })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err) return res.status(400).json({ error: err.message })
  next()
})

module.exports = router
