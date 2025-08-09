-- Phase C.6: Schedule retention cleanup for analysis_events using pg_cron
-- Ensure pg_cron extension is available
create extension if not exists pg_cron;

-- Create a daily job at 03:15 UTC to delete events older than 60 days
-- Idempotent: only schedule if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-analysis-events-daily') THEN
    PERFORM cron.schedule(
      'cleanup-analysis-events-daily',
      '15 3 * * *',
      $$ SELECT public.cleanup_analysis_events(60); $$
    );
  END IF;
END
$$;