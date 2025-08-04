-- ============================================================================
-- CREATE MISSING FUNCTIONS AND COMPLETE SCHEMA OPTIMIZATION
-- ============================================================================

-- Create the auto-populate function first
CREATE OR REPLACE FUNCTION public.auto_populate_analysis_user_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
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
$$;

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
        'healthy'::text,
        jsonb_build_object('tables_analyzed', COUNT(*))
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- Check index usage
    RETURN QUERY
    SELECT 
        'index_usage'::text,
        CASE 
            WHEN AVG(CASE WHEN idx_scan + seq_scan > 0 THEN idx_scan::float / (idx_scan + seq_scan) ELSE 0 END) > 0.5 
            THEN 'healthy' 
            ELSE 'warning' 
        END::text,
        jsonb_build_object(
            'avg_index_usage_ratio', 
            ROUND(AVG(CASE WHEN idx_scan + seq_scan > 0 THEN idx_scan::float / (idx_scan + seq_scan) * 100 ELSE 0 END), 2)
        )
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public';
    
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
-- CREATE HELPER FUNCTION FOR ROBUST PIPELINE
-- ============================================================================

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