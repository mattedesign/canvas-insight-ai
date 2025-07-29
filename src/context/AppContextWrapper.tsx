/**
 * App Context Wrapper - Migration Bridge
 * Provides backward compatibility during the transition to simplified state management
 */

import React from 'react';
import { SimplifiedAppProvider, useSimplifiedAppContext } from './SimplifiedAppContext';
import { useLoadingStateMachine } from '@/hooks/useLoadingStateMachine';
import { useImageViewer } from '@/hooks/useImageViewer';
import { useAnalysisRealtime } from '@/hooks/useAnalysisRealtime';
import { useAppActions, useAppHelpers } from '@/hooks/useOptimizedSelectors';
import type { AppContextType } from './AppContext';

type LegacyAppContextType = AppContextType;

// Legacy compatibility wrapper
const LegacyCompatibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch, stableHelpers } = useSimplifiedAppContext();
  const actions = useAppActions();
  const helpers = useAppHelpers();
  const loadingMachine = useLoadingStateMachine();
  const imageViewer = useImageViewer();
  
  // Analysis realtime with stable callbacks
  const analysisRealtime = useAnalysisRealtime({
    onAnalysisUpdate: React.useCallback((analysis) => {
      dispatch({ type: 'UPDATE_ANALYSIS', payload: { imageId: analysis.imageId, analysis } });
    }, [dispatch]),
    
    onAnalysisError: React.useCallback((imageId: string, error: string) => {
      dispatch({ type: 'UPDATE_IMAGE', payload: { id: imageId, updates: { status: 'error' } } });
    }, [dispatch]),
    
    onAnalysisStatusChange: React.useCallback((imageId: string, status) => {
      dispatch({ type: 'UPDATE_IMAGE', payload: { id: imageId, updates: { status } } });
    }, [dispatch]),
  });

  // Create legacy context value for backward compatibility
  const legacyContextValue = React.useMemo((): LegacyAppContextType => ({
    // Core state
    state,
    actions: {
      ...actions,
      // Bridge new action names to old ones
      setLoading: (loading: boolean) => loadingMachine.actions.startAppLoad(),
      setSyncing: (syncing: boolean) => syncing ? loadingMachine.actions.startSync() : loadingMachine.actions.syncSuccess(),
      setUploading: (uploading: boolean) => uploading ? loadingMachine.actions.startUpload() : loadingMachine.actions.uploadSuccess(),
      setGeneratingConcept: (generating: boolean) => generating ? loadingMachine.actions.startConceptGeneration() : loadingMachine.actions.conceptGenerationSuccess(),
      setError: (error: string | null) => error ? loadingMachine.actions.appLoadError(error) : loadingMachine.actions.clearError(),
      addImages: (images) => dispatch({ type: 'ADD_IMAGES', payload: images }),
      removeImage: (imageId) => dispatch({ type: 'REMOVE_IMAGE', payload: imageId }),
      updateImage: (id, updates) => dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates } }),
      setSelectedImage: (imageId) => dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId }),
      addAnalysis: (analysis) => dispatch({ type: 'ADD_ANALYSIS', payload: analysis }),
      updateAnalysis: (imageId, analysis) => dispatch({ type: 'UPDATE_ANALYSIS', payload: { imageId, analysis } }),
      removeAnalysis: (analysisId) => dispatch({ type: 'REMOVE_ANALYSIS', payload: analysisId }),
      createGroup: (group) => dispatch({ type: 'CREATE_GROUP', payload: group }),
      updateGroup: (id, updates) => dispatch({ type: 'UPDATE_GROUP', payload: { id, updates } }),
      deleteGroup: (groupId) => dispatch({ type: 'DELETE_GROUP', payload: groupId }),
      addGroupAnalysis: (groupAnalysis) => dispatch({ type: 'ADD_GROUP_ANALYSIS', payload: groupAnalysis }),
      addGeneratedConcept: (concept) => dispatch({ type: 'ADD_GENERATED_CONCEPT', payload: concept }),
      toggleAnnotations: () => dispatch({ type: 'TOGGLE_ANNOTATIONS' }),
      setGalleryTool: (tool) => dispatch({ type: 'SET_GALLERY_TOOL', payload: tool }),
      setGroupDisplayMode: (groupId, mode) => dispatch({ type: 'SET_GROUP_DISPLAY_MODE', payload: { groupId, mode } }),
      addPendingSync: (operationId) => dispatch({ type: 'ADD_PENDING_SYNC', payload: operationId }),
      removePendingSync: (operationId) => dispatch({ type: 'REMOVE_PENDING_SYNC', payload: operationId }),
      setLastSyncTimestamp: (timestamp) => dispatch({ type: 'SET_LAST_SYNC_TIMESTAMP', payload: timestamp }),
      incrementVersion: () => dispatch({ type: 'INCREMENT_VERSION' }),
      batchUpload: (images, analyses) => dispatch({ type: 'BATCH_UPLOAD', payload: { images, analyses } }),
      mergeFromDatabase: (data, forceReplace) => dispatch({ type: 'MERGE_FROM_DATABASE', payload: data, meta: { forceReplace } }),
      clearAllData: () => dispatch({ type: 'CLEAR_ALL_DATA' }),
      restoreState: (state) => dispatch({ type: 'RESTORE_STATE', payload: state }),
    },
    
    // High-level operations using stable helpers
    handleImageUpload: stableHelpers.uploadImages,
    handleImageUploadImmediate: stableHelpers.uploadImagesImmediate,
    handleAnalysisComplete: React.useCallback((imageId: string, analysis) => {
      dispatch({ type: 'UPDATE_ANALYSIS', payload: { imageId, analysis } });
    }, [dispatch]),
    
    // Data operations
    loadDataFromDatabase: stableHelpers.loadData,
    syncToDatabase: stableHelpers.syncData,
    updateAppStateFromDatabase: React.useCallback((data) => {
      dispatch({ type: 'MERGE_FROM_DATABASE', payload: data, meta: { forceReplace: false } });
    }, [dispatch]),
    clearCanvas: stableHelpers.clearCanvas,
    
    // Group operations
    createGroup: stableHelpers.createGroup,
    updateGroup: React.useCallback((groupId: string, updates) => {
      dispatch({ type: 'UPDATE_GROUP', payload: { id: groupId, updates } });
    }, [dispatch]),
    deleteGroup: React.useCallback((groupId: string) => {
      dispatch({ type: 'DELETE_GROUP', payload: groupId });
    }, [dispatch]),
    
    // Concept generation
    generateConcept: stableHelpers.generateConcept,
    
    // Legacy support (backward compatibility properties)
    uploadedImages: state.uploadedImages,
    analyses: state.analyses,
    selectedImageId: state.selectedImageId,
    imageGroups: state.imageGroups,
    groupAnalysesWithPrompts: state.groupAnalysesWithPrompts,
    generatedConcepts: state.generatedConcepts,
    groupAnalyses: state.groupAnalysesWithPrompts,
    groupPromptSessions: state.groupAnalysesWithPrompts,
    showAnnotations: state.showAnnotations,
    galleryTool: state.galleryTool,
    groupDisplayModes: state.groupDisplayModes,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    isUploading: state.isUploading,
    isGeneratingConcept: state.isGeneratingConcept,
    pendingBackgroundSync: state.pendingBackgroundSync,
    lastSyncTimestamp: state.lastSyncTimestamp,
    version: state.version,
    
    // Legacy functions
    addImage: React.useCallback((image) => {
      dispatch({ type: 'ADD_IMAGES', payload: [image] });
    }, [dispatch]),
    updateImageAnalysisStatus: React.useCallback((imageId: string, status: string) => {
      dispatch({ type: 'UPDATE_IMAGE', payload: { id: imageId, updates: { status: status as any } } });
    }, [dispatch]),
    addAnalysis: React.useCallback((analysis) => {
      dispatch({ type: 'ADD_ANALYSIS', payload: analysis });
    }, [dispatch]),
    setSelectedImage: React.useCallback((imageId: string | null) => {
      dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId });
    }, [dispatch]),
    toggleAnnotations: React.useCallback(() => {
      dispatch({ type: 'TOGGLE_ANNOTATIONS' });
    }, [dispatch]),
    setGalleryTool: React.useCallback((tool: 'cursor' | 'draw') => {
      dispatch({ type: 'SET_GALLERY_TOOL', payload: tool });
    }, [dispatch]),
    
    // Integrations
    imageViewer,
    analysisRealtime,
    
    // Backward compatibility handlers (simplified)
    handleClearCanvas: stableHelpers.clearCanvas,
    handleImageSelect: React.useCallback((imageId: string) => {
      dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId });
    }, [dispatch]),
    handleToggleAnnotations: React.useCallback(() => {
      dispatch({ type: 'TOGGLE_ANNOTATIONS' });
    }, [dispatch]),
    handleAnnotationClick: React.useCallback((annotationId: string) => {
      imageViewer.toggleAnnotation(annotationId);
    }, [imageViewer]),
    handleGalleryToolChange: React.useCallback((tool: 'cursor' | 'draw') => {
      dispatch({ type: 'SET_GALLERY_TOOL', payload: tool });
    }, [dispatch]),
    handleAddComment: React.useCallback(() => {
      // Placeholder for comment functionality
    }, []),
    handleGenerateConcept: React.useCallback(async (analysisId: string) => {
      await stableHelpers.generateConcept('Auto-generated concept', [analysisId]);
    }, [stableHelpers]),
    handleCreateGroup: React.useCallback((imageIds: string[]) => {
      stableHelpers.createGroup('New Group', 'Auto-created group', '#3b82f6', imageIds, { x: 100, y: 100 });
    }, [stableHelpers]),
    handleUngroup: React.useCallback((groupId: string) => {
      dispatch({ type: 'DELETE_GROUP', payload: groupId });
    }, [dispatch]),
    handleDeleteGroup: React.useCallback((groupId: string) => {
      dispatch({ type: 'DELETE_GROUP', payload: groupId });
    }, [dispatch]),
    handleEditGroup: React.useCallback((groupId: string, name: string, description: string, color: string) => {
      dispatch({ type: 'UPDATE_GROUP', payload: { id: groupId, updates: { name, description, color } } });
    }, [dispatch]),
    handleGroupDisplayModeChange: React.useCallback((groupId: string, mode: 'standard' | 'stacked') => {
      dispatch({ type: 'SET_GROUP_DISPLAY_MODE', payload: { groupId, mode } });
    }, [dispatch]),
    handleSubmitGroupPrompt: React.useCallback(async (groupId: string, prompt: string, isCustom: boolean) => {
      // Placeholder for group prompt functionality
    }, []),
    handleEditGroupPrompt: React.useCallback((sessionId: string) => {
      // Placeholder for edit group prompt functionality
    }, []),
    handleCreateFork: React.useCallback((sessionId: string) => {
      // Placeholder for create fork functionality
    }, []),
    
    // Additional integration points
    viewerState: imageViewer.state,
    toggleAnnotation: imageViewer.toggleAnnotation,
    clearAnnotations: imageViewer.clearAnnotations,
  }), [
    state, 
    dispatch, 
    stableHelpers, 
    actions, 
    loadingMachine.actions, 
    imageViewer, 
    analysisRealtime
  ]);

  // Create a legacy context for backward compatibility
  const LegacyAppContext = React.createContext<LegacyAppContextType | undefined>(undefined);

  return (
    <LegacyAppContext.Provider value={legacyContextValue}>
      {children}
    </LegacyAppContext.Provider>
  );
};

// Main wrapper that provides both simplified and legacy contexts
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SimplifiedAppProvider>
      <LegacyCompatibilityProvider>
        {children}
      </LegacyCompatibilityProvider>
    </SimplifiedAppProvider>
  );
};