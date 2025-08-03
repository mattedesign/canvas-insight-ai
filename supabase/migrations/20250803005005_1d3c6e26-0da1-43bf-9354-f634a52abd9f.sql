-- Fix security warning: Set search_path for function security
CREATE OR REPLACE FUNCTION public.update_storage_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;