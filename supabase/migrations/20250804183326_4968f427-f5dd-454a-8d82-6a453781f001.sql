-- Fix security warnings by setting proper search_path for functions

-- Fix get_next_analysis_version function
CREATE OR REPLACE FUNCTION get_next_analysis_version(p_image_id UUID, p_analysis_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1 
    INTO next_version
    FROM ux_analyses 
    WHERE image_id = p_image_id 
    AND analysis_type = p_analysis_type;
    
    RETURN next_version;
END;
$$;

-- Fix has_recent_analysis function
CREATE OR REPLACE FUNCTION has_recent_analysis(p_image_id UUID, p_analysis_type TEXT, p_hours INTEGER DEFAULT 24)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM ux_analyses 
        WHERE image_id = p_image_id 
        AND analysis_type = p_analysis_type
        AND status = 'completed'
        AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
    );
END;
$$;

-- Fix auto_set_analysis_version function
CREATE OR REPLACE FUNCTION auto_set_analysis_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.version IS NULL THEN
        NEW.version := get_next_analysis_version(NEW.image_id, NEW.analysis_type);
    END IF;
    RETURN NEW;
END;
$$;