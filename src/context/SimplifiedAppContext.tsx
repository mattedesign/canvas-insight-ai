/**
 * EMERGENCY FIX: SimplifiedAppContext with circular dependencies removed
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useMemo, 
  useRef,
  useEffect,
  useCallback
} from 'react';
import { useAuth } from './AuthContext';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { DataMigrationService } from '@/services/DataMigrationService';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { loadImageDimensions } from '@/utils/imageUtils';
import type { AppState, AppAction } from './AppStateTypes';
import { appStateReducer } from './AppStateReducer';
import { initialAppState } from './AppStateTypes';

interface SimplifiedAppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loadData: () => Promise<void>;
  isLoading: boolean;
  // Backward compatibility properties
  stableHelpers?: {
    loadData: () => Promise<void>;
    syncData: () => Promise<void>;
    uploadImages: (files: File[]) => Promise<void>;
    uploadImagesImmediate: (files: File[]) => Promise<void>;
    createGroup: (name: string, description: string, color: string, imageIds: string[], position: { x: number; y: number }) => void;
    generateConcept: (prompt: string, selectedImages?: string[]) => Promise<void>;
    clearCanvas: () => void;
  };
  loadingMachine?: {
    state: Record<string, string>;
    actions: Record<string, () => void>;
  };
}

const SimplifiedAppContext = createContext<SimplifiedAppContextType | undefined>(undefined);

export const useSimplifiedAppContext = () => {
  const context = useContext(SimplifiedAppContext);
  if (!context) {
    throw new Error('useSimplifiedAppContext must be used within SimplifiedAppProvider');
  }
  return context;
};

export const SimplifiedAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const { user } = useAuth();
  const { toast } = useFilteredToast();
  
  // Use refs to prevent circular dependencies
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);
  
  // Stable load function that doesn't cause re-renders
  const loadData = useCallback(async (): Promise<void> => {
    // Prevent concurrent loads
    if (isLoadingRef.current || !user) {
      console.log('[AppContext] Skipping load - already loading or no user');
      return Promise.resolve();
    }
    
    // If already loaded for this user, skip
    if (hasLoadedRef.current) {
      console.log('[AppContext] Data already loaded');
      return Promise.resolve();
    }
    
    console.log('[AppContext] Starting data load...');
    isLoadingRef.current = true;
    
    // Create a single promise for this load operation
    return DataMigrationService.loadAllFromDatabase()
      .then((migrationResult) => {
        if (migrationResult.success && migrationResult.data) {
          console.log('[AppContext] Data loaded successfully');
          dispatch({ 
            type: 'MERGE_FROM_DATABASE', 
            payload: migrationResult.data, 
            meta: { forceReplace: false } 
          });
          hasLoadedRef.current = true;
        }
      })
      .catch((error) => {
        console.error('[AppContext] Failed to load data:', error);
        toast({
          category: "error",
          title: "Failed to load data",
          description: "Please refresh the page",
          variant: "destructive",
        });
      })
      .finally(() => {
        isLoadingRef.current = false;
        loadingPromiseRef.current = null;
      });
  }, [user, dispatch, toast]); // Minimal stable dependencies
  
  // Create mock stableHelpers for backward compatibility
  const stableHelpers = useMemo(() => ({
    loadData: () => loadData(),
    syncData: () => Promise.resolve(), // Mock sync function
    uploadImages: async (files: File[]) => {
      console.log('Mock uploadImages called with', files.length, 'files');
    },
    uploadImagesImmediate: async (files: File[]) => {
      console.log('Mock uploadImagesImmediate called with', files.length, 'files');
    },
    createGroup: (name: string, description: string, color: string, imageIds: string[], position: { x: number; y: number }) => {
      console.log('Mock createGroup called:', name);
    },
    generateConcept: async (prompt: string, selectedImages?: string[]) => {
      console.log('Mock generateConcept called:', prompt);
    },
    clearCanvas: () => {
      dispatch({ type: 'RESET_STATE' });
    }
  }), [loadData, dispatch]);
  
  // Create mock loadingMachine for backward compatibility
  const loadingMachine = useMemo(() => ({
    state: { appData: 'idle', sync: 'idle', imageUpload: 'idle', conceptGeneration: 'idle' },
    actions: {
      startAppLoad: () => {},
      appLoadSuccess: () => {},
      appLoadError: () => {},
      startSync: () => {},
      syncSuccess: () => {},
      syncError: () => {},
      startUpload: () => {},
      uploadSuccess: () => {},
      uploadError: () => {},
      startConceptGeneration: () => {},
      conceptGenerationSuccess: () => {},
      conceptGenerationError: () => {},
      resetAll: () => {}
    }
  }), []);
  
  // Load data when user changes - single effect, no dependencies on loadData
  useEffect(() => {
    if (user && !hasLoadedRef.current && !isLoadingRef.current) {
      // Use setTimeout to avoid immediate execution in render
      const timeoutId = setTimeout(() => {
        loadData();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    } else if (!user && hasLoadedRef.current) {
      // User logged out - reset state
      hasLoadedRef.current = false;
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user?.id]); // Only depend on user ID
  
  // Memoized context value - only recreate when state changes
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    loadData,
    isLoading: isLoadingRef.current,
    stableHelpers,
    loadingMachine
  }), [state, loadData, stableHelpers, loadingMachine]);
  
  return (
    <SimplifiedAppContext.Provider value={contextValue}>
      {children}
    </SimplifiedAppContext.Provider>
  );
};

// Export for backward compatibility
export { SimplifiedAppContext as AppContext, useSimplifiedAppContext as useAppContext };