-- Enable pg_cron extension (idempotent)
create extension if not exists pg_cron with schema extensions;

-- Create or replace a cleanup function to purge old analysis_events
create or replace function public.cleanup_analysis_events(retention_days integer)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete events older than the specified retention window
  delete from public.analysis_events
  where created_at < now() - make_interval(days => retention_days);
end;
$$;

-- Ensure an idempotent cron schedule by removing any existing job with the same name
-- (cron.job lives in the cron schema created by the pg_cron extension)
-- Safe even if no row exists
delete from cron.job
where jobname = 'cleanup_analysis_events_daily';

-- Schedule the cleanup to run daily at 03:15 UTC, keeping 60 days of history
select cron.schedule(
  'cleanup_analysis_events_daily',
  '15 3 * * *',
  $$select public.cleanup_analysis_events(60);$$
);
