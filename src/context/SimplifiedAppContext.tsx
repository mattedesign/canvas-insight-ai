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

  // PHASE 1.2: Create truly stable helper functions using useRef pattern
  const userRef = useRef(user);
  const toastRef = useRef(toast);
  const loadingMachineRef = useRef(loadingMachine);

  // Update refs without causing re-renders
  userRef.current = user;
  toastRef.current = toast;
  loadingMachineRef.current = loadingMachine;

  // PHASE 1.2: Stable helper functions with EMPTY dependencies (no re-render triggers)
  const stableHelpers = useMemo<StableHelpers>(() => ({
    loadData: async (): Promise<void> => {
      if (!userRef.current || loadingMachineRef.current.state.appData === 'loading') return;
      
      loadingMachineRef.current.actions.startAppLoad();
      
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
          
          loadingMachineRef.current.actions.appLoadSuccess();
        } else {
          throw new Error('No data available or load failed');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        console.error('[SimplifiedAppContext] Failed to load data:', error);
        
        loadingMachineRef.current.actions.appLoadError(errorMessage);
        
        toastRef.current({
          title: "Failed to load data",
          description: "Error loading your data. Please try refreshing.",
          variant: "destructive",
          category: "error"
        });
      }
    },

    syncData: async (): Promise<void> => {
      if (!userRef.current || loadingMachineRef.current.state.sync === 'loading') return;
      
      loadingMachineRef.current.actions.startSync();
      
      try {
        const migrationResult = await DataMigrationService.loadAllFromDatabase();
        
        if (migrationResult.success && migrationResult.data) {
          dispatch({ 
            type: 'MERGE_FROM_DATABASE', 
            payload: migrationResult.data, 
            meta: { forceReplace: false } 
          });
          
          loadingMachineRef.current.actions.syncSuccess();
          
          toastRef.current({
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
        
        loadingMachineRef.current.actions.syncError(errorMessage);
        
        toastRef.current({
          title: "Sync failed",
          description: "Failed to save data. Please try again.",
          variant: "destructive",
          category: "error"
        });
        
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    },

    uploadImages: async (files: File[]): Promise<void> => {
      if (loadingMachineRef.current.state.imageUpload === 'loading') return;
      
      loadingMachineRef.current.actions.startUpload();
      
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
        
        loadingMachineRef.current.actions.uploadSuccess();

        toastRef.current({
          title: "Upload complete",
          description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
          category: "success"
        });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        console.error('[SimplifiedAppContext] Upload failed:', error);
        
        loadingMachineRef.current.actions.uploadError(errorMessage);
        
        toastRef.current({
          title: "Upload failed", 
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
          category: "error"
        });
      }
    },

    uploadImagesImmediate: async (files: File[]): Promise<void> => {
      if (loadingMachineRef.current.state.imageUpload === 'loading') return;
      
      loadingMachineRef.current.actions.startUpload();

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
        
        loadingMachineRef.current.actions.uploadSuccess();

        toastRef.current({
          title: "Upload complete",
          description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
          category: "success"
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Immediate upload failed';
        console.error('Error in immediate image upload:', error);
        
        loadingMachineRef.current.actions.uploadError(errorMessage);
        
        toastRef.current({
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
      
      toastRef.current({
        title: "Group Created",
        description: `Created group "${name}" with ${imageIds.length} images`,
        category: "success"
      });
    },

    generateConcept: async (prompt: string, selectedImages?: string[]): Promise<void> => {
      if (loadingMachineRef.current.state.conceptGeneration === 'loading') return;
      
      loadingMachineRef.current.actions.startConceptGeneration();
      
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
        
        loadingMachineRef.current.actions.conceptGenerationSuccess();
        
        toastRef.current({
          title: "Concept Generated",
          description: "New concept has been generated successfully",
          category: "success"
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Concept generation failed';
        console.error('Concept generation failed:', error);
        
        loadingMachineRef.current.actions.conceptGenerationError(errorMessage);
        
        toastRef.current({
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
  }), []); // PHASE 1.2 CRITICAL FIX: EMPTY dependencies - truly stable

  // Track if we've loaded for this user
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Only load if user changed
    if (user && user.id !== loadedForUserRef.current) {
      console.log('[SimplifiedAppContext] User authenticated, loading data...');
      loadedForUserRef.current = user.id;
      stableHelpers.loadData();
    } else if (!user && loadedForUserRef.current) {
      console.log('[SimplifiedAppContext] User logged out, clearing state...');
      loadedForUserRef.current = null;
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user?.id]); // Only depend on user ID

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
    <SimplifiedAppContext.Provider value={contextValue}>
      <DataLoadingErrorBoundary>
        {children}
      </DataLoadingErrorBoundary>
    </SimplifiedAppContext.Provider>
  );
};

// Export for backward compatibility during migration
export { SimplifiedAppContext as AppContext, useSimplifiedAppContext as useAppContext };