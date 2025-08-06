-- Create fallback_events table for tracking fallback usage
CREATE TABLE public.fallback_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  service_name TEXT NOT NULL,
  fallback_type TEXT NOT NULL,
  original_error TEXT,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_fallback_events_user_id ON public.fallback_events(user_id);
CREATE INDEX idx_fallback_events_service_name ON public.fallback_events(service_name);
CREATE INDEX idx_fallback_events_created_at ON public.fallback_events(created_at);

-- Enable RLS
ALTER TABLE public.fallback_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own fallback events" 
ON public.fallback_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert fallback events" 
ON public.fallback_events 
FOR INSERT 
WITH CHECK (true);

-- Admin can view all fallback events
CREATE POLICY "Admins can view all fallback events" 
ON public.fallback_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() = auth.users.id 
    AND auth.users.email = 'admin@example.com'
  )
);