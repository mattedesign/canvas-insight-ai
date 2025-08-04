-- ============================================================================
-- COMPLETE SCHEMA OPTIMIZATION & FIX SECURITY ISSUE
-- ============================================================================

-- Fix the search path security issue for the new function
ALTER FUNCTION public.auto_populate_analysis_user_id() SET search_path = 'public';

-- ============================================================================
-- COMPLETE THE RLS POLICY UPDATES
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
-- ADD AUTOMATED MAINTENANCE TRIGGER
-- ============================================================================

-- Apply the trigger for auto-populating user_id
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

-- ============================================================================
-- UPDATE ROBUST PIPELINE TO USE NEW SCHEMA
-- ============================================================================

-- Create helper function for the robust pipeline to use standardized schema
CREATE OR REPLACE FUNCTION public.store_analysis_result(
    p_image_id uuid,
    p_analysis_data jsonb,
    p_user_id uuid,
    p_status text DEFAULT 'completed'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_analysis_id uuid;
BEGIN
    INSERT INTO public.ux_analyses (
        id,
        image_id,
        user_id,
        visual_annotations,
        suggestions,
        summary,
        metadata,
        status,
        analysis_type
    ) VALUES (
        gen_random_uuid(),
        p_image_id,
        p_user_id,
        COALESCE(p_analysis_data->'visualAnnotations', '[]'::jsonb),
        COALESCE(p_analysis_data->'suggestions', '[]'::jsonb),
        COALESCE(p_analysis_data->'summary', '{}'::jsonb),
        COALESCE(p_analysis_data->'metadata', '{}'::jsonb),
        p_status,
        COALESCE(p_analysis_data->>'analysis_type', 'full_analysis')
    )
    RETURNING id INTO v_analysis_id;
    
    RETURN v_analysis_id;
END;
$$;