-- Add slug column to projects table
ALTER TABLE public.projects 
ADD COLUMN slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX idx_projects_slug ON public.projects(slug);

-- Function to generate slug from project name
CREATE OR REPLACE FUNCTION public.generate_project_slug(project_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to generate random project name and slug
CREATE OR REPLACE FUNCTION public.generate_random_project_name()
RETURNS TABLE(name TEXT, slug TEXT)
LANGUAGE plpgsql
AS $$
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
$$;

-- Backfill existing projects with slugs
DO $$
DECLARE
  project_record RECORD;
  new_slug TEXT;
BEGIN
  FOR project_record IN SELECT id, name FROM public.projects WHERE slug IS NULL LOOP
    new_slug := public.generate_project_slug(project_record.name);
    UPDATE public.projects SET slug = new_slug WHERE id = project_record.id;
  END LOOP;
END;
$$;

-- Make slug column not null after backfill
ALTER TABLE public.projects 
ALTER COLUMN slug SET NOT NULL;