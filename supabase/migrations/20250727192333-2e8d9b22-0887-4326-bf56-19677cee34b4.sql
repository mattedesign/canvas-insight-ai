-- Create monitoring and analytics tables for Phase 5.2

-- Performance metrics table
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('page_load', 'api_response', 'user_action', 'error', 'performance')),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL
);

-- User events table
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click', 'upload', 'analysis', 'export', 'auth')),
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL
);

-- Error logs table
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_type TEXT NOT NULL CHECK (error_type IN ('javascript', 'api', 'network', 'validation')),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('performance', 'error', 'security', 'system')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security on all tables
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Performance metrics policies
CREATE POLICY "Users can insert their own performance metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view performance metrics for their projects" 
ON public.performance_metrics 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- User events policies
CREATE POLICY "Users can insert their own events" 
ON public.user_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own events" 
ON public.user_events 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Error logs policies
CREATE POLICY "Users can insert error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own error logs" 
ON public.error_logs 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Alerts policies
CREATE POLICY "Users can view all alerts" 
ON public.alerts 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update alerts they acknowledge/resolve" 
ON public.alerts 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_performance_metrics_created_at ON public.performance_metrics(created_at);
CREATE INDEX idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_session ON public.performance_metrics(session_id);

CREATE INDEX idx_user_events_created_at ON public.user_events(created_at);
CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX idx_user_events_type ON public.user_events(event_type);
CREATE INDEX idx_user_events_session ON public.user_events(session_id);

CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX idx_error_logs_session ON public.error_logs(session_id);

CREATE INDEX idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX idx_alerts_resolved ON public.alerts(resolved);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_type ON public.alerts(type);

-- Create function to clean up old monitoring data (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Delete performance metrics older than 30 days
  DELETE FROM public.performance_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete user events older than 90 days
  DELETE FROM public.user_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete error logs older than 60 days
  DELETE FROM public.error_logs 
  WHERE created_at < NOW() - INTERVAL '60 days';
  
  -- Delete resolved alerts older than 30 days
  DELETE FROM public.alerts 
  WHERE resolved = true AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;