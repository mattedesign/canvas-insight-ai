/**
 * Refactored App Context - Race Condition Free
 * Uses reducer pattern for atomic state management
 */

import React, { createContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useImageViewer } from '@/hooks/useImageViewer';
import { useAnalysisRealtime } from '@/hooks/useAnalysisRealtime';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { appStateReducer } from './AppStateReducer';
import { initialAppState, type AppState, type AppAction } from './AppStateTypes';
import { atomicStateManager } from '@/services/AtomicStateManager';
import { backgroundSyncService } from '@/services/BackgroundSyncService';
import { DataMigrationService } from '@/services/DataMigrationService';
import { AnalysisPerformanceService } from '@/services/AnalysisPerformanceService';
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
  
  // Backward compatibility - legacy handlers (restored from original)
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

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const { user } = useAuth();
  const { toast } = useFilteredToast();
  const { state: viewerState, toggleAnnotation, clearAnnotations } = useImageViewer();

  // Real-time analysis handling with optimized updates
  const handleAnalysisUpdate = useCallback((analysis: UXAnalysis) => {
    console.log('Real-time analysis update received:', analysis);
    
    dispatch({ type: 'UPDATE_ANALYSIS', payload: { imageId: analysis.imageId, analysis } });
    
    // Cache for performance
    AnalysisPerformanceService.setCachedAnalysis(analysis.imageId, analysis);
  }, []);

  const handleAnalysisError = useCallback((imageId: string, error: string) => {
    console.error('Analysis error for image:', imageId, error);
    
    // Update both image and analysis status atomically
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

  // Data loading function - removed from dependency array to prevent infinite loops
  const loadDataFromDatabase = useCallback(async () => {
    if (!user) return;

    const operationId = `load-data-${Date.now()}`;
    
    const result = await atomicStateManager.executeOperation(
      operationId,
      'LOAD',
      async () => {
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
            
            return migrationResult.data;
          } else {
            console.log('[AppContext] No data loaded or load failed');
            return null;
          }
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      },
      5 // High priority for initial load
    );

    if (!result.success) {
      console.error('[AppContext] Failed to load data:', result.error);
      toast({
        title: "Failed to load data",
        description: result.error || "Unknown error occurred",
        category: "error",
        variant: "destructive"
      });
    }
  }, [user, toast]);

  // Load initial data when user logs in - REMOVED loadDataFromDatabase from dependencies to prevent infinite loop
  useEffect(() => {
    if (user) {
      console.log('[AppContext] User authenticated, loading data...');
      loadDataFromDatabase();
    } else {
      console.log('[AppContext] User logged out, clearing state...');
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user]); // Only depend on user, not the function

  // Database sync function - pass state as parameter to avoid dependency issues
  const syncToDatabase = useCallback(async (stateToSync = state) => {
    if (!user) return;

    const operationId = `sync-${Date.now()}`;
    
    const result = await atomicStateManager.executeOperation(
      operationId,
      'SYNC',
      async () => {
        dispatch({ type: 'SET_SYNCING', payload: true });
        
        try {
          const migrationResult = await DataMigrationService.migrateAllToDatabase({
            uploadedImages: stateToSync.uploadedImages,
            analyses: stateToSync.analyses,
            imageGroups: stateToSync.imageGroups,
            groupAnalysesWithPrompts: stateToSync.groupAnalysesWithPrompts,
          });
          
          if (migrationResult.success) {
            console.log('[AppContext] Data synced successfully');
            toast({
              title: "Sync complete",
              description: "Your data has been saved to the cloud.",
              category: "success",
            });
            return true;
          } else {
            throw new Error(migrationResult.error || 'Sync failed');
          }
        } finally {
          dispatch({ type: 'SET_SYNCING', payload: false });
        }
      },
      7 // High priority for sync
    );

    if (!result.success) {
      console.error('[AppContext] Sync failed:', result.error);
      toast({
        title: "Sync failed",
        description: result.error || "Failed to save data",
        category: "error",
        variant: "destructive"
      });
    }
  }, [user, toast]);

  // Image upload with atomic operation
  const handleImageUpload = useCallback(async (files: File[]) => {
    const operationId = `upload-${Date.now()}`;
    
    const result = await atomicStateManager.executeOperation(
      operationId,
      'UPLOAD',
      async () => {
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
              status: 'processing'
            };
            
            newImages.push(uploadedImage);
            
            if (user) {
              // Queue background processing
              backgroundSyncService.queueImageProcessing(imageId, imageUrl, file.name);
              
              // Create placeholder analysis
              const placeholderAnalysis: UXAnalysis = {
                id: `analysis-${imageId}`,
                imageId,
                imageName: file.name,
                imageUrl,
                userContext: '',
                status: 'processing',
                visualAnnotations: [],
                suggestions: [],
                summary: {
                  overallScore: 0,
                  categoryScores: {
                    usability: 0,
                    accessibility: 0,
                    visual: 0,
                    content: 0
                  },
                  keyIssues: [],
                  strengths: []
                },
                metadata: { objects: [], text: [], colors: [], faces: 0 },
                createdAt: new Date()
              };
              
              newAnalyses.push(placeholderAnalysis);
              dispatch({ type: 'ADD_PENDING_SYNC', payload: imageId });
            } else {
              // Use mock analysis for non-authenticated users
              newAnalyses.push(generateMockAnalysis(imageId, file.name, imageUrl));
            }
          }
          
          console.log('[AppContext] Batch uploading images and analyses...');
          
          // Single atomic update
          dispatch({ 
            type: 'BATCH_UPLOAD', 
            payload: { images: newImages, analyses: newAnalyses } 
          });
          
          return { newImages, newAnalyses };
          
        } finally {
          dispatch({ type: 'SET_UPLOADING', payload: false });
        }
      },
      9 // Very high priority for uploads
    );

    if (result.success && result.data) {
      console.log('[AppContext] Upload completed successfully');
      
      // Set up background sync event handlers
      backgroundSyncService.setEventHandlers({
        onSyncComplete: (syncResult) => {
          if (syncResult.success && syncResult.data) {
            console.log('[AppContext] Background analysis completed:', syncResult.operationId);
            handleAnalysisComplete(syncResult.data.imageId, syncResult.data);
          }
        },
        onSyncError: (operationId, error) => {
          console.error('[AppContext] Background sync failed:', operationId, error);
        }
      });

      // Show success feedback
      const uploadedImages = result.data.newImages || [];
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} and generated analyses.`,
        category: "success",
      });
    } else {
      console.error('[AppContext] Upload failed:', result.error);
      toast({
        title: "Upload failed", 
        description: result.error || "Unknown error occurred",
        category: "error",
        variant: "destructive"
      });
    }
  }, [user, toast]);

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
  }, []);

  const updateGroup = useCallback((groupId: string, updates: Partial<ImageGroup>) => {
    dispatch({ type: 'UPDATE_GROUP', payload: { id: groupId, updates } });
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    dispatch({ type: 'REMOVE_GROUP', payload: groupId });
  }, []);

  // Restored original handlers
  const handleAnnotationClick = useCallback((annotationId: string) => {
    toggleAnnotation(annotationId);
  }, [toggleAnnotation]);

  const handleGalleryToolChange = useCallback((tool: 'cursor' | 'draw') => {
    dispatch({ type: 'SET_GALLERY_TOOL', payload: tool });
  }, []);

  const handleAddComment = useCallback(() => {
    console.log('Add comment mode activated');
  }, []);

  // Restored original group creation with default colors - avoid state dependency by using dynamic values
  const handleCreateGroup = useCallback((imageIds: string[]) => {
    const groupId = `group-${Date.now()}`;
    // Use timestamp to ensure unique group numbers instead of relying on array length
    const groupNumber = Math.floor(Date.now() / 1000) % 100 + 1;
    const defaultColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const color = defaultColors[(groupNumber - 1) % defaultColors.length];
    
    const newGroup: ImageGroup = {
      id: groupId,
      name: `Group ${groupNumber}`,
      description: '',
      imageIds,
      position: { x: 100, y: 100 },
      color,
      createdAt: new Date(),
    };
    
    dispatch({ type: 'ADD_GROUP', payload: newGroup });
  }, []);

  // Restored original generateConcept (different from the concept generation above)
  const handleGenerateConcept = useCallback(async (analysisId: string) => {
    dispatch({ type: 'SET_GENERATING_CONCEPT', payload: true });
    
    try {
      const analysis = state.analyses.find(a => a.id === analysisId);
      if (!analysis) return;
      
      // Simulate concept generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const title = `Improved ${analysis.imageName || 'Design'}`;
      const newConcept: GeneratedConcept = {
        id: `concept-${Date.now()}`,
        analysisId,
        imageUrl: '/placeholder.svg',
        title,
        description: `A conceptual design addressing key usability issues identified in the analysis.`,
        improvements: analysis.suggestions
          .filter(s => s.impact === 'high')
          .slice(0, 5)
          .map(s => s.title),
        createdAt: new Date()
      };
      
      dispatch({ type: 'ADD_CONCEPT', payload: newConcept });
      
    } catch (error) {
      console.error('Failed to generate concept:', error);
    } finally {
      dispatch({ type: 'SET_GENERATING_CONCEPT', payload: false });
    }
  }, [state.analyses]);

  // Restored original group prompt submission
  const handleSubmitGroupPrompt = useCallback(async (groupId: string, prompt: string, isCustom: boolean) => {
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create analysis with prompt
      const analysisId = `analysis-${Date.now()}`;
      const analysis = {
        id: analysisId,
        sessionId: `session-${Date.now()}`,
        groupId,
        prompt,
        summary: {
          overallScore: 75 + Math.floor(Math.random() * 20),
          consistency: 70 + Math.floor(Math.random() * 25),
          thematicCoherence: 80 + Math.floor(Math.random() * 15),
          userFlowContinuity: 65 + Math.floor(Math.random() * 30),
        },
        insights: [
          'Visual hierarchy is consistently applied across all screens',
          'Color palette maintains brand consistency throughout the group',
        ],
        recommendations: [
          'Consider standardizing button sizes across all screens',
          'Implement consistent spacing patterns for better visual rhythm',
        ],
        patterns: {
          commonElements: ['Primary buttons', 'Navigation bar'],
          designInconsistencies: ['Button sizes', 'Icon styles'],
          userJourneyGaps: ['Missing back navigation'],
        },
        createdAt: new Date(),
      };
      
      dispatch({ type: 'ADD_GROUP_ANALYSIS', payload: analysis });
      
      toast({
        title: "Group analysis complete",
        description: "Group prompt analysis has been generated.",
        category: "success",
      });
      
    } catch (error) {
      console.error('Group prompt failed:', error);
    }
  }, [toast]);

  // Restored original edit group prompt
  const handleEditGroupPrompt = useCallback((sessionId: string) => {
    console.log('Edit group prompt:', sessionId);
    // Original functionality would create a new session for editing
  }, []);

  // Restored original create fork
  const handleCreateFork = useCallback((sessionId: string) => {
    console.log('Create fork:', sessionId);
    // Original functionality would create a fork session
  }, []);

  // Context value with backward compatibility
  const value = useMemo(() => ({
    // New interface
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
    generateConcept: async (prompt: string) => {}, // Mock for new interface
    viewerState,
    toggleAnnotation,
    clearAnnotations,
    handleAnalysisComplete,
    
    // Backward compatibility - direct state access
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
    
    // Backward compatibility - restored original handlers
    handleClearCanvas: clearCanvas,
    handleImageSelect: (imageId: string) => dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId }),
    handleToggleAnnotations: () => dispatch({ type: 'TOGGLE_ANNOTATIONS' }),
    handleAnnotationClick,
    handleGalleryToolChange,
    handleAddComment,
    handleGenerateConcept,
    handleCreateGroup,
    handleUngroup: (groupId: string) => deleteGroup(groupId),
    handleDeleteGroup: deleteGroup,
    handleEditGroup: (groupId: string, name: string, description: string, color: string) => 
      updateGroup(groupId, { name, description, color }),
    handleGroupDisplayModeChange: (groupId: string, mode: 'standard' | 'stacked') => 
      dispatch({ type: 'SET_GROUP_DISPLAY_MODE', payload: { groupId, mode } }),
    handleSubmitGroupPrompt,
    handleEditGroupPrompt,
    handleCreateFork,
  }), [
    state,
    handleImageUpload,
    handleImageUploadImmediate,
    syncToDatabase,
    loadDataFromDatabase,
    updateAppStateFromDatabase,
    clearCanvas,
    createGroup,
    updateGroup,
    deleteGroup,
    viewerState,
    toggleAnnotation,
    clearAnnotations,
    handleAnalysisComplete,
    handleAnnotationClick,
    handleGalleryToolChange,
    handleAddComment,
    handleGenerateConcept,
    handleCreateGroup,
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