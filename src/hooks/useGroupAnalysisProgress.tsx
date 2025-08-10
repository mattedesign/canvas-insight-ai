import { useState, useCallback, useRef } from 'react';
import { groupAnalysisProgressService, GroupAnalysisProgressData } from '@/services/GroupAnalysisProgressService';
import { Node } from '@xyflow/react';
import { startGroupUxAnalysis } from '@/services/StartGroupUxAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { fetchLatestGroupAnalysis } from '@/services/fetchLatestGroupAnalysis';

export interface GroupAnalysisHookReturn {
  analyzeGroup: (
    groupId: string,
    groupName: string,
    imageUrls: string[],
    payload: any
  ) => Promise<any>;
  getLoadingNode: (
    groupId: string,
    position: { x: number; y: number },
    onCancel?: (groupId: string) => void
  ) => Node | null;
  getResultsNode: (
    groupId: string,
    analysisResults: any,
    position: { x: number; y: number },
    callbacks?: {
      onEditPrompt?: (sessionId: string) => void;
      onCreateFork?: (sessionId: string) => void;
      onViewDetails?: (analysisId: string) => void;
    }
  ) => Node;
  isAnalysisInProgress: (groupId: string) => boolean;
  cancelAnalysis: (groupId: string) => void;
}

export const useGroupAnalysisProgress = (): GroupAnalysisHookReturn => {
  const [activeAnalyses, setActiveAnalyses] = useState<Set<string>>(new Set());
  const progressCallbacksRef = useRef<Map<string, (data: GroupAnalysisProgressData) => void>>(new Map());

  const analyzeGroup = useCallback(async (
    groupId: string,
    groupName: string,
    imageUrls: string[],
    payload: any
  ): Promise<any> => {
    if (activeAnalyses.has(groupId)) {
      throw new Error('Group analysis already in progress');
    }

    setActiveAnalyses(prev => new Set(prev).add(groupId));

    try {
      // Initialize progress tracking
      if (payload?.onProgressNodeUpdate) {
        progressCallbacksRef.current.set(groupId, payload.onProgressNodeUpdate);
      }
      groupAnalysisProgressService.startGroupAnalysis(
        groupId,
        groupName,
        imageUrls.length,
        (progressData: GroupAnalysisProgressData) => {
          const callback = progressCallbacksRef.current.get(groupId);
          if (callback) callback(progressData);
        }
      );

      // Start background job
      // Prefer both dispatch paths during testing for maximum reliability
      const dispatchMode = (localStorage.getItem('DISPATCH_MODE') as 'inngest' | 'direct' | 'both') || 'both';
      const { jobId } = await startGroupUxAnalysis({
        groupId,
        imageUrls,
        groupName,
        projectId: payload?.projectId || null,
        userContext: payload?.prompt || payload?.userContext || null,
        dispatchMode,
      });

      // Subscribe to realtime job updates and analysis events, with a lightweight polling fallback
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        let channelJobs: any;
        let channelEvents: any;
        let pollId: any;
        const requestStartedAt = new Date();
        const cleanup = () => {
          if (channelJobs) supabase.removeChannel(channelJobs);
          if (channelEvents) supabase.removeChannel(channelEvents);
          if (pollId) clearInterval(pollId);
        };
        const timeout = setTimeout(async () => {
          if (!resolved) {
            cleanup();
            try {
              const latest = await fetchLatestGroupAnalysis(groupId);
              const latestCreatedAt = latest?.created_at ? new Date(latest.created_at) : null;
              if (latestCreatedAt && latestCreatedAt > requestStartedAt) {
                groupAnalysisProgressService.completeGroupAnalysis(groupId, latest);
                resolved = true;
                resolve();
              } else {
                groupAnalysisProgressService.failGroupAnalysis(groupId, 'No job progress detected within 3 minutes.');
                reject(new Error('No job progress detected within 3 minutes. Please check background workers.'));
              }
            } catch (e) {
              groupAnalysisProgressService.failGroupAnalysis(groupId, 'No job progress detected within 3 minutes.');
              reject(new Error('No job progress detected within 3 minutes. Please check background workers.'));
            }
          }
        }, 180000);

        // Initial snapshot of the job to reflect queued/vision stages ASAP
        (async () => {
          const { data } = await supabase
            .from('group_analysis_jobs')
            .select('status, progress, current_stage, error')
            .eq('id', jobId)
            .maybeSingle();
          if (data) {
            groupAnalysisProgressService.updateProgress(groupId, data.current_stage || 'queued', data.progress || 0);
          }
        })();

        // Realtime: job row updates
        channelJobs = supabase
          .channel(`group-analysis-job-${jobId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'group_analysis_jobs',
            filter: `id=eq.${jobId}`,
          }, async (payload: any) => {
            const j = payload.new as { status: string; progress: number | null; current_stage: string | null; error?: string | null };
            groupAnalysisProgressService.updateProgress(groupId, j.current_stage || 'processing', j.progress || 0);

            if (j.status === 'completed') {
              resolved = true;
              clearTimeout(timeout);
              try {
                const latest = await fetchLatestGroupAnalysis(groupId);
                groupAnalysisProgressService.completeGroupAnalysis(groupId, latest);
                cleanup();
                resolve();
              } catch (e) {
                cleanup();
                reject(e);
              }
            }

            if (j.status === 'failed') {
              // Before treating as terminal failure, check if results were actually written
              try {
                const latest = await fetchLatestGroupAnalysis(groupId);
                const latestCreatedAt = latest?.created_at ? new Date(latest.created_at) : null;
                if (latestCreatedAt && latestCreatedAt > requestStartedAt) {
                  console.warn('[useGroupAnalysisProgress] Job reported failed but results exist; treating as completed', { groupId, jobId, latestCreatedAt, requestStartedAt });
                  resolved = true;
                  clearTimeout(timeout);
                  groupAnalysisProgressService.completeGroupAnalysis(groupId, latest);
                  cleanup();
                  resolve();
                  return;
                }
              } catch {
                // No results found; proceed to mark as failure
              }
              resolved = true;
              clearTimeout(timeout);
              groupAnalysisProgressService.failGroupAnalysis(groupId, j.error || 'Group analysis failed');
              cleanup();
              reject(new Error(j.error || 'Group analysis failed'));
            }
          })
          .subscribe();

        // Realtime: analysis_events inserts for granular stage/progress
        channelEvents = supabase
          .channel(`group-analysis-events-${jobId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'analysis_events',
            filter: `group_job_id=eq.${jobId}`,
          }, async (payload: any) => {
            const ev = payload.new as { event_name: string; stage: string; progress: number | null; message?: string | null };
            const stage = ev.stage || (ev.event_name?.split('/')?.[1]?.split('.')?.[0] ?? 'processing');
            const progress = typeof ev.progress === 'number' ? ev.progress : 0;
            groupAnalysisProgressService.updateProgress(groupId, stage, progress, ev.message || undefined);

            // Terminal event from synthesis
            if (ev.event_name === 'group-analysis/completed') {
              resolved = true;
              clearTimeout(timeout);
              try {
                const latest = await fetchLatestGroupAnalysis(groupId);
                groupAnalysisProgressService.completeGroupAnalysis(groupId, latest);
                cleanup();
                resolve();
              } catch (e) {
                cleanup();
                reject(e);
              }
            }
          })
          .subscribe();

        // Polling fallback in case Realtime is blocked by RLS or network
        pollId = setInterval(async () => {
          if (resolved) return;
          try {
            const { data } = await supabase
              .from('group_analysis_jobs')
              .select('status, progress, current_stage, error')
              .eq('id', jobId)
              .maybeSingle();
            if (!data) return;
            groupAnalysisProgressService.updateProgress(groupId, data.current_stage || 'processing', data.progress || 0);
            if (data.status === 'completed') {
              resolved = true;
              clearTimeout(timeout);
              const latest = await fetchLatestGroupAnalysis(groupId);
              groupAnalysisProgressService.completeGroupAnalysis(groupId, latest);
              cleanup();
              resolve();
            } else if (data.status === 'failed') {
              resolved = true;
              clearTimeout(timeout);
              groupAnalysisProgressService.failGroupAnalysis(groupId, data.error || 'Group analysis failed');
              cleanup();
              reject(new Error(data.error || 'Group analysis failed'));
            }
          } catch (e) {
            // ignore transient polling errors
          }
        }, 2000);
      });

      return fetchLatestGroupAnalysis(groupId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Group analysis failed';
      groupAnalysisProgressService.failGroupAnalysis(groupId, errorMessage);
      throw error;
    } finally {
      setActiveAnalyses(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  }, [activeAnalyses]);

  const getLoadingNode = useCallback((
    groupId: string,
    position: { x: number; y: number },
    onCancel?: (groupId: string) => void
  ): Node | null => {
    return groupAnalysisProgressService.createLoadingNode(groupId, position, onCancel);
  }, []);

  const getResultsNode = useCallback((
    groupId: string,
    analysisResults: any,
    position: { x: number; y: number },
    callbacks?: {
      onEditPrompt?: (sessionId: string) => void;
      onCreateFork?: (sessionId: string) => void;
      onViewDetails?: (analysisId: string) => void;
    }
  ): Node => {
    return groupAnalysisProgressService.createResultsNode(
      groupId,
      analysisResults,
      position,
      callbacks?.onEditPrompt,
      callbacks?.onCreateFork,
      callbacks?.onViewDetails
    );
  }, []);

  const isAnalysisInProgress = useCallback((groupId: string): boolean => {
    return groupAnalysisProgressService.isAnalysisInProgress(groupId);
  }, []);

  const cancelAnalysis = useCallback((groupId: string): void => {
    groupAnalysisProgressService.cancelGroupAnalysis(groupId);
    setActiveAnalyses(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
  }, []);

  return {
    analyzeGroup,
    getLoadingNode,
    getResultsNode,
    isAnalysisInProgress,
    cancelAnalysis
  };
};