-- Add metadata column to images table for storing Google Vision metadata
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add analysis_type column to ux_analyses table to distinguish between different analysis types
ALTER TABLE public.ux_analyses ADD COLUMN IF NOT EXISTS analysis_type TEXT DEFAULT 'full_analysis';

-- Add trigger to validate metadata on image upload
CREATE OR REPLACE FUNCTION public.validate_image_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate metadata structure if present
  IF NEW.metadata IS NOT NULL THEN
    -- Basic validation - ensure it's valid JSON
    IF NOT jsonb_typeof(NEW.metadata) = 'object' THEN
      RAISE EXCEPTION 'Image metadata must be a valid JSON object';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for image metadata validation
DROP TRIGGER IF EXISTS validate_image_metadata_trigger ON public.images;
CREATE TRIGGER validate_image_metadata_trigger
  BEFORE INSERT OR UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.validate_image_metadata();