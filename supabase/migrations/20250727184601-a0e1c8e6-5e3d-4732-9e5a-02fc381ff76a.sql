-- Create canvas_states table for persisting canvas viewport and node positions
CREATE TABLE canvas_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  node_positions JSONB NOT NULL DEFAULT '{}',
  selected_nodes JSONB NOT NULL DEFAULT '[]',
  canvas_settings JSONB NOT NULL DEFAULT '{"showAnnotations": true, "tool": "cursor"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Enable Row Level Security
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canvas_states table
CREATE POLICY "Users can view canvas state for their projects" 
ON canvas_states FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = canvas_states.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create canvas state for their projects" 
ON canvas_states FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = canvas_states.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update canvas state for their projects" 
ON canvas_states FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = canvas_states.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete canvas state for their projects" 
ON canvas_states FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = canvas_states.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates on canvas_states
CREATE TRIGGER update_canvas_states_updated_at
  BEFORE UPDATE ON canvas_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();