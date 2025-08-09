-- Phase A: Performance indexes for analysis_events and scheduled retention cleanup (retry)
create extension if not exists pg_cron with schema extensions;

-- Performance indexes
create index if not exists idx_analysis_events_job_created_at on public.analysis_events (job_id, created_at);
create index if not exists idx_analysis_events_group_job_created_at on public.analysis_events (group_job_id, created_at);
create index if not exists idx_analysis_events_job_event_created_at on public.analysis_events (job_id, event_name, created_at);
create index if not exists idx_analysis_events_group_event_created_at on public.analysis_events (group_job_id, event_name, created_at);

-- Schedule daily cleanup at 02:00 UTC retaining 60 days
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_analysis_events_daily_v2') THEN
    PERFORM cron.schedule(
      'cleanup_analysis_events_daily_v2',
      '0 2 * * *',
      'SELECT public.cleanup_analysis_events(60)'
    );
  END IF;
END
$do$;