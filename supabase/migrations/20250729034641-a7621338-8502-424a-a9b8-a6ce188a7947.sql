-- Phase 1: Fix Database Integrity Issues

-- First, clean up orphaned records in ux_analyses table
-- Delete any ux_analyses records that reference non-existent images
DELETE FROM public.ux_analyses 
WHERE image_id IS NOT NULL 
AND image_id NOT IN (SELECT id FROM public.images);

-- Delete any group_analyses records that reference non-existent groups
DELETE FROM public.group_analyses 
WHERE group_id IS NOT NULL 
AND group_id NOT IN (SELECT id FROM public.image_groups);

-- Delete any group_images records that reference non-existent images or groups
DELETE FROM public.group_images 
WHERE image_id NOT IN (SELECT id FROM public.images)
OR group_id NOT IN (SELECT id FROM public.image_groups);

-- Delete any canvas_states records that reference non-existent projects
DELETE FROM public.canvas_states 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM public.projects);

-- Add foreign key constraints to ensure data integrity
-- Add FK constraint for ux_analyses -> images
ALTER TABLE public.ux_analyses 
ADD CONSTRAINT fk_ux_analyses_image_id 
FOREIGN KEY (image_id) REFERENCES public.images(id) 
ON DELETE CASCADE;

-- Add FK constraint for group_analyses -> image_groups
ALTER TABLE public.group_analyses 
ADD CONSTRAINT fk_group_analyses_group_id 
FOREIGN KEY (group_id) REFERENCES public.image_groups(id) 
ON DELETE CASCADE;

-- Add FK constraint for group_images -> images
ALTER TABLE public.group_images 
ADD CONSTRAINT fk_group_images_image_id 
FOREIGN KEY (image_id) REFERENCES public.images(id) 
ON DELETE CASCADE;

-- Add FK constraint for group_images -> image_groups
ALTER TABLE public.group_images 
ADD CONSTRAINT fk_group_images_group_id 
FOREIGN KEY (group_id) REFERENCES public.image_groups(id) 
ON DELETE CASCADE;

-- Add FK constraint for images -> projects
ALTER TABLE public.images 
ADD CONSTRAINT fk_images_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) 
ON DELETE CASCADE;

-- Add FK constraint for image_groups -> projects
ALTER TABLE public.image_groups 
ADD CONSTRAINT fk_image_groups_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) 
ON DELETE CASCADE;

-- Add FK constraint for canvas_states -> projects
ALTER TABLE public.canvas_states 
ADD CONSTRAINT fk_canvas_states_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) 
ON DELETE CASCADE;

-- Add improved validation triggers for better data integrity
CREATE OR REPLACE FUNCTION public.validate_ux_analysis_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure image_id exists when provided
  IF NEW.image_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.images WHERE id = NEW.image_id) THEN
      RAISE EXCEPTION 'Invalid image_id: % does not exist in images table', NEW.image_id;
    END IF;
  END IF;

  -- Validate JSON structure for visual_annotations
  IF NEW.visual_annotations IS NOT NULL THEN
    IF NOT jsonb_typeof(NEW.visual_annotations) = 'array' THEN
      RAISE EXCEPTION 'visual_annotations must be a JSON array';
    END IF;
  END IF;

  -- Validate JSON structure for suggestions
  IF NEW.suggestions IS NOT NULL THEN
    IF NOT jsonb_typeof(NEW.suggestions) = 'array' THEN
      RAISE EXCEPTION 'suggestions must be a JSON array';
    END IF;
  END IF;

  -- Validate JSON structure for summary
  IF NEW.summary IS NOT NULL THEN
    IF NOT jsonb_typeof(NEW.summary) = 'object' THEN
      RAISE EXCEPTION 'summary must be a JSON object';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ux_analyses validation
DROP TRIGGER IF EXISTS validate_ux_analysis_trigger ON public.ux_analyses;
CREATE TRIGGER validate_ux_analysis_trigger
  BEFORE INSERT OR UPDATE ON public.ux_analyses
  FOR EACH ROW EXECUTE FUNCTION public.validate_ux_analysis_data();

-- Add indexes for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_ux_analyses_image_id ON public.ux_analyses(image_id);
CREATE INDEX IF NOT EXISTS idx_group_analyses_group_id ON public.group_analyses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_images_image_id ON public.group_images(image_id);
CREATE INDEX IF NOT EXISTS idx_group_images_group_id ON public.group_images(group_id);
CREATE INDEX IF NOT EXISTS idx_images_project_id ON public.images(project_id);
CREATE INDEX IF NOT EXISTS idx_image_groups_project_id ON public.image_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_project_id ON public.canvas_states(project_id);