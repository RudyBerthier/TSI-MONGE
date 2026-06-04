const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { logActivity } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

const postStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'posts');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.user.id}-${Date.now()}${ext}`);
    }
});

const storyStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'stories');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `story-${req.user.id}-${Date.now()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Format requis : JPEG, PNG, GIF, WebP, MP4, WebM ou MOV.'));
    }
};

const postUpload = multer({ storage: postStorage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });
const storyUpload = multer({ storage: storyStorage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalide ou expiré' });
        req.user = user;
        next();
    });
};

// Helper pour traiter les mentions
const createMentionNotifications = async (content, postId, reqUserId) => {
    if (!content) return;
    const mentions = content.match(/@([A-Za-z0-9_.-]+)/g);
    if (!mentions) return;

    const usernames = [...new Set(mentions.map(m => m.slice(1)))];
    if (usernames.length === 0) return;

    try {
        const { data: mentionedUsers } = await supabase
            .from('users')
            .select('id')
            .in('username', usernames);

        if (mentionedUsers && mentionedUsers.length > 0) {
            const notifications = mentionedUsers
                .filter(u => u.id !== reqUserId)
                .map(u => ({
                    user_id: u.id,
                    from_user_id: reqUserId,
                    type: 'mention',
                    post_id: postId,
                    is_read: false
                }));

            if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications);
            }
        }
    } catch (err) {
        console.error('Erreur notifications mentions:', err);
    }
};

// --- Helper pour enrichir les posts avec les likes des amis ---
async function enrichPostsWithFriendLikes(posts, currentUserId) {
    if (!posts || posts.length === 0 || !currentUserId) return posts;

    try {
        const { data: followingList } = await supabase
            .from('user_followers')
            .select('following_id')
            .eq('follower_id', currentUserId);
        
        const followingIds = (followingList || []).map(f => f.following_id);
        if (followingIds.length === 0) return posts;

        const friendLikerIdsSet = new Set();
        posts.forEach(p => {
            let likes = p.likes;
            if (typeof likes === 'string') { try { likes = JSON.parse(likes); } catch { likes = []; } }
            if (Array.isArray(likes)) {
                likes.forEach(id => {
                    if (followingIds.includes(id)) friendLikerIdsSet.add(id);
                });
            }
        });

        const friendLikerIds = Array.from(friendLikerIdsSet);
        if (friendLikerIds.length === 0) return posts;

        const { data: likers } = await supabase
            .from('users')
            .select('id, username')
            .in('id', friendLikerIds);
        
        const likersMap = {};
        (likers || []).forEach(l => likersMap[l.id] = l.username);

        return posts.map(p => {
            let likes = p.likes;
            if (typeof likes === 'string') { try { likes = JSON.parse(likes); } catch { likes = []; } }
            if (!Array.isArray(likes)) likes = [];
            
            const friendNames = [];
            likes.forEach(id => {
                if (likersMap[id]) friendNames.push(likersMap[id]);
            });
            
            return {
                ...p,
                friend_likes_names: friendNames
            };
        });

    } catch (err) {
        console.error('Erreur enrichissement likes amis:', err);
        return posts; // Fallback
    }
}

// ==========================================
// ROUTES PUBLIQUES & FEED
// ==========================================

// In-memory cache for proxied avatars
const avatarCache = new Map();

// GET /api/users/proxy-avatar - Proxy and cache Google avatars to bypass 429
router.get('/proxy-avatar', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || !url.startsWith('https://lh3.googleusercontent.com/')) {
            return res.status(400).send('Invalid avatar URL');
        }

        // Check cache
        if (avatarCache.has(url)) {
            const { contentType, buffer, expires } = avatarCache.get(url);
            if (Date.now() < expires) {
                res.set('Content-Type', contentType);
                res.set('Cache-Control', 'public, max-age=86400');
                return res.send(buffer);
            } else {
                avatarCache.delete(url);
            }
        }

        // Fetch from Google
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).send('Error fetching avatar');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Save to cache (24 hours)
        avatarCache.set(url, { contentType, buffer, expires: Date.now() + 24 * 60 * 60 * 1000 });

        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
    } catch (err) {
        console.error('Erreur proxy avatar:', err);
        res.status(500).send('Proxy error');
    }
});

// GET /api/users/explore - Récupérer des posts contenant des médias (images/videos) ou des hashtags
router.get('/explore', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        let query = supabase
            .from('user_posts')
            .select(`
                *,
                users:user_id (username, avatar, google_avatar, is_verified)
            `);

        if (q) {
            query = query.ilike('content', `%${q}%`);
        } else {
            query = query.or('image_url.not.is.null,video_url.not.is.null');
        }

        const { data: posts, error } = await query
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) throw error;

        const formattedPosts = posts.map(post => {
            const author = post.users;
            const newPost = { ...post };
            delete newPost.users;
            return { ...newPost, author };
        });

        const enrichedPosts = await enrichPostsWithFriendLikes(formattedPosts, req.user.id);
        res.json(enrichedPosts);

    } catch (error) {
        console.error('Erreur get explore:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:identifier/highlights - Récupérer les stories "à la une" d'un utilisateur
router.get('/:identifier/highlights', async (req, res) => {
    try {
        const { identifier } = req.params;

        // 1) Trouver l'utilisateur
        const { data: targetUser, error: ue } = await supabase
            .from('users')
            .select('id, username')
            .or(`id.eq.${identifier},username.eq.${identifier}`)
            .single();

        if (ue || !targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        // 2) Récupérer ses stories où is_highlight = true
        const { data: highlights, error: he } = await supabase
            .from('user_stories')
            .select('*')
            .eq('user_id', targetUser.id)
            .eq('is_highlight', true)
            .order('created_at', { ascending: true }); // On les montre dans l'ordre de création

        if (he) throw he;

        // 3) Ajouter les infos de l'auteur (pour la consistance avec le store front-end)
        const formattedHighlights = highlights.map(h => ({
            ...h,
            author: targetUser
        }));

        res.json(formattedHighlights || []);
    } catch (error) {
        console.error('Erreur get highlights:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/stories/:id/highlight - Toggle 'is_highlight' status of a story
router.post('/stories/:id/highlight', authenticateToken, async (req, res) => {
    try {
        const storyId = req.params.id;
        const userId = req.user.id;

        const { data: story, error: fetchErr } = await supabase
            .from('user_stories')
            .select('user_id, is_highlight')
            .eq('id', storyId)
            .single();

        if (fetchErr || !story) {
            return res.status(404).json({ error: "Story introuvable" });
        }
        if (story.user_id !== userId) {
            return res.status(403).json({ error: "Non autorisé à modifier cette story" });
        }

        const newHighlightStatus = !story.is_highlight;

        const { error: updateErr } = await supabase
            .from('user_stories')
            .update({ is_highlight: newHighlightStatus })
            .eq('id', storyId);

        if (updateErr) throw updateErr;

        res.json({ success: true, is_highlight: newHighlightStatus });

    } catch (error) {
        console.error('Erreur toggle highlight story:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


// GET /api/users/feed - Récupérer le fil d'actualité global (doit être avant /:identifier)
router.get('/feed', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: posts, error } = await supabase
            .from('user_posts')
            .select(`
                *,
                users:user_id (username, avatar, google_avatar, is_verified)
            `)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const formattedPosts = posts.map(post => {
            const author = post.users;
            const newPost = { ...post };
            delete newPost.users;
            return { ...newPost, author };
        });

        const enrichedPosts = await enrichPostsWithFriendLikes(formattedPosts, req.user.id);
        res.json(enrichedPosts);

    } catch (error) {
        console.error('Erreur get feed:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/reels - Récupérer le fil d'actualité vidéo
router.get('/reels', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: posts, error } = await supabase
            .from('user_posts')
            .select(`
                *,
                users:user_id (username, avatar, google_avatar, is_verified)
            `)
            .not('video_url', 'is', null)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const formattedPosts = posts.map(post => {
            const author = post.users;
            const newPost = { ...post };
            delete newPost.users;
            return { ...newPost, author };
        });

        const enrichedPosts = await enrichPostsWithFriendLikes(formattedPosts, req.user.id);
        res.json(enrichedPosts);

    } catch (error) {
        console.error('Erreur get reels:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/stories - Récupérer les stories actives (doit être avant /:identifier)
router.get('/stories', authenticateToken, async (req, res) => {
    try {
        const { data: userViews } = await supabase
            .from('story_views')
            .select('story_id')
            .eq('user_id', req.user.id);
        const viewedStoryIds = new Set(userViews?.map(v => v.story_id) || []);

        const { data: stories, error } = await supabase
            .from('user_stories')
            .select(`
                id, user_id, media_url, media_type, poll, created_at, expires_at,
                users:user_id (username, avatar, google_avatar, is_verified)
            `)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        const groupedStories = {};
        stories.forEach(story => {
            if (!groupedStories[story.user_id]) {
                const author = story.users;
                delete story.users;
                groupedStories[story.user_id] = { author, stories: [] };
            } else {
                delete story.users;
            }
            // Indicate if the current user has viewed this specific story
            story.isViewed = viewedStoryIds.has(story.id);
            groupedStories[story.user_id].stories.push(story);
        });

        const result = Object.values(groupedStories).sort((a, b) => {
            if (a.author.username === req.user.username) return -1;
            if (b.author.username === req.user.username) return 1;
            const latestA = new Date(Math.max(...a.stories.map(s => new Date(s.created_at))));
            const latestB = new Date(Math.max(...b.stories.map(s => new Date(s.created_at))));
            return latestB - latestA;
        });

        res.json(result);
    } catch (error) {
        console.error('Erreur get stories:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/stories - Ajouter une story (doit être avant /:identifier)
router.post('/stories', authenticateToken, storyUpload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Média requis pour la story' });
        }
        const mediaUrl = `/uploads/stories/${req.file.filename}`;
        const isVideo = req.file.mimetype.startsWith('video/');

        // Parse poll if provided
        let poll = null;
        if (req.body.poll) {
            try { poll = JSON.parse(req.body.poll); } catch (e) {}
        }

        const { data, error } = await supabase
            .from('user_stories')
            .insert({
                user_id: req.user.id,
                media_url: mediaUrl,
                media_type: isVideo ? 'video' : 'image',
                ...(poll ? { poll } : {}),
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Erreur ajout story:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/stories/:storyId/view - Marquer une story comme vue
router.post('/stories/:storyId/view', authenticateToken, async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user.id;

        const { error } = await supabase
            .from('story_views')
            .upsert({ story_id: storyId, user_id: userId }, { onConflict: 'story_id,user_id' });

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur story view:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/stories/:storyId/vote - Voter dans le sondage d'une story
router.post('/stories/:storyId/vote', authenticateToken, async (req, res) => {
    try {
        const { storyId } = req.params;
        const { optionIndex } = req.body;
        const userId = req.user.id;

        if (optionIndex === undefined) return res.status(400).json({ error: 'optionIndex requis' });

        const { data: story, error: fetchErr } = await supabase
            .from('user_stories')
            .select('poll')
            .eq('id', storyId)
            .single();

        if (fetchErr || !story?.poll) return res.status(404).json({ error: 'Sondage introuvable' });

        const poll = story.poll;
        // Prevent double vote
        if (poll.user_votes?.[userId] !== undefined) {
            return res.json({ poll });
        }

        const options = poll.options.map((opt, i) => ({
            ...opt,
            votes: (opt.votes || 0) + (i === optionIndex ? 1 : 0)
        }));
        const updatedPoll = {
            ...poll,
            options,
            user_votes: { ...(poll.user_votes || {}), [userId]: optionIndex }
        };

        const { error: updateErr } = await supabase
            .from('user_stories')
            .update({ poll: updatedPoll })
            .eq('id', storyId);

        if (updateErr) throw updateErr;
        res.json({ poll: updatedPoll });
    } catch (error) {
        console.error('Erreur vote story poll:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/users/stories/:storyId - Supprimer une story
router.delete('/stories/:storyId', authenticateToken, async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user.id;

        // Récupérer la story pour vérifier son propriétaire
        const { data: story, error: fetchError } = await supabase
            .from('user_stories')
            .select('user_id, media_url')
            .eq('id', storyId)
            .single();

        if (fetchError || !story) {
            return res.status(404).json({ error: 'Story introuvable' });
        }

        if (story.user_id !== userId) {
            return res.status(403).json({ error: 'Non autorisé à supprimer cette story' });
        }

        // Supprimer le fichier associé
        if (story.media_url) {
            try {
                const fileName = path.basename(story.media_url);
                const filePath = path.join(__dirname, '..', 'uploads', 'stories', fileName);
                await fs.access(filePath);
                await fs.unlink(filePath);
            } catch (err) {
                console.error("Erreur suppression fichier story:", err);
            }
        }

        // Supprimer la story en base de données
        const { error: deleteError } = await supabase
            .from('user_stories')
            .delete()
            .eq('id', storyId);

        if (deleteError) throw deleteError;

        res.json({ success: true, message: 'Story supprimée' });

    } catch (error) {
        console.error('Erreur suppression story:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/stories/:storyId/reply - Répondre à une story (texte)
router.post('/stories/:storyId/reply', authenticateToken, async (req, res) => {
    try {
        const { storyId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content?.trim()) return res.status(400).json({ error: 'Contenu requis' });

        const { data: story, error: fetchErr } = await supabase
            .from('user_stories')
            .select('user_id')
            .eq('id', storyId)
            .single();

        if (fetchErr || !story) return res.status(404).json({ error: 'Story introuvable' });

        // Marquer la story comme vue
        await supabase
            .from('story_views')
            .upsert({ story_id: storyId, user_id: userId }, { onConflict: 'story_id,user_id' });

        // Sauvegarder la réponse
        const { data: reply, error: insertErr } = await supabase
            .from('story_replies')
            .insert({ story_id: storyId, user_id: userId, content: content.trim() })
            .select()
            .single();

        if (insertErr) throw insertErr;

        // Notifier le propriétaire (si ce n'est pas soi-même)
        if (story.user_id !== userId) {
            await supabase.from('notifications').insert({
                user_id: story.user_id,
                type: 'story_reply',
                from_user_id: userId,
                post_id: storyId,
                message: content.trim(),
            }).catch(() => {});
        }

        res.status(201).json(reply);
    } catch (error) {
        console.error('Erreur story reply:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/stories/:storyId/viewers - Viewers + réactions + réponses (owner only)
router.get('/stories/:storyId/viewers', authenticateToken, async (req, res) => {
    try {
        const { storyId } = req.params;

        // Vérifier que c'est le propriétaire
        const { data: story, error: fetchErr } = await supabase
            .from('user_stories')
            .select('user_id')
            .eq('id', storyId)
            .single();

        if (fetchErr || !story) return res.status(404).json({ error: 'Story introuvable' });
        if (story.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        // Récupérer les vues (avec réactions)
        const { data: views } = await supabase
            .from('story_views')
            .select('user_id, reaction, viewed_at, users:user_id(id, username, avatar, google_avatar, is_verified)')
            .eq('story_id', storyId)
            .order('viewed_at', { ascending: false });

        // Récupérer les réponses texte
        const { data: replies } = await supabase
            .from('story_replies')
            .select('id, content, created_at, users:user_id(id, username, avatar, google_avatar, is_verified)')
            .eq('story_id', storyId)
            .order('created_at', { ascending: false });

        // Fusionner : pour chaque viewer, ajouter ses réponses
        const viewerMap = {};
        (views || []).forEach(v => {
            const u = v.users;
            if (!u) return;
            viewerMap[u.id] = { user: u, reaction: v.reaction, viewed_at: v.viewed_at, replies: [] };
        });
        (replies || []).forEach(r => {
            const u = r.users;
            if (!u) return;
            if (!viewerMap[u.id]) {
                viewerMap[u.id] = { user: u, reaction: null, viewed_at: r.created_at, replies: [] };
            }
            viewerMap[u.id].replies.push({ id: r.id, content: r.content, created_at: r.created_at });
        });

        const viewers = Object.values(viewerMap).sort((a, b) =>
            new Date(b.viewed_at) - new Date(a.viewed_at)
        );

        res.json({ viewers, total_views: (views || []).length, total_replies: (replies || []).length });
    } catch (error) {
        console.error('Erreur viewers story:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/stories/:storyId/react - Réagir à une story avec un emoji
router.post('/stories/:storyId/react', authenticateToken, async (req, res) => {
    try {
        const { storyId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        if (!emoji) return res.status(400).json({ error: 'emoji requis' });

        // Récupérer la story pour avoir le owner
        const { data: story, error: fetchErr } = await supabase
            .from('user_stories')
            .select('user_id')
            .eq('id', storyId)
            .single();

        if (fetchErr || !story) return res.status(404).json({ error: 'Story introuvable' });

        // Ne pas se notifier soi-même
        if (story.user_id === userId) return res.json({ success: true });

        // Upsert la réaction dans story_views (marquer vue + réaction)
        await supabase
            .from('story_views')
            .upsert({ story_id: storyId, user_id: userId, reaction: emoji }, { onConflict: 'story_id,user_id' });

        // Créer une notification pour le propriétaire
        await supabase.from('notifications').insert({
            user_id: story.user_id,
            type: 'story_reaction',
            from_user_id: userId,
            post_id: storyId,   // stocker l'id de la story pour référence
            message: emoji,
        }).catch(() => {});

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur story react:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/notifications - Récupérer les notifications (paginées)
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;

        const { data: notifs, error } = await supabase
            .from('notifications')
            .select(`
                *,
                from_user:from_user_id (username, avatar, google_avatar, is_verified)
            `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        res.json(notifs || []);
    } catch (error) {
        console.error('Erreur get notifications:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/users/notifications/read-all - Marquer toutes les notifications comme lues
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', req.user.id)
            .eq('is_read', false);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur mark all read:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/users/notifications/:id/read - Marquer une notification comme lue
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur mark read:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/friends - Récupérer les amis mutuels (abonnement réciproque)
router.get('/friends', authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Get users I follow
        const { data: iFollow, error: e1 } = await supabase
            .from('user_followers')
            .select('following_id')
            .eq('follower_id', currentUserId);

        if (e1) throw e1;

        // Get users who follow me
        const { data: followMe, error: e2 } = await supabase
            .from('user_followers')
            .select('follower_id')
            .eq('following_id', currentUserId);

        if (e2) throw e2;

        const iFollowIds = new Set((iFollow || []).map(r => r.following_id));
        const followMeIds = new Set((followMe || []).map(r => r.follower_id));

        // Mutual = intersection
        const mutualIds = [...iFollowIds].filter(id => followMeIds.has(id));

        if (mutualIds.length === 0) {
            return res.json([]);
        }

        const { data: friends, error: e3 } = await supabase
            .from('users')
            .select('id, username, avatar, google_avatar')
            .in('id', mutualIds);

        if (e3) throw e3;
        res.json(friends || []);
    } catch (error) {
        console.error('Erreur get friends:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/close-friends - Récupérer la liste des amis proches
router.get('/close-friends', authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        const { data: closeFriendsData, error: cfError } = await supabase
            .from('user_close_friends')
            .select('friend_id')
            .eq('user_id', currentUserId);

        if (cfError) throw cfError;

        const friendIds = (closeFriendsData || []).map(r => r.friend_id);

        if (friendIds.length === 0) {
            return res.json([]);
        }

        const { data: friends, error: usersError } = await supabase
            .from('users')
            .select('id, username, avatar, google_avatar')
            .in('id', friendIds);

        if (usersError) throw usersError;
        res.json(friends || []);
    } catch (error) {
        console.error('Erreur get close friends:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/close-friends/:friendId - Ajouter un ami proche
router.post('/close-friends/:friendId', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.params;
        const currentUserId = req.user.id;

        if (friendId === currentUserId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même' });
        }

        const { error } = await supabase
            .from('user_close_friends')
            .insert({ user_id: currentUserId, friend_id: friendId });

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.json({ success: true, message: 'Déjà ami proche' });
            }
            throw error;
        }

        res.json({ success: true, message: 'Ajouté aux amis proches' });
    } catch (error) {
        console.error('Erreur add close friend:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/users/close-friends/:friendId - Retirer un ami proche
router.delete('/close-friends/:friendId', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.params;
        const currentUserId = req.user.id;

        const { error } = await supabase
            .from('user_close_friends')
            .delete()
            .eq('user_id', currentUserId)
            .eq('friend_id', friendId);

        if (error) throw error;

        res.json({ success: true, message: 'Retiré des amis proches' });
    } catch (error) {
        console.error('Erreur remove close friend:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim() === '') {
            return res.json([]);
        }

        const searchTerm = q.trim();

        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, avatar, google_avatar')
            .ilike('username', `%${searchTerm}%`)
            .limit(20);

        if (error) throw error;
        res.json(users || []);
    } catch (error) {
        console.error('Erreur search users:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/saved-posts - Récupérer les posts sauvegardés (doit être avant /:identifier)
router.get('/saved-posts', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('saved_posts')
            .select(`
                post_id,
                created_at,
                user_posts (
                    *,
                    users:user_id (username, avatar, google_avatar, is_verified)
                )
            `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // format
        const formatted = data.map(item => {
            const post = { ...item.user_posts };
            const author = post.users;
            delete post.users;
            return { ...post, author };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Erreur get saved posts:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTES LECTEUR MUSICAL (STATE) — doit être avant /:identifier
// ==========================================

// GET /api/users/music-state - Récupérer l'état du lecteur privé
router.get('/music-state', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('private_queue, private_current_track')
            .eq('id', req.user.id)
            .single();

        if (error) {
            if (error.code === '42703') return res.json({ queue: [], currentTrack: null });
            throw error;
        }

        res.json({
            queue: data?.private_queue || [],
            currentTrack: data?.private_current_track || null
        });
    } catch (error) {
        console.error('Erreur get music state:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/music-state - Sauvegarder l'état du lecteur privé
router.post('/music-state', authenticateToken, async (req, res) => {
    try {
        const { queue, currentTrack } = req.body;

        const { error } = await supabase
            .from('users')
            .update({
                private_queue: queue || [],
                private_current_track: currentTrack || null
            })
            .eq('id', req.user.id);

        if (error) {
            if (error.code === '42703') return res.json({ success: true, warning: 'Migrations manquantes' });
            throw error;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur save music state:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:identifier - Récupérer un profil par ID ou username
router.get('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;

        // Identifier peut être un ID ou un pseudo
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username, avatar, google_avatar, role, is_verified, created_at, bio, links')
            .or(`id.eq.${identifier},username.eq.${identifier}`)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Récupérer le nombre de followers
        const { count: followersCount } = await supabase
            .from('user_followers')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', user.id);

        // Récupérer le nombre d'abonnements (following)
        const { count: followingCount } = await supabase
            .from('user_followers')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id);

        res.json({
            ...user,
            followers_count: followersCount || 0,
            following_count: followingCount || 0
        });

    } catch (error) {
        console.error('Erreur get profile:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:identifier/followers - Liste des abonnés d'un utilisateur
router.get('/:identifier/followers', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { data: targetUser, error: ue } = await supabase
            .from('users').select('id').or(`id.eq.${identifier},username.eq.${identifier}`).single();
        if (ue || !targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const { data: rows, error: fe } = await supabase
            .from('user_followers').select('follower_id').eq('following_id', targetUser.id);
        if (fe) throw fe;

        const followerIds = (rows || []).map(r => r.follower_id);
        if (followerIds.length === 0) return res.json([]);

        const { data: users, error: ue2 } = await supabase
            .from('users').select('id, username, avatar, google_avatar').in('id', followerIds);
        if (ue2) throw ue2;
        res.json(users || []);
    } catch (error) {
        console.error('Erreur get followers:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:identifier/following - Liste des abonnements d'un utilisateur
router.get('/:identifier/following', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { data: targetUser, error: ue } = await supabase
            .from('users').select('id').or(`id.eq.${identifier},username.eq.${identifier}`).single();
        if (ue || !targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const { data: rows, error: fe } = await supabase
            .from('user_followers').select('following_id').eq('follower_id', targetUser.id);
        if (fe) throw fe;

        const followingIds = (rows || []).map(r => r.following_id);
        if (followingIds.length === 0) return res.json([]);

        const { data: users, error: ue2 } = await supabase
            .from('users').select('id, username, avatar, google_avatar').in('id', followingIds);
        if (ue2) throw ue2;
        res.json(users || []);
    } catch (error) {
        console.error('Erreur get following:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:identifier/posts - Récupérer les publications d'un utilisateur
router.get('/:identifier/posts', async (req, res) => {
    try {
        const { identifier } = req.params;

        // Récupérer d'abord l'ID de l'utilisateur
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .or(`id.eq.${identifier},username.eq.${identifier}`)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Récupérer les posts (exclure archivés sauf pour le propriétaire)
        let postsQuery = supabase
            .from('user_posts')
            .select(`*, users:user_id (id, username, avatar, google_avatar)`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        // Vérifier si c'est le propriétaire qui consulte
        let viewerIsOwner = false;
        const authHeaderPosts = req.headers['authorization'];
        if (authHeaderPosts) {
            try {
                const jwt = require('jsonwebtoken');
                const tok = authHeaderPosts.split(' ')[1];
                const decoded = jwt.verify(tok, process.env.JWT_SECRET || 'tsi1-secret-key-2025');
                viewerIsOwner = decoded.id === user.id;
            } catch (e) {}
        }
        if (!viewerIsOwner) postsQuery = postsQuery.eq('is_archived', false);

        const { data: posts, error: postsError } = await postsQuery;

        if (postsError) throw postsError;

        let currentUserId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const jwt = require('jsonwebtoken');
            const token = authHeader.split(' ')[1];
            try {
                const userToken = jwt.verify(token, process.env.JWT_SECRET || 'tsi1-secret-key-2025');
                currentUserId = userToken.id;
            } catch (e) {}
        }
        
        let enrichedPosts = posts || [];
        if (currentUserId) {
            enrichedPosts = await enrichPostsWithFriendLikes(enrichedPosts, currentUserId);
        }

        // Filter out close-friend-only posts if the viewing user is not a close friend
        if (!viewerIsOwner && currentUserId) {
            const { data: friendsData } = await supabase
                .from('user_close_friends')
                .select('user_id')
                .eq('friend_id', currentUserId)
                .eq('user_id', user.id);
            const isCloseFriend = friendsData && friendsData.length > 0;

            enrichedPosts = enrichedPosts.filter(post => {
                if (!post.is_close_friends_only) return true;
                return isCloseFriend;
            });
        } else if (!viewerIsOwner && !currentUserId) {
            // Unauthenticated users can never see close-friends-only posts
            enrichedPosts = enrichedPosts.filter(post => !post.is_close_friends_only);
        }
        
        res.json(enrichedPosts);

    } catch (error) {
        console.error('Erreur get posts:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:id/is-following/:targetId - Vérifier si un user suit un autre user
router.get('/:followerId/is-following/:followingId', async (req, res) => {
    try {
        const { followerId, followingId } = req.params;

        const { data, error } = await supabase
            .from('user_followers')
            .select('follower_id')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .single();

        res.json({ isFollowing: !!data });
    } catch (error) {
        // Si single() ne trouve rien, il jette une erreur "Row not found"
        res.json({ isFollowing: false });
    }
});

// ==========================================
// ROUTES PROTÉGÉES (Nécessite authentification)
// ==========================================

// PUT /api/users/profile - Mettre à jour bio et links de l'utilisateur connecté
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { bio, links } = req.body;

        const updateData = {};
        if (bio !== undefined) updateData.bio = bio;

        if (links !== undefined) {
            // S'assurer que les liens sont bien formés
            try {
                const parsedLinks = typeof links === 'string' ? JSON.parse(links) : links;
                updateData.links = parsedLinks;
            } catch (e) {
                return res.status(400).json({ error: 'Format des liens invalide' });
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Rien à mettre à jour' });
        }

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', req.user.id);

        if (error) throw error;

        logActivity({
            actorId: req.user.id,
            actorUsername: req.user.username,
            action: 'users.profile.update',
            details: updateData,
            req
        });

        res.json({ success: true, message: 'Profil mis à jour' });

    } catch (error) {
        console.error('Erreur update profile:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/:targetId/follow - S'abonner / Se désabonner
router.post('/:targetId/follow', authenticateToken, async (req, res) => {
    try {
        const { targetId } = req.params;
        const currentUserId = req.user.id;

        if (targetId === currentUserId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas vous suivre vous-même' });
        }

        // Vérifier si la relation existe déjà
        const { data: existingFollow, error: searchError } = await supabase
            .from('user_followers')
            .select('follower_id')
            .eq('follower_id', currentUserId)
            .eq('following_id', targetId)
            .maybeSingle();

        if (searchError) {
            console.error('Erreur recherche abonnement:', searchError);
            return res.status(500).json({ error: 'Erreur lors de la vérification de l\'abonnement' });
        }

        if (existingFollow) {
            // Se désabonner
            await supabase
                .from('user_followers')
                .delete()
                .eq('follower_id', currentUserId)
                .eq('following_id', targetId);

            logActivity({
                actorId: req.user.id,
                actorUsername: req.user.username,
                action: 'users.unfollow',
                targetType: 'user',
                targetId: targetId,
                req
            });

            return res.json({ success: true, action: 'unfollowed' });
        } else {
            // S'abonner
            const { error: insertError } = await supabase
                .from('user_followers')
                .insert({
                    follower_id: currentUserId,
                    following_id: targetId
                });

            if (insertError) {
                console.error('Erreur insertion abonnement:', insertError);
                return res.status(500).json({ error: 'Impossible de s\'abonner.' });
            }

            // Créer une notification pour la personne suivie (ignorer l'erreur si la table n'existe pas)
            try {
                await supabase.from('notifications').insert({
                    user_id: targetId,
                    type: 'follow',
                    from_user_id: currentUserId,
                    message: `${req.user.username} s'est abonné(é) à votre profil`
                });
            } catch (notifyErr) {
                console.error("Impossible de créer la notification", notifyErr);
            }

            logActivity({
                actorId: req.user.id,
                actorUsername: req.user.username,
                action: 'users.follow',
                targetType: 'user',
                targetId: targetId,
                req
            });

            return res.json({ action: 'followed', following: true });
        }

    } catch (error) {
        console.error('Erreur follow/unfollow:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/posts - Créer une nouvelle publication
router.post('/posts', authenticateToken, postUpload.array('media', 10), async (req, res) => {
    try {
        const { content, is_close_friends_only } = req.body;
        let imageUrls = [];
        let videoUrl = null;

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const isVideo = file.mimetype.startsWith('video/');
                if (isVideo) {
                    // For simplicity, we assume only one video per post
                    videoUrl = `/uploads/posts/${file.filename}`;
                } else {
                    imageUrls.push(`/uploads/posts/${file.filename}`);
                }
            });
        }

        if (!content && imageUrls.length === 0 && !videoUrl) {
            return res.status(400).json({ error: 'La publication ne peut pas être vide' });
        }

        // We stringify the array of image URLs to store in the existing text column, 
        // or just store the first one if we can't change the column type yet.
        // Assuming we can store JSON string in text column since Postgres supports it loosely, 
        // or just comma-separated URLs. Let's use comma-separated for simple backwards compatibility.
        const imageUrlStr = imageUrls.length > 0 ? imageUrls.join(',') : null;

        const { data, error } = await supabase
            .from('user_posts')
            .insert({
                user_id: req.user.id,
                content: content || '',
                image_url: imageUrlStr,
                video_url: videoUrl,
                likes: [],
                is_close_friends_only: is_close_friends_only || false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        logActivity({
            actorId: req.user.id,
            actorUsername: req.user.username,
            action: 'users.post.create',
            targetType: 'post',
            targetId: data?.id,
            details: { content: content, hasImage: imageUrls.length > 0, hasVideo: !!videoUrl },
            req
        });

        // Créer les notifications pour les mentions
        await createMentionNotifications(content, data.id, req.user.id);

        res.json({ success: true, post: data });

    } catch (error) {
        console.error('Erreur creation post:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/posts/:postId/like - Liker/Unliker une publication
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        // Récupérer le post actuel
        const { data: post, error: fetchError } = await supabase
            .from('user_posts')
            .select('likes, user_id')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: 'Publication introuvable' });
        }

        let likes = post.likes;
        if (typeof likes === 'string') {
            try { likes = JSON.parse(likes); } catch { likes = []; }
        }
        if (!Array.isArray(likes)) likes = [];
        
        let isLiked = false;

        if (likes.includes(userId)) {
            // Unlike
            likes = likes.filter(id => id !== userId);
        } else {
            // Like
            likes.push(userId);
            isLiked = true;

            // Créer une notification pour le propriétaire du post (si ce n'est pas nous)
            if (post.user_id !== userId) {
                const username = req.user.username || "Quelqu'un";
                const { error: notifError } = await supabase.from('notifications').insert({
                    user_id: post.user_id,
                    type: 'like',
                    from_user_id: userId,
                    post_id: postId,
                    message: `${username} a aimé votre publication`
                });
                if (notifError) console.error('Notification like en erreur:', notifError.message);
            }
        }

        const { error: updateError } = await supabase
            .from('user_posts')
            .update({ likes })
            .eq('id', postId);

        if (updateError) throw updateError;

        res.json({ success: true, liked: isLiked, likesCount: likes.length });

    } catch (error) {
        console.error('Erreur like post:', error.message, error.stack);
        res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
});

// POST /api/users/posts/:postId/save - Sauvegarder/Retirer une publication
router.post('/posts/:postId/save', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        const { data: existing } = await supabase
            .from('saved_posts')
            .select('*')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        let isSaved = false;

        if (existing) {
            await supabase
                .from('saved_posts')
                .delete()
                .eq('user_id', userId)
                .eq('post_id', postId);
        } else {
            await supabase
                .from('saved_posts')
                .insert({ user_id: userId, post_id: postId });
            isSaved = true;
        }

        res.json({ success: true, saved: isSaved });

    } catch (error) {
        console.error('Erreur save post:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/users/posts/:postId/archive - Archiver/Désarchiver une publication
router.put('/posts/:postId/archive', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const { data: post, error: fetchErr } = await supabase
            .from('user_posts')
            .select('user_id, is_archived')
            .eq('id', postId)
            .single();

        if (fetchErr || !post) return res.status(404).json({ error: 'Post introuvable' });
        if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

        const { error } = await supabase
            .from('user_posts')
            .update({ is_archived: !post.is_archived })
            .eq('id', postId);

        if (error) throw error;
        res.json({ is_archived: !post.is_archived });
    } catch (error) {
        console.error('Erreur archive post:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/posts/archived - Récupérer ses publications archivées
router.get('/posts/archived', authenticateToken, async (req, res) => {
    try {
        const { data: posts, error } = await supabase
            .from('user_posts')
            .select(`*, users:user_id (id, username, avatar, google_avatar)`)
            .eq('user_id', req.user.id)
            .eq('is_archived', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(posts || []);
    } catch (error) {
        console.error('Erreur get archived posts:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/users/posts/:postId - Supprimer une publication
router.delete('/posts/:postId', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        // Récupérer la publication pour vérifier son propriétaire
        const { data: post, error: fetchError } = await supabase
            .from('user_posts')
            .select('user_id, image_url, video_url')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: 'Publication introuvable' });
        }

        if (post.user_id !== userId) {
            return res.status(403).json({ error: 'Non autorisé à supprimer cette publication' });
        }

        // Supprimer le fichier associé s'il y en a un
        const mediaUrl = post.image_url || post.video_url;
        if (mediaUrl) {
            try {
                // mediaUrl ressemble à "/uploads/posts/fichier.ext"
                // On extrait juste le nom de fichier pour le combiner avec "__dirname/../uploads/posts"
                const fileName = path.basename(mediaUrl);
                const filePath = path.join(__dirname, '..', 'uploads', 'posts', fileName);

                // Vérifier si le fichier existe avant de le supprimer
                await fs.access(filePath);
                await fs.unlink(filePath);
            } catch (err) {
                console.error("Erreur lors de la suppression du fichier média lié au post :", err);
                // On continue même si la suppression du fichier a échouée pour supprimer le post en db
            }
        }

        // Supprimer la publication de la base de données
        const { error: deleteError } = await supabase
            .from('user_posts')
            .delete()
            .eq('id', postId);

        if (deleteError) throw deleteError;

        logActivity({
            actorId: req.user.id,
            actorUsername: req.user.username,
            action: 'users.post.delete',
            targetType: 'post',
            targetId: postId,
            details: { mediaUrl: post.image_url || post.video_url },
            req
        });

        res.json({ success: true, message: 'Publication supprimée' });

    } catch (error) {
        console.error('Erreur suppression post:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTES COMMENTAIRES (POSTS)
// ==========================================

// GET /api/users/posts/:postId/comments - Récupérer les commentaires d'une publication
router.get('/posts/:postId/comments', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;

        const { data: comments, error } = await supabase
            .from('post_comments')
            .select(`
                id,
                content,
                created_at,
                user_id,
                users:user_id (username, avatar, google_avatar, is_verified)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json(comments || []);
    } catch (error) {
        console.error('Erreur get comments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/posts/:postId/comments - Ajouter un commentaire
router.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
        }

        const { data, error } = await supabase
            .from('post_comments')
            .insert({
                post_id: postId,
                user_id: userId,
                content: content.trim()
            })
            .select(`
                id,
                content,
                created_at,
                user_id,
                users:user_id (username, avatar, google_avatar, is_verified)
            `)
            .single();

        if (error) throw error;

        // Créer les notifications pour les mentions
        await createMentionNotifications(content, postId, userId);

        logActivity({
            actorId: req.user.id,
            actorUsername: req.user.username,
            action: 'users.post.comment',
            targetType: 'post_comment',
            targetId: data?.id,
            details: { postId, content },
            req
        });

        res.json({ success: true, comment: data });
    } catch (error) {
        console.error('Erreur add comment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/users/posts/:postId/comments/:commentId - Supprimer un commentaire
router.delete('/posts/:postId/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user.id;

        // Vérifier qui est l'auteur du commentaire et qui est l'auteur du post
        const [commentRes, postRes] = await Promise.all([
            supabase.from('post_comments').select('user_id').eq('id', commentId).single(),
            supabase.from('user_posts').select('user_id').eq('id', postId).single()
        ]);

        const comment = commentRes.data;
        const post = postRes.data;

        if (!comment) {
            return res.status(404).json({ error: 'Commentaire introuvable' });
        }

        // L'utilisateur peut supprimer s'il est l'auteur du commentaire OU l'auteur du post
        const canDelete = (comment.user_id === userId) || (post && post.user_id === userId);

        if (!canDelete) {
            return res.status(403).json({ error: 'Non autorisé à supprimer ce commentaire' });
        }

        const { error: deleteError } = await supabase
            .from('post_comments')
            .delete()
            .eq('id', commentId);

        if (deleteError) throw deleteError;

        logActivity({
            actorId: req.user.id,
            actorUsername: req.user.username,
            action: 'users.post.comment.delete',
            targetType: 'post_comment',
            targetId: commentId,
            details: { postId, content: comment.content },
            req
        });

        res.json({ success: true, message: 'Commentaire supprimé' });
    } catch (error) {
        console.error('Erreur delete comment:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTES SIGNALEMENTS (REPORTS)
// ==========================================

// POST /api/users/reports - Signaler un contenu inapproprié
router.post('/reports', authenticateToken, async (req, res) => {
    try {
        const { targetType, targetId, reason } = req.body;
        const reporterId = req.user.id; // comes from authenticateToken -> Clerk/Google text id

        if (!targetType || !targetId || !reason) {
            return res.status(400).json({ error: 'Données de signalement incomplètes' });
        }

        const validTypes = ['post', 'comment', 'story', 'user'];
        if (!validTypes.includes(targetType)) {
            return res.status(400).json({ error: 'Type de signalement invalide' });
        }

        const { error } = await supabase
            .from('reports')
            .insert({
                reporter_id: reporterId,
                target_type: targetType,
                target_id: targetId,
                reason: reason,
                status: 'pending'
            });

        if (error) {
            console.error('Erreur Supabase lors du signalement:', error);
            return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du signalement' });
        }

        // Optionnel : Notifier les admins de l'arrivée d'un nouveau signalement
        // logActivity({
        //     actorId: reporterId,
        //     action: 'users.report.create',
        //     targetType: targetType,
        //     targetId: targetId,
        //     details: { reason },
        //     req
        // });

        res.json({ success: true, message: 'Signalement envoyé avec succès. Merci !' });

    } catch (error) {
        console.error('Erreur add report:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// ==========================================
// ROUTES LECTEUR MUSICAL (STATE)
// ==========================================

// GET /api/users/music-state - Récupérer l'état du lecteur privé
router.get('/music-state', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('private_queue, private_current_track')
            .eq('id', req.user.id)
            .single();

        if (error) {
            // Si la colonne n'existe pas encore (migration non faite), on ignore silencieusement
            if (error.code === '42703') return res.json({ queue: [], currentTrack: null });
            throw error;
        }

        res.json({
            queue: data?.private_queue || [],
            currentTrack: data?.private_current_track || null
        });
    } catch (error) {
        console.error('Erreur get music state:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/music-state - Sauvegarder l'état du lecteur privé
router.post('/music-state', authenticateToken, async (req, res) => {
    try {
        const { queue, currentTrack } = req.body;
        
        const { error } = await supabase
            .from('users')
            .update({
                private_queue: queue || [],
                private_current_track: currentTrack || null
            })
            .eq('id', req.user.id);

        if (error) {
            if (error.code === '42703') return res.json({ success: true, warning: 'Migrations manquantes' });
            throw error;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur save music state:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
