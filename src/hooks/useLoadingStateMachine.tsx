import { useCallback } from 'react';
import type { AppAction, LoadingStateInfo } from '@/context/AppStateTypes';

/**
 * ✅ PHASE 3.1: LOADING STATE MACHINE HELPER
 * Creates stable helper functions for managing loading state transitions
 * Uses useCallback with empty dependencies to prevent re-creation
 */
export const useLoadingStateMachine = (dispatch: React.Dispatch<AppAction>) => {
  
  // ✅ PHASE 3.1: Helper to create loading state info
  const createLoadingState = useCallback((
    state: 'idle' | 'loading' | 'success' | 'error',
    operation?: string,
    progress?: number,
    error?: string
  ): LoadingStateInfo => ({
    state,
    operation,
    progress,
    error,
  }), []);

  // ✅ PHASE 3.1: Data loading state machine
  const setDataLoadingState = useCallback((
    state: 'idle' | 'loading' | 'success' | 'error',
    operation?: string,
    progress?: number,
    error?: string
  ) => {
    dispatch({
      type: 'SET_LOADING_STATE',
      payload: createLoadingState(state, operation, progress, error),
    });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  // ✅ PHASE 3.1: Upload state machine
  const setUploadingState = useCallback((
    state: 'idle' | 'loading' | 'success' | 'error',
    operation?: string,
    progress?: number,
    error?: string
  ) => {
    dispatch({
      type: 'SET_UPLOADING_STATE',
      payload: createLoadingState(state, operation, progress, error),
    });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  // ✅ PHASE 3.1: Sync state machine
  const setSyncingState = useCallback((
    state: 'idle' | 'loading' | 'success' | 'error',
    operation?: string,
    progress?: number,
    error?: string
  ) => {
    dispatch({
      type: 'SET_SYNCING_STATE',
      payload: createLoadingState(state, operation, progress, error),
    });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  // ✅ PHASE 3.1: Convenience methods for common operations
  const startDataLoading = useCallback((operation: string = 'loading data') => {
    setDataLoadingState('loading', operation);
  }, []); // ✅ Empty dependencies

  const completeDataLoading = useCallback(() => {
    setDataLoadingState('success');
  }, []); // ✅ Empty dependencies

  const failDataLoading = useCallback((error: string) => {
    setDataLoadingState('error', undefined, undefined, error);
  }, []); // ✅ Empty dependencies

  const startUploading = useCallback((operation: string = 'uploading') => {
    setUploadingState('loading', operation);
  }, []); // ✅ Empty dependencies

  const updateUploadProgress = useCallback((progress: number) => {
    setUploadingState('loading', 'uploading', progress);
  }, []); // ✅ Empty dependencies

  const completeUploading = useCallback(() => {
    setUploadingState('success');
  }, []); // ✅ Empty dependencies

  const failUploading = useCallback((error: string) => {
    setUploadingState('error', undefined, undefined, error);
  }, []); // ✅ Empty dependencies

  const startSyncing = useCallback((operation: string = 'syncing') => {
    setSyncingState('loading', operation);
  }, []); // ✅ Empty dependencies

  const completeSyncing = useCallback(() => {
    setSyncingState('success');
  }, []); // ✅ Empty dependencies

  const failSyncing = useCallback((error: string) => {
    setSyncingState('error', undefined, undefined, error);
  }, []); // ✅ Empty dependencies

  return {
    // Raw state setters
    setDataLoadingState,
    setUploadingState,
    setSyncingState,
    
    // Data loading convenience methods
    startDataLoading,
    completeDataLoading,
    failDataLoading,
    
    // Upload convenience methods
    startUploading,
    updateUploadProgress,
    completeUploading,
    failUploading,
    
    // Sync convenience methods
    startSyncing,
    completeSyncing,
    failSyncing,
  };
};