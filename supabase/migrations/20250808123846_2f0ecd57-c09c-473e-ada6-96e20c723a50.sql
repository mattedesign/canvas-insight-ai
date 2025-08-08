-- Create group_analysis_jobs table for background group analyses
CREATE TABLE IF NOT EXISTS public.group_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  group_id UUID,
  project_id UUID,
  image_urls TEXT[] NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_stage TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.group_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Policies mirroring analysis_jobs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='group_analysis_jobs' AND policyname='Users can create own group jobs'
  ) THEN
    CREATE POLICY "Users can create own group jobs"
    ON public.group_analysis_jobs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='group_analysis_jobs' AND policyname='Users can update own group jobs'
  ) THEN
    CREATE POLICY "Users can update own group jobs"
    ON public.group_analysis_jobs
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='group_analysis_jobs' AND policyname='Users can view own group jobs'
  ) THEN
    CREATE POLICY "Users can view own group jobs"
    ON public.group_analysis_jobs
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger to auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_group_analysis_jobs_updated_at'
  ) THEN
    CREATE TRIGGER update_group_analysis_jobs_updated_at
    BEFORE UPDATE ON public.group_analysis_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Realtime support
ALTER TABLE public.group_analysis_jobs REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication if not already
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='group_analysis_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_analysis_jobs;
  END IF;
END $$;
