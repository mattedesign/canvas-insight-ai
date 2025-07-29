-- Phase 2: Core Database Schema for UX Analysis Platform
-- This creates the complete database structure for persistent storage

-- Enable RLS for all tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Core project structure
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Image storage and metadata
CREATE TABLE IF NOT EXISTS public.images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  dimensions JSONB NOT NULL DEFAULT '{"width": 0, "height": 0}',
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed' CHECK (status IN ('uploading', 'completed', 'error')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on images
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Images RLS policies
CREATE POLICY "Users can view their own images" 
ON public.images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own images" 
ON public.images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images" 
ON public.images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" 
ON public.images 
FOR DELETE 
USING (auth.uid() = user_id);

-- UX analysis results
CREATE TABLE IF NOT EXISTS public.ux_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_context TEXT,
  visual_annotations JSONB NOT NULL DEFAULT '[]',
  suggestions JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on analyses
ALTER TABLE public.ux_analyses ENABLE ROW LEVEL SECURITY;

-- Analyses RLS policies
CREATE POLICY "Users can view their own analyses" 
ON public.ux_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" 
ON public.ux_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" 
ON public.ux_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
ON public.ux_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Image grouping system
CREATE TABLE IF NOT EXISTS public.image_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  position JSONB NOT NULL DEFAULT '{"x": 100, "y": 100}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on groups
ALTER TABLE public.image_groups ENABLE ROW LEVEL SECURITY;

-- Groups RLS policies
CREATE POLICY "Users can view their own groups" 
ON public.image_groups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own groups" 
ON public.image_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups" 
ON public.image_groups 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups" 
ON public.image_groups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Many-to-many relationship for group images
CREATE TABLE IF NOT EXISTS public.group_images (
  group_id UUID REFERENCES public.image_groups(id) ON DELETE CASCADE,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (group_id, image_id)
);

-- Enable RLS on group_images
ALTER TABLE public.group_images ENABLE ROW LEVEL SECURITY;

-- Group images RLS policies - users can only access through their groups
CREATE POLICY "Users can view group images through their groups" 
ON public.group_images 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.image_groups 
    WHERE image_groups.id = group_id 
    AND image_groups.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add images to their groups" 
ON public.group_images 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.image_groups 
    WHERE image_groups.id = group_id 
    AND image_groups.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove images from their groups" 
ON public.group_images 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.image_groups 
    WHERE image_groups.id = group_id 
    AND image_groups.user_id = auth.uid()
  )
);

-- Group analysis workflow
CREATE TABLE IF NOT EXISTS public.group_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.image_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  summary JSONB NOT NULL DEFAULT '{}',
  insights JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  patterns JSONB NOT NULL DEFAULT '{}',
  parent_analysis_id UUID REFERENCES public.group_analyses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on group analyses
ALTER TABLE public.group_analyses ENABLE ROW LEVEL SECURITY;

-- Group analyses RLS policies
CREATE POLICY "Users can view their own group analyses" 
ON public.group_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own group analyses" 
ON public.group_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own group analyses" 
ON public.group_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group analyses" 
ON public.group_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Generated concepts table
CREATE TABLE IF NOT EXISTS public.generated_concepts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  analysis_id UUID REFERENCES public.ux_analyses(id) ON DELETE SET NULL,
  improvements JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on concepts
ALTER TABLE public.generated_concepts ENABLE ROW LEVEL SECURITY;

-- Concepts RLS policies
CREATE POLICY "Users can view their own concepts" 
ON public.generated_concepts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own concepts" 
ON public.generated_concepts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concepts" 
ON public.generated_concepts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concepts" 
ON public.generated_concepts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Canvas state persistence
CREATE TABLE IF NOT EXISTS public.canvas_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  ui_state JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on canvas states
ALTER TABLE public.canvas_states ENABLE ROW LEVEL SECURITY;

-- Canvas states RLS policies
CREATE POLICY "Users can view their own canvas states" 
ON public.canvas_states 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own canvas states" 
ON public.canvas_states 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvas states" 
ON public.canvas_states 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvas states" 
ON public.canvas_states 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger to update timestamps
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canvas_states_updated_at
BEFORE UPDATE ON public.canvas_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Validation triggers
CREATE TRIGGER validate_image_metadata_trigger
BEFORE INSERT OR UPDATE ON public.images
FOR EACH ROW
EXECUTE FUNCTION public.validate_image_metadata();

CREATE TRIGGER validate_ux_analysis_data_trigger
BEFORE INSERT OR UPDATE ON public.ux_analyses
FOR EACH ROW
EXECUTE FUNCTION public.validate_ux_analysis_data();

CREATE TRIGGER validate_image_upload_trigger
BEFORE INSERT OR UPDATE ON public.images
FOR EACH ROW
EXECUTE FUNCTION public.validate_image_upload();

CREATE TRIGGER validate_analysis_content_trigger
BEFORE INSERT OR UPDATE ON public.ux_analyses
FOR EACH ROW
EXECUTE FUNCTION public.validate_analysis_content();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_project_id ON public.images(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_image_id ON public.ux_analyses(image_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.ux_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON public.image_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_project_id ON public.image_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_group_analyses_group_id ON public.group_analyses(group_id);
CREATE INDEX IF NOT EXISTS idx_concepts_user_id ON public.generated_concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_project_id ON public.canvas_states(project_id);