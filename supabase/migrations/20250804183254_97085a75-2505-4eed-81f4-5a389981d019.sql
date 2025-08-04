-- Step 1: Remove the problematic unique constraint on image_id
-- This allows multiple analyses per image
DROP INDEX IF EXISTS idx_ux_analyses_image_id_unique;

-- Step 2: Create a new composite unique constraint that allows multiple analyses per image
-- but prevents duplicate analyses of the same type at the same time
CREATE UNIQUE INDEX idx_ux_analyses_image_analysis_type_status 
ON ux_analyses (image_id, analysis_type, status) 
WHERE status IN ('completed', 'processing');

-- Step 3: Add version column for analysis versioning
ALTER TABLE ux_analyses 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Step 4: Add analysis_hash column for deterministic deduplication
ALTER TABLE ux_analyses 
ADD COLUMN IF NOT EXISTS analysis_hash TEXT;

-- Step 5: Create index on analysis_hash for performance
CREATE INDEX IF NOT EXISTS idx_ux_analyses_hash ON ux_analyses (analysis_hash);

-- Step 6: Add created_by column to track analysis source
ALTER TABLE ux_analyses 
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'user';

-- Step 7: Update existing analyses to have proper versions
UPDATE ux_analyses 
SET version = 1 
WHERE version IS NULL;

-- Step 8: Create function to get next version for an image
CREATE OR REPLACE FUNCTION get_next_analysis_version(p_image_id UUID, p_analysis_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Step 9: Create function to check for existing analysis
CREATE OR REPLACE FUNCTION has_recent_analysis(p_image_id UUID, p_analysis_type TEXT, p_hours INTEGER DEFAULT 24)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Step 10: Add trigger to auto-populate analysis version
CREATE OR REPLACE FUNCTION auto_set_analysis_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.version IS NULL THEN
        NEW.version := get_next_analysis_version(NEW.image_id, NEW.analysis_type);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_auto_set_analysis_version
    BEFORE INSERT ON ux_analyses
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_analysis_version();