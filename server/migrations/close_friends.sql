-- Migration: Add Close Friends feature

-- 1. Create the user_close_friends table
CREATE TABLE IF NOT EXISTS public.user_close_friends (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, friend_id)
);

-- Enable RLS (Row Level Security) on the new table
ALTER TABLE public.user_close_friends ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_close_friends
-- Users can see their own close friends
CREATE POLICY "Users can view their own close friends"
    ON public.user_close_friends FOR SELECT
    USING (auth.uid()::text = user_id);

-- Users can add/remove their own close friends
CREATE POLICY "Users can insert their own close friends"
    ON public.user_close_friends FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own close friends"
    ON public.user_close_friends FOR DELETE
    USING (auth.uid()::text = user_id);


-- 2. Add visibility column to user_posts
-- We use a boolean for simplicity: is_close_friends_only
ALTER TABLE public.user_posts 
ADD COLUMN IF NOT EXISTS is_close_friends_only BOOLEAN DEFAULT false;

-- Update existing rows (optional, but good practice since default might only apply to new rows in some Postgres versions)
UPDATE public.user_posts SET is_close_friends_only = false WHERE is_close_friends_only IS NULL;

-- 3. Update RLS policies for user_posts to handle close friends visibility.
-- Assuming you already have policies on user_posts, you might need to adjust them if RLS is strictly enforced for SELECTs. 
-- However, if your API handles the logic (which it seems to do in users.js), no strict RLS SELECT changes are entirely necessary
-- for the backend to work, as the backend uses the service key or runs queries directly and filters results.
