/**
 * Stable App State Hook - Performance Optimized State Access
 * Prevents unnecessary re-renders and provides stable selectors
 */

import { useContext, useMemo, useCallback } from 'react';
import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';
import type { AppState, UploadedImage, LegacyUXAnalysis as UXAnalysis } from '@/context/AppStateTypes';

interface StableAppStateReturn {
  // Core state
  state: AppState;
  
  // Stable selectors (memoized)
  getImageById: (id: string) => UploadedImage | undefined;
  getAnalysisForImage: (imageId: string) => UXAnalysis | undefined;
  getSelectedImage: () => UploadedImage | undefined;
  getOperationStates: () => {
    isLoading: boolean;
    isSyncing: boolean;
    isUploading: boolean;
    isGeneratingConcept: boolean;
    hasPendingOperations: boolean;
  };
  
  // Core actions (stable references)
  uploadImages: (files: File[]) => Promise<void>;
  selectImage: (imageId: string | null) => void;
  toggleAnnotations: () => void;
  syncData: () => Promise<void>;
  loadData: () => Promise<void>;
}

export const useStableAppState = (): StableAppStateReturn => {
  const { state, stableHelpers } = useSimplifiedAppContext();
  
  // Memoized selectors to prevent object recreation
  const getImageById = useCallback((id: string) => {
    return state.uploadedImages.find(img => img.id === id);
  }, [state.uploadedImages]);
  
  const getAnalysisForImage = useCallback((imageId: string) => {
    return state.analyses.find(analysis => analysis.imageId === imageId);
  }, [state.analyses]);
  
  const getSelectedImage = useCallback(() => {
    return state.selectedImageId ? getImageById(state.selectedImageId) : undefined;
  }, [state.selectedImageId, getImageById]);
  
  const getOperationStates = useCallback(() => ({
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    isUploading: state.isUploading,
    isGeneratingConcept: state.isGeneratingConcept,
    hasPendingOperations: state.pendingBackgroundSync.size > 0,
  }), [state.isLoading, state.isSyncing, state.isUploading, state.isGeneratingConcept, state.pendingBackgroundSync.size]);
  
  // Stable action references
  const uploadImages = useCallback((files: File[]) => {
    return handleImageUpload(files);
  }, [handleImageUpload]);
  
  const selectImage = useCallback((imageId: string | null) => {
    actions.setSelectedImage(imageId);
  }, [actions]);
  
  const toggleAnnotations = useCallback(() => {
    actions.toggleAnnotations();
  }, [actions]);
  
  const syncData = useCallback(() => {
    return syncToDatabase();
  }, [syncToDatabase]);
  
  const loadData = useCallback(() => {
    return loadDataFromDatabase();
  }, [loadDataFromDatabase]);
  
  // Return stable object (memoized)
  return useMemo(() => ({
    state,
    getImageById,
    getAnalysisForImage,
    getSelectedImage,
    getOperationStates,
    uploadImages,
    selectImage,
    toggleAnnotations,
    syncData,
    loadData,
  }), [
    state,
    getImageById,
    getAnalysisForImage,
    getSelectedImage,
    getOperationStates,
    uploadImages,
    selectImage,
    toggleAnnotations,
    syncData,
    loadData,
  ]);
};

// Lightweight hooks for specific data access patterns
export const useImageState = () => {
  const { state, getImageById, getSelectedImage } = useStableAppState();
  
  return useMemo(() => ({
    images: state.uploadedImages,
    selectedImage: getSelectedImage(),
    selectedImageId: state.selectedImageId,
    getImageById,
  }), [state.uploadedImages, state.selectedImageId, getSelectedImage, getImageById]);
};

export const useAnalysisState = () => {
  const { state, getAnalysisForImage } = useStableAppState();
  
  return useMemo(() => ({
    analyses: state.analyses,
    getAnalysisForImage,
  }), [state.analyses, getAnalysisForImage]);
};

export const useOperationState = () => {
  const { getOperationStates } = useStableAppState();
  return getOperationStates();
};

export const useUIState = () => {
  const { state } = useStableAppState();
  
  return useMemo(() => ({
    showAnnotations: state.showAnnotations,
    galleryTool: state.galleryTool,
    groupDisplayModes: state.groupDisplayModes,
  }), [state.showAnnotations, state.galleryTool, state.groupDisplayModes]);
};