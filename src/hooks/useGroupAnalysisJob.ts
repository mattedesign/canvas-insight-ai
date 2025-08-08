import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GroupAnalysisJob = {
  id: string;
  user_id: string | null;
  group_id: string | null;
  project_id: string | null;
  image_urls: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number | null;
  current_stage: string | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
};

export function useGroupAnalysisJob(jobId: string | null) {
  const [job, setJob] = useState<GroupAnalysisJob | null>(null);
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
        .from('group_analysis_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (!mounted) return;
      if (error) setError(error.message);
      setJob((data as GroupAnalysisJob) ?? null);
      setLoading(false);
    };

    const subscribe = async () => {
      channel = supabase
        .channel(`group-analysis-job-${jobId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_analysis_jobs',
          filter: `id=eq.${jobId}`,
        }, (payload: any) => {
          const updated = payload.new as GroupAnalysisJob;
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
