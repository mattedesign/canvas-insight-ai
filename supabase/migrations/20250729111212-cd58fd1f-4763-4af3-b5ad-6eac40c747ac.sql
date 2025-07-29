-- Phase 1: Schema Alignment - Add missing columns to canvas_states table

-- Add missing columns to canvas_states table
ALTER TABLE public.canvas_states 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS edges JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ui_state JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Update existing records to have proper user_id from projects
UPDATE public.canvas_states 
SET user_id = p.user_id 
FROM public.projects p 
WHERE canvas_states.project_id = p.id 
AND canvas_states.user_id IS NULL;

-- Make user_id NOT NULL after populating existing records
ALTER TABLE public.canvas_states 
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can create canvas state for their projects" ON public.canvas_states;
DROP POLICY IF EXISTS "Users can view canvas state for their projects" ON public.canvas_states;
DROP POLICY IF EXISTS "Users can update canvas state for their projects" ON public.canvas_states;
DROP POLICY IF EXISTS "Users can delete canvas state for their projects" ON public.canvas_states;

-- Create new RLS policies that work with user_id directly
CREATE POLICY "Users can create their own canvas states" 
ON public.canvas_states 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own canvas states" 
ON public.canvas_states 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvas states" 
ON public.canvas_states 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvas states" 
ON public.canvas_states 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_canvas_states_user_project 
ON public.canvas_states(user_id, project_id);

-- Add a constraint to ensure one canvas state per user per project
ALTER TABLE public.canvas_states 
DROP CONSTRAINT IF EXISTS unique_user_project_canvas;

ALTER TABLE public.canvas_states 
ADD CONSTRAINT unique_user_project_canvas 
UNIQUE (user_id, project_id);