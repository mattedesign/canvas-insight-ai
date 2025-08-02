import { useCallback, useRef } from 'react';
import type { AppAction } from '@/context/AppStateTypes';
import { DataMigrationService } from '@/services/DataMigrationService';
import { useLoadingStateMachine } from './useLoadingStateMachine';
import { eventDrivenSyncService } from '@/services/EventDrivenSyncService';
import type { 
  StrictStableHelpers, 
  StrictDispatchFunction,
  StrictCallbackFunction,
  StrictAsyncFunction 
} from '@/types/strict-types';
import type { ImageGroup } from '@/types/ux-analysis';

// ✅ PHASE 4.1: STRICT INTERFACE WITH EXPLICIT RETURN TYPES
interface StableHelpers extends StrictStableHelpers {
  readonly loadData: StrictAsyncFunction<string | undefined, void>;
  readonly uploadImages: StrictAsyncFunction<readonly File[], void>;
  readonly createGroup: StrictCallbackFunction<ImageGroup, void>;
  readonly deleteImage: StrictAsyncFunction<string, void>;
  readonly deleteGroup: StrictAsyncFunction<string, void>;
  readonly cleanWorkspace: StrictAsyncFunction<{ clearImages: boolean; clearAnalyses: boolean; clearGroups: boolean; }, void>;
  readonly resetAll: StrictCallbackFunction<void, void>;
}

/**
 * ✅ PHASE 4.1: STABLE HELPER FUNCTIONS WITH STRICT TYPING
 * Creates stable helper functions that only depend on dispatch
 * Uses useCallback with empty dependencies to prevent re-creation
 * Implements explicit loading state transitions and event-driven updates
 * ALL FUNCTIONS HAVE EXPLICIT RETURN TYPES FOR STRICT TYPESCRIPT
 */
export const useStableHelpers = (dispatch: StrictDispatchFunction): StableHelpers => {
  const isLoadingRef = useRef(false);
  
  // ✅ PHASE 3.1: Use loading state machine
  const loadingMachine = useLoadingStateMachine(dispatch);

  // ✅ PHASE 4.1: Data loading with explicit return type and strict typing
  const loadData = useCallback(async (expectedProjectId?: string): Promise<void> => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    // ✅ PHASE 3.1: Start loading state
    loadingMachine.startDataLoading('Loading project data');
    
    try {
      console.log('[Stable Helpers] Starting data load for project:', expectedProjectId);
      const result = await DataMigrationService.loadAllFromDatabase(expectedProjectId);
      if (result.success && result.data) {
        console.log('[Stable Helpers] Data loaded successfully:', {
          images: result.data.uploadedImages.length,
          analyses: result.data.analyses.length,
          groups: result.data.imageGroups.length,
          groupAnalyses: result.data.groupAnalysesWithPrompts.length
        });
        
        // ✅ PHASE 4: Validate loaded image URLs before dispatching
        const validImages = result.data.uploadedImages.filter(img => 
          img.url && (img.url.startsWith('http') || img.url.startsWith('blob:'))
        );
        
        console.log('[Stable Helpers] Image URL validation:', {
          total: result.data.uploadedImages.length,
          validUrls: validImages.length,
          invalidUrls: result.data.uploadedImages.length - validImages.length
        });
        
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

  // ✅ PHASE 4.1: Upload with explicit return type and strict typing
  const uploadImages = useCallback(async (files: readonly File[]): Promise<void> => {
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
      
      // ✅ PHASE 3.2: Fire event-driven sync for each uploaded image
      results.forEach(image => {
        eventDrivenSyncService.emitSyncEvent({
          type: 'image_added',
          payload: image,
          source: 'local'
        });
      });
      
      // ✅ PHASE 3.1: Complete uploading state
      loadingMachine.completeUploading();
      
    } catch (error: any) {
      const errorMsg = `Upload failed: ${error.message}`;
      console.error(errorMsg, error);
      // ✅ PHASE 3.1: Fail uploading state with specific error
      loadingMachine.failUploading(errorMsg);
    }
  }, []); // ✅ Empty dependencies - only depends on dispatch

  // ✅ PHASE 4.1: Create group with explicit return type and strict typing
  const createGroup = useCallback((data: ImageGroup): void => {
    dispatch({ type: 'ADD_GROUP', payload: data });
    
    // ✅ PHASE 3.2: Fire event-driven sync for group creation
    eventDrivenSyncService.emitSyncEvent({
      type: 'group_created',
      payload: data,
      source: 'local'
    });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  // ✅ PHASE 4.1: Delete image with explicit return type and strict typing
  const deleteImage = useCallback(async (id: string): Promise<void> => {
    try {
      // Delete from database first
      const { ImageMigrationService } = await import('@/services/DataMigrationService');
      await ImageMigrationService.deleteImageFromDatabase(id);
      
      // Then update local state
      dispatch({ type: 'REMOVE_IMAGE', payload: id });
      
      // ✅ PHASE 3.2: Fire event-driven sync for image deletion
      eventDrivenSyncService.emitSyncEvent({
        type: 'image_deleted',
        payload: id,
        source: 'local'
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw error;
    }
  }, []); // ✅ Empty dependencies - only depends on dispatch

  // ✅ Delete group with database persistence
  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    try {
      // Delete from database first
      const { GroupMigrationService } = await import('@/services/DataMigrationService');
      await GroupMigrationService.deleteGroupFromDatabase(id);
      
      // Then update local state
      dispatch({ type: 'REMOVE_GROUP', payload: id });
      
      // Fire event-driven sync for group deletion
      eventDrivenSyncService.emitSyncEvent({
        type: 'group_deleted',
        payload: id,
        source: 'local'
      });
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  }, []);

  // ✅ Clean workspace with selective deletion
  const cleanWorkspace = useCallback(async (options: { 
    clearImages: boolean; 
    clearAnalyses: boolean; 
    clearGroups: boolean; 
  }): Promise<void> => {
    try {
      const { DataMigrationService } = await import('@/services/DataMigrationService');
      await DataMigrationService.cleanWorkspaceData(options);
      
      // Update local state based on options
      if (options.clearImages) {
        dispatch({ type: 'CLEAR_IMAGES' });
      }
      if (options.clearAnalyses) {
        dispatch({ type: 'CLEAR_ANALYSES' });
      }
      if (options.clearGroups) {
        dispatch({ type: 'CLEAR_GROUPS' });
      }
      
      // Fire event-driven sync for workspace cleanup
      eventDrivenSyncService.emitSyncEvent({
        type: 'workspace_cleaned',
        payload: options,
        source: 'local'
      });
    } catch (error) {
      console.error('Failed to clean workspace:', error);
      throw error;
    }
  }, []);

  // ✅ PHASE 4.1: Reset all with explicit return type and strict typing
  const resetAll = useCallback((): void => {
    dispatch({ type: 'RESET_STATE' });
    
    // ✅ PHASE 3.2: Fire event-driven sync for data invalidation
    eventDrivenSyncService.emitSyncEvent({
      type: 'data_invalidated',
      payload: { reason: 'state_reset' },
      source: 'local'
    });
  }, []); // ✅ Empty dependencies - only depends on dispatch

  return {
    loadData,
    uploadImages,
    createGroup,
    deleteImage,
    deleteGroup,
    cleanWorkspace,
    resetAll
  };
};