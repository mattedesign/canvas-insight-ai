import { useState, useCallback, useEffect } from 'react';
import { useReactFlow, useOnViewportChange } from '@xyflow/react';

export const useCanvasZoom = () => {
  const { zoomIn, zoomOut, zoomTo, fitView, getZoom } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState(100);

  // Sync zoom level with viewport changes for responsiveness
  useOnViewportChange({
    onChange: (vp) => {
      if (typeof vp.zoom === 'number' && isFinite(vp.zoom)) {
        setZoomLevel(Math.round(vp.zoom * 100));
      }
    },
  });

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

  // Keyboard shortcuts and ctrl/cmd + wheel zoom
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

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // prevent browser page zoom
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else if (e.deltaY > 0) {
          handleZoomOut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
      window.removeEventListener('wheel', handleWheel as any);
    };
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