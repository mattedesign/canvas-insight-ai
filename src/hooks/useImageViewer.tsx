import { useState, useCallback } from 'react';

export interface ImageViewerState {
  zoom: number;
  pan: { x: number; y: number };
  selectedAnnotations: string[];
}

export const useImageViewer = () => {
  const [state, setState] = useState<ImageViewerState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedAnnotations: [],
  });

  const updateZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom }));
  }, []);

  const updatePan = useCallback((pan: { x: number; y: number }) => {
    setState(prev => ({ ...prev, pan }));
  }, []);

  const toggleAnnotation = useCallback((annotationId: string) => {
    setState(prev => ({
      ...prev,
      selectedAnnotations: prev.selectedAnnotations.includes(annotationId)
        ? prev.selectedAnnotations.filter(id => id !== annotationId)
        : [...prev.selectedAnnotations, annotationId]
    }));
  }, []);

  const clearAnnotations = useCallback(() => {
    setState(prev => ({ ...prev, selectedAnnotations: [] }));
  }, []);

  return {
    state,
    updateZoom,
    updatePan,
    toggleAnnotation,
    clearAnnotations,
  };
};