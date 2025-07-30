import { useCallback, useRef } from 'react';
import type { AppAction } from '@/context/AppStateTypes';
import { DataMigrationService } from '@/services/DataMigrationService';

interface StableHelpers {
  loadData: (expectedProjectId?: string) => Promise<void>;
  uploadImages: (files: File[]) => Promise<void>;
  createGroup: (data: any) => void;
  deleteImage: (id: string) => void;
  resetAll: () => void;
}

/**
 * ✅ PHASE 2.3: STABLE HELPER FUNCTIONS
 * Creates stable helper functions that only depend on dispatch
 * Uses useCallback with empty dependencies to prevent re-creation
 */
export const useStableHelpers = (dispatch: React.Dispatch<AppAction>): StableHelpers => {
  const isLoadingRef = useRef(false);

  // ✅ PHASE 2.3: All helpers use useCallback with empty dependencies
  const loadData = useCallback(async (expectedProjectId?: string) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      console.log('[Stable Helpers] Starting data load for project:', expectedProjectId);
      const result = await DataMigrationService.loadAllFromDatabase(expectedProjectId);
      if (result.success && result.data) {
        console.log('[Stable Helpers] Data loaded successfully:', result.data);
        dispatch({ type: 'MERGE_FROM_DATABASE', payload: result.data });
      } else {
        console.error('[Stable Helpers] Data loading failed:', result.error);
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Unknown error' });
      }
    } catch (error: any) {
      console.error('[Stable Helpers] Data loading exception:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Unknown error' });
    } finally {
      isLoadingRef.current = false;
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // ✅ Empty dependencies - only depends on dispatch

  const uploadImages = useCallback(async (files: File[]) => {
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
  }, []); // ✅ Empty dependencies - only depends on dispatch

  const createGroup = useCallback((data: any) => {
    dispatch({ type: 'ADD_GROUP', payload: data });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  const deleteImage = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_IMAGE', payload: id });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  return {
    loadData,
    uploadImages,
    createGroup,
    deleteImage,
    resetAll
  };
};