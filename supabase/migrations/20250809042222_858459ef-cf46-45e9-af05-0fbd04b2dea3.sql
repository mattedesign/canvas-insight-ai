-- Phase B: Precise final-result linking for group analyses
ALTER TABLE public.group_analyses
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;