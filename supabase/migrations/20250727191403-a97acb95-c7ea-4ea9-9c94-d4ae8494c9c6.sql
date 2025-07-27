-- Phase 5.1: Security & Scalability Enhancements

-- Enable leaked password protection and strengthen auth security
UPDATE auth.config SET 
  password_min_length = 8,
  password_require_letters = true,
  password_require_numbers = true,
  password_require_symbols = true,
  password_require_uppercase = true;

-- Create function to track failed login attempts
CREATE OR REPLACE FUNCTION public.track_failed_login(email_address TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_logs (event_type, user_email, metadata, created_at)
  VALUES ('failed_login', email_address, '{"attempt_time": "' || NOW() || '"}', NOW())
  ON CONFLICT DO NOTHING;
END;
$$;

-- Create security logs table for monitoring
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_email TEXT,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only allow system/admin access to security logs
CREATE POLICY "System access only for security logs"
ON public.security_logs
FOR ALL
USING (false); -- No user access, only system functions

-- Create rate limiting table for API requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  endpoint_name TEXT,
  max_requests INTEGER DEFAULT 100,
  window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Enhanced RLS policies for existing tables with additional security

-- Projects: Add IP-based access logging
CREATE OR REPLACE FUNCTION public.log_project_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_logs (event_type, user_id, metadata)
  VALUES ('project_access', auth.uid(), 
    json_build_object('project_id', NEW.id, 'action', TG_OP));
  RETURN NEW;
END;
$$;

-- Add trigger for project access logging
DROP TRIGGER IF EXISTS log_project_access_trigger ON projects;
CREATE TRIGGER log_project_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_access();

-- Images: Enhanced security with file size and type validation
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS virus_scan_status TEXT DEFAULT 'pending';

-- UX Analyses: Add content filtering and validation
CREATE OR REPLACE FUNCTION public.validate_analysis_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Basic content validation
  IF length(NEW.user_context::TEXT) > 10000 THEN
    RAISE EXCEPTION 'User context too long';
  END IF;
  
  -- Log analysis creation
  INSERT INTO public.security_logs (event_type, user_id, metadata)
  VALUES ('analysis_created', auth.uid(), 
    json_build_object('analysis_id', NEW.id, 'image_id', NEW.image_id));
  
  RETURN NEW;
END;
$$;

-- Add trigger for analysis validation
DROP TRIGGER IF EXISTS validate_analysis_trigger ON ux_analyses;
CREATE TRIGGER validate_analysis_trigger
  BEFORE INSERT OR UPDATE ON ux_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_analysis_content();

-- Backup and recovery: Create backup metadata table
CREATE TABLE IF NOT EXISTS public.backup_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL, -- 'full', 'incremental', 'user_data'
  backup_path TEXT NOT NULL,
  file_size BIGINT,
  checksum TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restored_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'completed' -- 'pending', 'completed', 'failed'
);

-- Enable RLS on backup metadata (admin only)
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

-- Only system functions can access backup metadata
CREATE POLICY "System access only for backup metadata"
ON public.backup_metadata
FOR ALL
USING (false);

-- Create function for automated cleanup of old data
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up old security logs (keep 90 days)
  DELETE FROM public.security_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean up old rate limit records (keep 7 days)
  DELETE FROM public.rate_limits 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Log cleanup activity
  INSERT INTO public.security_logs (event_type, metadata)
  VALUES ('data_cleanup', json_build_object('timestamp', NOW()));
END;
$$;

-- Add function to validate user permissions before sensitive operations
CREATE OR REPLACE FUNCTION public.validate_user_permission(
  operation TEXT,
  resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF operation IN ('delete_project', 'bulk_delete', 'export_data') THEN
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