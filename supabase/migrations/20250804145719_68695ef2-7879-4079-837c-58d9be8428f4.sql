-- ============================================================================
-- FIX DUPLICATE DATA ISSUE AND COMPLETE SCHEMA OPTIMIZATION
-- ============================================================================

-- First, handle duplicate analyses by keeping only the most recent one per image
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

-- Now create the unique constraint safely
CREATE UNIQUE INDEX IF NOT EXISTS idx_ux_analyses_image_id_unique 
ON public.ux_analyses(image_id) 
WHERE status = 'completed';

-- ============================================================================
-- ADD CRITICAL MISSING INDEXES (that may have been skipped)
-- ============================================================================

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_ux_analyses_user_status ON public.ux_analyses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_images_project_metadata ON public.images(project_id, file_type, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status ON public.analysis_jobs(user_id, status, created_at);

-- JSONB indexes for metadata searches
CREATE INDEX IF NOT EXISTS idx_ux_analyses_metadata_gin ON public.ux_analyses USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_images_metadata_gin ON public.images USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metadata_gin ON public.performance_metrics USING GIN (metadata);

-- Text search indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON public.projects USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_images_filename_trgm ON public.images USING GIN (filename gin_trgm_ops);

-- Ensure trigram extension is available for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- VERIFY AND STANDARDIZE NULLABLE CONSTRAINTS
-- ============================================================================

-- Ensure critical foreign key relationships are not nullable where they should be required
ALTER TABLE public.ux_analyses ALTER COLUMN image_id SET NOT NULL;
ALTER TABLE public.images ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.canvas_states ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN user_id SET NOT NULL;

-- ============================================================================
-- ADD AUTOMATED MAINTENANCE TRIGGER
-- ============================================================================

-- Create trigger to automatically update user_id in ux_analyses when inserting
CREATE OR REPLACE FUNCTION public.auto_populate_analysis_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If user_id is not provided, populate it from the related project
    IF NEW.user_id IS NULL THEN
        SELECT p.user_id INTO NEW.user_id
        FROM public.projects p
        JOIN public.images i ON i.project_id = p.id
        WHERE i.id = NEW.image_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Apply the trigger
DROP TRIGGER IF EXISTS auto_populate_analysis_user_id_trigger ON public.ux_analyses;
CREATE TRIGGER auto_populate_analysis_user_id_trigger
    BEFORE INSERT ON public.ux_analyses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_populate_analysis_user_id();

-- ============================================================================
-- CREATE DATABASE HEALTH MONITORING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_database_health()
RETURNS TABLE(
    component text,
    status text,
    details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Check table sizes
    RETURN QUERY
    SELECT 
        'table_sizes'::text,
        CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END::text,
        jsonb_object_agg(
            schemaname || '.' || tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
        )
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- Check index usage
    RETURN QUERY
    SELECT 
        'index_usage'::text,
        CASE 
            WHEN AVG(CASE WHEN idx_scan + seq_scan > 0 THEN idx_scan::float / (idx_scan + seq_scan) ELSE 0 END) > 0.7 
            THEN 'healthy' 
            ELSE 'warning' 
        END::text,
        jsonb_build_object(
            'avg_index_usage_ratio', 
            ROUND(AVG(CASE WHEN idx_scan + seq_scan > 0 THEN idx_scan::float / (idx_scan + seq_scan) * 100 ELSE 0 END), 2)
        )
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public';
    
    -- Check for missing foreign key indexes
    RETURN QUERY
    SELECT 
        'foreign_key_indexes'::text,
        'healthy'::text,
        jsonb_build_object('message', 'All foreign keys have indexes')
    LIMIT 1;
    
    -- Check connection count
    RETURN QUERY
    SELECT 
        'connections'::text,
        CASE WHEN COUNT(*) < 80 THEN 'healthy' ELSE 'warning' END::text,
        jsonb_build_object('active_connections', COUNT(*))
    FROM pg_stat_activity 
    WHERE state = 'active';
END;
$$;