/**
 * Phase 4: Performance Optimized Callbacks Hook
 * Stable callback references with proper dependency management
 */

import { useCallback, useRef, useMemo } from 'react';
import { StrictAppAction } from '@/types/strict-interfaces';

interface OptimizedCallbacksConfig {
  readonly enableLogging?: boolean;
  readonly componentName?: string;
}

export function usePerformanceOptimizedCallbacks(
  dispatch: React.Dispatch<StrictAppAction>,
  config: OptimizedCallbacksConfig = {}
) {
  const { enableLogging = false, componentName = 'Unknown' } = config;
  const callbackMetrics = useRef(new Map<string, number>());

  // Log callback usage in development
  const logCallback = useCallback((callbackName: string) => {
    if (!enableLogging || process.env.NODE_ENV !== 'development') return;
    
    const count = callbackMetrics.current.get(callbackName) || 0;
    callbackMetrics.current.set(callbackName, count + 1);
    
    if (count > 0 && count % 10 === 0) {
      console.log(`[${componentName}] Callback "${callbackName}" called ${count} times`);
    }
  }, [enableLogging, componentName]);

  // Stable image management callbacks
  const imageCallbacks = useMemo(() => ({
    addImage: useCallback((image: Parameters<typeof dispatch>[0] extends { type: 'ADD_IMAGE'; payload: infer P } ? P : never) => {
      logCallback('addImage');
      dispatch({ type: 'ADD_IMAGE', payload: image });
    }, [dispatch, logCallback]),

    updateImage: useCallback((imageId: string, updates: Parameters<typeof dispatch>[0] extends { type: 'UPDATE_IMAGE'; payload: { updates: infer P } } ? P : never) => {
      logCallback('updateImage');
      dispatch({ type: 'UPDATE_IMAGE', payload: { id: imageId, updates } });
    }, [dispatch, logCallback]),

    removeImage: useCallback((imageId: string) => {
      logCallback('removeImage');
      dispatch({ type: 'REMOVE_IMAGE', payload: imageId });
    }, [dispatch, logCallback]),

    selectImage: useCallback((imageId: string | null) => {
      logCallback('selectImage');
      dispatch({ type: 'SELECT_IMAGE', payload: imageId });
    }, [dispatch, logCallback])
  }), [dispatch, logCallback]);

  // Stable analysis management callbacks
  const analysisCallbacks = useMemo(() => ({
    addAnalysis: useCallback((analysis: Parameters<typeof dispatch>[0] extends { type: 'ADD_ANALYSIS'; payload: infer P } ? P : never) => {
      logCallback('addAnalysis');
      dispatch({ type: 'ADD_ANALYSIS', payload: analysis });
    }, [dispatch, logCallback]),

    updateAnalysis: useCallback((analysisId: string, updates: Parameters<typeof dispatch>[0] extends { type: 'UPDATE_ANALYSIS'; payload: { updates: infer P } } ? P : never) => {
      logCallback('updateAnalysis');
      dispatch({ type: 'UPDATE_ANALYSIS', payload: { id: analysisId, updates } });
    }, [dispatch, logCallback]),

    removeAnalysis: useCallback((analysisId: string) => {
      logCallback('removeAnalysis');
      dispatch({ type: 'REMOVE_ANALYSIS', payload: analysisId });
    }, [dispatch, logCallback])
  }), [dispatch, logCallback]);

  // Stable group management callbacks
  const groupCallbacks = useMemo(() => ({
    addGroup: useCallback((group: Parameters<typeof dispatch>[0] extends { type: 'ADD_GROUP'; payload: infer P } ? P : never) => {
      logCallback('addGroup');
      dispatch({ type: 'ADD_GROUP', payload: group });
    }, [dispatch, logCallback]),

    updateGroup: useCallback((groupId: string, updates: Parameters<typeof dispatch>[0] extends { type: 'UPDATE_GROUP'; payload: { updates: infer P } } ? P : never) => {
      logCallback('updateGroup');
      dispatch({ type: 'UPDATE_GROUP', payload: { id: groupId, updates } });
    }, [dispatch, logCallback]),

    removeGroup: useCallback((groupId: string) => {
      logCallback('removeGroup');
      dispatch({ type: 'REMOVE_GROUP', payload: groupId });
    }, [dispatch, logCallback]),

    selectGroup: useCallback((groupId: string | null) => {
      logCallback('selectGroup');
      dispatch({ type: 'SELECT_GROUP', payload: groupId });
    }, [dispatch, logCallback])
  }), [dispatch, logCallback]);

  // Stable UI state callbacks
  const uiCallbacks = useMemo(() => ({
    setLoading: useCallback((loading: boolean) => {
      logCallback('setLoading');
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, [dispatch, logCallback]),

    setError: useCallback((error: string | null) => {
      logCallback('setError');
      dispatch({ type: 'SET_ERROR', payload: error });
    }, [dispatch, logCallback]),

    setLastSync: useCallback((date: Date | null) => {
      logCallback('setLastSync');
      dispatch({ type: 'SET_LAST_SYNC', payload: date });
    }, [dispatch, logCallback]),

    resetState: useCallback(() => {
      logCallback('resetState');
      dispatch({ type: 'RESET_STATE' });
    }, [dispatch, logCallback])
  }), [dispatch, logCallback]);

  // Batch operations for better performance
  const batchCallbacks = useMemo(() => ({
    setImages: useCallback((images: Parameters<typeof dispatch>[0] extends { type: 'SET_IMAGES'; payload: infer P } ? P : never) => {
      logCallback('setImages');
      dispatch({ type: 'SET_IMAGES', payload: images });
    }, [dispatch, logCallback]),

    setAnalyses: useCallback((analyses: Parameters<typeof dispatch>[0] extends { type: 'SET_ANALYSES'; payload: infer P } ? P : never) => {
      logCallback('setAnalyses');
      dispatch({ type: 'SET_ANALYSES', payload: analyses });
    }, [dispatch, logCallback]),

    setGroups: useCallback((groups: Parameters<typeof dispatch>[0] extends { type: 'SET_GROUPS'; payload: infer P } ? P : never) => {
      logCallback('setGroups');
      dispatch({ type: 'SET_GROUPS', payload: groups });
    }, [dispatch, logCallback])
  }), [dispatch, logCallback]);

  // Development utilities
  const devCallbacks = useMemo(() => ({
    getCallbackMetrics: useCallback(() => {
      return Object.fromEntries(callbackMetrics.current);
    }, []),

    resetCallbackMetrics: useCallback(() => {
      callbackMetrics.current.clear();
    }, []),

    logMostUsedCallbacks: useCallback(() => {
      if (process.env.NODE_ENV !== 'development') return;
      
      const metrics = Array.from(callbackMetrics.current.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      
      console.log(`[${componentName}] Most used callbacks:`, metrics);
    }, [componentName])
  }), [componentName]);

  return {
    ...imageCallbacks,
    ...analysisCallbacks,
    ...groupCallbacks,
    ...uiCallbacks,
    ...batchCallbacks,
    ...devCallbacks
  };
}

// Hook for stable event handlers
export function useStableEventHandlers<T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
  dependencies: React.DependencyList = []
): T {
  const stableHandlers = useMemo(() => {
    const stable = {} as T;
    
    for (const [key, handler] of Object.entries(handlers)) {
      stable[key as keyof T] = useCallback(handler, dependencies) as T[keyof T];
    }
    
    return stable;
  }, [handlers, ...dependencies]);

  return stableHandlers;
}

// Hook for memoized selectors
export function useMemoizedSelectors<State, Selectors extends Record<string, (state: State) => any>>(
  state: State,
  selectors: Selectors
): { [K in keyof Selectors]: ReturnType<Selectors[K]> } {
  return useMemo(() => {
    const results = {} as { [K in keyof Selectors]: ReturnType<Selectors[K]> };
    
    for (const [key, selector] of Object.entries(selectors)) {
      results[key as keyof Selectors] = selector(state);
    }
    
    return results;
  }, [state, selectors]);
}