import React from 'react';
import { UnifiedFloatingToolbar, UnifiedToolMode } from './UnifiedFloatingToolbar';

export type GalleryToolMode = UnifiedToolMode;

interface GalleryFloatingToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onDelete: () => void;
  onToggleAnnotations: () => void;
  onToolChange?: (tool: GalleryToolMode) => void;
  onAddComment?: () => void;
  showAnnotations: boolean;
  zoomLevel: number;
  currentTool?: GalleryToolMode;
}

export const GalleryFloatingToolbar: React.FC<GalleryFloatingToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onDelete,
  onToggleAnnotations,
  onToolChange,
  onAddComment,
  showAnnotations,
  zoomLevel,
  currentTool = 'cursor'
}) => {
  return (
    <UnifiedFloatingToolbar
      context="gallery"
      zoomLevel={zoomLevel}
      onZoomIn={onZoomIn}
      onZoomOut={onZoomOut}
      onReset={onReset}
      onDelete={onDelete}
      onToggleAnnotations={onToggleAnnotations}
      onToolChange={onToolChange}
      onAddComment={onAddComment}
      showAnnotations={showAnnotations}
      currentTool={currentTool}
    />
  );
};