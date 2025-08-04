import { useState, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

export const useCanvasZoom = () => {
  const { zoomIn, zoomOut, zoomTo, fitView, getZoom } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState(100);

  // Update zoom level when zoom changes
  useEffect(() => {
    const updateZoom = () => {
      try {
        const currentZoom = getZoom();
        if (typeof currentZoom === 'number' && !isNaN(currentZoom) && isFinite(currentZoom)) {
          setZoomLevel(Math.round(currentZoom * 100));
        } else {
          setZoomLevel(100);
        }
      } catch (error) {
        console.error('Error getting zoom level:', error);
        setZoomLevel(100);
      }
    };
    
    updateZoom();
    const interval = setInterval(updateZoom, 100);
    return () => clearInterval(interval);
  }, [getZoom]);

  const handleZoomIn = useCallback(() => {
    zoomIn();
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
  }, [zoomOut]);

  const handleZoomTo100 = useCallback(() => {
    zoomTo(1);
    setZoomLevel(100);
  }, [zoomTo]);

  const handleZoomTo200 = useCallback(() => {
    zoomTo(2);
    setZoomLevel(200);
  }, [zoomTo]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 800, padding: 0.1 });
  }, [fitView]);

  const handleReset = useCallback(() => {
    handleZoomTo100();
  }, [handleZoomTo100]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '+':
          case '=':
            event.preventDefault();
            handleZoomIn();
            break;
          case '-':
            event.preventDefault();
            handleZoomOut();
            break;
          case '0':
            event.preventDefault();
            handleZoomTo100();
            break;
          case '1':
            event.preventDefault();
            handleFitView();
            break;
          case '2':
            event.preventDefault();
            handleZoomTo200();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleZoomIn, handleZoomOut, handleZoomTo100, handleFitView, handleZoomTo200]);

  return {
    zoomLevel,
    handleZoomIn,
    handleZoomOut,
    handleZoomTo100,
    handleZoomTo200,
    handleFitView,
    handleReset
  };
};