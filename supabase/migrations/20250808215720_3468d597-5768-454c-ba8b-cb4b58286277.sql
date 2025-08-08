-- Phase A.2 — Performance indexes for analysis_events
-- These match UI and worker query patterns and are safe to create idempotently
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_created_at
  ON public.analysis_events (job_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_events_group_job_created_at
  ON public.analysis_events (group_job_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_events_job_event_created_at
  ON public.analysis_events (job_id, event_name, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_events_group_job_event_created_at
  ON public.analysis_events (group_job_id, event_name, created_at);
