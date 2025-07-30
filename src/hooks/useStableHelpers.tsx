import { useCallback, useRef } from 'react';
import type { AppAction } from '@/context/AppStateTypes';
import { DataMigrationService } from '@/services/DataMigrationService';
import { useLoadingStateMachine } from './useLoadingStateMachine';

interface StableHelpers {
  loadData: (expectedProjectId?: string) => Promise<void>;
  uploadImages: (files: File[]) => Promise<void>;
  createGroup: (data: any) => void;
  deleteImage: (id: string) => void;
  resetAll: () => void;
}

/**
 * ✅ PHASE 3.1: STABLE HELPER FUNCTIONS WITH LOADING STATE MACHINE
 * Creates stable helper functions that only depend on dispatch
 * Uses useCallback with empty dependencies to prevent re-creation
 * Implements explicit loading state transitions
 */
export const useStableHelpers = (dispatch: React.Dispatch<AppAction>): StableHelpers => {
  const isLoadingRef = useRef(false);
  
  // ✅ PHASE 3.1: Use loading state machine
  const loadingMachine = useLoadingStateMachine(dispatch);

  // ✅ PHASE 3.1: Data loading with explicit state machine transitions
  const loadData = useCallback(async (expectedProjectId?: string) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    // ✅ PHASE 3.1: Start loading state
    loadingMachine.startDataLoading('Loading project data');
    
    try {
      console.log('[Stable Helpers] Starting data load for project:', expectedProjectId);
      const result = await DataMigrationService.loadAllFromDatabase(expectedProjectId);
      if (result.success && result.data) {
        console.log('[Stable Helpers] Data loaded successfully:', result.data);
        dispatch({ type: 'MERGE_FROM_DATABASE', payload: result.data });
        // ✅ PHASE 3.1: Complete loading state
        loadingMachine.completeDataLoading();
      } else {
        const errorMsg = result.error || 'Unknown error';
        console.error('[Stable Helpers] Data loading failed:', errorMsg);
        // ✅ PHASE 3.1: Fail loading state with specific error
        loadingMachine.failDataLoading(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      console.error('[Stable Helpers] Data loading exception:', error);
      // ✅ PHASE 3.1: Fail loading state with exception error
      loadingMachine.failDataLoading(errorMsg);
    } finally {
      isLoadingRef.current = false;
    }
  }, []); // ✅ Empty dependencies - only depends on dispatch

  // ✅ PHASE 3.1: Upload with explicit state machine transitions
  const uploadImages = useCallback(async (files: File[]) => {
    // ✅ PHASE 3.1: Start uploading state
    loadingMachine.startUploading(`Uploading ${files.length} files`);
    
    try {
      const { loadImageDimensions } = await import('@/utils/imageUtils');
      const { ImageMigrationService } = await import('@/services/DataMigrationService');
      
      const uploadPromises = files.map(async (file, index) => {
        // ✅ PHASE 3.1: Update progress during upload
        const progress = ((index + 1) / files.length) * 100;
        loadingMachine.updateUploadProgress(progress);
        
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
      
      // ✅ PHASE 3.1: Complete uploading state
      loadingMachine.completeUploading();

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
      const errorMsg = `Upload failed: ${error.message}`;
      console.error(errorMsg, error);
      // ✅ PHASE 3.1: Fail uploading state with specific error
      loadingMachine.failUploading(errorMsg);
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