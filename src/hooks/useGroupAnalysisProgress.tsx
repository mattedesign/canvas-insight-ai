import { useState, useCallback, useRef } from 'react';
import { useOptimizedAnalysis } from './useOptimizedAnalysis';
import { groupAnalysisProgressService, GroupAnalysisProgressData } from '@/services/GroupAnalysisProgressService';
import { Node } from '@xyflow/react';

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
  const { analyzeGroup: baseAnalyzeGroup } = useOptimizedAnalysis();
  const [activeAnalyses, setActiveAnalyses] = useState<Set<string>>(new Set());
  const progressCallbacksRef = useRef<Map<string, (data: GroupAnalysisProgressData) => void>>(new Map());

  const analyzeGroup = useCallback(async (
    groupId: string,
    groupName: string,
    imageUrls: string[],
    payload: any
  ): Promise<any> => {
    // Prevent duplicate analyses
    if (activeAnalyses.has(groupId)) {
      throw new Error('Group analysis already in progress');
    }

    setActiveAnalyses(prev => new Set(prev).add(groupId));

    try {
      // Set up progress tracking
      const onProgressUpdate = (stage: string, progress: number, message?: string) => {
        groupAnalysisProgressService.updateProgress(groupId, stage, progress, message);
      };

      // Register progress callback with service
      groupAnalysisProgressService.startGroupAnalysis(
        groupId,
        groupName,
        imageUrls.length,
        (progressData: GroupAnalysisProgressData) => {
          const callback = progressCallbacksRef.current.get(groupId);
          if (callback) {
            callback(progressData);
          }
        }
      );

      // Execute the analysis with progress updates
      const result = await baseAnalyzeGroup(imageUrls, payload, onProgressUpdate);

      // Mark as completed
      groupAnalysisProgressService.completeGroupAnalysis(groupId, result);

      return result;

    } catch (error) {
      // Mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Group analysis failed';
      groupAnalysisProgressService.failGroupAnalysis(groupId, errorMessage);
      throw error;

    } finally {
      // Clean up active analysis tracking
      setActiveAnalyses(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  }, [baseAnalyzeGroup, activeAnalyses]);

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