import { useCallback, useRef, useEffect } from 'react';
import type { AppAction } from '@/context/AppStateTypes';
import { useLoadingStateMachine } from './useLoadingStateMachine';
import type { 
  StrictInitializationConfig,
  StrictInitializationStatus,
  StrictInitializationManager,
  StrictDispatchFunction,
  StrictAsyncFunction,
  StrictCallbackFunction
} from '@/types/strict-types';

// ✅ PHASE 4.1: STRICT INITIALIZATION CONFIG WITH EXPLICIT TYPES
interface InitializationConfig extends StrictInitializationConfig {
  readonly userId?: string;
  readonly projectId?: string;
  readonly retryAttempts?: number;
  readonly retryDelay?: number;
}

/**
 * ✅ PHASE 4.1: STRICT INITIALIZATION MANAGER WITH TYPE SAFETY
 * Separates initialization from re-renders using one-time effects
 * Implements proper error boundaries and retry logic
 * Uses event-driven updates for subsequent data changes
 * ALL FUNCTIONS HAVE EXPLICIT RETURN TYPES FOR STRICT TYPESCRIPT
 */
export const useInitializationManager = (dispatch: StrictDispatchFunction): StrictInitializationManager => {
  const initializationStatusRef = useRef<{
    isInitialized: boolean;
    isInitializing: boolean;
    lastConfig: InitializationConfig | null;
    retryCount: number;
  }>({
    isInitialized: false,
    isInitializing: false,
    lastConfig: null,
    retryCount: 0,
  });

  const loadingMachine = useLoadingStateMachine(dispatch);

  // ✅ PHASE 4.1: One-time initialization with explicit return type and strict typing
  const initializeApp = useCallback<StrictAsyncFunction<InitializationConfig, void>>(async (config: InitializationConfig): Promise<void> => {
    const status = initializationStatusRef.current;
    
    // Prevent multiple initializations
    if (status.isInitializing) {
      console.log('[Initialization] Already initializing, skipping...');
      return;
    }

    // Check if already initialized with same config
    if (status.isInitialized && 
        status.lastConfig?.userId === config.userId && 
        status.lastConfig?.projectId === config.projectId) {
      console.log('[Initialization] Already initialized with same config, skipping...');
      return;
    }

    status.isInitializing = true;
    status.retryCount = 0;
    
    const maxRetries = config.retryAttempts || 3;
    const retryDelay = config.retryDelay || 1000;

    // ✅ PHASE 3.2: Start initialization loading state
    loadingMachine.startDataLoading('Initializing application data');

    while (status.retryCount < maxRetries) {
      try {
        console.log(`[Initialization] Attempt ${status.retryCount + 1}/${maxRetries} for user: ${config.userId}`);
        
        // Import service dynamically to avoid circular dependencies
        const { DataMigrationService } = await import('@/services/DataMigrationService');
        
        const result = await DataMigrationService.loadAllFromDatabase(config.projectId);
        
        if (result.success && result.data) {
          console.log('[Initialization] Data loaded successfully:', result.data);
          
          // ✅ PHASE 3.2: Dispatch initialization data
          dispatch({ 
            type: 'MERGE_FROM_DATABASE', 
            payload: result.data,
            meta: { forceReplace: true }
          });
          
          // ✅ PHASE 3.2: Mark as initialized
          status.isInitialized = true;
          status.isInitializing = false;
          status.lastConfig = config;
          
          // ✅ PHASE 3.2: Complete loading state
          loadingMachine.completeDataLoading();
          
          // ✅ PHASE 3.2: Fire initialization complete event
          window.dispatchEvent(new CustomEvent('appInitialized', { 
            detail: { config, data: result.data } 
          }));
          
          return;
        } else {
          throw new Error(result.error || 'Failed to load data');
        }
      } catch (error: any) {
        status.retryCount++;
        const errorMsg = error.message || 'Unknown initialization error';
        
        console.error(`[Initialization] Attempt ${status.retryCount} failed:`, errorMsg);
        
        if (status.retryCount >= maxRetries) {
          // ✅ PHASE 3.2: All retries exhausted
          status.isInitializing = false;
          loadingMachine.failDataLoading(`Initialization failed after ${maxRetries} attempts: ${errorMsg}`);
          
          // ✅ PHASE 3.2: Fire initialization failed event
          window.dispatchEvent(new CustomEvent('appInitializationFailed', { 
            detail: { config, error: errorMsg, attempts: maxRetries } 
          }));
          
          throw error;
        } else {
          // ✅ PHASE 3.2: Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }, []); // ✅ PHASE 3.2: Empty dependencies - only depends on dispatch

  // ✅ PHASE 4.1: Reset initialization state with explicit return type
  const resetInitialization = useCallback<StrictCallbackFunction<void, void>>((): void => {
    const status = initializationStatusRef.current;
    status.isInitialized = false;
    status.isInitializing = false;
    status.lastConfig = null;
    status.retryCount = 0;
    
    console.log('[Initialization] State reset');
    
    // ✅ PHASE 3.2: Fire reset event
    window.dispatchEvent(new CustomEvent('appInitializationReset'));
  }, []); // ✅ PHASE 3.2: Empty dependencies

  // ✅ PHASE 4.1: Check initialization status with explicit return type
  const getInitializationStatus = useCallback<StrictCallbackFunction<void, StrictInitializationStatus>>((): StrictInitializationStatus => ({
    isInitialized: initializationStatusRef.current.isInitialized,
    isInitializing: initializationStatusRef.current.isInitializing,
    lastConfig: initializationStatusRef.current.lastConfig,
    retryCount: initializationStatusRef.current.retryCount,
  }), []); // ✅ PHASE 3.2: Empty dependencies

  // ✅ PHASE 3.2: Handle data invalidation events
  useEffect(() => {
    const handleDataInvalidation = (event: CustomEvent) => {
      console.log('[Initialization] Data invalidated, resetting:', event.detail);
      resetInitialization();
    };

    const handleProjectChange = (event: CustomEvent) => {
      console.log('[Initialization] Project changed, resetting:', event.detail);
      resetInitialization();
    };

    // ✅ PHASE 3.2: Listen for data invalidation events
    window.addEventListener('dataInvalidated', handleDataInvalidation as EventListener);
    window.addEventListener('projectChanged', handleProjectChange as EventListener);

    return () => {
      window.removeEventListener('dataInvalidated', handleDataInvalidation as EventListener);
      window.removeEventListener('projectChanged', handleProjectChange as EventListener);
    };
  }, []); // ✅ PHASE 3.2: Empty dependencies - event handlers are stable

  return {
    initializeApp,
    resetInitialization,
    getInitializationStatus,
  };
};