import { useReducer, useCallback, useRef } from 'react';
import { DataMigrationService } from '@/services/DataMigrationService';
import { appStateReducer } from '@/context/AppStateReducer';
import type { AppState, AppAction } from '@/context/AppStateTypes';
import { initialAppState } from '@/context/AppStateTypes';

interface StateManager {
  state: AppState;
  actions: {
    loadData: () => Promise<void>;
    uploadImages: (files: File[]) => Promise<void>;
    createGroup: (data: any) => void;
    deleteImage: (id: string) => void;
    resetAll: () => void;
  };
  status: {
    isLoading: boolean;
    hasError: boolean;
    errorMessage: string | null;
  };
}

export const useAppStateManager = (): StateManager => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const isLoadingRef = useRef(false);

  // ✅ STABLE ACTIONS - These NEVER change (empty dependency arrays)
  const actions = {
    loadData: useCallback(async () => {
      if (isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const result = await DataMigrationService.loadAllFromDatabase();
        if (result.success && result.data) {
          dispatch({ type: 'MERGE_FROM_DATABASE', payload: result.data });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        isLoadingRef.current = false;
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []), // ✅ EMPTY - Never changes

    uploadImages: useCallback(async (files: File[]) => {
      dispatch({ type: 'SET_UPLOADING', payload: true });
      
      try {
        const { loadImageDimensions } = await import('@/utils/imageUtils');
        const { ImageMigrationService } = await import('@/services/DataMigrationService');
        
        const uploadPromises = files.map(async (file) => {
          // Load image dimensions first
          const dimensions = await loadImageDimensions(file);
          
          // Create uploaded image object
          const uploadedImage = {
            id: crypto.randomUUID(),
            name: file.name,
            url: URL.createObjectURL(file), // Temporary URL for immediate preview
            file: file,
            dimensions,
            status: 'uploading' as const
          };
          
          // Upload to Supabase storage and create database record
          await ImageMigrationService.migrateImageToDatabase(uploadedImage);
          
          // Return completed image
          return {
            ...uploadedImage,
            status: 'completed' as const
          };
        });
        
        const results = await Promise.all(uploadPromises);
        console.log('[Upload] Upload completed, adding images to state:', results);
        
        dispatch({ 
          type: 'ADD_IMAGES',
          payload: results
        });

        // After successful upload, reload data from database to ensure consistency
        console.log('[Upload] Reloading data from database to verify images are saved...');
        setTimeout(async () => {
          try {
            const result = await DataMigrationService.loadAllFromDatabase();
            if (result.success && result.data) {
              console.log('[Upload] Database reload completed:', result.data);
              dispatch({ type: 'MERGE_FROM_DATABASE', payload: result.data });
            }
          } catch (error) {
            console.error('[Upload] Failed to reload from database:', error);
          }
        }, 1000); // Small delay to ensure database operations complete
        
      } catch (error) {
        console.error('Upload failed:', error);
        dispatch({ type: 'SET_ERROR', payload: `Upload failed: ${error.message}` });
      } finally {
        dispatch({ type: 'SET_UPLOADING', payload: false });
      }
    }, []), // ✅ EMPTY - Never changes

    createGroup: useCallback((data: any) => {
      dispatch({ type: 'ADD_GROUP', payload: data });
    }, []), // ✅ EMPTY - Never changes

    deleteImage: useCallback((id: string) => {
      dispatch({ type: 'REMOVE_IMAGE', payload: id });
    }, []), // ✅ EMPTY - Never changes

    resetAll: useCallback(() => {
      dispatch({ type: 'RESET_STATE' });
    }, []) // ✅ EMPTY - Never changes
  };

  const status = {
    isLoading: state.isLoading || isLoadingRef.current,
    hasError: !!state.error,
    errorMessage: state.error
  };

  return { state, actions, status };
};