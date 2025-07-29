-- Fix security warnings from the linter

-- Fix Function Search Path Mutable - set search_path for the validation function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';