-- Enable pg_cron extension (idempotent)
create extension if not exists pg_cron with schema extensions;

-- Use existing cleanup function: public.cleanup_analysis_events(p_retention_days integer) RETURNS integer
-- Ensure idempotent schedule by removing any existing job with the same name
delete from cron.job where jobname = 'cleanup_analysis_events_daily';

-- Schedule the cleanup to run daily at 03:15 UTC, keeping 60 days of history
select cron.schedule(
  'cleanup_analysis_events_daily',
  '15 3 * * *',
  $$select public.cleanup_analysis_events(60);$$
);
