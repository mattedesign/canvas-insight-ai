-- Fix search path for security compliance
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;