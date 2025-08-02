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
  // Claude's suggested fix: Use default values during destructuring
  const { 
    uploadedImages = [], 
    imageGroups = [], 
    analyses = [],
    ...restProps
  } = props;
  
  // Simple length calculation
  const imageCount = uploadedImages.length;
  const groupCount = imageGroups.length;
  const analysisCount = analyses.length;
  const totalElements = imageCount + groupCount + analysisCount;
  
  // Decision logic for virtualization with safe comparisons
  const shouldVirtualize = 
    imageCount > VIRTUALIZATION_THRESHOLDS.IMAGES ||
    groupCount > VIRTUALIZATION_THRESHOLDS.GROUPS ||
    totalElements > VIRTUALIZATION_THRESHOLDS.TOTAL_ELEMENTS;
  
  // Performance logging with safe array access
  React.useEffect(() => {
    if (shouldVirtualize) {
      console.log(`[PerformantCanvas] Using virtualized rendering:`, {
        images: imageCount,
        groups: groupCount,
        analyses: analysisCount,
        total: totalElements
      });
    } else {
      console.log(`[PerformantCanvas] Using standard ReactFlow rendering:`, {
        images: imageCount,
        groups: groupCount,
        analyses: analysisCount,
        total: totalElements
      });
    }
  }, [shouldVirtualize, imageCount, groupCount, analysisCount, totalElements]);
  
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
      <CanvasView {...restProps} uploadedImages={uploadedImages} imageGroups={imageGroups} analyses={analyses} />
    </div>
  );
};

// Export performance utilities with simple arithmetic
export const CanvasPerformanceUtils = {
  shouldVirtualize: (imageCount: number, groupCount: number, analysisCount: number): boolean => {
    const safeImageCount = imageCount || 0;
    const safeGroupCount = groupCount || 0;
    const safeAnalysisCount = analysisCount || 0;
    const total = safeImageCount + safeGroupCount + safeAnalysisCount;
    
    return (
      safeImageCount > VIRTUALIZATION_THRESHOLDS.IMAGES ||
      safeGroupCount > VIRTUALIZATION_THRESHOLDS.GROUPS ||
      total > VIRTUALIZATION_THRESHOLDS.TOTAL_ELEMENTS
    );
  },
  
  getPerformanceMetrics: (imageCount: number, groupCount: number, analysisCount: number) => {
    const safeImageCount = imageCount || 0;
    const safeGroupCount = groupCount || 0;
    const safeAnalysisCount = analysisCount || 0;
    const totalElements = safeImageCount + safeGroupCount + safeAnalysisCount;
    
    return {
      totalElements,
      shouldVirtualize: CanvasPerformanceUtils.shouldVirtualize(safeImageCount, safeGroupCount, safeAnalysisCount),
      estimatedMemoryUsage: (safeImageCount * 0.5 + safeGroupCount * 0.1 + safeAnalysisCount * 0.3).toFixed(1) + 'MB',
      recommendedAction: safeImageCount > 100 ? 'Consider pagination' : 'Performance optimal'
    };
  }
};