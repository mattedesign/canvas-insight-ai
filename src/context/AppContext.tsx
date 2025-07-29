/**
 * Simplified App Context - Single Source of Truth
 * Eliminates race conditions by removing complex state managers
 */

import React, { createContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useImageViewer } from '@/hooks/useImageViewer';
import { useAnalysisRealtime } from '@/hooks/useAnalysisRealtime';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { appStateReducer } from './AppStateReducer';
import { initialAppState, type AppState, type AppAction } from './AppStateTypes';
import { DataMigrationService } from '@/services/DataMigrationService';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import type { UploadedImage, UXAnalysis, ImageGroup, GroupAnalysisWithPrompt, GeneratedConcept } from '@/types/ux-analysis';

interface AppContextType {
  // State
  state: AppState;
  
  // Actions
  dispatch: React.Dispatch<AppAction>;
  
  // High-level operations
  handleImageUpload: (files: File[]) => Promise<void>;
  handleImageUploadImmediate: (files: File[]) => Promise<void>;
  syncToDatabase: () => Promise<void>;
  loadDataFromDatabase: () => Promise<void>;
  updateAppStateFromDatabase: (data: any) => void;
  
  // Canvas operations
  clearCanvas: () => void;
  
  // Group operations
  createGroup: (name: string, description: string, color: string, imageIds: string[], position?: { x: number; y: number }) => void;
  updateGroup: (groupId: string, updates: Partial<ImageGroup>) => void;
  deleteGroup: (groupId: string) => void;
  
  // Concept generation
  generateConcept: (prompt: string, selectedImages?: string[]) => Promise<void>;
  
  // Image viewer integration
  viewerState: any;
  toggleAnnotation: (annotationId: string) => void;
  clearAnnotations: () => void;
  
  // AI Analysis actions
  handleAnalysisComplete: (imageId: string, analysis: UXAnalysis) => void;
  
  // Cache features
  offlineCache?: any;
  
  // Backward compatibility - direct state access
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  imageGroups: ImageGroup[];
  groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
  generatedConcepts: GeneratedConcept[];
  groupAnalyses: any[];
  groupPromptSessions: any[];
  selectedImageId: string | null;
  showAnnotations: boolean;
  galleryTool: 'cursor' | 'draw';
  groupDisplayModes: Record<string, 'standard' | 'stacked'>;
  isLoading: boolean;
  isSyncing: boolean;
  isUploading: boolean;
  isGeneratingConcept: boolean;
  
  // Backward compatibility - legacy handlers
  handleClearCanvas: () => void;
  handleImageSelect: (imageId: string) => void;
  handleToggleAnnotations: () => void;
  handleAnnotationClick: (annotationId: string) => void;
  handleGalleryToolChange: (tool: 'cursor' | 'draw') => void;
  handleAddComment: () => void;
  handleGenerateConcept: (analysisId: string) => Promise<void>;
  handleCreateGroup: (imageIds: string[]) => void;
  handleUngroup: (groupId: string) => void;
  handleDeleteGroup: (groupId: string) => void;
  handleEditGroup: (groupId: string, name: string, description: string, color: string) => void;
  handleGroupDisplayModeChange: (groupId: string, mode: 'standard' | 'stacked') => void;
  handleSubmitGroupPrompt: (groupId: string, prompt: string, isCustom: boolean) => Promise<void>;
  handleEditGroupPrompt: (sessionId: string) => void;
  handleCreateFork: (sessionId: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: React.ReactNode;
}

// Custom hook to use the context
export function useAppContext() {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const { user } = useAuth();
  const { toast } = useFilteredToast();
  const { state: viewerState, toggleAnnotation, clearAnnotations } = useImageViewer();
  
  // Simplified hooks for basic functionality
  const offlineCache = useOfflineCache();

  // Real-time analysis handling with optimized updates
  const handleAnalysisUpdate = useCallback((analysis: UXAnalysis) => {
    console.log('Real-time analysis update received:', analysis);
    dispatch({ type: 'UPDATE_ANALYSIS', payload: { imageId: analysis.imageId, analysis } });
  }, []);

  const handleAnalysisError = useCallback((imageId: string, error: string) => {
    console.error('Analysis error for image:', imageId, error);
    dispatch({ type: 'UPDATE_IMAGE', payload: { id: imageId, updates: { status: 'error' } } });
    
    toast({
      title: "Analysis failed",
      description: `Analysis failed for image: ${error}`,
      category: "error",
      variant: "destructive"
    });
  }, [toast]);

  // Set up real-time analysis handling
  useAnalysisRealtime({
    onAnalysisUpdate: handleAnalysisUpdate,
    onAnalysisError: handleAnalysisError,
    onAnalysisStatusChange: (imageId: string, status: UXAnalysis['status']) => {
      dispatch({ type: 'UPDATE_IMAGE', payload: { id: imageId, updates: { status } } });
    },
  });

  // Simplified data loading function
  const loadDataFromDatabase = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const migrationResult = await DataMigrationService.loadAllFromDatabase();
      
      if (migrationResult.success && migrationResult.data) {
        console.log('[AppContext] Data loaded successfully:', {
          images: migrationResult.data.uploadedImages.length,
          analyses: migrationResult.data.analyses.length,
          groups: migrationResult.data.imageGroups.length
        });
        
        dispatch({ 
          type: 'MERGE_FROM_DATABASE', 
          payload: migrationResult.data,
          meta: { forceReplace: false }
        });
      } else {
        console.log('[AppContext] No data loaded or load failed');
      }
    } catch (error) {
      console.error('[AppContext] Failed to load data:', error);
      toast({
        title: "Failed to load data",
        description: "Error loading your data. Please try refreshing.",
        category: "error",
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, toast]);

  // Load initial data when user logs in
  useEffect(() => {
    if (user) {
      console.log('[AppContext] User authenticated, loading data...');
      loadDataFromDatabase();
    } else {
      console.log('[AppContext] User logged out, clearing state...');
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user]); // Only depend on user, not loadDataFromDatabase to avoid infinite loop

  // Simplified database sync function
  const syncToDatabase = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_SYNCING', payload: true });
    
    try {
      const migrationResult = await DataMigrationService.migrateAllToDatabase({
        uploadedImages: state.uploadedImages,
        analyses: state.analyses,
        imageGroups: state.imageGroups,
        groupAnalysesWithPrompts: state.groupAnalysesWithPrompts,
      });
      
      if (migrationResult.success) {
        console.log('[AppContext] Data synced successfully');
        toast({
          title: "Sync complete",
          description: "Your data has been saved to the cloud.",
          category: "success",
        });
      } else {
        throw new Error(migrationResult.error || 'Sync failed');
      }
    } catch (error) {
      console.error('[AppContext] Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Failed to save data. Please try again.",
        category: "error",
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [user, state, toast]);

  // Simplified image upload - direct state update
  const handleImageUpload = useCallback(async (files: File[]) => {
    dispatch({ type: 'SET_UPLOADING', payload: true });
    
    try {
      const newImages: UploadedImage[] = [];
      const newAnalyses: UXAnalysis[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageId = `img-${Date.now()}-${i}`;
        const imageUrl = URL.createObjectURL(file);
        
        const uploadedImage: UploadedImage = {
          id: imageId,
          name: file.name,
          url: imageUrl,
          file,
          dimensions: { width: 0, height: 0 },
          status: 'completed'
        };
        
        newImages.push(uploadedImage);
        
        // Generate immediate mock analysis
        const mockAnalysis = generateMockAnalysis(imageId, file.name, imageUrl);
        newAnalyses.push(mockAnalysis);
      }
      
      console.log('[AppContext] Uploading', newImages.length, 'images');
      
      // Single atomic update
      dispatch({ 
        type: 'BATCH_UPLOAD', 
        payload: { images: newImages, analyses: newAnalyses } 
      });

      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
        category: "success",
      });
      
    } catch (error) {
      console.error('[AppContext] Upload failed:', error);
      toast({
        title: "Upload failed", 
        description: "Failed to upload images. Please try again.",
        category: "error",
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  }, [toast]);

  // Immediate upload for demo purposes
  const handleImageUploadImmediate = useCallback(async (files: File[]) => {
    dispatch({ type: 'SET_UPLOADING', payload: true });

    try {
      const newImages: UploadedImage[] = [];
      const newAnalyses: UXAnalysis[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageId = `temp-${Date.now()}-${i}`;
        const imageUrl = URL.createObjectURL(file);
        
        const uploadedImage: UploadedImage = {
          id: imageId,
          name: file.name,
          url: imageUrl,
          file,
          dimensions: { width: 0, height: 0 },
          status: 'completed'
        };
        
        newImages.push(uploadedImage);
        newAnalyses.push(generateMockAnalysis(imageId, file.name, imageUrl));
      }
      
      // Single atomic update
      dispatch({ 
        type: 'BATCH_UPLOAD', 
        payload: { images: newImages, analyses: newAnalyses } 
      });

      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
        category: "success",
      });
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  }, [toast]);

  // Analysis completion handler
  const handleAnalysisComplete = useCallback((imageId: string, analysis: UXAnalysis) => {
    console.log('[AppContext] Analysis completed for image:', imageId);
    
    dispatch({ type: 'UPDATE_ANALYSIS', payload: { imageId, analysis } });
    dispatch({ type: 'REMOVE_PENDING_SYNC', payload: imageId });
    
    toast({
      title: "Analysis Complete",
      description: "New AI analysis has been generated for your image.",
      category: "success",
    });
  }, [toast]);

  // Update app state from database with conflict resolution
  const updateAppStateFromDatabase = useCallback((data: any) => {
    dispatch({ 
      type: 'MERGE_FROM_DATABASE', 
      payload: data,
      meta: { forceReplace: false }
    });
  }, []);

  // Canvas operations
  const clearCanvas = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    clearAnnotations();
  }, [clearAnnotations]);

  // Group operations
  const createGroup = useCallback((
    name: string, 
    description: string, 
    color: string, 
    imageIds: string[], 
    position = { x: 100, y: 100 }
  ) => {
    const newGroup: ImageGroup = {
      id: `group-${Date.now()}`,
      name,
      description,
      color,
      imageIds,
      position,
      createdAt: new Date()
    };

    dispatch({ type: 'ADD_GROUP', payload: newGroup });
    
    toast({
      title: "Group Created",
      description: `Created group "${name}" with ${imageIds.length} images`,
      category: "success"
    });
  }, [toast]);

  const updateGroup = useCallback((groupId: string, updates: Partial<ImageGroup>) => {
    dispatch({ type: 'UPDATE_GROUP', payload: { id: groupId, updates } });
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    dispatch({ type: 'REMOVE_GROUP', payload: groupId });
    
    toast({
      title: "Group Deleted",
      description: "Group has been deleted successfully",
      category: "success"
    });
  }, [toast]);

  // Concept generation
  const generateConcept = useCallback(async (prompt: string, selectedImages?: string[]) => {
    dispatch({ type: 'SET_GENERATING_CONCEPT', payload: true });
    
    try {
      // Mock concept generation for now
      const conceptId = `concept-${Date.now()}`;
      const concept: GeneratedConcept = {
        id: conceptId,
        title: 'Generated Concept',
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY2OTQyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Db25jZXB0PC90ZXh0Pjwvc3ZnPg==',
        analysisId: selectedImages?.[0] || '',
        description: `Generated concept based on: ${prompt}`,
        improvements: [],
        createdAt: new Date()
      };

      dispatch({ type: 'SET_CONCEPTS', payload: [concept] });
      
      toast({
        title: "Concept Generated",
        description: "New concept has been generated successfully",
        category: "success"
      });
    } catch (error) {
      console.error('Concept generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate concept. Please try again.",
        category: "error",
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_GENERATING_CONCEPT', payload: false });
    }
  }, [toast]);

  // Backward compatibility handlers
  const handleClearCanvas = useCallback(() => clearCanvas(), [clearCanvas]);
  const handleImageSelect = useCallback((imageId: string) => {
    dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId });
  }, []);
  
  const handleToggleAnnotations = useCallback(() => {
    dispatch({ type: 'TOGGLE_ANNOTATIONS' });
  }, [state.showAnnotations]);
  
  const handleAnnotationClick = useCallback((annotationId: string) => {
    toggleAnnotation(annotationId);
  }, [toggleAnnotation]);
  
  const handleGalleryToolChange = useCallback((tool: 'cursor' | 'draw') => {
    dispatch({ type: 'SET_GALLERY_TOOL', payload: tool });
  }, []);
  
  const handleAddComment = useCallback(() => {
    console.log('Add comment triggered');
  }, []);
  
  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    await generateConcept(`Generated from analysis ${analysisId}`, [analysisId]);
  }, [generateConcept]);
  
  const handleCreateGroup = useCallback((imageIds: string[]) => {
    createGroup(`Group ${Date.now()}`, 'Auto-created group', '#3b82f6', imageIds);
  }, [createGroup]);
  
  const handleUngroup = useCallback((groupId: string) => {
    deleteGroup(groupId);
  }, [deleteGroup]);
  
  const handleDeleteGroup = useCallback((groupId: string) => {
    deleteGroup(groupId);
  }, [deleteGroup]);
  
  const handleEditGroup = useCallback((groupId: string, name: string, description: string, color: string) => {
    updateGroup(groupId, { name, description, color });
  }, [updateGroup]);
  
  const handleGroupDisplayModeChange = useCallback((groupId: string, mode: 'standard' | 'stacked') => {
    dispatch({ type: 'SET_GROUP_DISPLAY_MODE', payload: { groupId, mode } });
  }, []);
  
  const handleSubmitGroupPrompt = useCallback(async (groupId: string, prompt: string, isCustom: boolean) => {
    console.log('Group prompt submitted:', { groupId, prompt, isCustom });
    toast({
      title: "Group Analysis",
      description: "Group analysis has been submitted for processing",
      category: "success"
    });
  }, [toast]);
  
  const handleEditGroupPrompt = useCallback((sessionId: string) => {
    console.log('Edit group prompt:', sessionId);
  }, []);
  
  const handleCreateFork = useCallback((sessionId: string) => {
    console.log('Create fork:', sessionId);
  }, []);

  // Memoized context value for performance
  const value = useMemo(() => ({
    // State and dispatch
    state,
    dispatch,
    
    // Operations
    handleImageUpload,
    handleImageUploadImmediate,
    syncToDatabase,
    loadDataFromDatabase,
    updateAppStateFromDatabase,
    clearCanvas,
    createGroup,
    updateGroup,
    deleteGroup,
    generateConcept,
    
    // Viewer integration
    viewerState,
    toggleAnnotation,
    clearAnnotations,
    
    // Analysis
    handleAnalysisComplete,
    
    // Cache features
    offlineCache,
    
    // Direct state access for backward compatibility
    uploadedImages: state.uploadedImages,
    analyses: state.analyses,
    imageGroups: state.imageGroups,
    groupAnalysesWithPrompts: state.groupAnalysesWithPrompts,
    generatedConcepts: state.generatedConcepts,
    groupAnalyses: state.groupAnalyses,
    groupPromptSessions: state.groupPromptSessions,
    selectedImageId: state.selectedImageId,
    showAnnotations: state.showAnnotations,
    galleryTool: state.galleryTool,
    groupDisplayModes: state.groupDisplayModes,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    isUploading: state.isUploading,
    isGeneratingConcept: state.isGeneratingConcept,
    
    // Legacy handlers
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    handleAnnotationClick,
    handleGalleryToolChange,
    handleAddComment,
    handleGenerateConcept,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    handleEditGroup,
    handleGroupDisplayModeChange,
    handleSubmitGroupPrompt,
    handleEditGroupPrompt,
    handleCreateFork,
  }), [
    state,
    dispatch,
    handleImageUpload,
    handleImageUploadImmediate,
    syncToDatabase,
    loadDataFromDatabase,
    updateAppStateFromDatabase,
    clearCanvas,
    createGroup,
    updateGroup,
    deleteGroup,
    generateConcept,
    viewerState,
    toggleAnnotation,
    clearAnnotations,
    handleAnalysisComplete,
    offlineCache,
    handleClearCanvas,
    handleImageSelect,
    handleToggleAnnotations,
    handleAnnotationClick,
    handleGalleryToolChange,
    handleAddComment,
    handleGenerateConcept,
    handleCreateGroup,
    handleUngroup,
    handleDeleteGroup,
    handleEditGroup,
    handleGroupDisplayModeChange,
    handleSubmitGroupPrompt,
    handleEditGroupPrompt,
    handleCreateFork,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};