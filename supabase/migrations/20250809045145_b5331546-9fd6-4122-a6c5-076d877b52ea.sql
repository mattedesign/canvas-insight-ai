-- Enable required extensions for scheduling HTTP calls
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule daily cleanup of analysis_events via Edge Function (idempotent)
DO $outer$
BEGIN
  -- Unschedule existing job if it exists to avoid duplicates
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-analysis-events-daily') THEN
    PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'cleanup-analysis-events-daily' LIMIT 1));
  END IF;

  -- Schedule at 03:00 UTC daily
  PERFORM cron.schedule(
    'cleanup-analysis-events-daily',
    '0 3 * * *',
    $cron$
    select
      net.http_post(
        url:='https://sdcmbfdtafkzpimwjpij.supabase.co/functions/v1/cleanup-analysis-events',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkY21iZmR0YWZrenBpbXdqcGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTc1MDEsImV4cCI6MjA2OTEzMzUwMX0.aYBZucbfmPjABOjmVjXd96eSeZHKAhnq2QOj4K4FWKM"}'::jsonb,
        body:='{"retentionDays":60}'::jsonb
      ) as request_id;
    $cron$
  );
END
$outer$;