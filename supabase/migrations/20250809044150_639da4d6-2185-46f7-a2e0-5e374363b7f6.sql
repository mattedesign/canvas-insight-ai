-- Phase A: Performance indexes and realtime publication updates
-- 1) Performance indexes for analysis_events
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_created_at
  ON public.analysis_events (job_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_events_group_job_created_at
  ON public.analysis_events (group_job_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_events_job_event_created_at
  ON public.analysis_events (job_id, event_name, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_events_group_job_event_created_at
  ON public.analysis_events (group_job_id, event_name, created_at);

-- 2) Ensure tables are part of the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'analysis_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_events';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'analysis_jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_jobs';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_analysis_jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.group_analysis_jobs';
  END IF;
END
$$;

-- 3) Safety: ensure group_analyses has metadata column (idempotent)
ALTER TABLE public.group_analyses
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;