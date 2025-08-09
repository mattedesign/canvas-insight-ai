import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AnalysisJob = {
  id: string;
  user_id: string | null;
  image_id: string;
  image_url: string;
  project_id: string | null;
  user_context: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number | null;
  current_stage: string | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
};

export function useAnalysisJob(jobId: string | null) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState<boolean>(!!jobId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      setError(null);
      return;
    }

    let channel: any;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (!mounted) return;
      if (error) setError(error.message);
      setJob((data as AnalysisJob) ?? null);
      console.debug('[useAnalysisJob] initial load', { jobId, status: (data as any)?.status, stage: (data as any)?.current_stage });
      setLoading(false);
    };

    const subscribe = async () => {
      channel = supabase
        .channel(`analysis-job-${jobId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${jobId}`,
        }, (payload: any) => {
          const updated = payload.new as AnalysisJob;
          console.debug('[useAnalysisJob] update', { jobId, status: updated.status, stage: updated.current_stage, progress: updated.progress });
          setJob(updated);
        })
        .subscribe();
    };

    load();
    subscribe();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [jobId]);

  return { job, loading, error };
}
