-- Phase 1A: Database Storage Schema
-- Create storage_metadata table for organized storage tracking

CREATE TABLE public.storage_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size BIGINT,
  file_type TEXT,
  dimensions JSONB,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for storage_metadata
ALTER TABLE public.storage_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for storage_metadata
CREATE POLICY "Users can create their own storage metadata" 
ON public.storage_metadata 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own storage metadata" 
ON public.storage_metadata 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own storage metadata" 
ON public.storage_metadata 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storage metadata" 
ON public.storage_metadata 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_storage_metadata_user_id ON public.storage_metadata(user_id);
CREATE INDEX idx_storage_metadata_project_id ON public.storage_metadata(project_id);
CREATE INDEX idx_storage_metadata_storage_path ON public.storage_metadata(storage_path);

-- Create trigger to update last_accessed timestamp
CREATE TRIGGER update_storage_last_accessed
  BEFORE UPDATE ON public.storage_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_storage_last_accessed();