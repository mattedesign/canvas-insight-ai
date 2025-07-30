import React, { createContext, useContext, useEffect, useRef, useReducer } from 'react';
import { useAuth } from './AuthContext';
import { appStateReducer } from '@/context/AppStateReducer';
import { initialAppState } from '@/context/AppStateTypes';
import type { AppState, AppAction } from '@/context/AppStateTypes';
import { DataMigrationService } from '@/services/DataMigrationService';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  stableHelpers: {
    loadData: (expectedProjectId?: string) => Promise<void>;
    uploadImages: (files: File[]) => Promise<void>;
    createGroup: (data: any) => void;
    deleteImage: (id: string) => void;
    resetAll: () => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // ✅ PHASE 2.1: STABLE HELPERS - Never change (empty dependencies)
  const stableHelpers = useRef({
    loadData: async (expectedProjectId?: string) => {
      if (isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        console.log('[Pure Reducer] Starting data load for project:', expectedProjectId);
        const result = await DataMigrationService.loadAllFromDatabase(expectedProjectId);
        if (result.success && result.data) {
          console.log('[Pure Reducer] Data loaded successfully:', result.data);
          dispatch({ type: 'MERGE_FROM_DATABASE', payload: result.data });
        } else {
          console.error('[Pure Reducer] Data loading failed:', result.error);
          dispatch({ type: 'SET_ERROR', payload: result.error || 'Unknown error' });
        }
      } catch (error: any) {
        console.error('[Pure Reducer] Data loading exception:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Unknown error' });
      } finally {
        isLoadingRef.current = false;
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    uploadImages: async (files: File[]) => {
      dispatch({ type: 'SET_UPLOADING', payload: true });
      
      try {
        const { loadImageDimensions } = await import('@/utils/imageUtils');
        const { ImageMigrationService } = await import('@/services/DataMigrationService');
        
        const uploadPromises = files.map(async (file) => {
          const dimensions = await loadImageDimensions(file);
          
          const uploadedImage = {
            id: crypto.randomUUID(),
            name: file.name,
            url: URL.createObjectURL(file),
            file: file,
            dimensions,
            status: 'uploading' as const
          };
          
          await ImageMigrationService.migrateImageToDatabase(uploadedImage);
          
          return {
            ...uploadedImage,
            status: 'completed' as const
          };
        });
        
        const results = await Promise.all(uploadPromises);
        dispatch({ type: 'ADD_IMAGES', payload: results });

        // Reload data to ensure consistency
        setTimeout(async () => {
          try {
            const result = await DataMigrationService.loadAllFromDatabase();
            if (result.success && result.data) {
              dispatch({ type: 'MERGE_FROM_DATABASE', payload: result.data });
            }
          } catch (error) {
            console.error('[Upload] Failed to reload from database:', error);
          }
        }, 1000);
        
      } catch (error: any) {
        console.error('Upload failed:', error);
        dispatch({ type: 'SET_ERROR', payload: `Upload failed: ${error.message}` });
      } finally {
        dispatch({ type: 'SET_UPLOADING', payload: false });
      }
    },

    createGroup: (data: any) => {
      dispatch({ type: 'ADD_GROUP', payload: data });
    },

    deleteImage: (id: string) => {
      dispatch({ type: 'REMOVE_IMAGE', payload: id });
    },

    resetAll: () => {
      dispatch({ type: 'RESET_STATE' });
    }
  }).current;

  // ✅ PHASE 2.1: SIMPLE DATA LOADING - No circular dependencies
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      stableHelpers.loadData();
    }
    
    if (!user) {
      hasLoadedRef.current = false;
      stableHelpers.resetAll();
    }
  }, [user?.id]); // ✅ ONLY user.id - stableHelpers never change

  // ✅ PHASE 2.1: Listen for project changes and clear state
  useEffect(() => {
    const handleProjectChange = (event: CustomEvent) => {
      console.log('[Pure Reducer] Project changed, clearing state:', event.detail);
      hasLoadedRef.current = false;
      stableHelpers.resetAll();
    };

    window.addEventListener('projectChanged', handleProjectChange as EventListener);
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange as EventListener);
    };
  }, []); // ✅ PHASE 2.1: Empty dependencies - stableHelpers never change

  const value = { state, dispatch, stableHelpers };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// ✅ PHASE 2.1: PURE REDUCER HOOKS
export const useAppDispatch = () => useAppContext().dispatch;
export const useAppState = () => useAppContext().state;
export const useAppHelpers = () => useAppContext().stableHelpers;

// Backward compatibility aliases
export const useSimplifiedAppContext = useAppContext;
export const SimplifiedAppProvider = AppProvider;