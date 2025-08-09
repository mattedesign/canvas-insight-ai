-- Enable pg_cron extension (idempotent)
create extension if not exists pg_cron with schema extensions;

-- Schedule daily cleanup at 03:15 UTC using existing function
select cron.schedule(
  'cleanup_analysis_events_daily',
  '15 3 * * *',
  $$select public.cleanup_analysis_events(60);$$
);
