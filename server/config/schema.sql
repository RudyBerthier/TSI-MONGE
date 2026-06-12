-- ============================================
-- TSI-MONGE : Migration JSON → Supabase
-- ============================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'professeur')),
  email_verified BOOLEAN DEFAULT FALSE,
  google_id TEXT UNIQUE,
  google_avatar TEXT,
  avatar TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Personal Notes
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sans titre',
  content TEXT DEFAULT '',
  color TEXT DEFAULT 'default',
  pinned BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Site settings (key-value)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick links
CREATE TABLE IF NOT EXISTS quick_links (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT,
  emoji TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  email TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email, type);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  options TEXT[] NOT NULL,
  votes JSONB DEFAULT '{}',
  user_votes JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  matiere TEXT NOT NULL DEFAULT '',
  jour TEXT NOT NULL,
  heure TEXT NOT NULL DEFAULT '',
  salle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  week_num INTEGER,
  recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seating layouts (JSONB for the complex layout)
CREATE TABLE IF NOT EXISTS seating_layouts (
  class_id TEXT PRIMARY KEY,
  start_date DATE NOT NULL,
  layout JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forum topics
CREATE TABLE IF NOT EXISTS forum_topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  files JSONB DEFAULT '[]',
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  device_votes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_created ON forum_topics(created_at DESC);

-- Forum replies
CREATE TABLE IF NOT EXISTS forum_replies (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  files JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON forum_replies(topic_id);

-- Cantine reviews
CREATE TABLE IF NOT EXISTS cantine_reviews (
  id TEXT PRIMARY KEY,
  pseudo TEXT NOT NULL DEFAULT 'Anonyme',
  note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire TEXT DEFAULT '',
  plat TEXT DEFAULT '',
  images JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cantine_reviews_created ON cantine_reviews(created_at DESC);

-- Colloscope (store as JSONB - complex nested structure)
CREATE TABLE IF NOT EXISTS colloscope (
  code TEXT PRIMARY KEY,
  kholles JSONB NOT NULL DEFAULT '[]'
);

-- Kholle requests
CREATE TABLE IF NOT EXISTS kholle_requests (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  original_date TEXT,
  original_time TEXT,
  original_colleur TEXT,
  requested_date TEXT,
  requested_time TEXT,
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pronote timetable
CREATE TABLE IF NOT EXISTS pronote_timetable (
  id SERIAL PRIMARY KEY,
  week_start TEXT NOT NULL,
  courses JSONB NOT NULL DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start)
);

-- Pronote credentials
CREATE TABLE IF NOT EXISTS pronote_credentials (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reactions JSONB DEFAULT '[]',
  edit_history JSONB DEFAULT '[]',
  read_by JSONB DEFAULT '[]',
  reply_to TEXT,
  attachment JSONB,
  is_edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);

-- Private conversations
CREATE TABLE IF NOT EXISTS private_conversations (
  id TEXT PRIMARY KEY,
  participants JSONB NOT NULL,
  last_message JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_conversations_updated ON private_conversations(updated_at DESC);

-- Private messages
CREATE TABLE IF NOT EXISTS private_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read_by JSONB DEFAULT '[]',
  reply_to TEXT,
  attachment JSONB,
  reactions JSONB DEFAULT '[]',
  edit_history JSONB DEFAULT '[]',
  is_edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(conversation_id, timestamp DESC);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  members JSONB NOT NULL DEFAULT '[]',
  last_message JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_updated ON groups(updated_at DESC);

-- Group messages
CREATE TABLE IF NOT EXISTS group_messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reply_to TEXT,
  attachment JSONB,
  reactions JSONB DEFAULT '[]',
  edit_history JSONB DEFAULT '[]',
  is_edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, timestamp DESC);

-- Contenu maths (scraping de l'ancien site)
CREATE TABLE IF NOT EXISTS math_content (
  id TEXT PRIMARY KEY,
  cours JSONB DEFAULT '[]',
  ds JSONB DEFAULT '[]',
  dm JSONB DEFAULT '[]',
  interros JSONB DEFAULT '[]',
  ap JSONB DEFAULT '[]',
  colles JSONB DEFAULT '{}',
  progression JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Migration : ajouter la colonne progression si elle n'existe pas
ALTER TABLE math_content ADD COLUMN IF NOT EXISTS progression JSONB DEFAULT '[]';
-- 1. Ajouter bio et links à users
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]';

-- 2. Table pour les abonnements (followers)
CREATE TABLE IF NOT EXISTS user_followers (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON user_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON user_followers(following_id);

-- 3. Table pour les publications (posts)
CREATE TABLE IF NOT EXISTS user_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  image_url TEXT,
  video_url TEXT,
  likes TEXT[] DEFAULT '{}', -- Tableau des IDs des utilisateurs ayant liké
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_posts_user ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created ON user_posts(created_at DESC);

-- 4. Table pour les commentaires des publications (post comments)
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created ON post_comments(created_at ASC);

-- 5. Table pour les Stories (24h)
CREATE TABLE IF NOT EXISTS user_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'image' ou 'video'
  is_highlight BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS is_highlight BOOLEAN DEFAULT FALSE;
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS poll JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_user_stories_user ON user_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_expires ON user_stories(expires_at);

-- 6. Table pour les vues de Stories
CREATE TABLE IF NOT EXISTS story_views (
  story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

-- 7. Table pour la sauvegarde des publications (Favoris)
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_created ON saved_posts(created_at DESC);

-- 8. Table cache pour le menu de la cantine (scraping Facebook)
CREATE TABLE IF NOT EXISTS cantine_menu (
  id SERIAL PRIMARY KEY,
  week_label TEXT NOT NULL,
  image_url TEXT NOT NULL,
  post_text TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cantine_menu_fetched ON cantine_menu(fetched_at DESC);

-- Activity logs (admin)
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_username TEXT NOT NULL DEFAULT 'System',
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_label TEXT,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor   ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action  ON activity_logs(action);

-- Verified badge
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Story reactions (emoji envoyé en réponse à une story)
ALTER TABLE story_views ADD COLUMN IF NOT EXISTS reaction TEXT DEFAULT NULL;

-- Story replies (réponses texte aux stories)
CREATE TABLE IF NOT EXISTS story_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_story_replies_story ON story_replies(story_id);CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'bug', -- 'bug', 'feature_request', 'other'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT, -- where it happened
  user_agent TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'closed'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC);

-- Kholleur reviews
CREATE TABLE IF NOT EXISTS kholleur_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kholleur_name TEXT NOT NULL,
  matiere TEXT,
  pseudo TEXT NOT NULL DEFAULT 'Anonyme',
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire TEXT DEFAULT '',
  likes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kholleur_reviews_name ON kholleur_reviews(kholleur_name);
CREATE INDEX IF NOT EXISTS idx_kholleur_reviews_created ON kholleur_reviews(created_at DESC);

-- ============================================
-- COVOITURAGE (CARPOOLING)
-- ============================================

CREATE TABLE IF NOT EXISTS carpool_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  destination TEXT NOT NULL,
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  departure_time TIMESTAMPTZ NOT NULL,
  seats_offered INTEGER NOT NULL CHECK (seats_offered > 0),
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
  price INTEGER DEFAULT 0,
  price_type TEXT DEFAULT 'per_person' CHECK (price_type IN ('per_person', 'divided')),
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpool_rides_departure ON carpool_rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_driver ON carpool_rides(driver_id);

CREATE TABLE IF NOT EXISTS carpool_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES carpool_rides(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ride_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_carpool_passengers_ride ON carpool_passengers(ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_passengers_user ON carpool_passengers(user_id);


/*
-- ============================================
-- NOTE POUR UPDATE : Si la table carpool_rides existe déjà, exécutez ces requêtes :
-- ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;
-- ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
-- ALTER TABLE carpool_passengers ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;
-- ALTER TABLE carpool_passengers ADD COLUMN IF NOT EXISTS boarded BOOLEAN DEFAULT false;
*/

-- ============================================
-- MODULE : MONGEFLIX (Films & Séries)
-- ============================================

-- 1. Table des médias (Films et Séries)
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_id VARCHAR NOT NULL UNIQUE,
    type VARCHAR NOT NULL DEFAULT 'movie', -- 'movie' ou 'tv'
    title VARCHAR NOT NULL,
    poster_url TEXT,
    release_year VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des critiques / notes
CREATE TABLE IF NOT EXISTS public.media_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, media_id) -- Un utilisateur ne peut noter un média qu'une seule fois
);

-- Index pour optimiser les requêtes sur le feed
CREATE INDEX IF NOT EXISTS idx_media_reviews_created_at ON public.media_reviews(created_at DESC);

-- 3. Table de Watchlist (Liste de visionnage)
CREATE TABLE IF NOT EXISTS public.media_watchlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL DEFAULT 'personal', -- 'personal' ou 'class'
    status VARCHAR NOT NULL DEFAULT 'planned', -- 'planned', 'watching', 'watched'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, media_id, type)
);

CREATE INDEX IF NOT EXISTS idx_media_watchlists_user ON public.media_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_media_watchlists_type ON public.media_watchlists(type);
