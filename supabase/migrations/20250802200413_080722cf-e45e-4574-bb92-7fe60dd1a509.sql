-- Create storage_data table for CentralizedStorageService
CREATE TABLE public.storage_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storage_data ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own storage data" 
ON public.storage_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own storage data" 
ON public.storage_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storage data" 
ON public.storage_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storage data" 
ON public.storage_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster key lookups
CREATE INDEX idx_storage_data_key ON public.storage_data(key);
CREATE INDEX idx_storage_data_user_id ON public.storage_data(user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_storage_data_updated_at
BEFORE UPDATE ON public.storage_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();