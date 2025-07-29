/**
 * Simplified App Context - Phase 2: Consolidated State Management
 * Pure reducer pattern with stable action dispatch and simplified context value
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

// Simplified context interface - Core values only
interface SimplifiedAppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  stableHelpers: StableHelpers;
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

  // Use refs for stable function references that don't cause re-renders
  const isLoadingRef = useRef(false);
  const isSyncingRef = useRef(false);
  const isUploadingRef = useRef(false);

  // Stable helper functions - dependencies only on dispatch, never on state
  const stableHelpers = useMemo<StableHelpers>(() => ({
    loadData: async () => {
      if (!user || isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      dispatch({ type: 'SET_LOADING', payload: true });
      
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
        }
      } catch (error) {
        console.error('[SimplifiedAppContext] Failed to load data:', error);
        toast({
          title: "Failed to load data",
          description: "Error loading your data. Please try refreshing.",
          variant: "destructive",
          category: "error"
        });
      } finally {
        isLoadingRef.current = false;
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    syncData: async () => {
      if (!user || isSyncingRef.current) return;
      
      isSyncingRef.current = true;
      dispatch({ type: 'SET_SYNCING', payload: true });
      
      try {
        // Phase 3.2: Event-driven approach - trigger a reload from database
        // instead of trying to access potentially stale state
        console.log('[SimplifiedAppContext] Triggering data reload for sync...');
        
        // Reload data from database (this is event-driven sync)
        const migrationResult = await DataMigrationService.loadAllFromDatabase();
        
        if (migrationResult.success && migrationResult.data) {
          dispatch({ 
            type: 'MERGE_FROM_DATABASE', 
            payload: migrationResult.data, 
            meta: { forceReplace: false } 
          });
          
          toast({
            title: "Sync complete",
            description: "Your data has been synchronized with the cloud.",
            category: "success"
          });
        }
        
      } catch (error) {
        console.error('[SimplifiedAppContext] Sync failed:', error);
        toast({
          title: "Sync failed",
          description: "Failed to save data. Please try again.",
          variant: "destructive",
          category: "error"
        });
        
        // Phase 3.2: Proper error boundary support
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Sync failed' });
      } finally {
        isSyncingRef.current = false;
        dispatch({ type: 'SET_SYNCING', payload: false });
      }
    },

    uploadImages: async (files: File[]) => {
      if (isUploadingRef.current) return;
      
      isUploadingRef.current = true;
      dispatch({ type: 'SET_UPLOADING', payload: true });
      
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
        
        dispatch({ type: 'BATCH_UPLOAD', payload: { images: newImages, analyses: newAnalyses } });

        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
          category: "success"
        });
        
      } catch (error) {
        console.error('[SimplifiedAppContext] Upload failed:', error);
        toast({
          title: "Upload failed", 
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
          category: "error"
        });
      } finally {
        isUploadingRef.current = false;
        dispatch({ type: 'SET_UPLOADING', payload: false });
      }
    },

    uploadImagesImmediate: async (files: File[]) => {
      if (isUploadingRef.current) return;
      
      isUploadingRef.current = true;
      dispatch({ type: 'SET_UPLOADING', payload: true });

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
        
        dispatch({ type: 'BATCH_UPLOAD', payload: { images: newImages, analyses: newAnalyses } });

        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}.`,
          category: "success"
        });
      } catch (error) {
        console.error('Error in immediate image upload:', error);
        toast({
          title: "Upload error",
          description: "Some images failed to load properly. Please try again.",
          category: "error"
        });
      } finally {
        isUploadingRef.current = false;
        dispatch({ type: 'SET_UPLOADING', payload: false });
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

    generateConcept: async (prompt: string, selectedImages?: string[]) => {
      dispatch({ type: 'SET_GENERATING_CONCEPT', payload: true });
      
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
        dispatch({ type: 'SET_GENERATING_CONCEPT', payload: false });
      }
    },

    clearCanvas: () => {
      dispatch({ type: 'RESET_STATE' });
    }
  }), [user, toast]); // Removed state dependency - helpers now truly stable

  // Load initial data when user logs in - ONE TIME EFFECT
  useEffect(() => {
    if (user) {
      console.log('[SimplifiedAppContext] User authenticated, loading data...');
      stableHelpers.loadData();
    } else {
      console.log('[SimplifiedAppContext] User logged out, clearing state...');
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user]); // Only user dependency - loadData is stable

  // Create context value with stable references
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    stableHelpers
  }), [state, stableHelpers]);

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