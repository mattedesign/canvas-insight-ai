-- Performance indexes for analysis_events
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_id ON public.analysis_events (job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_events_created_at ON public.analysis_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_events_event_name ON public.analysis_events (event_name);

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Cleanup function: remove old analysis events beyond retention window
CREATE OR REPLACE FUNCTION public.cleanup_analysis_events(retention_days integer DEFAULT 60)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.analysis_events
  WHERE created_at < now() - make_interval(days => retention_days);
END;
$$;

-- Schedule daily cleanup at 02:00 UTC
SELECT cron.schedule(
  'cleanup_analysis_events_daily_v2',
  '0 2 * * *',
  $$CALL public.cleanup_analysis_events(60);$$
);
