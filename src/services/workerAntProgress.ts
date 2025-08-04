import { supabase } from '../lib/supabase';

export interface AnalysisJob {
  id: string;
  user_id: string;
  image_id: string;
  image_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error?: string;
  metadata?: any;
}

export interface WorkerAntResult {
  id: string;
  job_id: string;
  ant_type: 'context' | 'pattern' | 'insight' | 'quality';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export class WorkerAntProgressService {
  /**
   * Create a new analysis job
   */
  static async createJob(userId: string, imageId: string, imageUrl: string): Promise<{ job: AnalysisJob | null, error: any }> {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .insert({
        user_id: userId,
        image_id: imageId,
        image_url: imageUrl,
        status: 'processing',
        progress: 0
      })
      .select()
      .single();
      
    return { job: data, error };
  }
  
  /**
   * Update job progress
   */
  static async updateProgress(jobId: string, progress: number, antType?: string): Promise<void> {
    // Update job progress
    const { error: jobError } = await supabase
      .from('analysis_jobs')
      .update({ 
        progress,
        status: progress === 100 ? 'completed' : 'processing',
        completed_at: progress === 100 ? new Date().toISOString() : undefined
      })
      .eq('id', jobId);
      
    if (jobError) {
      console.error('Failed to update job progress:', jobError);
    }
      
    // Record ant completion if provided
    if (antType) {
      const { error: antError } = await supabase
        .from('worker_ant_results')
        .insert({
          job_id: jobId,
          ant_type: antType,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
        
      if (antError) {
        console.error('Failed to record ant completion:', antError);
      }
    }
  }
  
  /**
   * Update job with error
   */
  static async updateJobError(jobId: string, error: string): Promise<void> {
    await supabase
      .from('analysis_jobs')
      .update({ 
        status: 'failed',
        error,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
  
  /**
   * Subscribe to real-time progress updates
   */
  static subscribeToProgress(
    jobId: string, 
    callback: (job: AnalysisJob) => void
  ) {
    return supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'analysis_jobs',
          filter: `id=eq.${jobId}`
        }, 
        (payload) => {
          callback(payload.new as AnalysisJob);
        }
      )
      .subscribe();
  }
  
  /**
   * Get job by ID
   */
  static async getJob(jobId: string): Promise<AnalysisJob | null> {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
      
    if (error) {
      console.error('Failed to get job:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get all jobs for a user
   */
  static async getUserJobs(userId: string): Promise<AnalysisJob[]> {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Failed to get user jobs:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Get worker ant results for a job
   */
  static async getJobResults(jobId: string): Promise<WorkerAntResult[]> {
    const { data, error } = await supabase
      .from('worker_ant_results')
      .select('*')
      .eq('job_id', jobId)
      .order('started_at', { ascending: true });
      
    if (error) {
      console.error('Failed to get job results:', error);
      return [];
    }
    
    return data || [];
  }
}
