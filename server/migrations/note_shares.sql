-- Create note_shares table for collaborative notes
CREATE TABLE IF NOT EXISTS note_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  shared_with_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'edit')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(note_id, shared_with_user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_note_shares_user ON note_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_note ON note_shares(note_id);
