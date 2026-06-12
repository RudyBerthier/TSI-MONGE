const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

// Helper pour formatter les résultats TMDB
const formatTmdbResults = (results) => results.map(item => ({
  tmdb_id: item.id.toString(),
  type: item.media_type || (item.name ? 'tv' : 'movie'),
  title: item.title || item.name,
  release_date: item.release_date || item.first_air_date,
  poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
  backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
  overview: item.overview,
  vote_average: item.vote_average
}));

// ----------------------------------------------------------------------
// GET /api/media/search - Rechercher un film/série sur TMDB
// ----------------------------------------------------------------------
router.get('/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Recherche vide' });

  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return res.status(400).json({ error: 'Clé API TMDB manquante. Administrateur, veuillez configurer TMDB_API_KEY dans le .env' });

  try {
    const response = await axios.get(`https://api.themoviedb.org/3/search/multi`, {
      params: { api_key: tmdbKey, language: 'fr-FR', query: q, page: 1, include_adult: false }
    });
    const results = response.data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
    res.json(formatTmdbResults(results));
  } catch (error) {
    console.error('Erreur recherche TMDB:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur TMDB' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/trending - Tendances du jour
// ----------------------------------------------------------------------
router.get('/trending', authenticateToken, async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return res.status(400).json({ error: 'Clé API TMDB manquante' });

  try {
    const response = await axios.get(`https://api.themoviedb.org/3/trending/all/day`, {
      params: { api_key: tmdbKey, language: 'fr-FR' }
    });
    res.json(formatTmdbResults(response.data.results));
  } catch (error) {
    console.error('Erreur trending TMDB:', error.message);
    res.status(500).json({ error: 'Erreur TMDB' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/popular/:type - Films ou séries populaires
// ----------------------------------------------------------------------
router.get('/popular/:type', authenticateToken, async (req, res) => {
  const { type } = req.params; // 'movie' ou 'tv'
  if (type !== 'movie' && type !== 'tv') return res.status(400).json({ error: 'Type invalide' });

  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return res.status(400).json({ error: 'Clé API TMDB manquante' });

  try {
    const [page1, page2] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/${type}/popular`, {
        params: { api_key: tmdbKey, language: 'fr-FR', page: 1 }
      }),
      axios.get(`https://api.themoviedb.org/3/${type}/popular`, {
        params: { api_key: tmdbKey, language: 'fr-FR', page: 2 }
      })
    ]);
    const results = [...page1.data.results, ...page2.data.results].map(item => ({ ...item, media_type: type }));
    res.json(formatTmdbResults(results));
  } catch (error) {
    console.error('Erreur popular TMDB:', error.message);
    res.status(500).json({ error: 'Erreur TMDB' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/discover - Films ou séries par genre
// ----------------------------------------------------------------------
router.get('/discover', authenticateToken, async (req, res) => {
  const { type = 'movie', genre } = req.query;
  if (!genre) return res.status(400).json({ error: 'Genre requis' });

  try {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey) return res.status(400).json({ error: 'Clé API manquante' });

    const [page1, page2] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/discover/${type}`, {
        params: { api_key: tmdbKey, with_genres: genre, language: 'fr-FR', page: 1 }
      }),
      axios.get(`https://api.themoviedb.org/3/discover/${type}`, {
        params: { api_key: tmdbKey, with_genres: genre, language: 'fr-FR', page: 2 }
      })
    ]);
    const results = [...page1.data.results, ...page2.data.results].map(item => ({ ...item, media_type: type }));
    res.json(formatTmdbResults(results));
  } catch (error) {
    console.error('Erreur discover TMDB:', error.message);
    res.status(500).json({ error: 'Erreur TMDB' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/random - Un film ou série au hasard
// ----------------------------------------------------------------------
router.get('/random', async (req, res) => {
  try {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey) return res.status(400).json({ error: 'Clé API manquante' });
    
    // On prend une page au hasard entre 1 et 50 des films les mieux notés
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const response = await axios.get(`https://api.themoviedb.org/3/movie/top_rated`, {
      params: { api_key: tmdbKey, language: 'fr-FR', page: randomPage }
    });
    
    const results = response.data.results;
    if (!results || results.length === 0) return res.status(404).json({ error: 'Aucun film trouvé' });
    
    const randomItem = results[Math.floor(Math.random() * results.length)];
    res.json({
      tmdb_id: randomItem.id.toString(),
      type: 'movie', // On simplifie à film pour l'instant
      title: randomItem.title || randomItem.name,
      release_date: randomItem.release_date || randomItem.first_air_date,
      poster_url: randomItem.poster_path ? `https://image.tmdb.org/t/p/w500${randomItem.poster_path}` : null,
      vote_average: randomItem.vote_average
    });
  } catch (error) {
    console.error('Erreur random TMDB:', error.message);
    res.status(500).json({ error: 'Erreur TMDB' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/details/:type/:id - Détails complets d'un média
// ----------------------------------------------------------------------
router.get('/details/:type/:id', authenticateToken, async (req, res) => {
  const { type, id } = req.params;
  try {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey) return res.status(400).json({ error: 'Clé API manquante' });

    const response = await axios.get(`https://api.themoviedb.org/3/${type}/${id}`, {
      params: { api_key: tmdbKey, language: 'fr-FR', append_to_response: 'watch/providers' }
    });
    const item = response.data;
    res.json({
      tmdb_id: item.id.toString(),
      type: type,
      title: item.title || item.name,
      release_date: item.release_date || item.first_air_date,
      poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
      overview: item.overview || "Aucune description disponible.",
      vote_average: item.vote_average,
      watch_providers: item['watch/providers']?.results?.FR || null
    });
  } catch (error) {
    console.error('Erreur details TMDB:', error.message);
    res.status(500).json({ error: 'Erreur TMDB' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/feed - Récupérer les dernières critiques (le mur)
// ----------------------------------------------------------------------
router.get('/feed', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('media_reviews')
      .select(`
        id,
        rating,
        review_text,
        season_number,
        episode_number,
        created_at,
        user_id,
        user:users!user_id ( username, avatar, google_avatar ),
        media:media_items!media_id ( tmdb_id, title, type, poster_url, release_year ),
        reactions:media_review_reactions ( user_id, reaction_type )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === '42P01') return res.json([]); // Table doesn't exist yet
      throw error;
    }

    res.json(reviews || []);
  } catch (error) {
    console.error('Erreur media feed:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des critiques' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/my-reviews - Mes critiques
// ----------------------------------------------------------------------
router.get('/my-reviews', authenticateToken, async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('media_reviews')
      .select(`
        id,
        rating,
        review_text,
        season_number,
        episode_number,
        created_at,
        user_id,
        user:users!user_id ( username, avatar, google_avatar ),
        media:media_items!media_id ( tmdb_id, title, type, poster_url, release_year ),
        reactions:media_review_reactions ( user_id, reaction_type )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return res.json([]);
      throw error;
    }

    res.json(reviews || []);
  } catch (error) {
    console.error('Erreur my-reviews:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de vos critiques' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/reviews/:tmdb_id - Critiques pour un média précis
// ----------------------------------------------------------------------
router.get('/reviews/:tmdb_id', async (req, res) => {
  try {
    const { data: media } = await supabase
      .from('media_items')
      .select('id')
      .eq('tmdb_id', req.params.tmdb_id)
      .maybeSingle();

    if (!media) return res.json([]); // Aucun avis pour ce média

    const { data: reviews, error } = await supabase
      .from('media_reviews')
      .select(`
        id,
        rating,
        review_text,
        season_number,
        episode_number,
        created_at,
        user_id,
        user:users!user_id ( username, avatar, google_avatar ),
        reactions:media_review_reactions ( user_id, reaction_type )
      `)
      .eq('media_id', media.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(reviews || []);
  } catch (error) {
    console.error('Erreur reviews par tmdb_id:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des critiques' });
  }
});

// ----------------------------------------------------------------------
// POST /api/media/review - Ajouter ou mettre à jour une critique
// ----------------------------------------------------------------------
router.post('/review', authenticateToken, async (req, res) => {
  try {
    const { tmdb_id, type, title, poster_url, release_year, rating, review_text, season_number, episode_number } = req.body;
    
    if (!tmdb_id || !rating) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    // 1. S'assurer que le media existe dans media_items, sinon on le crée
    const { data: existingMedia } = await supabase
      .from('media_items')
      .select('id')
      .eq('tmdb_id', tmdb_id)
      .maybeSingle();

    let mediaId;

    if (existingMedia) {
      mediaId = existingMedia.id;
    } else {
      const { data: newMedia, error: mediaError } = await supabase
        .from('media_items')
        .insert({
          tmdb_id,
          type: type || 'movie',
          title,
          poster_url,
          release_year
        })
        .select('id')
        .single();
      
      if (mediaError) throw mediaError;
      mediaId = newMedia.id;
    }

    // 2. Chercher si la critique existe déjà pour cet utilisateur, média, et saison/épisode (s'ils sont spécifiés)
    let query = supabase.from('media_reviews').select('id').eq('user_id', req.user.id).eq('media_id', mediaId);
    if (season_number) query = query.eq('season_number', season_number);
    else query = query.is('season_number', null);
    if (episode_number) query = query.eq('episode_number', episode_number);
    else query = query.is('episode_number', null);

    const { data: existingReview } = await query.maybeSingle();

    let review;
    if (existingReview) {
      // Update
      const { data, error: updateError } = await supabase
        .from('media_reviews')
        .update({
          rating: parseInt(rating),
          review_text: review_text || null,
          created_at: new Date().toISOString()
        })
        .eq('id', existingReview.id)
        .select()
        .single();
      if (updateError) throw updateError;
      review = data;
    } else {
      // Insert
      const { data, error: insertError } = await supabase
        .from('media_reviews')
        .insert({
          user_id: req.user.id,
          media_id: mediaId,
          rating: parseInt(rating),
          review_text: review_text || null,
          season_number: season_number || null,
          episode_number: episode_number || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (insertError) throw insertError;
      review = data;
    }

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Erreur ajout review:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la critique' });
  }
});

// ----------------------------------------------------------------------
// DELETE /api/media/review/:id - Supprimer une critique
// ----------------------------------------------------------------------
router.delete('/review/:id', authenticateToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin ou si c'est sa propre critique
    const { data: review } = await supabase.from('media_reviews').select('user_id').eq('id', req.params.id).single();
    if (!review) return res.status(404).json({ error: 'Critique introuvable' });
    
    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { error } = await supabase.from('media_reviews').delete().eq('id', req.params.id);
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression critique:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ----------------------------------------------------------------------
// POST /api/media/review/:id/react - Ajouter/Modifier une réaction
// ----------------------------------------------------------------------
router.post('/review/:id/react', authenticateToken, async (req, res) => {
  const { reaction } = req.body; // 'up' ou 'down' ou null (pour retirer)
  const reviewId = req.params.id;

  try {
    if (!reaction) {
      // Retirer la réaction
      const { error } = await supabase
        .from('media_review_reactions')
        .delete()
        .match({ user_id: req.user.id, review_id: reviewId });
      if (error && error.code !== '42P01') throw error;
    } else {
      // Ajouter ou mettre à jour la réaction
      if (reaction !== 'up' && reaction !== 'down') return res.status(400).json({ error: 'Réaction invalide' });
      
      const { error } = await supabase
        .from('media_review_reactions')
        .upsert({
          user_id: req.user.id,
          review_id: reviewId,
          reaction_type: reaction
        }, { onConflict: 'user_id,review_id' });
        
      if (error && error.code === '42P01') {
        return res.status(400).json({ error: 'La table des réactions n\'a pas encore été créée dans Supabase' });
      } else if (error) {
        throw error;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur réaction:', error);
    res.status(500).json({ error: 'Erreur lors de la réaction' });
  }
});

// ----------------------------------------------------------------------
// GET /api/media/watchlist - Récupérer les watchlists (personnelle et partagée)
// ----------------------------------------------------------------------
router.get('/watchlist', authenticateToken, async (req, res) => {
  try {
    const { data: watchlists, error } = await supabase
      .from('media_watchlists')
      .select(`
        id,
        type,
        status,
        created_at,
        user_id,
        user:users!user_id ( username, avatar ),
        media:media_items!media_id ( tmdb_id, title, type, poster_url, release_year )
      `)
      .or(`user_id.eq.${req.user.id},type.eq.class`)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return res.json([]); // Table missing
      throw error;
    }

    res.json(watchlists || []);
  } catch (error) {
    console.error('Erreur fetch watchlist:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des watchlists' });
  }
});

// ----------------------------------------------------------------------
// POST /api/media/watchlist - Ajouter/Modifier un élément dans la watchlist
// ----------------------------------------------------------------------
router.post('/watchlist', authenticateToken, async (req, res) => {
  const { tmdb_id, media_type, title, poster_url, release_year, type = 'personal', status = 'planned' } = req.body;

  if (!tmdb_id || !title) return res.status(400).json({ error: 'Paramètres manquants' });

  try {
    // 1. S'assurer que le media existe dans media_items, sinon on le crée
    const { data: existingMedia } = await supabase
      .from('media_items')
      .select('id')
      .eq('tmdb_id', tmdb_id)
      .maybeSingle();

    let mediaId;
    if (existingMedia) {
      mediaId = existingMedia.id;
    } else {
      const { data: newMedia, error: mediaError } = await supabase
        .from('media_items')
        .insert({
          tmdb_id,
          type: media_type || 'movie',
          title,
          poster_url,
          release_year
        })
        .select('id')
        .single();
      if (mediaError) throw mediaError;
      mediaId = newMedia.id;
    }

    // 2. Insérer ou mettre à jour la watchlist
    const { data: watchlistItem, error: watchlistError } = await supabase
      .from('media_watchlists')
      .upsert({
        user_id: req.user.id,
        media_id: mediaId,
        type,
        status,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,media_id,type' })
      .select(`
        id, type, status, created_at, user_id,
        user:users!user_id ( username, avatar ),
        media:media_items!media_id ( tmdb_id, title, type, poster_url, release_year )
      `)
      .single();

    if (watchlistError) throw watchlistError;

    res.status(201).json({ success: true, watchlistItem });
  } catch (error) {
    console.error('Erreur ajout watchlist:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout à la watchlist' });
  }
});

// ----------------------------------------------------------------------
// DELETE /api/media/watchlist/:id - Supprimer de la watchlist
// ----------------------------------------------------------------------
router.delete('/watchlist/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('media_watchlists')
      .delete()
      .match({ id: req.params.id, user_id: req.user.id });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression watchlist:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

module.exports = router;
