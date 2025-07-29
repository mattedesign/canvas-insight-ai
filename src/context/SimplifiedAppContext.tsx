/**
 * Simplified App Context - Phase 3: Optimized Data Loading with State Machine
 * Implements explicit loading states and removes loading logic from useEffect dependencies
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useMemo, 
  useRef,
  useEffect
} from 'react';
import { useAuth } from './AuthContext';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { useLoadingStateMachine } from '@/hooks/useLoadingStateMachine';
import { DataMigrationService } from '@/services/DataMigrationService';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { loadImageDimensions } from '@/utils/imageUtils';
import { DataLoadingErrorBoundary } from '@/components/DataLoadingErrorBoundary';
import type { 
  AppState, 
  AppAction,
  UploadedImage, 
  LegacyUXAnalysis as UXAnalysis,
  LegacyImageGroup as ImageGroup,
  LegacyGeneratedConcept as GeneratedConcept
} from './AppStateTypes';
import { appStateReducer } from './AppStateReducer';
import { initialAppState } from './AppStateTypes';

// PHASE 3.1: Simplified context interface with loading state machine
interface SimplifiedAppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  stableHelpers: StableHelpers;
  loadingMachine: ReturnType<typeof useLoadingStateMachine>;
}

// Stable helper functions with no dependencies on changing state
interface StableHelpers {
  loadData: () => Promise<void>;
  syncData: () => Promise<void>;
  uploadImages: (files: File[]) => Promise<void>;
  uploadImagesImmediate: (files: File[]) => Promise<void>;
  createGroup: (name: string, description: string, color: string, imageIds: string[], position: { x: number; y: number }) => void;
  generateConcept: (prompt: string, selectedImages?: string[]) => Promise<void>;
  clearCanvas: () => void;
}

const SimplifiedAppContext = createContext<SimplifiedAppContextType | undefined>(undefined);

export const useSimplifiedAppContext = () => {
  const context = useContext(SimplifiedAppContext);
  if (!context) {
    throw new Error('useSimplifiedAppContext must be used within SimplifiedAppProvider');
  }
  return context;
};

export const SimplifiedAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const { user } = useAuth();
  const { toast } = useFilteredToast();
  
  // PHASE 3.1: Integrate loading state machine
  const loadingMachine = useLoadingStateMachine();

  // Use refs for stable function references that don't cause re-renders
  const isInitializedRef = useRef(false);

  // PHASE 3.1: Stable helper functions using loading state machine
  const stableHelpers = useMemo<StableHelpers>(() => ({
    loadData: async (): Promise<void> => {
      if (!user || loadingMachine.state.appData === 'loading') return;
      
      loadingMachine.actions.startAppLoad();
      
      try {
        const migrationResult = await DataMigrationService.loadAllFromDatabase();
        
        if (migrationResult.success && migrationResult.data) {
          console.log('[SimplifiedAppContext] Data loaded successfully:', {
            images: migrationResult.data.uploadedImages?.length || 0,
            analyses: migrationResult.data.analyses?.length || 0,
            groups: migrationResult.data.imageGroups?.length || 0
          });
          
          dispatch({ 
            type: 'MERGE_FROM_DATABASE', 
            payload: migrationResult.data, 
            meta: { forceReplace: false } 
          });
          
          loadingMachine.actions.appLoadSuccess();
        } else {
          throw new Error('No data available or load failed');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        console.error('[SimplifiedAppContext] Failed to load data:', error);
        
        loadingMachine.actions.appLoadError(errorMessage);
        
        toast({
          title: "Failed to load data",
          description: "Error loading your data. Please try refreshing.",
          variant: "destructive",
          category: "error"
        });
      }
    },

    syncData: async (): Promise<void> => {
      if (!user || loadingMachine.state.sync === 'loading') return;
      
      loadingMachine.actions.startSync();
      
      try {
        // PHASE 3.2: Event-driven approach - reload from database instead of accessing state
        const migrationResult = await DataMigrationService.loadAllFromDatabase();
        
        if (migrationResult.success && migrationResult.data) {
          dispatch({ 
            type: 'MERGE_FROM_DATABASE', 
            payload: migrationResult.data, 
            meta: { forceReplace: false } 
          });
          
          loadingMachine.actions.syncSuccess();
          
          toast({
            title: "Sync complete",
            description: "Your data has been synchronized with the cloud.",
            category: "success"
          });
        } else {
          throw new Error('Sync failed - no data retrieved');
        }
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        console.error('[SimplifiedAppContext] Sync failed:', error);
        
        loadingMachine.actions.syncError(errorMessage);
        
        toast({
          title: "Sync failed",
          description: "Failed to save data. Please try again.",
          variant: "destructive",
          category: "error"
        });
        
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    },

    uploadImages: async (files: File[]): Promise<void> => {
      if (loadingMachine.state.imageUpload === 'loading') return;
      
      loadingMachine.actions.startUpload();
      
      try {
        const newImages: UploadedImage[] = [];
        const newAnalyses: UXAnalysis[] = [];
        
        const dimensionsPromises = files.map(async (file, i): Promise<{ image: UploadedImage; analysis: UXAnalysis }> => {
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
        
        dispatch({ type: 'BATCH_UPLOAD', payload: { images: newImages, analyses: newAnalyses } });
        
        loadingMachine.actions.uploadSuccess();

        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
          category: "success"
        });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        console.error('[SimplifiedAppContext] Upload failed:', error);
        
        loadingMachine.actions.uploadError(errorMessage);
        
        toast({
          title: "Upload failed", 
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
          category: "error"
        });
      }
    },

    uploadImagesImmediate: async (files: File[]): Promise<void> => {
      if (loadingMachine.state.imageUpload === 'loading') return;
      
      loadingMachine.actions.startUpload();

      try {
        const newImages: UploadedImage[] = [];
        const newAnalyses: UXAnalysis[] = [];
        
        const dimensionsPromises = files.map(async (file, i): Promise<{ image: UploadedImage; analysis: UXAnalysis }> => {
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
        
        dispatch({ type: 'BATCH_UPLOAD', payload: { images: newImages, analyses: newAnalyses } });
        
        loadingMachine.actions.uploadSuccess();

        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
          category: "success"
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Immediate upload failed';
        console.error('Error in immediate image upload:', error);
        
        loadingMachine.actions.uploadError(errorMessage);
        
        toast({
          title: "Upload error",
          description: "Some images failed to load properly. Please try again.",
          category: "error"
        });
      }
    },

    createGroup: (
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
    },

    generateConcept: async (prompt: string, selectedImages?: string[]): Promise<void> => {
      if (loadingMachine.state.conceptGeneration === 'loading') return;
      
      loadingMachine.actions.startConceptGeneration();
      
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
        
        loadingMachine.actions.conceptGenerationSuccess();
        
        toast({
          title: "Concept Generated",
          description: "New concept has been generated successfully",
          category: "success"
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Concept generation failed';
        console.error('Concept generation failed:', error);
        
        loadingMachine.actions.conceptGenerationError(errorMessage);
        
        toast({
          title: "Generation Failed",
          description: "Failed to generate concept. Please try again.",
          variant: "destructive",
          category: "error"
        });
      }
    },

    clearCanvas: () => {
      dispatch({ type: 'RESET_STATE' });
    }
  }), [user, toast, loadingMachine.state, loadingMachine.actions]); // PHASE 3.1: Added loading machine dependencies

  // PHASE 3.2: Load initial data when user logs in - ONE TIME EFFECT
  useEffect(() => {
    if (user && !isInitializedRef.current) {
      console.log('[SimplifiedAppContext] User authenticated, loading data...');
      isInitializedRef.current = true;
      stableHelpers.loadData();
    } else if (!user) {
      console.log('[SimplifiedAppContext] User logged out, clearing state...');
      isInitializedRef.current = false;
      loadingMachine.actions.resetAll();
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user, stableHelpers.loadData, loadingMachine.actions]); // PHASE 3.2: Proper dependencies

  // PHASE 3.2: Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      console.log('[SimplifiedAppContext] Cleaning up context...');
      loadingMachine.actions.resetAll();
      isInitializedRef.current = false;
    };
  }, [loadingMachine.actions]);

  // PHASE 3.1: Create context value with stable references including loading machine
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    stableHelpers,
    loadingMachine
  }), [state, stableHelpers, loadingMachine]);

  return (
    <DataLoadingErrorBoundary>
      <SimplifiedAppContext.Provider value={contextValue}>
        {children}
      </SimplifiedAppContext.Provider>
    </DataLoadingErrorBoundary>
  );
};

// Export for backward compatibility during migration
export { SimplifiedAppContext as AppContext, useSimplifiedAppContext as useAppContext };