-- Add status column to ux_analyses table for tracking analysis progress
ALTER TABLE public.ux_analyses 
ADD COLUMN status text DEFAULT 'completed' CHECK (status IN ('processing', 'analyzing', 'completed', 'error'));

-- Add index for better performance when filtering by status
CREATE INDEX idx_ux_analyses_status ON public.ux_analyses(status);

-- Enable realtime for ux_analyses table
ALTER TABLE public.ux_analyses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ux_analyses;

-- Update existing analyses to have completed status
UPDATE public.ux_analyses SET status = 'completed' WHERE status IS NULL;