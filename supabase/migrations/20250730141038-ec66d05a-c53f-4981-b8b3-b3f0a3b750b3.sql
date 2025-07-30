-- Ensure all tables have proper project_id foreign keys
-- and indexes for performance

-- Add project_id to tables that might be missing it
ALTER TABLE public.ux_analyses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.image_groups 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update existing records to have project_id (from their related images)
UPDATE public.ux_analyses 
SET project_id = (
  SELECT i.project_id 
  FROM public.images i 
  WHERE i.id = ux_analyses.image_id
)
WHERE project_id IS NULL;

UPDATE public.image_groups 
SET project_id = (
  SELECT i.project_id 
  FROM public.images i 
  JOIN public.group_images gi ON gi.image_id = i.id 
  WHERE gi.group_id = image_groups.id 
  LIMIT 1
)
WHERE project_id IS NULL;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_images_project_id_created 
ON public.images(project_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_project_id_created 
ON public.ux_analyses(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_groups_project_id_created 
ON public.image_groups(project_id, created_at DESC);

-- Update RLS policies to be project-aware (maintaining existing correct approach)
-- No changes needed - existing policies already use proper project-based access control