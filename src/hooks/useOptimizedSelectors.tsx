/**
 * Optimized Selectors - Phase 2: Simplified State Access
 * Replaces complex state management with clean selectors
 */

import { useMemo } from 'react';
import { useAppContext } from '@/context/SimplifiedAppContext';
import type { 
  AppState, 
  UploadedImage, 
  LegacyUXAnalysis as UXAnalysis,
  LegacyImageGroup as ImageGroup,
  LegacyGeneratedConcept as GeneratedConcept
} from '@/context/AppStateTypes';

// Type-safe selector function
type StateSelector<T> = (state: AppState) => T;

// Core selector hook with memoization
export const useAppSelector = <T,>(selector: StateSelector<T>): T => {
  const { state } = useAppContext();
  return useMemo(() => selector(state), [selector, state]);
};

// Optimized individual selectors
export const useImages = (): UploadedImage[] => {
  return useAppSelector(state => state.uploadedImages);
};

export const useAnalyses = (): UXAnalysis[] => {
  return useAppSelector(state => state.analyses);
};

export const useSelectedImageId = (): string | null => {
  return useAppSelector(state => state.selectedImageId);
};

export const useSelectedImage = (): UploadedImage | undefined => {
  const images = useImages();
  const selectedId = useSelectedImageId();
  
  return useMemo(() => {
    return selectedId ? images.find(img => img.id === selectedId) : undefined;
  }, [images, selectedId]);
};

export const useImageGroups = (): ImageGroup[] => {
  return useAppSelector(state => state.imageGroups);
};

export const useGeneratedConcepts = (): GeneratedConcept[] => {
  return useAppSelector(state => state.generatedConcepts);
};

// Operation state selectors (stable objects)
export const useOperationStates = () => {
  return useAppSelector(state => ({
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    isUploading: state.isUploading,
    isGeneratingConcept: state.isGeneratingConcept,
    hasPendingOperations: state.pendingBackgroundSync.size > 0,
  }));
};

// UI state selectors
export const useUIStates = () => {
  return useAppSelector(state => ({
    showAnnotations: state.showAnnotations,
    galleryTool: state.galleryTool,
    groupDisplayModes: state.groupDisplayModes,
  }));
};

// Optimized data access patterns
export const useImageWithAnalysis = (imageId: string | null) => {
  const images = useImages();
  const analyses = useAnalyses();
  
  return useMemo(() => {
    if (!imageId) return { image: undefined, analysis: undefined };
    
    const image = images.find(img => img.id === imageId);
    const analysis = analyses.find(a => a.imageId === imageId);
    
    return { image, analysis };
  }, [images, analyses, imageId]);
};

export const useGroupWithImages = (groupId: string | null) => {
  const groups = useImageGroups();
  const images = useImages();
  
  return useMemo(() => {
    if (!groupId) return { group: undefined, images: [] };
    
    const group = groups.find(g => g.id === groupId);
    const groupImages = group ? images.filter(img => group.imageIds.includes(img.id)) : [];
    
    return { group, images: groupImages };
  }, [groups, images, groupId]);
};

// Performance metrics selectors
export const useStateMetrics = () => {
  return useAppSelector(state => ({
    imageCount: state.uploadedImages.length,
    analysisCount: state.analyses.length,
    groupCount: state.imageGroups.length,
    conceptCount: state.generatedConcepts.length,
    version: state.version,
    lastSync: state.lastSyncTimestamp,
    pendingOps: state.pendingBackgroundSync.size,
  }));
};

// Action dispatchers (stable references)
export const useAppActions = () => {
  const { stableHelpers } = useAppContext();
  
  return stableHelpers;
};

// Helper functions (stable references)  
export const useAppHelpersLegacy = () => {
  const { stableHelpers } = useAppContext();
  return stableHelpers;
};