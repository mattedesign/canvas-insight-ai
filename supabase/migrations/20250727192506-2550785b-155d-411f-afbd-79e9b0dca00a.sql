-- Fix the security issue for cleanup_monitoring_data function
-- by setting the search_path explicitly

DROP FUNCTION IF EXISTS public.cleanup_monitoring_data();

CREATE OR REPLACE FUNCTION public.cleanup_monitoring_data()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';