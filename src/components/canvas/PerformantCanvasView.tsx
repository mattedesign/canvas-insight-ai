import React from 'react';
import type { CanvasViewProps } from './CanvasView';
import { CanvasView } from './CanvasView';
import { VirtualizedCanvasContainer } from './VirtualizedCanvasView';
import { useSafePropertyAccess } from '@/hooks/useSafePropertyAccess';
import { ArrayNumericSafety } from '@/utils/ArrayNumericSafety';

// Performance thresholds for virtualization
const VIRTUALIZATION_THRESHOLDS = {
  IMAGES: 50,
  GROUPS: 10,
  TOTAL_ELEMENTS: 75
};

export const PerformantCanvasView: React.FC<CanvasViewProps> = (props) => {
  const { safeGetArray, safeGetNumber } = useSafePropertyAccess();
  const arraySafety = ArrayNumericSafety.getInstance();
  
  // Safe array access with defaults
  const uploadedImages = safeGetArray(props, 'uploadedImages', [], 'PerformantCanvasView.uploadedImages');
  const imageGroups = safeGetArray(props, 'imageGroups', [], 'PerformantCanvasView.imageGroups');
  const analyses = safeGetArray(props, 'analyses', [], 'PerformantCanvasView.analyses');
  
  // Safe length calculation
  const imageCount = arraySafety.safeLength(uploadedImages, 0);
  const groupCount = arraySafety.safeLength(imageGroups, 0);
  const analysisCount = arraySafety.safeLength(analyses, 0);
  const totalElements = arraySafety.safeAdd(arraySafety.safeAdd(imageCount, groupCount), analysisCount);
  
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
      <CanvasView {...props} />
    </div>
  );
};

// Export performance utilities with safe arithmetic
export const CanvasPerformanceUtils = {
  shouldVirtualize: (imageCount: number, groupCount: number, analysisCount: number): boolean => {
    const arraySafety = ArrayNumericSafety.getInstance();
    const safeImageCount = arraySafety.safeAdd(imageCount || 0, 0);
    const safeGroupCount = arraySafety.safeAdd(groupCount || 0, 0);
    const safeAnalysisCount = arraySafety.safeAdd(analysisCount || 0, 0);
    const total = arraySafety.safeAdd(arraySafety.safeAdd(safeImageCount, safeGroupCount), safeAnalysisCount);
    
    return (
      safeImageCount > VIRTUALIZATION_THRESHOLDS.IMAGES ||
      safeGroupCount > VIRTUALIZATION_THRESHOLDS.GROUPS ||
      total > VIRTUALIZATION_THRESHOLDS.TOTAL_ELEMENTS
    );
  },
  
  getPerformanceMetrics: (imageCount: number, groupCount: number, analysisCount: number) => {
    const arraySafety = ArrayNumericSafety.getInstance();
    const safeImageCount = arraySafety.safeAdd(imageCount || 0, 0);
    const safeGroupCount = arraySafety.safeAdd(groupCount || 0, 0);
    const safeAnalysisCount = arraySafety.safeAdd(analysisCount || 0, 0);
    const totalElements = arraySafety.safeAdd(arraySafety.safeAdd(safeImageCount, safeGroupCount), safeAnalysisCount);
    
    return {
      totalElements,
      shouldVirtualize: CanvasPerformanceUtils.shouldVirtualize(safeImageCount, safeGroupCount, safeAnalysisCount),
      estimatedMemoryUsage: arraySafety.safeAdd(
        arraySafety.safeAdd(safeImageCount * 0.5, safeGroupCount * 0.1),
        safeAnalysisCount * 0.3
      ).toFixed(1) + 'MB',
      recommendedAction: safeImageCount > 100 ? 'Consider pagination' : 'Performance optimal'
    };
  }
};