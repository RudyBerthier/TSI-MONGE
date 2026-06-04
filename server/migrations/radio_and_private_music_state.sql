-- Migration pour ajouter la sauvegarde du Lecteur Privé aux utilisateurs
ALTER TABLE users ADD COLUMN IF NOT EXISTS private_queue JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS private_current_track JSONB;

-- Table globale pour sauvegarder l'état de la Radio Monge
CREATE TABLE IF NOT EXISTS radio_monge_state (
    id INT PRIMARY KEY DEFAULT 1,
    current_track JSONB,
    queue JSONB DEFAULT '[]'::jsonb,
    start_time_ms BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialisation de la file unique Radio Monge (id = 1)
INSERT INTO radio_monge_state (id, queue, current_track, start_time_ms)
SELECT 1, '[]'::jsonb, null, 0
WHERE NOT EXISTS (SELECT 1 FROM radio_monge_state WHERE id = 1);
