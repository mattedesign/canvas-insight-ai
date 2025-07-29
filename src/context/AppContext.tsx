/**
 * Refactored App Context - Clean Architecture Implementation
 * Eliminates circular dependencies and implements performance optimizations
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useMemo, 
  useCallback,
  useEffect
} from 'react';
import { useAuth } from './AuthContext';
import { useImageViewer } from '@/hooks/useImageViewer';
import { useAnalysisRealtime } from '@/hooks/useAnalysisRealtime';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { DataMigrationService } from '@/services/DataMigrationService';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { loadImageDimensions } from '@/utils/imageUtils';
import type { 
  AppState, 
  AppAction,
  UploadedImage, 
  LegacyUXAnalysis as UXAnalysis,
  LegacyImageGroup as ImageGroup,
  GroupAnalysisWithPrompt,
  LegacyGeneratedConcept as GeneratedConcept
} from './AppStateTypes';
import { appStateReducer } from './AppStateReducer';
import { createActions, type AppActionsType } from './AppActions';
import { initialAppState } from './AppStateTypes';

// Context interface with enhanced type safety
interface AppContextType {
  state: AppState;
  actions: AppActionsType;
  
  // High-level operations
  handleImageUpload: (files: File[]) => Promise<void>;
  handleImageUploadImmediate: (files: File[]) => Promise<void>;
  handleAnalysisComplete: (imageId: string, analysis: UXAnalysis) => void;
  
  // Data operations
  loadDataFromDatabase: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
  updateAppStateFromDatabase: (data: any) => void;
  clearCanvas: () => void;
  
  // Group operations
  createGroup: (name: string, description: string, color: string, imageIds: string[], position: { x: number; y: number }) => void;
  updateGroup: (groupId: string, updates: Partial<ImageGroup>) => void;
  deleteGroup: (groupId: string) => void;
  
  // Concept generation
  generateConcept: (prompt: string, selectedImages?: string[]) => Promise<void>;
  
  // Legacy support (for backward compatibility)
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  selectedImageId: string | null;
  imageGroups: ImageGroup[];
  groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
  generatedConcepts: GeneratedConcept[];
  groupAnalyses: GroupAnalysisWithPrompt[];
  groupPromptSessions: GroupAnalysisWithPrompt[];
  showAnnotations: boolean;
  galleryTool: 'cursor' | 'draw';
  groupDisplayModes: Record<string, 'standard' | 'stacked'>;
  isLoading: boolean;
  isSyncing: boolean;
  isUploading: boolean;
  isGeneratingConcept: boolean;
  pendingBackgroundSync: Set<string>;
  lastSyncTimestamp: Date | null;
  version: number;
  
  // Legacy functions (deprecated but maintained for compatibility)
  addImage: (image: UploadedImage) => void;
  updateImageAnalysisStatus: (imageId: string, status: string) => void;
  addAnalysis: (analysis: UXAnalysis) => void;
  setSelectedImage: (imageId: string | null) => void;
  toggleAnnotations: () => void;
  setGalleryTool: (tool: 'cursor' | 'draw') => void;
  
  // Image viewer integration
  imageViewer: ReturnType<typeof useImageViewer>;
  
  // Realtime analysis
  analysisRealtime: ReturnType<typeof useAnalysisRealtime>;
  
  // Backward compatibility handlers
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
  
  // Additional integration points
  viewerState: any;
  toggleAnnotation: (annotationId: string) => void;
  clearAnnotations: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const { user } = useAuth();
  const { toast } = useFilteredToast();
  const imageViewer = useImageViewer();
  const { state: viewerState, toggleAnnotation, clearAnnotations } = imageViewer;
  
  // Create action creators
  const actions = useMemo(() => createActions(dispatch), []);
  
  // Real-time analysis handling
  const handleAnalysisUpdate = useCallback((analysis: UXAnalysis) => {
    console.log('Real-time analysis update received:', analysis);
    actions.updateAnalysis(analysis.imageId, analysis);
  }, [actions]);

  const handleAnalysisError = useCallback((imageId: string, error: string) => {
    console.error('Analysis error for image:', imageId, error);
    actions.updateImage(imageId, { status: 'error' });
    
    toast({
      title: "Analysis failed",
      description: `Analysis failed for image: ${error}`,
      category: "error",
    });
  }, [actions, toast]);

  const analysisRealtime = useAnalysisRealtime({
    onAnalysisUpdate: handleAnalysisUpdate,
    onAnalysisError: handleAnalysisError,
    onAnalysisStatusChange: (imageId: string, status: UXAnalysis['status']) => {
      actions.updateImage(imageId, { status });
    },
  });

  // Data loading function
  const loadDataFromDatabase = useCallback(async () => {
    if (!user) return;

    actions.setLoading(true);
    
    try {
      const migrationResult = await DataMigrationService.loadAllFromDatabase();
      
      if (migrationResult.success && migrationResult.data) {
        console.log('[AppContext] Data loaded successfully:', {
          images: migrationResult.data.uploadedImages?.length || 0,
          analyses: migrationResult.data.analyses?.length || 0,
          groups: migrationResult.data.imageGroups?.length || 0
        });
        
        actions.mergeFromDatabase(migrationResult.data, false);
      } else {
        console.log('[AppContext] No data loaded or load failed');
      }
    } catch (error) {
      console.error('[AppContext] Failed to load data:', error);
      toast({
        title: "Failed to load data",
        description: "Error loading your data. Please try refreshing.",
        variant: "destructive",
        category: "error"
      });
    } finally {
      actions.setLoading(false);
    }
  }, [user, actions, toast]);

  // Load initial data when user logs in
  useEffect(() => {
    if (user) {
      console.log('[AppContext] User authenticated, loading data...');
      loadDataFromDatabase();
    } else {
      console.log('[AppContext] User logged out, clearing state...');
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user, loadDataFromDatabase]);

  // Database sync function
  const syncToDatabase = useCallback(async () => {
    if (!user) return;

    actions.setSyncing(true);
    
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
          category: "success"
        });
      } else {
        throw new Error(migrationResult.error || 'Sync failed');
      }
    } catch (error) {
      console.error('[AppContext] Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Failed to save data. Please try again.",
        variant: "destructive",
        category: "error"
      });
    } finally {
      actions.setSyncing(false);
    }
  }, [user, state, actions, toast]);

  // Image upload with proper dimensions
  const handleImageUpload = useCallback(async (files: File[]) => {
    actions.setUploading(true);
    
    try {
      const newImages: UploadedImage[] = [];
      const newAnalyses: UXAnalysis[] = [];
      
      const dimensionsPromises = files.map(async (file, i) => {
        const imageId = `img-${Date.now()}-${i}`;
        const imageUrl = URL.createObjectURL(file);
        
        const dimensions = await loadImageDimensions(file);
        
        const uploadedImage: UploadedImage = {
          id: imageId,
          name: file.name,
          url: imageUrl,
          file,
          dimensions,
          status: 'completed'
        };
        
        return {
          image: uploadedImage,
          analysis: generateMockAnalysis(imageId, file.name, imageUrl)
        };
      });
      
      const results = await Promise.all(dimensionsPromises);
      
      results.forEach(result => {
        newImages.push(result.image);
        newAnalyses.push(result.analysis);
      });
      
      console.log('[AppContext] Uploading', newImages.length, 'images with dimensions');
      
      actions.batchUpload(newImages, newAnalyses);

      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''} with dimensions loaded.`,
        category: "success"
      });
      
    } catch (error) {
      console.error('[AppContext] Upload failed:', error);
      toast({
        title: "Upload failed", 
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
        category: "error"
      });
    } finally {
      actions.setUploading(false);
    }
  }, [actions, toast]);

  // Immediate upload for demo purposes
  const handleImageUploadImmediate = useCallback(async (files: File[]) => {
    actions.setUploading(true);

    try {
      const newImages: UploadedImage[] = [];
      const newAnalyses: UXAnalysis[] = [];
      
      const dimensionsPromises = files.map(async (file, i) => {
        const imageId = `temp-${Date.now()}-${i}`;
        const imageUrl = URL.createObjectURL(file);
        
        const dimensions = await loadImageDimensions(file);
        
        const uploadedImage: UploadedImage = {
          id: imageId,
          name: file.name,
          url: imageUrl,
          file,
          dimensions,
          status: 'completed'
        };
        
        return {
          image: uploadedImage,
          analysis: generateMockAnalysis(imageId, file.name, imageUrl)
        };
      });
      
      const results = await Promise.all(dimensionsPromises);
      
      results.forEach(result => {
        newImages.push(result.image);
        newAnalyses.push(result.analysis);
      });
      
      actions.batchUpload(newImages, newAnalyses);

      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''} with dimensions loaded.`,
        category: "success"
      });
    } catch (error) {
      console.error('Error in image upload:', error);
      toast({
        title: "Upload error",
        description: "Some images failed to load properly. Please try again.",
        category: "error"
      });
    } finally {
      actions.setUploading(false);
    }
  }, [actions, toast]);

  // Analysis completion handler
  const handleAnalysisComplete = useCallback((imageId: string, analysis: UXAnalysis) => {
    console.log('[AppContext] Analysis completed for image:', imageId);
    
    actions.updateAnalysis(imageId, analysis);
    actions.removePendingSync(imageId);
    
    toast({
      title: "Analysis Complete",
      description: "New AI analysis has been generated for your image.",
      category: "success"
    });
  }, [actions, toast]);

  // Update app state from database
  const updateAppStateFromDatabase = useCallback((data: any) => {
    actions.mergeFromDatabase(data, false);
  }, [actions]);

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
    actions.updateGroup(groupId, updates);
  }, [actions]);

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
    actions.setGeneratingConcept(true);
    
    try {
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
        variant: "destructive",
        category: "error"
      });
    } finally {
      actions.setGeneratingConcept(false);
    }
  }, [actions, toast]);

  // Legacy support functions
  const addImage = useCallback((image: UploadedImage) => {
    actions.addImages([image]);
  }, [actions]);

  const updateImageAnalysisStatus = useCallback((imageId: string, status: string) => {
    actions.updateImage(imageId, { status: status as any });
  }, [actions]);

  const addAnalysis = useCallback((analysis: UXAnalysis) => {
    actions.addAnalysis(analysis);
  }, [actions]);

  const setSelectedImage = useCallback((imageId: string | null) => {
    actions.setSelectedImage(imageId);
  }, [actions]);

  const toggleAnnotations = useCallback(() => {
    actions.toggleAnnotations();
  }, [actions]);

  const setGalleryTool = useCallback((tool: 'cursor' | 'draw') => {
    actions.setGalleryTool(tool);
  }, [actions]);

  // Backward compatibility handlers
  const handleClearCanvas = useCallback(() => clearCanvas(), [clearCanvas]);
  const handleImageSelect = useCallback((imageId: string) => {
    actions.setSelectedImage(imageId);
  }, [actions]);
  
  const handleToggleAnnotations = useCallback(() => {
    actions.toggleAnnotations();
  }, [actions]);
  
  const handleAnnotationClick = useCallback((annotationId: string) => {
    toggleAnnotation(annotationId);
  }, [toggleAnnotation]);
  
  const handleGalleryToolChange = useCallback((tool: 'cursor' | 'draw') => {
    actions.setGalleryTool(tool);
  }, [actions]);
  
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
    actions.setGroupDisplayMode(groupId, mode);
  }, [actions]);
  
  const handleSubmitGroupPrompt = useCallback(async (groupId: string, prompt: string, isCustom: boolean) => {
    console.log('Group prompt submitted:', { groupId, prompt, isCustom });
  }, []);
  
  const handleEditGroupPrompt = useCallback((sessionId: string) => {
    console.log('Edit group prompt:', sessionId);
  }, []);
  
  const handleCreateFork = useCallback((sessionId: string) => {
    console.log('Create fork:', sessionId);
  }, []);

  // Memoized context value
  const contextValue = useMemo(() => ({
    state,
    actions,
    
    // High-level operations
    handleImageUpload,
    handleImageUploadImmediate,
    handleAnalysisComplete,
    
    // Data operations
    loadDataFromDatabase,
    syncToDatabase,
    updateAppStateFromDatabase,
    clearCanvas,
    
    // Group operations
    createGroup,
    updateGroup,
    deleteGroup,
    
    // Concept generation
    generateConcept,
    
    // Direct state access for backward compatibility
    uploadedImages: state.uploadedImages,
    analyses: state.analyses,
    selectedImageId: state.selectedImageId,
    imageGroups: state.imageGroups,
    groupAnalysesWithPrompts: state.groupAnalysesWithPrompts,
    generatedConcepts: state.generatedConcepts,
    groupAnalyses: state.groupAnalyses,
    groupPromptSessions: state.groupPromptSessions,
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
    addImage,
    updateImageAnalysisStatus,
    addAnalysis,
    setSelectedImage,
    toggleAnnotations,
    setGalleryTool,
    
    // Integration points
    imageViewer,
    analysisRealtime,
    viewerState,
    toggleAnnotation,
    clearAnnotations,
    
    // Backward compatibility handlers
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
    actions,
    handleImageUpload,
    handleImageUploadImmediate,
    handleAnalysisComplete,
    loadDataFromDatabase,
    syncToDatabase,
    updateAppStateFromDatabase,
    clearCanvas,
    createGroup,
    updateGroup,
    deleteGroup,
    generateConcept,
    addImage,
    updateImageAnalysisStatus,
    addAnalysis,
    setSelectedImage,
    toggleAnnotations,
    setGalleryTool,
    imageViewer,
    analysisRealtime,
    viewerState,
    toggleAnnotation,
    clearAnnotations,
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
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};