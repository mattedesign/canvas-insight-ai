-- Create RPC functions for analysis cache operations

-- Function to get cached analysis
CREATE OR REPLACE FUNCTION get_cached_analysis(p_image_hash text)
RETURNS TABLE(results jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ac.results
  FROM analysis_cache ac
  WHERE ac.image_hash = p_image_hash
    AND ac.created_at >= NOW() - INTERVAL '24 hours'
  LIMIT 1;
END;
$$;

-- Function to upsert cached analysis
CREATE OR REPLACE FUNCTION upsert_cached_analysis(
  p_image_hash text,
  p_results jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO analysis_cache (image_hash, results, created_at)
  VALUES (p_image_hash, p_results, NOW())
  ON CONFLICT (image_hash)
  DO UPDATE SET
    results = EXCLUDED.results,
    created_at = EXCLUDED.created_at;
END;
$$;

-- Function to clear expired cache
CREATE OR REPLACE FUNCTION clear_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM analysis_cache
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;