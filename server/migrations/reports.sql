-- Migration: Add Reports table

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'story', 'user')),
    target_id UUID NOT NULL, -- UUID of the reported item
    reason TEXT NOT NULL, -- Free text or pre-defined category
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Admins can view and update all reports
CREATE POLICY "Admins can view all reports"
    ON public.reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all reports"
    ON public.reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Any authenticated user can insert a report
CREATE POLICY "Users can insert reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid()::text = reporter_id);
