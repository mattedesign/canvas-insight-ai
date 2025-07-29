import React from 'react';
import type { CanvasViewProps } from './CanvasView';
import { CanvasView } from './CanvasView';
import { VirtualizedCanvasContainer } from './VirtualizedCanvasView';

// Performance thresholds for virtualization
const VIRTUALIZATION_THRESHOLDS = {
  IMAGES: 50,
  GROUPS: 10,
  TOTAL_ELEMENTS: 75
};

export const PerformantCanvasView: React.FC<CanvasViewProps> = (props) => {
  const { uploadedImages, imageGroups = [], analyses } = props;
  
  // Calculate total elements to determine if virtualization is needed
  const totalElements = uploadedImages.length + imageGroups.length + analyses.length;
  
  // Decision logic for virtualization
  const shouldVirtualize = 
    uploadedImages.length > VIRTUALIZATION_THRESHOLDS.IMAGES ||
    imageGroups.length > VIRTUALIZATION_THRESHOLDS.GROUPS ||
    totalElements > VIRTUALIZATION_THRESHOLDS.TOTAL_ELEMENTS;
  
  // Performance logging
  React.useEffect(() => {
    if (shouldVirtualize) {
      console.log(`[PerformantCanvas] Using virtualized rendering:`, {
        images: uploadedImages.length,
        groups: imageGroups.length,
        analyses: analyses.length,
        total: totalElements
      });
    } else {
      console.log(`[PerformantCanvas] Using standard ReactFlow rendering:`, {
        images: uploadedImages.length,
        groups: imageGroups.length,
        analyses: analyses.length,
        total: totalElements
      });
    }
  }, [shouldVirtualize, uploadedImages.length, imageGroups.length, analyses.length, totalElements]);
  
  // Use virtualized view for large datasets
  if (shouldVirtualize) {
    return (
      <div className="performant-canvas-virtualized">
        <VirtualizedCanvasContainer
          uploadedImages={uploadedImages}
          analyses={analyses}
          onImageSelect={props.onImageSelect}
          onOpenAnalysisPanel={props.onOpenAnalysisPanel}
          onAnalysisComplete={props.onAnalysisComplete}
          showAnnotations={props.showAnnotations}
          selectedImageId={null} // TODO: Extract from props or context
        />
      </div>
    );
  }
  
  // Use standard ReactFlow for smaller datasets (preserves all features)
  return (
    <div className="performant-canvas-standard">
      <CanvasView {...props} />
    </div>
  );
};

// Export performance utilities
export const CanvasPerformanceUtils = {
  shouldVirtualize: (imageCount: number, groupCount: number, analysisCount: number): boolean => {
    const total = imageCount + groupCount + analysisCount;
    return (
      imageCount > VIRTUALIZATION_THRESHOLDS.IMAGES ||
      groupCount > VIRTUALIZATION_THRESHOLDS.GROUPS ||
      total > VIRTUALIZATION_THRESHOLDS.TOTAL_ELEMENTS
    );
  },
  
  getPerformanceMetrics: (imageCount: number, groupCount: number, analysisCount: number) => ({
    totalElements: imageCount + groupCount + analysisCount,
    shouldVirtualize: CanvasPerformanceUtils.shouldVirtualize(imageCount, groupCount, analysisCount),
    estimatedMemoryUsage: (imageCount * 0.5 + groupCount * 0.1 + analysisCount * 0.3) + 'MB', // Rough estimate
    recommendedAction: imageCount > 100 ? 'Consider pagination' : 'Performance optimal'
  })
};