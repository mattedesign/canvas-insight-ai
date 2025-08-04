-- ============================================================================
-- STEP 1A: ADD MISSING COLUMNS FIRST
-- ============================================================================

-- Add user_id column to ux_analyses if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ux_analyses' AND column_name = 'user_id') THEN
        ALTER TABLE public.ux_analyses ADD COLUMN user_id uuid;
        
        -- Populate user_id from related projects table
        UPDATE public.ux_analyses 
        SET user_id = p.user_id 
        FROM public.projects p 
        JOIN public.images i ON i.project_id = p.id 
        WHERE ux_analyses.image_id = i.id;
    END IF;
END $$;

-- ============================================================================
-- STEP 1B: FIX DUPLICATE DATA ISSUE
-- ============================================================================

-- Handle duplicate analyses by keeping only the most recent one per image
WITH duplicates AS (
    SELECT 
        image_id,
        array_agg(id ORDER BY created_at DESC) as analysis_ids
    FROM public.ux_analyses 
    WHERE status = 'completed'
    GROUP BY image_id 
    HAVING COUNT(*) > 1
),
ids_to_delete AS (
    SELECT unnest(analysis_ids[2:]) as id_to_delete
    FROM duplicates
)
DELETE FROM public.ux_analyses 
WHERE id IN (SELECT id_to_delete FROM ids_to_delete);

-- Create the unique constraint safely
CREATE UNIQUE INDEX IF NOT EXISTS idx_ux_analyses_image_id_unique 
ON public.ux_analyses(image_id) 
WHERE status = 'completed';

-- ============================================================================
-- STEP 1C: ADD PERFORMANCE INDEXES
-- ============================================================================

-- Basic indexes that should already exist from previous migration
CREATE INDEX IF NOT EXISTS idx_ux_analyses_user_id ON public.ux_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ux_analyses_image_id ON public.ux_analyses(image_id);
CREATE INDEX IF NOT EXISTS idx_ux_analyses_status ON public.ux_analyses(status);
CREATE INDEX IF NOT EXISTS idx_ux_analyses_created_at ON public.ux_analyses(created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_ux_analyses_user_status ON public.ux_analyses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_images_project_metadata ON public.images(project_id, file_type, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status ON public.analysis_jobs(user_id, status, created_at);

-- ============================================================================
-- STEP 1D: ADD CONSTRAINTS SAFELY
-- ============================================================================

-- Add constraint to ensure valid status values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'ux_analyses_valid_status') THEN
        ALTER TABLE public.ux_analyses 
        ADD CONSTRAINT ux_analyses_valid_status 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'));
    END IF;
END $$;

-- Add constraint for valid analysis types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'ux_analyses_valid_analysis_type') THEN
        ALTER TABLE public.ux_analyses 
        ADD CONSTRAINT ux_analyses_valid_analysis_type 
        CHECK (analysis_type IN ('full_analysis', 'quick_scan', 'accessibility_check', 'performance_review', 'custom'));
    END IF;
END $$;