-- Create metrics_history table for tracking dashboard metrics over time
CREATE TABLE public.metrics_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_analyses INTEGER NOT NULL DEFAULT 0,
  total_images INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  category_scores JSONB NOT NULL DEFAULT '{}',
  issue_distribution JSONB NOT NULL DEFAULT '{}',
  analysis_success_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.metrics_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own metrics history" 
ON public.metrics_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert metrics history" 
ON public.metrics_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_metrics_history_project_recorded 
ON public.metrics_history(project_id, recorded_at DESC);

CREATE INDEX idx_metrics_history_user_recorded 
ON public.metrics_history(user_id, recorded_at DESC);

-- Create function to calculate metric trends
CREATE OR REPLACE FUNCTION public.calculate_metric_trend(
  p_project_id UUID,
  p_metric_name TEXT,
  p_days_back INTEGER DEFAULT 7
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_value NUMERIC;
  previous_value NUMERIC;
  trend_percentage NUMERIC;
  confidence_score NUMERIC;
  result JSONB;
BEGIN
  -- Get current period average (last day)
  SELECT AVG(
    CASE 
      WHEN p_metric_name = 'average_score' THEN average_score
      WHEN p_metric_name = 'total_issues' THEN total_issues
      WHEN p_metric_name = 'analysis_success_rate' THEN analysis_success_rate
      ELSE 0
    END
  ) INTO current_value
  FROM public.metrics_history
  WHERE project_id = p_project_id
    AND recorded_at >= NOW() - INTERVAL '1 day';
    
  -- Get previous period average
  SELECT AVG(
    CASE 
      WHEN p_metric_name = 'average_score' THEN average_score
      WHEN p_metric_name = 'total_issues' THEN total_issues
      WHEN p_metric_name = 'analysis_success_rate' THEN analysis_success_rate
      ELSE 0
    END
  ) INTO previous_value
  FROM public.metrics_history
  WHERE project_id = p_project_id
    AND recorded_at >= NOW() - INTERVAL '1 day' - (p_days_back || ' days')::INTERVAL
    AND recorded_at < NOW() - INTERVAL '1 day';
    
  -- Calculate trend percentage
  IF previous_value IS NOT NULL AND previous_value > 0 THEN
    trend_percentage := ROUND((current_value - previous_value) / previous_value * 100, 1);
  ELSE
    trend_percentage := 0;
  END IF;
  
  -- Calculate confidence based on data points available
  SELECT COUNT(*) INTO confidence_score
  FROM public.metrics_history
  WHERE project_id = p_project_id
    AND recorded_at >= NOW() - (p_days_back || ' days')::INTERVAL;
    
  confidence_score := LEAST(confidence_score / 10.0, 1.0); -- Max confidence at 10+ data points
  
  result := jsonb_build_object(
    'current_value', COALESCE(current_value, 0),
    'previous_value', COALESCE(previous_value, 0),
    'trend_percentage', COALESCE(trend_percentage, 0),
    'trend_direction', CASE 
      WHEN trend_percentage > 0 THEN 'up'
      WHEN trend_percentage < 0 THEN 'down'
      ELSE 'stable'
    END,
    'confidence_score', COALESCE(confidence_score, 0),
    'has_sufficient_data', confidence_score >= 0.3
  );
  
  RETURN result;
END;
$$;

-- Create function to record current metrics snapshot
CREATE OR REPLACE FUNCTION public.record_metrics_snapshot(p_project_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_total_analyses INTEGER;
  v_total_images INTEGER;
  v_average_score NUMERIC;
  v_total_issues INTEGER;
  v_category_scores JSONB;
  v_issue_distribution JSONB;
  v_success_rate NUMERIC;
  v_snapshot_id UUID;
BEGIN
  -- Get project owner
  SELECT user_id INTO v_user_id
  FROM public.projects
  WHERE id = p_project_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;
  
  -- Calculate current metrics
  -- Get images for this project
  WITH project_images AS (
    SELECT id FROM public.images WHERE project_id = p_project_id
  ),
  current_analyses AS (
    SELECT * FROM public.ux_analyses 
    WHERE image_id IN (SELECT id FROM project_images)
      AND created_at >= NOW() - INTERVAL '24 hours'
  )
  SELECT 
    COUNT(*),
    COUNT(DISTINCT image_id),
    AVG(COALESCE((summary->>'overallScore')::numeric, 0)),
    SUM(jsonb_array_length(COALESCE(suggestions, '[]'::jsonb))),
    jsonb_build_object(
      'usability', AVG(COALESCE((summary->'categoryScores'->>'usability')::numeric, 0)),
      'accessibility', AVG(COALESCE((summary->'categoryScores'->>'accessibility')::numeric, 0)),
      'visual', AVG(COALESCE((summary->'categoryScores'->>'visual')::numeric, 0)),
      'content', AVG(COALESCE((summary->'categoryScores'->>'content')::numeric, 0))
    ),
    jsonb_build_object(
      'high', COUNT(*) FILTER (WHERE suggestions::text LIKE '%"impact":"high"%'),
      'medium', COUNT(*) FILTER (WHERE suggestions::text LIKE '%"impact":"medium"%'),
      'low', COUNT(*) FILTER (WHERE suggestions::text LIKE '%"impact":"low"%')
    )
  INTO v_total_analyses, v_total_images, v_average_score, v_total_issues, v_category_scores, v_issue_distribution
  FROM current_analyses;
  
  -- Calculate success rate (analyses that completed successfully)
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*))
      ELSE 100.0 
    END
  INTO v_success_rate
  FROM public.ux_analyses ua
  JOIN public.images i ON i.id = ua.image_id
  WHERE i.project_id = p_project_id
    AND ua.created_at >= NOW() - INTERVAL '24 hours';
  
  -- Insert metrics snapshot
  INSERT INTO public.metrics_history (
    project_id,
    user_id,
    total_analyses,
    total_images,
    average_score,
    total_issues,
    category_scores,
    issue_distribution,
    analysis_success_rate
  ) VALUES (
    p_project_id,
    v_user_id,
    COALESCE(v_total_analyses, 0),
    COALESCE(v_total_images, 0),
    COALESCE(v_average_score, 0),
    COALESCE(v_total_issues, 0),
    COALESCE(v_category_scores, '{}'),
    COALESCE(v_issue_distribution, '{}'),
    COALESCE(v_success_rate, 100)
  ) RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;