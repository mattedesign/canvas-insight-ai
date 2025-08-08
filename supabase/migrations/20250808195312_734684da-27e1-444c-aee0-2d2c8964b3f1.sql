-- Performance indexes for analysis_events
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_created_at ON public.analysis_events (job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_events_group_created_at ON public.analysis_events (group_job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_event_created_at ON public.analysis_events (job_id, event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_events_group_event_created_at ON public.analysis_events (group_job_id, event_name, created_at);

-- Cleanup function for analysis_events retention
CREATE OR REPLACE FUNCTION public.cleanup_analysis_events(p_retention_days integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.analysis_events
  WHERE created_at < NOW() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;