-- 1. Ajouter les colonnes season_number et episode_number
ALTER TABLE public.media_reviews ADD COLUMN IF NOT EXISTS season_number INTEGER NULL;
ALTER TABLE public.media_reviews ADD COLUMN IF NOT EXISTS episode_number INTEGER NULL;

-- 2. Supprimer l'ancienne contrainte d'unicité stricte
-- Pour trouver le nom exact de la contrainte, PostgreSQL la nomme généralement "media_reviews_user_id_media_id_key"
ALTER TABLE public.media_reviews DROP CONSTRAINT IF EXISTS media_reviews_user_id_media_id_key;

-- 3. (Optionnel) Ajouter une contrainte qui autorise une seule review par saison/épisode
-- PostgreSQL 15+ permet UNIQUE NULLS NOT DISTINCT
-- Si cela pose erreur, tu peux l'ignorer, le backend gérera l'unicité.
ALTER TABLE public.media_reviews ADD CONSTRAINT media_reviews_user_id_media_id_season_episode_key UNIQUE NULLS NOT DISTINCT (user_id, media_id, season_number, episode_number);
