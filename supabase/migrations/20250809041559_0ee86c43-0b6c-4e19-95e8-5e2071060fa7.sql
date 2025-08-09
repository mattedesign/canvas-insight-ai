-- Performance indexes for analysis_events to match worker/UI queries
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_created_at
  ON public.analysis_events (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_events_group_job_created_at
  ON public.analysis_events (group_job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_events_job_event_created_at
  ON public.analysis_events (job_id, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_events_group_event_created_at
  ON public.analysis_events (group_job_id, event_name, created_at DESC);
