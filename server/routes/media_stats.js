const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 1. Film le plus critiqué
    const { data: mostReviewed, error: err1 } = await supabase
      .from('media_reviews')
      .select('media_id, media_items!inner(tmdb_id, type, title, poster_url)')
      .eq('media_items.type', 'movie');

    let mostReviewedMovie = null;
    if (mostReviewed && mostReviewed.length > 0) {
      const counts = {};
      let maxCount = 0;
      let maxMovie = null;
      mostReviewed.forEach(r => {
        counts[r.media_id] = (counts[r.media_id] || 0) + 1;
        if (counts[r.media_id] > maxCount) {
          maxCount = counts[r.media_id];
          maxMovie = r.media_items;
        }
      });
      if (maxMovie) {
        mostReviewedMovie = { ...maxMovie, count: maxCount };
      }
    }

    // 2. Série la mieux notée (min 2 reviews)
    const { data: topSeries, error: err2 } = await supabase
      .from('media_reviews')
      .select('rating, media_id, media_items!inner(tmdb_id, type, title, poster_url)')
      .eq('media_items.type', 'tv');

    let bestSeries = null;
    if (topSeries && topSeries.length > 0) {
      const ratings = {};
      topSeries.forEach(r => {
        if (!ratings[r.media_id]) ratings[r.media_id] = { sum: 0, count: 0, item: r.media_items };
        ratings[r.media_id].sum += r.rating;
        ratings[r.media_id].count += 1;
      });
      let maxAvg = 0;
      let maxItem = null;
      for (const id in ratings) {
        const avg = ratings[id].sum / ratings[id].count;
        if (ratings[id].count >= 1 && avg > maxAvg) {
          maxAvg = avg;
          maxItem = ratings[id].item;
        }
      }
      if (maxItem) {
        bestSeries = { ...maxItem, avg: maxAvg };
      }
    }

    // 3. Critique la plus likée
    const { data: mostLiked, error: err3 } = await supabase
      .from('media_review_reactions')
      .select('review_id, reaction_type')
      .eq('reaction_type', 'up');

    let bestReviewObj = null;
    if (mostLiked && mostLiked.length > 0) {
      const likes = {};
      let maxLikes = 0;
      let maxReviewId = null;
      mostLiked.forEach(l => {
        likes[l.review_id] = (likes[l.review_id] || 0) + 1;
        if (likes[l.review_id] > maxLikes) {
          maxLikes = likes[l.review_id];
          maxReviewId = l.review_id;
        }
      });
      
      if (maxReviewId) {
        const { data: reviewDetails } = await supabase
          .from('media_reviews')
          .select('*, users(name, avatar_url), media_items(title, poster_url, type, tmdb_id)')
          .eq('id', maxReviewId)
          .single();
        if (reviewDetails) {
          bestReviewObj = { ...reviewDetails, likesCount: maxLikes };
        }
      }
    }

    res.json({
      most_reviewed_movie: mostReviewedMovie,
      best_series: bestSeries,
      most_liked_review: bestReviewObj
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

module.exports = router;
