-- ============================================================================
-- STEP 1: DATABASE SCHEMA STANDARDIZATION & PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Fix function search path security issue (from linter)
ALTER FUNCTION public.generate_project_slug(text) SET search_path = 'public';
ALTER FUNCTION public.log_project_access() SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_data() SET search_path = 'public';
ALTER FUNCTION public.validate_user_permission(text, uuid) SET search_path = 'public';
ALTER FUNCTION public.audit_trigger_function() SET search_path = 'public';
ALTER FUNCTION public.generate_random_project_name() SET search_path = 'public';
ALTER FUNCTION public.check_rate_limit(text, integer, integer) SET search_path = 'public';
ALTER FUNCTION public.validate_image_upload() SET search_path = 'public';
ALTER FUNCTION public.validate_analysis_content() SET search_path = 'public';
ALTER FUNCTION public.get_analysis_job_status(uuid) SET search_path = 'public';
ALTER FUNCTION public.validate_ux_analysis_data() SET search_path = 'public';
ALTER FUNCTION public.cleanup_monitoring_data() SET search_path = 'public';
ALTER FUNCTION public.generate_api_key() SET search_path = 'public';
ALTER FUNCTION public.update_storage_last_accessed() SET search_path = 'public';
ALTER FUNCTION public.validate_image_metadata() SET search_path = 'public';
ALTER FUNCTION public.get_cached_analysis(text) SET search_path = 'public';
ALTER FUNCTION public.clear_expired_cache() SET search_path = 'public';
ALTER FUNCTION public.upsert_cached_analysis(text, jsonb) SET search_path = 'public';

-- ============================================================================
-- ADD CRITICAL PERFORMANCE INDEXES
-- ============================================================================

-- Images table indexes for common queries
CREATE INDEX IF NOT EXISTS idx_images_project_id ON public.images(project_id);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON public.images(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_file_type ON public.images(file_type);

-- UX Analyses table indexes for performance
CREATE INDEX IF NOT EXISTS idx_ux_analyses_image_id ON public.ux_analyses(image_id);
CREATE INDEX IF NOT EXISTS idx_ux_analyses_project_id ON public.ux_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_ux_analyses_created_at ON public.ux_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ux_analyses_status ON public.ux_analyses(status);
CREATE INDEX IF NOT EXISTS idx_ux_analyses_analysis_type ON public.ux_analyses(analysis_type);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Analysis jobs table indexes
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON public.analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON public.analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON public.analysis_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_image_id ON public.analysis_jobs(image_id);

-- Canvas states indexes
CREATE INDEX IF NOT EXISTS idx_canvas_states_user_id ON public.canvas_states(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_project_id ON public.canvas_states(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_updated_at ON public.canvas_states(updated_at DESC);

-- Image groups indexes
CREATE INDEX IF NOT EXISTS idx_image_groups_project_id ON public.image_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_image_groups_created_at ON public.image_groups(created_at DESC);

-- Group images composite index for joins
CREATE INDEX IF NOT EXISTS idx_group_images_group_id_image_id ON public.group_images(group_id, image_id);

-- Analysis cache indexes
CREATE INDEX IF NOT EXISTS idx_analysis_cache_image_hash ON public.analysis_cache(image_hash);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_created_at ON public.analysis_cache(created_at DESC);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON public.performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON public.performance_metrics(metric_type);

-- Error logs indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);

-- Security logs indexes
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);

-- Rate limits composite index for checking limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint_window ON public.rate_limits(user_id, endpoint, window_start);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used_at ON public.api_keys(last_used_at DESC);

-- ============================================================================
-- STANDARDIZE NAMING INCONSISTENCIES
-- ============================================================================

-- Add standardized columns to ux_analyses if missing (for consistency with analyses table)
DO $$
BEGIN
    -- Add user_id if it doesn't exist (for direct user reference)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ux_analyses' AND column_name = 'user_id') THEN
        ALTER TABLE public.ux_analyses ADD COLUMN user_id uuid;
        
        -- Populate user_id from related projects table
        UPDATE public.ux_analyses 
        SET user_id = p.user_id 
        FROM public.projects p 
        JOIN public.images i ON i.project_id = p.id 
        WHERE ux_analyses.image_id = i.id;
        
        -- Add index for the new column
        CREATE INDEX idx_ux_analyses_user_id ON public.ux_analyses(user_id);
    END IF;
END $$;

-- ============================================================================
-- ENHANCE RLS POLICIES FOR CONSISTENCY
-- ============================================================================

-- Update ux_analyses RLS policies to use direct user_id when available
DROP POLICY IF EXISTS "Users can view analyses for their images" ON public.ux_analyses;
CREATE POLICY "Users can view analyses for their images" ON public.ux_analyses
FOR SELECT USING (
    (user_id = auth.uid()) OR 
    (EXISTS (
        SELECT 1 FROM public.images i 
        JOIN public.projects p ON p.id = i.project_id 
        WHERE i.id = ux_analyses.image_id AND p.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Users can create analyses for their images" ON public.ux_analyses;
CREATE POLICY "Users can create analyses for their images" ON public.ux_analyses
FOR INSERT WITH CHECK (
    (user_id = auth.uid()) OR 
    (EXISTS (
        SELECT 1 FROM public.images i 
        JOIN public.projects p ON p.id = i.project_id 
        WHERE i.id = ux_analyses.image_id AND p.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Users can update analyses for their images" ON public.ux_analyses;
CREATE POLICY "Users can update analyses for their images" ON public.ux_analyses
FOR UPDATE USING (
    (user_id = auth.uid()) OR 
    (EXISTS (
        SELECT 1 FROM public.images i 
        JOIN public.projects p ON p.id = i.project_id 
        WHERE i.id = ux_analyses.image_id AND p.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Users can delete analyses for their images" ON public.ux_analyses;
CREATE POLICY "Users can delete analyses for their images" ON public.ux_analyses
FOR DELETE USING (
    (user_id = auth.uid()) OR 
    (EXISTS (
        SELECT 1 FROM public.images i 
        JOIN public.projects p ON p.id = i.project_id 
        WHERE i.id = ux_analyses.image_id AND p.user_id = auth.uid()
    ))
);

-- ============================================================================
-- ADD MISSING CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Add unique constraint to prevent duplicate analyses per image
CREATE UNIQUE INDEX IF NOT EXISTS idx_ux_analyses_image_id_unique 
ON public.ux_analyses(image_id) 
WHERE status = 'completed';

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

-- ============================================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- ============================================================================

-- Enhanced cleanup function for better performance
CREATE OR REPLACE FUNCTION public.enhanced_cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Clean up old security logs (keep 90 days)
    DELETE FROM public.security_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old rate limit records (keep 7 days)
    DELETE FROM public.rate_limits 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Clean up old canvas states (keep 30 days)
    DELETE FROM public.canvas_states 
    WHERE updated_at < NOW() - INTERVAL '30 days';
    
    -- Clean up failed/cancelled analyses older than 7 days
    DELETE FROM public.ux_analyses 
    WHERE status IN ('failed', 'cancelled') 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Clean up old performance metrics (keep 30 days)
    DELETE FROM public.performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old error logs (keep 60 days)
    DELETE FROM public.error_logs 
    WHERE created_at < NOW() - INTERVAL '60 days';
    
    -- Clean up old analysis cache (keep 24 hours)
    DELETE FROM public.analysis_cache 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- Log cleanup activity
    INSERT INTO public.security_logs (event_type, metadata)
    VALUES ('enhanced_data_cleanup', json_build_object(
        'timestamp', NOW(), 
        'tables_cleaned', 7,
        'cleanup_version', '2.0'
    ));
END;
$$;

-- Create function to analyze query performance
CREATE OR REPLACE FUNCTION public.analyze_query_performance()
RETURNS TABLE(
    table_name text,
    index_usage_ratio numeric,
    seq_scan_ratio numeric,
    recommendations text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        CASE 
            WHEN idx_tup_read + seq_tup_read > 0 
            THEN ROUND((idx_tup_read::numeric / (idx_tup_read + seq_tup_read)) * 100, 2)
            ELSE 0 
        END as index_usage_ratio,
        CASE 
            WHEN seq_scan + idx_scan > 0 
            THEN ROUND((seq_scan::numeric / (seq_scan + idx_scan)) * 100, 2)
            ELSE 0 
        END as seq_scan_ratio,
        CASE 
            WHEN seq_scan > idx_scan AND seq_scan > 100 
            THEN ARRAY['Consider adding indexes for frequently scanned columns']
            WHEN seq_tup_read > idx_tup_read * 10 
            THEN ARRAY['High sequential scan activity detected']
            ELSE ARRAY['Performance looks good']
        END as recommendations
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY seq_scan DESC;
END;
$$;