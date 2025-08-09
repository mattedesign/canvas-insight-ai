-- Performance indexes for analysis_events
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_id ON public.analysis_events (job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_events_created_at ON public.analysis_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_events_event_name ON public.analysis_events (event_name);

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule daily cleanup at 02:00 UTC using existing function (returns integer)
SELECT cron.schedule(
  'cleanup_analysis_events_daily_v2',
  '0 2 * * *',
  $$SELECT public.cleanup_analysis_events(60);$$
);
