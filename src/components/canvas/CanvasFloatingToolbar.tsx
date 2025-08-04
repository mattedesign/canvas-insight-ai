import React from 'react';
import { UnifiedFloatingToolbar, UnifiedToolMode } from '../UnifiedFloatingToolbar';
import { useCanvasZoom } from '@/hooks/useCanvasZoom';

interface CanvasFloatingToolbarProps {
  onToolChange: (tool: UnifiedToolMode) => void;
  onToggleAnnotations: () => void;
  onToggleAnalysis: () => void;
  onAddComment: () => void;
  onCreateGroup?: () => void;
  onImageUpload?: (files: File[]) => void;
  showAnnotations: boolean;
  showAnalysis: boolean;
  currentTool: UnifiedToolMode;
  hasMultiSelection?: boolean;
  selectedCount?: number;
}

export const CanvasFloatingToolbar: React.FC<CanvasFloatingToolbarProps> = (props) => {
  const {
    zoomLevel,
    handleZoomIn,
    handleZoomOut,
    handleZoomTo100,
    handleZoomTo200,
    handleFitView,
    handleReset
  } = useCanvasZoom();

  return (
    <UnifiedFloatingToolbar
      {...props}
      context="canvas"
      zoomLevel={zoomLevel}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onReset={handleReset}
      onZoomTo100={handleZoomTo100}
      onZoomTo200={handleZoomTo200}
      onFitView={handleFitView}
    />
  );
};