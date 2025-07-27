-- Core project structure
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image storage and metadata
CREATE TABLE images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  dimensions JSONB NOT NULL, -- {width, height}
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UX analysis results
CREATE TABLE ux_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  user_context TEXT,
  visual_annotations JSONB NOT NULL DEFAULT '[]',
  suggestions JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image grouping system
CREATE TABLE image_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  position JSONB NOT NULL, -- {x, y}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE group_images (
  group_id UUID REFERENCES image_groups(id) ON DELETE CASCADE,
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, image_id)
);

-- Group analysis workflow
CREATE TABLE group_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES image_groups(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  summary JSONB NOT NULL DEFAULT '{}',
  insights JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  patterns JSONB NOT NULL DEFAULT '{}',
  parent_analysis_id UUID REFERENCES group_analyses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
CREATE POLICY "Users can view their own projects" 
ON projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON projects FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for images table
CREATE POLICY "Users can view images in their projects" 
ON images FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = images.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create images in their projects" 
ON images FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = images.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update images in their projects" 
ON images FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = images.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete images in their projects" 
ON images FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = images.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for ux_analyses table
CREATE POLICY "Users can view analyses for their images" 
ON ux_analyses FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM images 
    JOIN projects ON projects.id = images.project_id
    WHERE images.id = ux_analyses.image_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create analyses for their images" 
ON ux_analyses FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM images 
    JOIN projects ON projects.id = images.project_id
    WHERE images.id = ux_analyses.image_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update analyses for their images" 
ON ux_analyses FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM images 
    JOIN projects ON projects.id = images.project_id
    WHERE images.id = ux_analyses.image_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete analyses for their images" 
ON ux_analyses FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM images 
    JOIN projects ON projects.id = images.project_id
    WHERE images.id = ux_analyses.image_id 
    AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for image_groups table
CREATE POLICY "Users can view groups in their projects" 
ON image_groups FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = image_groups.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups in their projects" 
ON image_groups FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = image_groups.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update groups in their projects" 
ON image_groups FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = image_groups.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete groups in their projects" 
ON image_groups FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = image_groups.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for group_images table
CREATE POLICY "Users can view group-image associations for their projects" 
ON group_images FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM image_groups 
    JOIN projects ON projects.id = image_groups.project_id
    WHERE image_groups.id = group_images.group_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create group-image associations for their projects" 
ON group_images FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM image_groups 
    JOIN projects ON projects.id = image_groups.project_id
    WHERE image_groups.id = group_images.group_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete group-image associations for their projects" 
ON group_images FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM image_groups 
    JOIN projects ON projects.id = image_groups.project_id
    WHERE image_groups.id = group_images.group_id 
    AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for group_analyses table
CREATE POLICY "Users can view group analyses for their projects" 
ON group_analyses FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM image_groups 
    JOIN projects ON projects.id = image_groups.project_id
    WHERE image_groups.id = group_analyses.group_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create group analyses for their projects" 
ON group_analyses FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM image_groups 
    JOIN projects ON projects.id = image_groups.project_id
    WHERE image_groups.id = group_analyses.group_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update group analyses for their projects" 
ON group_analyses FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM image_groups 
    JOIN projects ON projects.id = image_groups.project_id
    WHERE image_groups.id = group_analyses.group_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete group analyses for their projects" 
ON group_analyses FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM image_groups 
    JOIN projects ON projects.id = image_groups.project_id
    WHERE image_groups.id = group_analyses.group_id 
    AND projects.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for image uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Create storage policies for image uploads
CREATE POLICY "Images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'images');

CREATE POLICY "Users can upload images to their folder" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);