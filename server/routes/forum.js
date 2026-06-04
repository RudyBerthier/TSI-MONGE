const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const path = require('path')
const multer = require('multer')
const jwt = require('jsonwebtoken')
const supabase = require('../config/supabase')
const { logActivity } = require('../utils/logger')

const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025'

// Optional auth: sets req.user if a valid token is present, but does not reject unauthenticated requests
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return next()
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user
    next()
  })
}

// Configure multer for file uploads (images, PDFs, documents)
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/forum')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (err) {
      cb(err)
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // Keep original filename for display, but make it unique
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    cb(null, 'forum-' + uniqueSuffix + '-' + safeName)
  }
})

// Allowed file types
const ALLOWED_EXTENSIONS = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|py|js|html|css|c|cpp|java/
const ALLOWED_MIMETYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'text/x-python', 'text/x-c', 'text/x-c++', 'text/x-java'
]

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: function (req, file, cb) {
    const extname = ALLOWED_EXTENSIONS.test(path.extname(file.originalname).toLowerCase())
    const mimetype = ALLOWED_MIMETYPES.includes(file.mimetype)

    if (mimetype || extname) {
      return cb(null, true)
    } else {
      cb(new Error('Type de fichier non autorise'))
    }
  }
})

// Helper: get file type category
function getFileType(filename, mimetype) {
  const ext = path.extname(filename).toLowerCase().slice(1)

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['xls', 'xlsx'].includes(ext)) return 'excel'
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint'
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive'
  if (['py', 'js', 'html', 'css', 'c', 'cpp', 'java', 'txt'].includes(ext)) return 'code'
  return 'file'
}

// Helper: map DB topic row to frontend format
function mapTopicToFrontend(row, replies) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    author: row.author,
    files: row.files || [],
    likes: row.likes || 0,
    dislikes: row.dislikes || 0,
    deviceVotes: row.device_votes || {},
    createdAt: row.created_at,
    replies: (replies || []).map(r => ({
      id: r.id,
      content: r.content,
      author: r.author,
      files: r.files || [],
      createdAt: r.created_at
    }))
  }
}

// POST upload files (images, PDFs, documents)
router.post('/upload', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const files = req.files.map(file => ({
      url: `/uploads/forum/${file.filename}`,
      name: file.originalname,
      type: getFileType(file.originalname, file.mimetype),
      size: file.size
    }))

    res.json({ success: true, files })
  } catch (err) {
    console.error('Error uploading files:', err)
    res.status(500).json({ error: 'Failed to upload files' })
  }
})

// GET all topics
router.get('/topics', async (req, res) => {
  try {
    const { data: topics, error } = await supabase
      .from('forum_topics')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch all replies for all topics
    const topicIds = (topics || []).map(t => t.id)
    let replies = []
    if (topicIds.length > 0) {
      const { data: allReplies, error: repliesError } = await supabase
        .from('forum_replies')
        .select('*')
        .in('topic_id', topicIds)
        .order('created_at', { ascending: true })

      if (repliesError) throw repliesError
      replies = allReplies || []
    }

    // Group replies by topic_id
    const repliesByTopic = {}
    for (const r of replies) {
      if (!repliesByTopic[r.topic_id]) repliesByTopic[r.topic_id] = []
      repliesByTopic[r.topic_id].push(r)
    }

    const result = (topics || []).map(t => mapTopicToFrontend(t, repliesByTopic[t.id] || []))

    res.json({ topics: result })
  } catch (err) {
    console.error('Error reading forum topics:', err)
    res.status(500).json({ error: 'Failed to read topics' })
  }
})

// GET single topic by ID
router.get('/topics/:id', async (req, res) => {
  try {
    const { data: topic, error } = await supabase
      .from('forum_topics')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    const { data: replies, error: repliesError } = await supabase
      .from('forum_replies')
      .select('*')
      .eq('topic_id', req.params.id)
      .order('created_at', { ascending: true })

    if (repliesError) throw repliesError

    res.json({ topic: mapTopicToFrontend(topic, replies || []) })
  } catch (err) {
    console.error('Error reading topic:', err)
    res.status(500).json({ error: 'Failed to read topic' })
  }
})

// POST new topic
router.post('/topics', async (req, res) => {
  try {
    const { title, category, content, author, files, images } = req.body

    if (!title || !category || !content || !author) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const newTopic = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      category,
      content,
      author,
      files: files || images || [],
      likes: 0,
      dislikes: 0,
      device_votes: {},
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('forum_topics')
      .insert(newTopic)
      .select()
      .single()

    if (error) throw error

    logActivity({ actorUsername: author, action: 'forum.topic.create', targetType: 'topic', targetId: data.id, targetLabel: title, req });
    res.json({ success: true, topic: mapTopicToFrontend(data, []) })
  } catch (err) {
    console.error('Error creating topic:', err)
    res.status(500).json({ error: 'Failed to create topic' })
  }
})

// POST reply to topic
router.post('/topics/:id/replies', async (req, res) => {
  try {
    const { content, author, files, images } = req.body

    if (!content || !author) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select('id')
      .eq('id', req.params.id)
      .single()

    if (topicError || !topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    const newReply = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      topic_id: req.params.id,
      content,
      author,
      files: files || images || [],
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('forum_replies')
      .insert(newReply)
      .select()
      .single()

    if (error) throw error

    logActivity({ actorUsername: author, action: 'forum.reply.create', targetType: 'topic', targetId: req.params.id, req });
    res.json({
      success: true,
      reply: {
        id: data.id,
        content: data.content,
        author: data.author,
        files: data.files || [],
        createdAt: data.created_at
      }
    })
  } catch (err) {
    console.error('Error adding reply:', err)
    res.status(500).json({ error: 'Failed to add reply' })
  }
})

// Helper: get device fingerprint from header
function getFingerprint(req) {
  return req.headers['x-fingerprint'] || 'unknown'
}

// GET user's vote for a topic (by fingerprint)
router.get('/topics/:id/my-vote', async (req, res) => {
  try {
    const fingerprint = getFingerprint(req)
    if (fingerprint === 'unknown') {
      return res.json({ vote: null })
    }

    const { data: topic, error } = await supabase
      .from('forum_topics')
      .select('device_votes')
      .eq('id', req.params.id)
      .single()

    if (error || !topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    const vote = topic.device_votes?.[fingerprint] || null

    res.json({ vote })
  } catch (err) {
    console.error('Error getting vote:', err)
    res.status(500).json({ error: 'Failed to get vote' })
  }
})

// GET all user votes (by fingerprint) - for initial load
router.get('/my-votes', async (req, res) => {
  try {
    const fingerprint = getFingerprint(req)
    if (fingerprint === 'unknown') {
      return res.json({ votes: {} })
    }

    const { data: topics, error } = await supabase
      .from('forum_topics')
      .select('id, device_votes')

    if (error) throw error

    const votes = {}
    for (const topic of (topics || [])) {
      if (topic.device_votes?.[fingerprint]) {
        votes[topic.id] = topic.device_votes[fingerprint]
      }
    }

    res.json({ votes })
  } catch (err) {
    console.error('Error getting votes:', err)
    res.status(500).json({ error: 'Failed to get votes' })
  }
})

// POST vote on topic (like/dislike) - fingerprint-based
router.post('/topics/:id/vote', async (req, res) => {
  try {
    const { action } = req.body // 'like', 'dislike', or 'remove'
    const fingerprint = getFingerprint(req)

    if (fingerprint === 'unknown') {
      return res.status(400).json({ error: 'Fingerprint required' })
    }

    const { data: topic, error: fetchError } = await supabase
      .from('forum_topics')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    // Initialize if needed
    let likes = typeof topic.likes === 'number' ? topic.likes : 0
    let dislikes = typeof topic.dislikes === 'number' ? topic.dislikes : 0
    const deviceVotes = topic.device_votes || {}

    const previousVote = deviceVotes[fingerprint]

    // Remove previous vote count if exists
    if (previousVote === 'like') {
      likes = Math.max(0, likes - 1)
    } else if (previousVote === 'dislike') {
      dislikes = Math.max(0, dislikes - 1)
    }

    // Handle action
    if (action === 'remove' || action === previousVote) {
      // Remove vote entirely (toggle off)
      delete deviceVotes[fingerprint]
    } else if (action === 'like') {
      likes += 1
      deviceVotes[fingerprint] = 'like'
    } else if (action === 'dislike') {
      dislikes += 1
      deviceVotes[fingerprint] = 'dislike'
    }

    const { error: updateError } = await supabase
      .from('forum_topics')
      .update({ likes, dislikes, device_votes: deviceVotes })
      .eq('id', req.params.id)

    if (updateError) throw updateError

    res.json({
      success: true,
      likes,
      dislikes,
      userVote: deviceVotes[fingerprint] || null
    })
  } catch (err) {
    console.error('Error voting on topic:', err)
    res.status(500).json({ error: 'Failed to vote' })
  }
})

// POST like topic (legacy, keep for compatibility)
router.post('/topics/:id/like', async (req, res) => {
  try {
    const { data: topic, error: fetchError } = await supabase
      .from('forum_topics')
      .select('likes')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    const newLikes = (topic.likes || 0) + 1

    const { error: updateError } = await supabase
      .from('forum_topics')
      .update({ likes: newLikes })
      .eq('id', req.params.id)

    if (updateError) throw updateError

    res.json({ success: true, likes: newLikes })
  } catch (err) {
    console.error('Error liking topic:', err)
    res.status(500).json({ error: 'Failed to like topic' })
  }
})

// DELETE topic (admin only or author via frontend validation)
router.delete('/topics/:id', optionalAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin'

    // Delete all replies for this topic first
    await supabase
      .from('forum_replies')
      .delete()
      .eq('topic_id', req.params.id)

    const { data, error } = await supabase
      .from('forum_topics')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    logActivity({ actorId: req.user?.id, actorUsername: req.user?.username || data.author, action: 'forum.topic.delete', targetType: 'topic', targetId: data.id, targetLabel: data.title, req });
    res.json({ success: true, deletedBy: isAdmin ? 'admin' : 'author' })
  } catch (err) {
    console.error('Error deleting topic:', err)
    res.status(500).json({ error: 'Failed to delete topic' })
  }
})

// DELETE reply (admin only or author via frontend validation)
router.delete('/topics/:topicId/replies/:replyId', optionalAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin'

    const { data, error } = await supabase
      .from('forum_replies')
      .delete()
      .eq('id', req.params.replyId)
      .eq('topic_id', req.params.topicId)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Reply not found' })
    }

    logActivity({ actorId: req.user?.id, actorUsername: req.user?.username || data.author, action: 'forum.reply.delete', targetType: 'reply', targetId: data.id, req });
    res.json({ success: true, deletedBy: isAdmin ? 'admin' : 'author' })
  } catch (err) {
    console.error('Error deleting reply:', err)
    res.status(500).json({ error: 'Failed to delete reply' })
  }
})

module.exports = router
