const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// 1. Récupérer les listes (celles de l'utilisateur + publiques)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: lists, error } = await supabase
      .from('media_custom_lists')
      .select('*, media_custom_list_items(media_items(tmdb_id, type, title, poster_url))')
      .or(`user_id.eq.${req.user.id},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(lists);
  } catch (error) {
    console.error('Erreur récupération des listes:', error);
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

// 2. Créer une nouvelle liste
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, is_public } = req.body;
  if (!name) return res.status(400).json({ error: 'Le nom de la liste est requis' });

  try {
    const { data, error } = await supabase
      .from('media_custom_lists')
      .insert([{ user_id: req.user.id, name, description, is_public: !!is_public }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Erreur création de liste:', error);
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

// 3. Supprimer une liste
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Vérifier que la liste appartient à l'utilisateur
    const { data: list } = await supabase.from('media_custom_lists').select('user_id').eq('id', id).single();
    if (!list || list.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    const { error } = await supabase.from('media_custom_lists').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Liste supprimée' });
  } catch (error) {
    console.error('Erreur suppression liste:', error);
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

// 4. Ajouter/retirer un média d'une liste
router.post('/:id/items', authenticateToken, async (req, res) => {
  const { id: list_id } = req.params;
  const { media } = req.body; // L'objet media complet pour l'insérer si besoin

  try {
    // Vérifier l'accès
    const { data: list } = await supabase.from('media_custom_lists').select('user_id').eq('id', list_id).single();
    if (!list || list.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    const tmdb_id = media.tmdb_id || media.id?.toString();
    const type = media.type || media.media_type || 'movie';

    // Récupérer ou insérer le média dans media_items
    let mediaId;
    const { data: existingMedia } = await supabase.from('media_items').select('id').eq('tmdb_id', tmdb_id).single();
    
    if (existingMedia) {
      mediaId = existingMedia.id;
    } else {
      const releaseYear = media.release_date ? media.release_date.split('-')[0] : (media.first_air_date ? media.first_air_date.split('-')[0] : null);
      const { data: newMedia, error: insertError } = await supabase
        .from('media_items')
        .insert([{
          tmdb_id,
          type,
          title: media.title || media.name,
          poster_url: media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : null,
          release_year: releaseYear
        }])
        .select('id').single();

      if (insertError) throw insertError;
      mediaId = newMedia.id;
    }

    // Toggle (ajouter ou supprimer)
    const { data: existingItem } = await supabase
      .from('media_custom_list_items')
      .select('id')
      .eq('list_id', list_id)
      .eq('media_id', mediaId)
      .single();

    if (existingItem) {
      // Supprimer
      await supabase.from('media_custom_list_items').delete().eq('id', existingItem.id);
      res.json({ message: 'Retiré de la liste', added: false });
    } else {
      // Ajouter
      await supabase.from('media_custom_list_items').insert([{ list_id, media_id: mediaId }]);
      res.json({ message: 'Ajouté à la liste', added: true });
    }
  } catch (error) {
    console.error('Erreur modification liste:', error);
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

module.exports = router;
