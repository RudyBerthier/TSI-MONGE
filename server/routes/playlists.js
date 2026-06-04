const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

function auth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'Non autorisé' });
    try {
        req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'tsi1-secret-key-2025');
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalide' });
    }
}

// ─── GET /api/playlists ─ Mes playlists ──────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('playlists')
            .select('id, name, cover_image, is_public, is_liked_playlist, created_at')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/playlists/public ─ Toutes les playlists publiques ──────────────
router.get('/public', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('playlists')
            .select(`
                id, name, cover_image, created_at,
                users:user_id (id, username, avatar, google_avatar)
            `)
            .eq('is_public', true)
            .eq('is_liked_playlist', false)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/playlists ─ Créer une playlist ────────────────────────────────
router.post('/', auth, async (req, res) => {
    const { name, is_public } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
    try {
        const { data, error } = await supabase
            .from('playlists')
            .insert({ user_id: req.user.id, name: name.trim(), is_public: !!is_public })
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/playlists/:id ─ Modifier une playlist ─────────────────────────
router.put('/:id', auth, async (req, res) => {
    const { name, is_public } = req.body;
    try {
        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (is_public !== undefined) updates.is_public = is_public;

        const { error } = await supabase
            .from('playlists')
            .update(updates)
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/playlists/:id ─ Supprimer ───────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .eq('is_liked_playlist', false); // Protect Liked Playlist
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/playlists/:id/tracks ─ Pistes d'une playlist ───────────────────
router.get('/:id/tracks', async (req, res) => {
    try {
        // Check visibility
        const { data: playlist, error: pe } = await supabase
            .from('playlists')
            .select('is_public, user_id')
            .eq('id', req.params.id)
            .single();
        if (pe || !playlist) return res.status(404).json({ error: 'Playlist introuvable' });

        // Allow if public, or owner
        let isOwner = false;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            try {
                const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'tsi1-secret-key-2025');
                isOwner = decoded.id === playlist.user_id;
            } catch {}
        }
        if (!playlist.is_public && !isOwner) return res.status(403).json({ error: 'Accès refusé' });

        const { data, error } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', req.params.id)
            .order('position', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/playlists/:id/tracks ─ Ajouter un titre ───────────────────────
router.post('/:id/tracks', auth, async (req, res) => {
    const { name, artist, image, audioUrl } = req.body;
    if (!name || !audioUrl) return res.status(400).json({ error: 'name et audioUrl requis' });
    try {
        // Verify ownership
        const { data: playlist } = await supabase
            .from('playlists').select('user_id').eq('id', req.params.id).single();
        if (!playlist || playlist.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        // Check for duplicates to prevent the same song being added multiple times
        const { data: existing } = await supabase
            .from('playlist_tracks')
            .select('id')
            .eq('playlist_id', req.params.id)
            .eq('audio_url', audioUrl);
            
        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Ce titre est déjà dans la playlist' });
        }

        // Get max position
        const { data: maxPos } = await supabase
            .from('playlist_tracks')
            .select('position')
            .eq('playlist_id', req.params.id)
            .order('position', { ascending: false })
            .limit(1)
            .single();
        const position = (maxPos?.position ?? -1) + 1;

        const { data, error } = await supabase
            .from('playlist_tracks')
            .insert({ playlist_id: req.params.id, track_name: name, track_artist: artist || '', track_image: image || '', audio_url: audioUrl, position })
            .select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/playlists/:id/tracks/:trackId ─ Retirer un titre ────────────
router.delete('/:id/tracks/:trackId', auth, async (req, res) => {
    try {
        const { data: playlist } = await supabase
            .from('playlists').select('user_id').eq('id', req.params.id).single();
        if (!playlist || playlist.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        const { error } = await supabase
            .from('playlist_tracks')
            .delete()
            .eq('id', req.params.trackId)
            .eq('playlist_id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/playlists/:id/tracks/remove-url ─ Retirer un titre via audio_url ──
router.post('/:id/tracks/remove-url', auth, async (req, res) => {
    const { audioUrl } = req.body;
    if (!audioUrl) return res.status(400).json({ error: 'audioUrl requis' });
    try {
        const { data: playlist } = await supabase
            .from('playlists').select('user_id').eq('id', req.params.id).single();
        if (!playlist || playlist.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        const { error } = await supabase
            .from('playlist_tracks')
            .delete()
            .eq('playlist_id', req.params.id)
            .eq('audio_url', audioUrl);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/playlists/:id/tracks/reorder ─ Réordonner (DnD) ───────────────
router.put('/:id/tracks/reorder', auth, async (req, res) => {
    const { orderedIds } = req.body; // Array of track IDs in new order
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds requis' });
    try {
        const { data: playlist } = await supabase
            .from('playlists').select('user_id').eq('id', req.params.id).single();
        if (!playlist || playlist.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        const updates = orderedIds.map((id, index) =>
            supabase.from('playlist_tracks').update({ position: index }).eq('id', id).eq('playlist_id', req.params.id)
        );
        await Promise.all(updates);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/playlists/:id/save ─ Sauvegarder une playlist publique ─────────
router.post('/:id/save', auth, async (req, res) => {
    try {
        // Get original playlist
        const { data: original, error: pe } = await supabase
            .from('playlists')
            .select('*, playlist_tracks(*)')
            .eq('id', req.params.id)
            .eq('is_public', true)
            .single();
        if (pe || !original) return res.status(404).json({ error: 'Playlist introuvable ou privée' });
        if (original.user_id === req.user.id) return res.status(400).json({ error: 'C\'est votre propre playlist' });

        // Create a copy
        const { data: copy, error: ce } = await supabase
            .from('playlists')
            .insert({ user_id: req.user.id, name: `${original.name} (copie)`, cover_image: original.cover_image, is_public: false })
            .select('id').single();
        if (ce) throw ce;

        // Copy all tracks
        const tracks = (original.playlist_tracks || []).map((t, idx) => ({
            playlist_id: copy.id,
            track_name: t.track_name,
            track_artist: t.track_artist,
            track_image: t.track_image,
            audio_url: t.audio_url,
            position: idx
        }));
        if (tracks.length > 0) {
            await supabase.from('playlist_tracks').insert(tracks);
        }
        res.json({ success: true, playlistId: copy.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
