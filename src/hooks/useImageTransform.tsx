import { useState, useCallback, useRef } from 'react';

export interface ImageTransformState {
  scale: number;
  positionX: number;
  positionY: number;
}

export const useImageTransform = () => {
  const [transformState, setTransformState] = useState<ImageTransformState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });
  
  const transformRef = useRef<any>(null);

  const handleTransformChange = useCallback((ref: any) => {
    if (ref?.state) {
      setTransformState({
        scale: ref.state.scale,
        positionX: ref.state.positionX,
        positionY: ref.state.positionY,
      });
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.zoomIn(0.3);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.zoomOut(0.3);
    }
  }, []);

  const resetTransform = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  }, []);

  const setTransformRef = useCallback((ref: any) => {
    transformRef.current = ref;
  }, []);

  const getZoomLevel = useCallback(() => {
    return Math.round(transformState.scale * 100);
  }, [transformState.scale]);

  return {
    transformState,
    zoomIn,
    zoomOut,
    resetTransform,
    setTransformRef,
    handleTransformChange,
    getZoomLevel,
  };
};