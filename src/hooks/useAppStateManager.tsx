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
        // ✅ COPY YOUR EXISTING UPLOAD LOGIC HERE
        // Replace this with your actual upload implementation
        const uploadPromises = files.map(async (file) => {
          // Your upload logic from the old stableHelpers.uploadImages
          const uploadedImage = {
            id: crypto.randomUUID(),
            name: file.name,
            url: URL.createObjectURL(file), // Create temporary URL for preview
            file: file,
            dimensions: { width: 0, height: 0 }, // Will be updated after loading
            status: 'uploading' as const
          };
          
          // Use existing ImageMigrationService
          const { ImageMigrationService } = await import('@/services/DataMigrationService');
          await ImageMigrationService.migrateImageToDatabase(uploadedImage);
          
          return uploadedImage;
        });
        
        const results = await Promise.all(uploadPromises);
        
        dispatch({ 
          type: 'ADD_IMAGES',
          payload: results
        });
        
        dispatch({ type: 'SET_UPLOADING', payload: false });
        
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
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