-- Add timing columns to analysis_events for stage durations
ALTER TABLE public.analysis_events
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS ended_at   TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER NULL;

-- Helpful composite indexes for start/complete lookups per stage
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_stage_status_created 
  ON public.analysis_events (job_id, stage, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_events_group_stage_status_created 
  ON public.analysis_events (group_job_id, stage, status, created_at DESC);
