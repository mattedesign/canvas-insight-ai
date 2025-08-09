-- Phase C.6: Schedule retention cleanup for analysis_events using pg_cron (fixed quoting)
create extension if not exists pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-analysis-events-daily') THEN
    PERFORM cron.schedule(
      'cleanup-analysis-events-daily',
      '15 3 * * *',
      'SELECT public.cleanup_analysis_events(60);'
    );
  END IF;
END
$$;