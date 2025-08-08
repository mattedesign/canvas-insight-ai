-- Create analysis_events table to log event-driven pipeline updates
CREATE TABLE IF NOT EXISTS public.analysis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NULL,
  group_job_id UUID NULL,
  user_id UUID NULL,
  event_name TEXT NOT NULL,
  stage TEXT NULL,
  status TEXT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_events ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_analysis_events_job_id ON public.analysis_events(job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_events_group_job_id ON public.analysis_events(group_job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_events_created_at ON public.analysis_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_events_user_id ON public.analysis_events(user_id);

-- Policies
DROP POLICY IF EXISTS "System can insert analysis events" ON public.analysis_events;
CREATE POLICY "System can insert analysis events"
ON public.analysis_events
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their analysis events" ON public.analysis_events;
CREATE POLICY "Users can view their analysis events"
ON public.analysis_events
FOR SELECT
USING (
  (job_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.analysis_jobs aj
    WHERE aj.id = analysis_events.job_id AND aj.user_id = auth.uid()
  ))
  OR
  (group_job_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_analysis_jobs gij
    WHERE gij.id = analysis_events.group_job_id AND gij.user_id = auth.uid()
  ))
  OR (user_id = auth.uid())
);
