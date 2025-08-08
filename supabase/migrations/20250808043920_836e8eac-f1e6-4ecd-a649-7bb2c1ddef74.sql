-- 1) Add columns used by the async pipeline
ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS current_stage text,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS user_context text;

-- 2) Helpful indexes for querying & filtering
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_project_id ON public.analysis_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_current_stage ON public.analysis_jobs(current_stage);

-- 3) Ensure realtime payloads include full row data on updates
ALTER TABLE public.analysis_jobs REPLICA IDENTITY FULL;

-- 4) Add analysis_jobs to supabase_realtime publication if it's not already included
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'analysis_jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_jobs';
  END IF;
END $$;