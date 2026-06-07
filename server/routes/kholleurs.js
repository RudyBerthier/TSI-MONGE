const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Helper to get all profs from colloscope to validate/build stats
async function getProfsFromColloscope() {
    const { data: rows } = await supabase.from('colloscope').select('*');
    const profs = new Map();

    for (const row of (rows || [])) {
        for (const kholle of row.kholles) {
            if (kholle.prof) {
                if (!profs.has(kholle.prof)) {
                    profs.set(kholle.prof, {
                        name: kholle.prof,
                        matiere: kholle.matiere || '',
                        total_reviews: 0,
                        avg_rating: 0,
                        ratings_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    });
                }
            }
        }
    }
    return profs;
}

// GET /api/kholleurs/stats - Get global stats for all kholleurs
router.get('/stats', async (req, res) => {
    try {
        const profsMap = await getProfsFromColloscope();

        // Get all reviews to compute stats
        const { data: reviews, error } = await supabase
            .from('kholleur_reviews')
            .select('kholleur_name, note');

        if (!error && reviews) {
            for (const review of reviews) {
                const profName = review.kholleur_name;
                // If a prof was reviewed but removed from colloscope, add them back
                if (!profsMap.has(profName)) {
                    profsMap.set(profName, {
                        name: profName,
                        matiere: 'Inconnue',
                        total_reviews: 0,
                        avg_rating: 0,
                        ratings_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    });
                }

                const prof = profsMap.get(profName);
                if (review.note >= 1 && review.note <= 5) {
                    prof.ratings_distribution[review.note] += 1;
                    prof.total_reviews += 1;
                }
            }
        }

        // Calculate average
        const result = Array.from(profsMap.values()).map(prof => {
            if (prof.total_reviews > 0) {
                const sum = (prof.ratings_distribution[1] * 1) +
                    (prof.ratings_distribution[2] * 2) +
                    (prof.ratings_distribution[3] * 3) +
                    (prof.ratings_distribution[4] * 4) +
                    (prof.ratings_distribution[5] * 5);
                prof.avg_rating = sum / prof.total_reviews;
            }
            return prof;
        });

        // Sort by average rating descending, then by total reviews
        result.sort((a, b) => {
            if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
            return b.total_reviews - a.total_reviews;
        });

        res.json(result);
    } catch (err) {
        console.error('Erreur get kholleurs stats:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/kholleurs/:name/reviews - Get reviews for a specific kholleur
router.get('/:name/reviews', async (req, res) => {
    try {
        const { name } = req.params;
        const { data: reviews, error } = await supabase
            .from('kholleur_reviews')
            .select('id, kholleur_name, matiere, pseudo, note, commentaire, likes, created_at, users!user_id (id, avatar, google_avatar)')
            .eq('kholleur_name', name)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Clean up the response payload for users
        const formattedReviews = reviews.map(r => ({
            id: r.id,
            kholleur_name: r.kholleur_name,
            matiere: r.matiere,
            pseudo: r.pseudo,
            note: r.note,
            commentaire: r.commentaire,
            likes: r.likes || [],
            created_at: r.created_at,
            user_avatar: r.users?.avatar || r.users?.google_avatar || null,
            user_id: r.users?.id || null
        }));

        res.json(formattedReviews);
    } catch (err) {
        console.error('Erreur get reviews kholleur:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/kholleurs/:name/reviews - Post a new review
router.post('/:name/reviews', authenticateToken, async (req, res) => {
    try {
        const { name } = req.params;
        const { note, commentaire, is_anonymous, matiere } = req.body;
        const userId = req.user.id;
        const username = req.user.username;

        if (!note || note < 1 || note > 5) {
            return res.status(400).json({ error: 'La note doit être comprise entre 1 et 5' });
        }

        const pseudo = is_anonymous ? 'Anonyme' : username;

        const { data, error } = await supabase
            .from('kholleur_reviews')
            .insert({
                kholleur_name: name,
                matiere: matiere || '',
                pseudo,
                user_id: userId,
                note,
                commentaire: commentaire || '',
                likes: []
            })
            .select()
            .single();

        if (error) throw error;

        logActivity({
            actorId: userId,
            actorUsername: username,
            action: 'review.kholleur',
            targetType: 'kholleur',
            targetLabel: `Avis ${note}/5 pour ${name}`,
            req
        });

        res.status(201).json(data);
    } catch (err) {
        console.error('Erreur post review kholleur:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/kholleurs/reviews/:id/like - Like or unlike a review
router.post('/reviews/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const username = req.user.username;

        // The JWT doesn't contain the avatar, so we fetch it from the database
        const { data: userRow } = await supabase
            .from('users')
            .select('avatar, google_avatar')
            .eq('id', userId)
            .single();

        const avatar = userRow ? (userRow.avatar || userRow.google_avatar) : null;

        const { data: review, error: fetchErr } = await supabase
            .from('kholleur_reviews')
            .select('likes')
            .eq('id', id)
            .single();

        if (fetchErr || !review) return res.status(404).json({ error: 'Avis introuvable' });

        let likes = review.likes || [];

        // Ensure likes is an array (JSONB can sometimes return null)
        if (!Array.isArray(likes)) likes = [];

        // Determine if user has already liked
        const hasLikedIndex = likes.findIndex(l => {
            if (typeof l === 'string') return l === userId;
            return l.userId === userId;
        });

        if (hasLikedIndex !== -1) {
            // Remove like
            likes.splice(hasLikedIndex, 1);
        } else {
            // Add like with user details
            likes.push({ userId, username, avatar });
        }

        const { error: updateErr } = await supabase
            .from('kholleur_reviews')
            .update({ likes })
            .eq('id', id);

        if (updateErr) throw updateErr;

        res.json({ success: true, likes });
    } catch (err) {
        console.error('Erreur like review kholleur:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/kholleurs/reviews/:id - Delete a review
router.delete('/reviews/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        const { data: review, error: fetchErr } = await supabase
            .from('kholleur_reviews')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchErr || !review) return res.status(404).json({ error: 'Avis introuvable' });

        if (review.user_id !== userId && !isAdmin) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        const { error: delErr } = await supabase
            .from('kholleur_reviews')
            .delete()
            .eq('id', id);

        if (delErr) throw delErr;

        res.json({ success: true });
    } catch (err) {
        console.error('Erreur delete review kholleur:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/kholleurs/reviews/:id - Edit a review
router.put('/reviews/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { note, commentaire, is_anonymous } = req.body;
        const userId = req.user.id;

        if (!note || note < 1 || note > 5) {
            return res.status(400).json({ error: 'La note doit être comprise entre 1 et 5' });
        }

        const { data: review, error: fetchErr } = await supabase
            .from('kholleur_reviews')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchErr || !review) return res.status(404).json({ error: 'Avis introuvable' });

        if (review.user_id !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        const pseudo = is_anonymous ? 'Anonyme' : req.user.username;

        const { data, error: updateErr } = await supabase
            .from('kholleur_reviews')
            .update({ note, commentaire: commentaire || '', pseudo })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        res.json(data);
    } catch (err) {
        console.error('Erreur update review kholleur:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
