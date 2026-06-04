const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

// Auth middleware
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requis' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(403).json({ error: 'Token invalide' });
    }
}

// ─── GET NOTES ───────────────────────────────────────────────────────────────

// GET /api/notes — Get all notes (owned + shared with me)
router.get('/', auth, async (req, res) => {
    try {
        // 1. My own notes
        const { data: myNotes, error: err1 } = await supabase
            .from('notes')
            .select('id, title, content, color, pinned, updated_at, created_at, user_id')
            .eq('user_id', req.user.id)
            .order('pinned', { ascending: false })
            .order('updated_at', { ascending: false });
        if (err1) throw err1;

        // 2. Notes shared with me
        const { data: shared, error: err2 } = await supabase
            .from('note_shares')
            .select(`
                permission,
                notes (id, title, content, color, pinned, updated_at, created_at, user_id)
            `)
            .eq('shared_with_user_id', req.user.id);
        if (err2) throw err2;

        const sharedNotes = (shared || []).map(s => {
            if (!s.notes) return null;
            return {
                ...s.notes,
                is_shared: true,
                permission: s.permission,
                // Pinned state from the owner's perspective isn't perfectly what we want,
                // but we keep it simple for now.
            };
        }).filter(Boolean);

        // Combine
        const allNotes = [...(myNotes || []), ...sharedNotes];

        // Sort combined (pinned first, then updated_at)
        allNotes.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updated_at) - new Date(a.updated_at);
        });

        res.json(allNotes);
    } catch (err) {
        console.error('Erreur récupération notes:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/notes/:id — Get a single note (must be owner or shared)
router.get('/:id', auth, async (req, res) => {
    try {
        const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !note) return res.status(404).json({ error: 'Note non trouvée' });

        if (note.user_id !== req.user.id) {
            // Check if shared
            const { data: share } = await supabase
                .from('note_shares')
                .select('permission')
                .eq('note_id', note.id)
                .eq('shared_with_user_id', req.user.id)
                .single();
            if (!share) return res.status(403).json({ error: 'Accès refusé' });
            note.is_shared = true;
            note.permission = share.permission;
        }

        res.json(note);
    } catch (err) {
        console.error('Erreur récupération note:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── MUTATE NOTES ────────────────────────────────────────────────────────────

// POST /api/notes — Create a new note
router.post('/', auth, async (req, res) => {
    try {
        const { title, content, color } = req.body;

        const { data, error } = await supabase
            .from('notes')
            .insert({
                user_id: req.user.id,
                title: (title || 'Sans titre').substring(0, 200),
                content: (content || '').substring(0, 50000),
                color: color || 'default',
                pinned: false,
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Erreur création note:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/notes/:id — Update a note
router.put('/:id', auth, async (req, res) => {
    try {
        // 1. Check permissions First
        const { data: note, error: err1 } = await supabase
            .from('notes')
            .select('user_id')
            .eq('id', req.params.id)
            .single();
        if (err1 || !note) return res.status(404).json({ error: 'Note non trouvée' });

        if (note.user_id !== req.user.id) {
            // Verify edit permission
            const { data: share, error: errShare } = await supabase
                .from('note_shares')
                .select('permission')
                .eq('note_id', req.params.id)
                .eq('shared_with_user_id', req.user.id)
                .single();

            if (errShare || !share || share.permission !== 'edit') {
                return res.status(403).json({ error: 'Accès refusé (lecture seule)' });
            }
        }

        // 2. Perform Update
        const { title, content, color, pinned } = req.body;
        const updates = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title.substring(0, 200);
        if (content !== undefined) updates.content = content.substring(0, 50000);
        if (color !== undefined) updates.color = color;
        if (pinned !== undefined && note.user_id === req.user.id) updates.pinned = pinned; // Only owner can pin (for all)

        const { data, error } = await supabase
            .from('notes')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Return with share info if not owner
        if (note.user_id !== req.user.id) {
            data.is_shared = true;
            data.permission = 'edit';
        }
        res.json(data);
    } catch (err) {
        console.error('Erreur mise à jour note:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/notes/:id — Delete a note
router.delete('/:id', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id); // Only owner can delete

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur suppression note:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── SHARING LOGIC ───────────────────────────────────────────────────────────

// GET /api/notes/:id/shares — Get list of users a note is shared with
router.get('/:id/shares', auth, async (req, res) => {
    try {
        // Ensure owner
        const { data: note } = await supabase.from('notes').select('user_id').eq('id', req.params.id).single();
        if (!note || note.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        const { data, error } = await supabase
            .from('note_shares')
            .select('id, permission, shared_with_user_id, users(username)')
            .eq('note_id', req.params.id);

        if (error) throw error;
        res.json(data.map(d => ({
            id: d.id,
            user_id: d.shared_with_user_id,
            username: d.users?.username,
            permission: d.permission
        })));
    } catch (err) {
        console.error('Erreur listage partages:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/notes/:id/shares — Share a note with someone
router.post('/:id/shares', auth, async (req, res) => {
    try {
        const { username, permission = 'read' } = req.body;
        if (!username) return res.status(400).json({ error: 'Username requis' });

        // Ensure owner
        const { data: note } = await supabase.from('notes').select('user_id').eq('id', req.params.id).single();
        if (!note || note.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        // Find user to share with
        const { data: targetUser } = await supabase.from('users').select('id, username').ilike('username', username).single();
        if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        if (targetUser.id === req.user.id) return res.status(400).json({ error: 'Impossible de partager avec soi-même' });

        // Upsert share
        const { data, error } = await supabase
            .from('note_shares')
            .upsert({
                note_id: req.params.id,
                shared_with_user_id: targetUser.id,
                permission: permission
            }, { onConflict: 'note_id, shared_with_user_id' })
            .select('id, permission, shared_with_user_id, users(username)')
            .single();

        if (error) throw error;

        res.json({
            id: data.id,
            user_id: data.shared_with_user_id,
            username: targetUser.username,
            permission: data.permission
        });
    } catch (err) {
        console.error('Erreur partage note:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/notes/:id/shares/:userId — Revoke a share
router.delete('/:id/shares/:userId', auth, async (req, res) => {
    try {
        // Ensure owner
        const { data: note } = await supabase.from('notes').select('user_id').eq('id', req.params.id).single();
        if (!note || note.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        const { error } = await supabase
            .from('note_shares')
            .delete()
            .eq('note_id', req.params.id)
            .eq('shared_with_user_id', req.params.userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur révocation partage:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
