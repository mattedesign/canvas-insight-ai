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
import { DataMigrationService, ImageMigrationService, AnalysisMigrationService } from '@/services/DataMigrationService';
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
  
  // Track current project to prevent duplicate loads
  const currentProjectRef = useRef<string | null>(null);

  // PHASE 1.2: Create truly stable helper functions using useRef pattern
  const userRef = useRef(user);
  const toastRef = useRef(toast);
  const loadingMachineRef = useRef(loadingMachine);

  // Update refs without causing re-renders
  userRef.current = user;
  toastRef.current = toast;
  loadingMachineRef.current = loadingMachine;

  // 🚨 CRITICAL FIX: Create a stable loadData function in a ref
  const loadDataFunctionRef = useRef<() => Promise<void>>();

  // PHASE 1.2: Stable helper functions with EMPTY dependencies (no re-render triggers)
  const stableHelpers = useMemo<StableHelpers>(() => {
    // Define loadData function
    const loadDataFunction = async (): Promise<void> => {
      if (!userRef.current || loadingMachineRef.current.state.appData === 'loading') return;
      
      // 🚨 FIX: Don't overwrite state if currently uploading
      if (loadingMachineRef.current.state.imageUpload === 'loading') {
        console.log('[SimplifiedAppContext] Skipping data load during upload to prevent race condition');
        return;
      }
      
      loadingMachineRef.current.actions.startAppLoad();
      
      try {
        const migrationResult = await DataMigrationService.loadAllFromDatabase();
        
        if (migrationResult.success && migrationResult.data) {
          console.log('[SimplifiedAppContext] Data loaded successfully:', {
            images: migrationResult.data.uploadedImages?.length || 0,
            analyses: migrationResult.data.analyses?.length || 0,
            groups: migrationResult.data.imageGroups?.length || 0
          });
          
          // 🚨 FIX: Merge with existing state instead of replacing
          dispatch({ 
            type: 'MERGE_FROM_DATABASE', 
            payload: migrationResult.data, 
            meta: { 
              forceReplace: false,
              preserveUploading: true // Preserve images currently uploading
            } 
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
    };

    // Store in ref for stable access
    loadDataFunctionRef.current = loadDataFunction;

    return {
      loadData: loadDataFunction,

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
            // 🚨 FIX: Use permanent IDs and save to database immediately
            const imageId = `img-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
            const imageUrl = URL.createObjectURL(file);
            
            const dimensions = await loadImageDimensions(file);
            
            const uploadedImage: UploadedImage = {
              id: imageId, // ✅ Permanent ID, not temp
              name: file.name,
              url: imageUrl,
              file,
              dimensions,
              status: 'completed'
            };

            // 🚨 FIX: Save to database immediately to prevent race condition
            try {
              await ImageMigrationService.migrateImageToDatabase(uploadedImage);
              console.log('[Upload] Image saved to database:', imageId);
            } catch (error) {
              console.warn('[Upload] Failed to save image to database, will retry:', error);
              // Continue with local state, background sync will handle it
            }
            
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
          
          // 🚨 FIX: Add images to state AND save analyses to database
          dispatch({ type: 'BATCH_UPLOAD', payload: { images: newImages, analyses: newAnalyses } });
          
          // Save analyses to database as well
          try {
            for (const analysis of newAnalyses) {
              await AnalysisMigrationService.migrateAnalysisToDatabase(analysis);
            }
          } catch (error) {
            console.warn('[Upload] Failed to save analyses, will retry later:', error);
          }
          
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
    };
  }, []); // PHASE 1.2 CRITICAL FIX: EMPTY dependencies - truly stable

  // Track loading state with ref
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && user.id !== lastUserIdRef.current) {
      console.log('[SimplifiedAppContext] User authenticated, loading data...');
      lastUserIdRef.current = user.id;
      hasLoadedRef.current = false;
      
      // 🚨 CRITICAL FIX: Use the ref function to avoid closure issues
      if (loadDataFunctionRef.current) {
        loadDataFunctionRef.current();
      }
    } else if (!user && lastUserIdRef.current) {
      console.log('[SimplifiedAppContext] User logged out, clearing state...');
      lastUserIdRef.current = null;
      hasLoadedRef.current = false;
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user?.id]); // ✅ FIXED - only user.id

  // 🚨 CRITICAL FIX: Project change listener - use ref instead of stableHelpers
  useEffect(() => {
    const handleProjectChange = async (event: CustomEvent) => {
      const { projectId } = event.detail;
      
      // Skip if same project
      if (currentProjectRef.current === projectId) {
        console.log('[AppContext] Same project, skipping reload');
        return;
      }
      
      console.log('[AppContext] Project changed, reloading data for:', projectId);
      currentProjectRef.current = projectId;
      
      // Clear current state
      dispatch({ type: 'RESET_STATE' });
      
      // 🚨 CRITICAL FIX: Use the ref function instead of stableHelpers.loadData()
      if (loadDataFunctionRef.current) {
        await loadDataFunctionRef.current();
      }
    };
    
    window.addEventListener('projectChanged', handleProjectChange as any);
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange as any);
    };
  }, []); // ✅ FIXED - empty dependencies

  // PHASE 3.2: Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      console.log('[SimplifiedAppContext] Cleaning up context...');
      loadingMachineRef.current.actions.resetAll();
      isInitializedRef.current = false;
    };
  }, []); // ✅ FIXED: Remove loadingMachine.actions dependency!

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