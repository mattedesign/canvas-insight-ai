-- Phase 1: Optional updated_at triggers and helpful indexes
-- Create trigger to auto-update updated_at on analysis_jobs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_analysis_jobs_updated_at'
  ) THEN
    CREATE TRIGGER set_analysis_jobs_updated_at
    BEFORE UPDATE ON public.analysis_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create trigger to auto-update updated_at on group_analysis_jobs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_group_analysis_jobs_updated_at'
  ) THEN
    CREATE TRIGGER set_group_analysis_jobs_updated_at
    BEFORE UPDATE ON public.group_analysis_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes to speed up event queries (deliverable: index on analysis reference)
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_id ON public.analysis_events (job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_events_group_job_id ON public.analysis_events (group_job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_events_user_id_created ON public.analysis_events (user_id, created_at DESC);
