/**
 * Progressive Loading Hook - Phase 3, Step 3.1
 * React hook for managing progressive data loading states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgressiveDataLoader } from '@/services/ProgressiveDataLoader';

interface ProgressState {
  stage: string;
  progress: number;
  totalStages: number;
  currentStage: number;
  estimatedTimeRemaining?: number;
  throughput?: number;
}

interface LoadingState {
  isLoading: boolean;
  isComplete: boolean;
  hasError: boolean;
  error?: string;
  progress: ProgressState;
  data?: {
    images: any[];
    analyses: any[];
    groups: any[];
    groupAnalyses: any[];
  };
  metrics?: {
    startTime: number;
    totalItems: number;
    loadedItems: number;
    failedItems: number;
    averageLoadTime: number;
    throughputPerSecond: number;
  };
  partialResults?: boolean;
}

interface LoadingOptions {
  validateProject?: boolean;
  enableCaching?: boolean;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
  autoRetry?: boolean;
  retryDelay?: number;
}

export function useProgressiveLoading(projectId: string | null, options: LoadingOptions = {}) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    isComplete: false,
    hasError: false,
    progress: {
      stage: 'Idle',
      progress: 0,
      totalStages: 5,
      currentStage: 0
    }
  });

  const loadingRef = useRef<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    validateProject = true,
    enableCaching = true,
    batchSize = 20,
    maxRetries = 3,
    timeout = 30000,
    autoRetry = false,
    retryDelay = 5000
  } = options;

  // Progress callback
  const handleProgress = useCallback((progress: ProgressState) => {
    setState(prev => ({
      ...prev,
      progress
    }));
  }, []);

  // Main loading function
  const loadData = useCallback(async (forceReload = false) => {
    if (!projectId) {
      setState(prev => ({
        ...prev,
        hasError: true,
        error: 'No project ID provided'
      }));
      return;
    }

    // Prevent duplicate loads
    if (state.isLoading && !forceReload) {
      console.log('[useProgressiveLoading] Load already in progress');
      return;
    }

    // Cancel previous loading if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    loadingRef.current = projectId;

    setState(prev => ({
      ...prev,
      isLoading: true,
      isComplete: false,
      hasError: false,
      error: undefined,
      progress: {
        stage: 'Initializing',
        progress: 0,
        totalStages: 5,
        currentStage: 1
      }
    }));

    try {
      const result = await ProgressiveDataLoader.loadProjectDataWithDependencies(
        projectId,
        {
          onProgress: handleProgress,
          validateProject,
          enableCaching,
          batchSize,
          maxRetries,
          timeout
        }
      );

      // Check if this is still the current loading request
      if (loadingRef.current !== projectId) {
        console.log('[useProgressiveLoading] Load cancelled - project changed');
        return;
      }

      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isComplete: true,
          hasError: false,
          data: result.data,
          metrics: result.metrics,
          partialResults: result.partialResults,
          progress: {
            stage: 'Complete',
            progress: 100,
            totalStages: 5,
            currentStage: 5
          }
        }));
      } else {
        // Handle failure
        setState(prev => ({
          ...prev,
          isLoading: false,
          isComplete: false,
          hasError: true,
          error: result.error,
          data: result.data, // May have partial data
          metrics: result.metrics,
          partialResults: result.partialResults
        }));

        // Auto-retry if enabled
        if (autoRetry && retryDelay > 0) {
          console.log(`[useProgressiveLoading] Auto-retry in ${retryDelay}ms`);
          retryTimeoutRef.current = setTimeout(() => {
            loadData(true);
          }, retryDelay);
        }
      }
    } catch (error) {
      // Check if this is still the current loading request
      if (loadingRef.current !== projectId) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isComplete: false,
        hasError: true,
        error: errorMessage
      }));

      console.error('[useProgressiveLoading] Load failed:', error);

      // Auto-retry if enabled
      if (autoRetry && retryDelay > 0) {
        retryTimeoutRef.current = setTimeout(() => {
          loadData(true);
        }, retryDelay);
      }
    }
  }, [
    projectId,
    state.isLoading,
    handleProgress,
    validateProject,
    enableCaching,
    batchSize,
    maxRetries,
    timeout,
    autoRetry,
    retryDelay
  ]);

  // Retry function
  const retry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    loadData(true);
  }, [loadData]);

  // Cancel function
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (projectId) {
      ProgressiveDataLoader.cancelLoading(projectId);
    }

    loadingRef.current = null;

    setState(prev => ({
      ...prev,
      isLoading: false,
      progress: {
        ...prev.progress,
        stage: 'Cancelled'
      }
    }));
  }, [projectId]);

  // Reset function
  const reset = useCallback(() => {
    cancel();
    setState({
      isLoading: false,
      isComplete: false,
      hasError: false,
      progress: {
        stage: 'Idle',
        progress: 0,
        totalStages: 5,
        currentStage: 0
      }
    });
  }, [cancel]);

  // Auto-load when projectId changes
  useEffect(() => {
    if (projectId && projectId !== loadingRef.current) {
      loadData();
    }
  }, [projectId, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Derived state
  const progressPercentage = state.progress.progress;
  const isStalled = state.isLoading && progressPercentage === 0 && 
    Date.now() - (state.metrics?.startTime || Date.now()) > 10000;

  const estimatedTimeRemaining = state.progress.estimatedTimeRemaining;
  const formattedTimeRemaining = estimatedTimeRemaining 
    ? `${Math.round(estimatedTimeRemaining / 1000)}s`
    : undefined;

  return {
    // State
    ...state,
    isStalled,
    progressPercentage,
    formattedTimeRemaining,
    
    // Actions
    loadData,
    retry,
    cancel,
    reset,
    
    // Computed values
    hasData: !!state.data,
    isEmpty: state.isComplete && (!state.data || Object.values(state.data).every(arr => arr.length === 0)),
    successRate: state.metrics ? 
      (state.metrics.loadedItems / (state.metrics.loadedItems + state.metrics.failedItems)) * 100 : 
      undefined
  };
}

// Additional hook for multiple projects
export function useProgressiveLoadingMultiple(projectIds: string[], options: LoadingOptions = {}) {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});
  const [globalState, setGlobalState] = useState({
    isLoading: false,
    allComplete: false,
    hasAnyError: false,
    totalProgress: 0
  });

  // Create individual loading states for each project
  useEffect(() => {
    const newStates: Record<string, LoadingState> = {};
    projectIds.forEach(id => {
      if (!loadingStates[id]) {
        newStates[id] = {
          isLoading: false,
          isComplete: false,
          hasError: false,
          progress: {
            stage: 'Idle',
            progress: 0,
            totalStages: 5,
            currentStage: 0
          }
        };
      }
    });

    if (Object.keys(newStates).length > 0) {
      setLoadingStates(prev => ({ ...prev, ...newStates }));
    }
  }, [projectIds, loadingStates]);

  // Update global state based on individual states
  useEffect(() => {
    const states = Object.values(loadingStates);
    const isLoading = states.some(s => s.isLoading);
    const allComplete = states.length > 0 && states.every(s => s.isComplete);
    const hasAnyError = states.some(s => s.hasError);
    const totalProgress = states.length > 0 ? 
      states.reduce((sum, s) => sum + s.progress.progress, 0) / states.length : 0;

    setGlobalState({
      isLoading,
      allComplete,
      hasAnyError,
      totalProgress
    });
  }, [loadingStates]);

  // Load all projects
  const loadAll = useCallback(async () => {
    const loadPromises = projectIds.map(async (projectId) => {
      setLoadingStates(prev => ({
        ...prev,
        [projectId]: {
          ...prev[projectId],
          isLoading: true,
          hasError: false
        }
      }));

      try {
        const result = await ProgressiveDataLoader.loadProjectDataWithDependencies(
          projectId,
          {
            ...options,
            onProgress: (progress) => {
              setLoadingStates(prev => ({
                ...prev,
                [projectId]: {
                  ...prev[projectId],
                  progress
                }
              }));
            }
          }
        );

        setLoadingStates(prev => ({
          ...prev,
          [projectId]: {
            ...prev[projectId],
            isLoading: false,
            isComplete: result.success,
            hasError: !result.success,
            error: result.error,
            data: result.data,
            metrics: result.metrics
          }
        }));
      } catch (error) {
        setLoadingStates(prev => ({
          ...prev,
          [projectId]: {
            ...prev[projectId],
            isLoading: false,
            hasError: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }));
      }
    });

    await Promise.allSettled(loadPromises);
  }, [projectIds, options]);

  return {
    loadingStates,
    globalState,
    loadAll,
    getProjectState: (projectId: string) => loadingStates[projectId]
  };
}