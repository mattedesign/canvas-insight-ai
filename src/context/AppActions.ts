/**
 * App Actions - Action creators for type-safe dispatch
 * Centralizes all action creation logic
 */

import type { 
  AppAction, 
  ImageFile, 
  UXAnalysis, 
  ImageGroup, 
  GroupAnalysis, 
  GeneratedConcept,
  AppState 
} from './AppStateTypes';

export const createActions = (dispatch: React.Dispatch<AppAction>) => ({
  // Loading states
  setLoading: (loading: boolean) => 
    dispatch({ type: 'SET_LOADING', payload: loading }),
  
  setSyncing: (syncing: boolean) => 
    dispatch({ type: 'SET_SYNCING', payload: syncing }),
  
  setUploading: (uploading: boolean) => 
    dispatch({ type: 'SET_UPLOADING', payload: uploading }),
  
  setGeneratingConcept: (generating: boolean) => 
    dispatch({ type: 'SET_GENERATING_CONCEPT', payload: generating }),
  
  setError: (error: string | null) => 
    dispatch({ type: 'SET_ERROR', payload: error }),
  
  // Image management
  addImages: (images: ImageFile[]) => 
    dispatch({ type: 'ADD_IMAGES', payload: images }),
  
  removeImage: (imageId: string) => 
    dispatch({ type: 'REMOVE_IMAGE', payload: imageId }),
  
  updateImage: (id: string, updates: Partial<ImageFile>) => 
    dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates } }),
  
  setSelectedImage: (imageId: string | null) => 
    dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId }),
  
  // Analysis management
  addAnalysis: (analysis: UXAnalysis) => 
    dispatch({ type: 'ADD_ANALYSIS', payload: analysis }),
  
  updateAnalysis: (id: string, updates: Partial<UXAnalysis>) => 
    dispatch({ type: 'UPDATE_ANALYSIS', payload: { id, updates } }),
  
  removeAnalysis: (analysisId: string) => 
    dispatch({ type: 'REMOVE_ANALYSIS', payload: analysisId }),
  
  // Group management
  createGroup: (group: ImageGroup) => 
    dispatch({ type: 'CREATE_GROUP', payload: group }),
  
  updateGroup: (id: string, updates: Partial<ImageGroup>) => 
    dispatch({ type: 'UPDATE_GROUP', payload: { id, updates } }),
  
  deleteGroup: (groupId: string) => 
    dispatch({ type: 'DELETE_GROUP', payload: groupId }),
  
  addGroupAnalysis: (groupAnalysis: GroupAnalysis) => 
    dispatch({ type: 'ADD_GROUP_ANALYSIS', payload: groupAnalysis }),
  
  // Concept generation
  addGeneratedConcept: (concept: GeneratedConcept) => 
    dispatch({ type: 'ADD_GENERATED_CONCEPT', payload: concept }),
  
  // UI state
  toggleAnnotations: () => 
    dispatch({ type: 'TOGGLE_ANNOTATIONS' }),
  
  setGalleryTool: (tool: 'select' | 'group' | 'analyze') => 
    dispatch({ type: 'SET_GALLERY_TOOL', payload: tool }),
  
  setGroupDisplayMode: (groupId: string, mode: 'collapsed' | 'expanded') => 
    dispatch({ type: 'SET_GROUP_DISPLAY_MODE', payload: { groupId, mode } }),
  
  // Sync state
  addPendingSync: (operationId: string) => 
    dispatch({ type: 'ADD_PENDING_SYNC', payload: operationId }),
  
  removePendingSync: (operationId: string) => 
    dispatch({ type: 'REMOVE_PENDING_SYNC', payload: operationId }),
  
  setLastSyncTimestamp: (timestamp: Date) => 
    dispatch({ type: 'SET_LAST_SYNC_TIMESTAMP', payload: timestamp }),
  
  incrementVersion: () => 
    dispatch({ type: 'INCREMENT_VERSION' }),
  
  // Batch operations
  batchUpload: (images: ImageFile[], analyses: UXAnalysis[]) => 
    dispatch({ type: 'BATCH_UPLOAD', payload: { images, analyses } }),
  
  mergeFromDatabase: (data: Partial<AppState>) => 
    dispatch({ type: 'MERGE_FROM_DATABASE', payload: data }),
  
  clearAllData: () => 
    dispatch({ type: 'CLEAR_ALL_DATA' }),
  
  restoreState: (state: AppState) => 
    dispatch({ type: 'RESTORE_STATE', payload: state }),
});

export type AppActionsType = ReturnType<typeof createActions>;