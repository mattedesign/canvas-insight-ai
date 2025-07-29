/**
 * Optimized App State Hook - Selector-based access
 * Prevents unnecessary re-renders and circular dependencies
 */

import { useContext, useMemo } from 'react';
import type { AppState, StateSelector } from '@/context/AppStateTypes';
import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';

// Main hook with overloads for typed access
export function useAppState(): AppState;
export function useAppState<T>(selector: StateSelector<T>): T;
export function useAppState<T>(selector?: StateSelector<T>) {
  const context = useSimplifiedAppContext();
  
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  
  const { state } = context;
  
  // If no selector provided, return full state
  if (!selector) {
    return state;
  }
  
  // Use selector for optimized access
  return useMemo(() => selector(state), [selector, state]);
}

// Convenience hooks for common access patterns
export function useImages() {
  return useAppState(state => state.uploadedImages);
}

export function useAnalyses() {
  return useAppState(state => state.analyses);
}

export function useSelectedImage() {
  return useAppState(state => 
    state.selectedImageId 
      ? state.uploadedImages.find(img => img.id === state.selectedImageId)
      : undefined
  );
}

export function useSelectedImageId() {
  return useAppState(state => state.selectedImageId);
}

export function useImageGroups() {
  return useAppState(state => state.imageGroups);
}

export function useGeneratedConcepts() {
  return useAppState(state => state.generatedConcepts);
}

export function useOperationState() {
  return useAppState(state => ({
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    isUploading: state.isUploading,
    isGeneratingConcept: state.isGeneratingConcept,
    hasPendingSync: state.pendingBackgroundSync.size > 0,
    error: state.error,
  }));
}

export function useUIState() {
  return useAppState(state => ({
    showAnnotations: state.showAnnotations,
    galleryTool: state.galleryTool,
    groupDisplayModes: state.groupDisplayModes,
  }));
}

// Helper hook for image-specific data
export function useImageData(imageId: string | null) {
  return useAppState(state => {
    if (!imageId) return null;
    
    const image = state.uploadedImages.find(img => img.id === imageId);
    const analysis = state.analyses.find(analysis => analysis.imageId === imageId);
    
    return image ? { image, analysis } : null;
  });
}

// Helper hook for group-specific data
export function useGroupData(groupId: string | null) {
  return useAppState(state => {
    if (!groupId) return null;
    
    const group = state.imageGroups.find(g => g.id === groupId);
    if (!group) return null;
    
    const images = state.uploadedImages.filter(img => group.imageIds.includes(img.id));
    const groupAnalyses = state.groupAnalysesWithPrompts.filter(ga => ga.groupId === groupId);
    
    return { group, images, analyses: groupAnalyses };
  });
}

// Performance monitoring hook
export function useStatePerformance() {
  return useAppState(state => ({
    totalImages: state.uploadedImages.length,
    totalAnalyses: state.analyses.length,
    totalGroups: state.imageGroups.length,
    pendingSyncCount: state.pendingBackgroundSync.size,
    version: state.version,
    lastSync: state.lastSyncTimestamp,
  }));
}