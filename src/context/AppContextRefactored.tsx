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

  // Load initial data when user logs in
  useEffect(() => {
    if (user) {
      console.log('[AppContext] User authenticated, loading data...');
      loadDataFromDatabase();
    } else {
      console.log('[AppContext] User logged out, clearing state...');
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user]);

  // Data loading function
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

  // Database sync function  
  const syncToDatabase = useCallback(async () => {
    if (!user) return;

    const operationId = `sync-${Date.now()}`;
    
    const result = await atomicStateManager.executeOperation(
      operationId,
      'SYNC',
      async () => {
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
  }, [user, state, toast]);

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

  // Concept generation
  const generateConcept = useCallback(async (prompt: string, selectedImages?: string[]) => {
    dispatch({ type: 'SET_GENERATING_CONCEPT', payload: true });
    
    try {
      // Mock concept generation for now
      const concept: GeneratedConcept = {
        id: `concept-${Date.now()}`,
        analysisId: selectedImages?.[0] || '',
        imageUrl: '/placeholder.svg', // This would be generated
        title: prompt.slice(0, 50),
        description: prompt,
        improvements: ['Mock improvement'],
        createdAt: new Date()
      };
      
      dispatch({ type: 'ADD_CONCEPT', payload: concept });
      
      toast({
        title: "Concept generated",
        description: "New design concept has been created.",
        category: "success",
      });
    } finally {
      dispatch({ type: 'SET_GENERATING_CONCEPT', payload: false });
    }
  }, [toast]);

  // Context value
  const value = useMemo(() => ({
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
    generateConcept,
    viewerState,
    toggleAnnotation,
    clearAnnotations,
    handleAnalysisComplete,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};