const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase')
const { authenticateToken } = require('./auth')

// GET /api/kanban
// Retrieve all homework tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('homework_tasks')
      .select('*, creator:created_by(username)')
      .order('due_date', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        return res.status(500).json({ error: 'La base de données n\'est pas encore configurée (Table introuvable).' })
      }
      throw error
    }

    res.json(tasks)
  } catch (error) {
    console.error('Erreur récupération Kanban:', error)
    res.status(500).json({ error: 'Erreur lors de la récupération des devoirs' })
  }
})

// POST /api/kanban
// Add a new global homework task
router.post('/', authenticateToken, async (req, res) => {
  const { title, subject, due_date, link } = req.body

  if (!title || !subject || !due_date) {
    return res.status(400).json({ error: 'Titre, matière et date requis' })
  }

  try {
    const { data: task, error } = await supabase
      .from('homework_tasks')
      .insert({
        title,
        subject,
        due_date,
        link: link || null,
        created_by: req.user.id
      })
      .select()
      .single()

    if (error) throw error

    // Fetch the username to return a complete object
    const { data: user } = await supabase.from('users').select('username').eq('id', req.user.id).single()

    res.status(201).json({ ...task, creator: user })
  } catch (error) {
    console.error('Erreur ajout Kanban:', error)
    res.status(500).json({ error: 'Erreur lors de l\'ajout du devoir' })
  }
})

// PUT /api/kanban/:id
// Edit a homework task (Anyone can edit now)
router.put('/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id
  const { title, subject, due_date, link } = req.body

  try {
    const { data: task, error } = await supabase
      .from('homework_tasks')
      .update({
        title,
        subject,
        due_date,
        link: link || null
      })
      .eq('id', taskId)
      .select('*, creator:created_by(username)')
      .single()

    if (error) throw error

    res.json(task)
  } catch (error) {
    console.error('Erreur modification Kanban:', error)
    res.status(500).json({ error: 'Erreur lors de la modification du devoir' })
  }
})

// DELETE /api/kanban/:id
// Delete a homework task (Anyone can delete now)
router.delete('/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id

  try {
    const { error } = await supabase
      .from('homework_tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression Kanban:', error)
    res.status(500).json({ error: 'Erreur lors de la suppression du devoir' })
  }
})

module.exports = router
