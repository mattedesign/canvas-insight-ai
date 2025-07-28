-- Fix function search path security issue for generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  RETURN 'uxap_' || encode(gen_random_bytes(32), 'hex');
END;
$$;