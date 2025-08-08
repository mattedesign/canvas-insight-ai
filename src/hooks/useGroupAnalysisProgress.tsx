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
      const { jobId } = await startGroupUxAnalysis({
        groupId,
        imageUrls,
        groupName,
        projectId: payload?.projectId || null,
        userContext: payload?.prompt || payload?.userContext || null,
      });

      // Subscribe to realtime job updates
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        let channel: any;
        const timeout = setTimeout(() => {
          if (!resolved) {
            if (channel) supabase.removeChannel(channel);
            groupAnalysisProgressService.failGroupAnalysis(groupId, 'No job progress detected within 60s.');
            reject(new Error('No job progress detected within 60s. Please check background workers.'));
          }
        }, 60000);

        channel = supabase
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
                supabase.removeChannel(channel);
                resolve();
              } catch (e) {
                supabase.removeChannel(channel);
                reject(e);
              }
            }

            if (j.status === 'failed') {
              resolved = true;
              clearTimeout(timeout);
              groupAnalysisProgressService.failGroupAnalysis(groupId, j.error || 'Group analysis failed');
              supabase.removeChannel(channel);
              reject(new Error(j.error || 'Group analysis failed'));
            }
          })
          .subscribe();
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