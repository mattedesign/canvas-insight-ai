-- Fix security warnings: Set search_path for all functions

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  endpoint_name TEXT,
  max_requests INTEGER DEFAULT 100,
  window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix log_project_access function
CREATE OR REPLACE FUNCTION public.log_project_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_logs (event_type, user_id, metadata)
  VALUES ('project_access', auth.uid(), 
    json_build_object('project_id', COALESCE(NEW.id, OLD.id), 'action', TG_OP));
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix validate_image_upload function
CREATE OR REPLACE FUNCTION public.validate_image_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Log image upload
  INSERT INTO public.security_logs (event_type, user_id, metadata)
  VALUES ('image_uploaded', auth.uid(), 
    json_build_object('image_id', NEW.id, 'filename', NEW.filename, 'size', NEW.file_size));
  
  -- Validate file size (max 50MB)
  IF NEW.file_size IS NOT NULL AND NEW.file_size > 52428800 THEN
    RAISE EXCEPTION 'File size exceeds maximum limit of 50MB';
  END IF;
  
  -- Validate file type
  IF NEW.file_type IS NOT NULL AND NEW.file_type NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN
    RAISE EXCEPTION 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix validate_analysis_content function
CREATE OR REPLACE FUNCTION public.validate_analysis_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Basic content validation
  IF NEW.user_context IS NOT NULL AND length(NEW.user_context) > 10000 THEN
    RAISE EXCEPTION 'User context too long (max 10,000 characters)';
  END IF;
  
  -- Log analysis creation
  INSERT INTO public.security_logs (event_type, user_id, metadata)
  VALUES ('analysis_created', auth.uid(), 
    json_build_object('analysis_id', NEW.id, 'image_id', NEW.image_id));
  
  RETURN NEW;
END;
$$;

-- Fix cleanup_old_data function
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Log cleanup activity
  INSERT INTO public.security_logs (event_type, metadata)
  VALUES ('data_cleanup', json_build_object('timestamp', NOW(), 'tables_cleaned', 3));
END;
$$;

-- Fix validate_user_permission function
CREATE OR REPLACE FUNCTION public.validate_user_permission(
  operation TEXT,
  resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix audit_trigger_function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, old_values, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;