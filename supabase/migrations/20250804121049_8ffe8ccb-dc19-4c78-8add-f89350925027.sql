-- Fix remaining security issues

-- Remove the potentially problematic view and recreate it as a secure function instead
DROP VIEW IF EXISTS public.analysis_job_status;

-- Create a secure function to get analysis job status instead of a view
CREATE OR REPLACE FUNCTION public.get_analysis_job_status(p_job_id uuid DEFAULT NULL)
 RETURNS TABLE(
   id uuid,
   user_id uuid,
   image_id text,
   status text,
   progress integer,
   created_at timestamp with time zone,
   error text,
   completed_ants bigint,
   total_ants bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user can only access their own job status
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied. Authentication required.';
  END IF;

  RETURN QUERY
  SELECT 
    aj.id,
    aj.user_id,
    aj.image_id,
    aj.status,
    aj.progress,
    aj.created_at,
    aj.error,
    COUNT(CASE WHEN war.status = 'completed' THEN 1 END) AS completed_ants,
    COUNT(war.id) AS total_ants
  FROM analysis_jobs aj
  LEFT JOIN worker_ant_results war ON aj.id = war.job_id
  WHERE aj.user_id = auth.uid()
    AND (p_job_id IS NULL OR aj.id = p_job_id)
  GROUP BY aj.id, aj.user_id, aj.image_id, aj.status, aj.progress, aj.created_at, aj.error;
END;
$function$;

-- Update remaining functions to have secure search_path
CREATE OR REPLACE FUNCTION public.log_project_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_logs (event_type, user_id, metadata)
  VALUES ('project_access', auth.uid(), 
    json_build_object('project_id', COALESCE(NEW.id, OLD.id), 'action', TG_OP));
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_ux_analysis_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure image_id exists when provided
  IF NEW.image_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.images WHERE id = NEW.image_id) THEN
      RAISE EXCEPTION 'Invalid image_id: % does not exist in images table', NEW.image_id;
    END IF;
  END IF;

  -- Validate JSON structure for visual_annotations
  IF NEW.visual_annotations IS NOT NULL THEN
    IF NOT jsonb_typeof(NEW.visual_annotations) = 'array' THEN
      RAISE EXCEPTION 'visual_annotations must be a JSON array';
    END IF;
  END IF;

  -- Validate JSON structure for suggestions
  IF NEW.suggestions IS NOT NULL THEN
    IF NOT jsonb_typeof(NEW.suggestions) = 'array' THEN
      RAISE EXCEPTION 'suggestions must be a JSON array';
    END IF;
  END IF;

  -- Validate JSON structure for summary
  IF NEW.summary IS NOT NULL THEN
    IF NOT jsonb_typeof(NEW.summary) = 'object' THEN
      RAISE EXCEPTION 'summary must be a JSON object';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;