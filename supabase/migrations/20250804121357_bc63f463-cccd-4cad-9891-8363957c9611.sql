-- Fix remaining functions without search_path set

CREATE OR REPLACE FUNCTION public.check_rate_limit(endpoint_name text, max_requests integer DEFAULT 100, window_minutes integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  window_start_time TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN false; -- Deny unauthenticated requests
  END IF;

  -- Calculate window start
  window_start_time := date_trunc('hour', NOW()) + 
    (EXTRACT(MINUTE FROM NOW())::INTEGER / window_minutes) * (window_minutes || ' minutes')::INTERVAL;

  -- Get or create rate limit record
  INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
  VALUES (current_user_id, endpoint_name, 1, window_start_time)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    created_at = NOW()
  RETURNING request_count INTO current_count;

  -- Check if limit exceeded
  IF current_count > max_requests THEN
    -- Log rate limit violation
    INSERT INTO public.security_logs (event_type, user_id, metadata)
    VALUES ('rate_limit_exceeded', current_user_id, 
      json_build_object('endpoint', endpoint_name, 'count', current_count, 'limit', max_requests));
    
    RETURN false;
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_monitoring_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete performance metrics older than 30 days
  DELETE FROM public.performance_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete user events older than 90 days
  DELETE FROM public.user_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete error logs older than 60 days
  DELETE FROM public.error_logs 
  WHERE created_at < NOW() - INTERVAL '60 days';
  
  -- Delete resolved alerts older than 30 days
  DELETE FROM public.alerts 
  WHERE resolved = true AND resolved_at < NOW() - INTERVAL '30 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Log cleanup activity
  INSERT INTO public.security_logs (event_type, metadata)
  VALUES ('data_cleanup', json_build_object('timestamp', NOW(), 'tables_cleaned', 3));
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_expired_cache()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.analysis_cache
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_api_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'uxap_' || encode(gen_random_bytes(32), 'hex');
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_storage_last_accessed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_cached_analysis(p_image_hash text, p_results jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.analysis_cache (image_hash, results, created_at)
  VALUES (p_image_hash, p_results, NOW())
  ON CONFLICT (image_hash)
  DO UPDATE SET
    results = EXCLUDED.results,
    created_at = EXCLUDED.created_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_user_permission(operation text, resource_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Must be authenticated
  IF current_user_id IS NULL THEN
    INSERT INTO public.security_logs (event_type, metadata)
    VALUES ('unauthorized_access_attempt', 
      json_build_object('operation', operation, 'resource_id', resource_id));
    RETURN false;
  END IF;
  
  -- Rate limit check for sensitive operations
  IF operation IN ('delete_project', 'bulk_delete', 'export_data', 'ai_analysis') THEN
    IF NOT public.check_rate_limit(operation, 10, 60) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Log successful permission validation
  INSERT INTO public.security_logs (event_type, user_id, metadata)
  VALUES ('permission_validated', current_user_id, 
    json_build_object('operation', operation, 'resource_id', resource_id));
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_image_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;