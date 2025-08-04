-- Fix database function security issues by adding search_path where missing

-- Update generate_project_slug function to include search_path
CREATE OR REPLACE FUNCTION public.generate_project_slug(project_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert name to slug format
  base_slug := lower(trim(regexp_replace(project_name, '[^a-zA-Z0-9\s-]', '', 'g')));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  -- Ensure slug is not empty
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'project';
  END IF;
  
  -- Check for uniqueness and add counter if needed
  final_slug := base_slug;
  
  WHILE EXISTS(SELECT 1 FROM public.projects WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$function$;

-- Update generate_random_project_name function to include search_path
CREATE OR REPLACE FUNCTION public.generate_random_project_name()
 RETURNS TABLE(name text, slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  adjectives TEXT[] := ARRAY['creative', 'innovative', 'modern', 'sleek', 'elegant', 'dynamic', 'vibrant', 'minimal', 'bold', 'fresh'];
  nouns TEXT[] := ARRAY['design', 'interface', 'experience', 'prototype', 'concept', 'project', 'study', 'analysis', 'review', 'exploration'];
  random_name TEXT;
  generated_slug TEXT;
BEGIN
  -- Generate random name
  random_name := 'UX ' || adjectives[1 + floor(random() * array_length(adjectives, 1))::int] || ' ' || 
                nouns[1 + floor(random() * array_length(nouns, 1))::int];
  
  -- Generate unique slug
  generated_slug := public.generate_project_slug(random_name);
  
  RETURN QUERY SELECT random_name, generated_slug;
END;
$function$;

-- Update validate_image_upload function to include search_path
CREATE OR REPLACE FUNCTION public.validate_image_upload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update validate_analysis_content function to include search_path
CREATE OR REPLACE FUNCTION public.validate_analysis_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;