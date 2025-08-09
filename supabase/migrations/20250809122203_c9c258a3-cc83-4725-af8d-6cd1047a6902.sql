-- Remove legacy cron job and trigger one-off cleanup run now
-- Ensure required extensions are present (no-op if already enabled)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Unschedule legacy job name using underscores to avoid duplicate schedules
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup_analysis_events_daily'
  ) THEN
    PERFORM cron.unschedule((
      SELECT jobid FROM cron.job WHERE jobname = 'cleanup_analysis_events_daily' LIMIT 1
    ));
  END IF;
END$$;

-- Fire a one-off manual cleanup invocation to validate pipeline end-to-end
-- Note: Uses anon key and public endpoint; the edge function should be public (verify_jwt=false)
SELECT net.http_post(
  url:='https://sdcmbfdtafkzpimwjpij.supabase.co/functions/v1/cleanup-analysis-events',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkY21iZmR0YWZrenBpbXdqcGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTc1MDEsImV4cCI6MjA2OTEzMzUwMX0.aYBZucbfmPjABOjmVjXd96eSeZHKAhnq2QOj4K4FWKM"}'::jsonb,
  body:='{"retentionDays":60, "trigger":"manual_smoke_test"}'::jsonb
) as request_id;