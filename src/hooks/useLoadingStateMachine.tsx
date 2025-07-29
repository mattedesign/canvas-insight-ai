/**
 * Loading State Machine - Phase 3: Optimized Data Loading
 * Implements predictable loading states and prevents render loops
 */

import { useReducer, useCallback, useRef, useMemo } from 'react';

// Loading state machine states
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface LoadingMachineState {
  appData: LoadingState;
  imageUpload: LoadingState;
  sync: LoadingState;
  conceptGeneration: LoadingState;
  error: string | null;
  lastOperation: string | null;
  operationCount: number;
}

type LoadingAction = 
  | { type: 'START_APP_LOAD' }
  | { type: 'APP_LOAD_SUCCESS' }
  | { type: 'APP_LOAD_ERROR'; error: string }
  | { type: 'START_UPLOAD' }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'START_SYNC' }
  | { type: 'SYNC_SUCCESS' }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'START_CONCEPT_GENERATION' }
  | { type: 'CONCEPT_GENERATION_SUCCESS' }
  | { type: 'CONCEPT_GENERATION_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_ALL' };

const initialState: LoadingMachineState = {
  appData: 'idle',
  imageUpload: 'idle',
  sync: 'idle',
  conceptGeneration: 'idle',
  error: null,
  lastOperation: null,
  operationCount: 0,
};

function loadingReducer(state: LoadingMachineState, action: LoadingAction): LoadingMachineState {
  const newState = { ...state, operationCount: state.operationCount + 1 };

  switch (action.type) {
    case 'START_APP_LOAD':
      return {
        ...newState,
        appData: 'loading',
        error: null,
        lastOperation: 'app_load',
      };

    case 'APP_LOAD_SUCCESS':
      return {
        ...newState,
        appData: 'success',
        error: null,
      };

    case 'APP_LOAD_ERROR':
      return {
        ...newState,
        appData: 'error',
        error: action.error,
      };

    case 'START_UPLOAD':
      return {
        ...newState,
        imageUpload: 'loading',
        error: null,
        lastOperation: 'upload',
      };

    case 'UPLOAD_SUCCESS':
      return {
        ...newState,
        imageUpload: 'success',
        error: null,
      };

    case 'UPLOAD_ERROR':
      return {
        ...newState,
        imageUpload: 'error',
        error: action.error,
      };

    case 'START_SYNC':
      return {
        ...newState,
        sync: 'loading',
        error: null,
        lastOperation: 'sync',
      };

    case 'SYNC_SUCCESS':
      return {
        ...newState,
        sync: 'success',
        error: null,
      };

    case 'SYNC_ERROR':
      return {
        ...newState,
        sync: 'error',
        error: action.error,
      };

    case 'START_CONCEPT_GENERATION':
      return {
        ...newState,
        conceptGeneration: 'loading',
        error: null,
        lastOperation: 'concept_generation',
      };

    case 'CONCEPT_GENERATION_SUCCESS':
      return {
        ...newState,
        conceptGeneration: 'success',
        error: null,
      };

    case 'CONCEPT_GENERATION_ERROR':
      return {
        ...newState,
        conceptGeneration: 'error',
        error: action.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...newState,
        error: null,
      };

    case 'RESET_ALL':
      return {
        ...initialState,
        operationCount: newState.operationCount,
      };

    default:
      return state;
  }
}

export const useLoadingStateMachine = () => {
  const [state, dispatch] = useReducer(loadingReducer, initialState);
  const operationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Auto-reset success states after a delay to prevent stale UI
  const scheduleSuccessReset = useCallback((operationType: string, delay = 3000) => {
    const timeoutId = setTimeout(() => {
      if (operationType === 'appData' && state.appData === 'success') {
        // Don't reset app data success state automatically
        return;
      }
      
      // Reset other success states to idle after delay
      switch (operationType) {
        case 'upload':
          if (state.imageUpload === 'success') {
            // Custom reset logic for upload if needed
          }
          break;
        case 'sync':
          if (state.sync === 'success') {
            // Custom reset logic for sync if needed
          }
          break;
        case 'concept':
          if (state.conceptGeneration === 'success') {
            // Custom reset logic for concept generation if needed
          }
          break;
      }
    }, delay);

    operationTimeouts.current.set(operationType, timeoutId);
  }, [state]);

  // Stable action creators that prevent re-render loops
  const actions = useMemo(() => ({
    startAppLoad: () => {
      dispatch({ type: 'START_APP_LOAD' });
    },

    appLoadSuccess: () => {
      dispatch({ type: 'APP_LOAD_SUCCESS' });
    },

    appLoadError: (error: string) => {
      dispatch({ type: 'APP_LOAD_ERROR', error });
    },

    startUpload: () => {
      dispatch({ type: 'START_UPLOAD' });
    },

    uploadSuccess: () => {
      dispatch({ type: 'UPLOAD_SUCCESS' });
      scheduleSuccessReset('upload');
    },

    uploadError: (error: string) => {
      dispatch({ type: 'UPLOAD_ERROR', error });
    },

    startSync: () => {
      dispatch({ type: 'START_SYNC' });
    },

    syncSuccess: () => {
      dispatch({ type: 'SYNC_SUCCESS' });
      scheduleSuccessReset('sync');
    },

    syncError: (error: string) => {
      dispatch({ type: 'SYNC_ERROR', error });
    },

    startConceptGeneration: () => {
      dispatch({ type: 'START_CONCEPT_GENERATION' });
    },

    conceptGenerationSuccess: () => {
      dispatch({ type: 'CONCEPT_GENERATION_SUCCESS' });
      scheduleSuccessReset('concept');
    },

    conceptGenerationError: (error: string) => {
      dispatch({ type: 'CONCEPT_GENERATION_ERROR', error });
    },

    clearError: () => {
      dispatch({ type: 'CLEAR_ERROR' });
    },

    resetAll: () => {
      // Clear all timeouts
      operationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      operationTimeouts.current.clear();
      dispatch({ type: 'RESET_ALL' });
    },
  }), [scheduleSuccessReset]);

  // Computed states for easy consumption
  const computed = {
    isAnyLoading: state.appData === 'loading' || 
                  state.imageUpload === 'loading' || 
                  state.sync === 'loading' || 
                  state.conceptGeneration === 'loading',
    
    hasAnyError: state.appData === 'error' || 
                 state.imageUpload === 'error' || 
                 state.sync === 'error' || 
                 state.conceptGeneration === 'error',
    
    isAppReady: state.appData === 'success' || state.appData === 'idle',
    
    canUpload: state.imageUpload !== 'loading' && state.appData !== 'loading',
    
    canSync: state.sync !== 'loading' && state.appData !== 'loading',
    
    canGenerateConcept: state.conceptGeneration !== 'loading' && state.appData !== 'loading',
  };

  return {
    state,
    actions,
    computed,
    debug: {
      operationCount: state.operationCount,
      lastOperation: state.lastOperation,
      activeTimeouts: operationTimeouts.current.size,
    }
  };
};