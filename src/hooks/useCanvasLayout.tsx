/**
 * Phase 5: Canvas Layout Hook with Testing and Validation
 * React hook for managing canvas layout with automatic validation
 */

import { useState, useCallback, useMemo } from 'react';
import { Node } from '@xyflow/react';
import { 
  positionNodesInGrid, 
  positionImageAnalysisPairs, 
  calculateContainerDimensions,
  validateLayout,
  PositionedNode,
  scaleImageDimensions
} from '@/utils/canvasPositioning';
import { CANVAS_LAYOUT, LayoutMode, getStandardNodeDimensions } from '@/utils/canvasLayoutConstants';
import { getSafeDimensions } from '@/utils/imageUtils';
import { UploadedImage, UXAnalysis } from '@/types/ux-analysis';

export interface CanvasLayoutState {
  nodes: Node[];
  containerDimensions: { width: number; height: number };
  layoutMode: LayoutMode;
  isValid: boolean;
  validationErrors: string[];
}

export interface UseCanvasLayoutOptions {
  layoutMode?: LayoutMode;
  autoValidate?: boolean;
  onLayoutError?: (errors: string[]) => void;
}

export function useCanvasLayout(
  uploadedImages: UploadedImage[] = [],
  analyses: UXAnalysis[] = [],
  options: UseCanvasLayoutOptions = {}
) {
  const { 
    layoutMode = 'flow', 
    autoValidate = true, 
    onLayoutError 
  } = options;

  const [layoutState, setLayoutState] = useState<CanvasLayoutState>({
    nodes: [],
    containerDimensions: { width: CANVAS_LAYOUT.CANVAS_MIN_WIDTH, height: CANVAS_LAYOUT.CANVAS_MIN_HEIGHT },
    layoutMode,
    isValid: true,
    validationErrors: []
  });

  // Memoized layout calculation
  const calculatedLayout = useMemo(() => {
    console.log('[useCanvasLayout] Calculating layout for:', {
      imagesCount: uploadedImages.length,
      analysesCount: analyses.length,
      layoutMode
    });

    if (uploadedImages.length === 0) {
      return {
        nodes: [],
        containerDimensions: { 
          width: CANVAS_LAYOUT.CANVAS_MIN_WIDTH, 
          height: CANVAS_LAYOUT.CANVAS_MIN_HEIGHT 
        },
        isValid: true,
        validationErrors: []
      };
    }

    // Prepare image-analysis pairs
    const imagePairs = uploadedImages.map(image => {
      const analysis = analyses.find(a => a.imageId === image.id);
      const safeDimensions = getSafeDimensions(image);
      
      return {
        imageId: image.id,
        imageDimensions: safeDimensions,
        analysisId: analysis?.id
      };
    });

    // Position nodes using improved algorithm
    const positionedNodes = positionImageAnalysisPairs(imagePairs, layoutMode);
    
    // Convert to React Flow node format
    const nodes: Node[] = [];
    
    positionedNodes.forEach(positioned => {
      if (positioned.type === 'image') {
        const image = uploadedImages.find(img => img.id === positioned.id);
        const analysis = analyses.find(a => a.imageId === positioned.id);
        
        if (image) {
          const scaledDimensions = scaleImageDimensions(getSafeDimensions(image));
          
          nodes.push({
            id: positioned.id,
            type: 'image',
            position: positioned.position,
            data: {
              image: {
                ...image,
                dimensions: scaledDimensions
              },
              analysis,
              showAnnotations: true,
              currentTool: 'cursor'
            },
            style: {
              width: scaledDimensions.width,
              height: scaledDimensions.height
            }
          });
        }
      } else if (positioned.type === 'analysisCard') {
        const analysis = analyses.find(a => a.id === positioned.id);
        
        if (analysis) {
          nodes.push({
            id: positioned.id,
            type: 'analysisCard',
            position: positioned.position,
            data: {
              analysis,
              imageId: analysis.imageId
            },
            style: {
              width: CANVAS_LAYOUT.ANALYSIS_CARD_WIDTH,
              height: CANVAS_LAYOUT.ANALYSIS_CARD_HEIGHT
            }
          });
        }
      }
    });

    // Calculate container dimensions
    const nodeDimensions = positionedNodes.map(node => ({
      width: node.bounds.width,
      height: node.bounds.height
    }));
    
    const containerDimensions = calculateContainerDimensions(nodeDimensions, layoutMode);

    // Validate layout
    const validation = validateLayout(positionedNodes);
    const validationErrors: string[] = [];
    
    if (!validation.isValid) {
      validationErrors.push(`Layout contains ${validation.overlaps.length} overlapping nodes`);
      validation.overlaps.forEach(overlap => {
        validationErrors.push(`Nodes ${overlap.node1} and ${overlap.node2} overlap`);
      });
    }

    // Check for nodes outside container bounds
    positionedNodes.forEach(node => {
      if (node.bounds.x + node.bounds.width > containerDimensions.width ||
          node.bounds.y + node.bounds.height > containerDimensions.height) {
        validationErrors.push(`Node ${node.id} extends beyond container bounds`);
      }
    });

    console.log('[useCanvasLayout] Layout calculated:', {
      nodesCount: nodes.length,
      containerDimensions,
      isValid: validation.isValid,
      validationErrors
    });

    return {
      nodes,
      containerDimensions,
      isValid: validation.isValid,
      validationErrors
    };
  }, [uploadedImages, analyses, layoutMode]);

  // Update layout state when calculation changes
  useMemo(() => {
    setLayoutState(prev => ({
      ...prev,
      ...calculatedLayout,
      layoutMode
    }));

    // Report validation errors
    if (autoValidate && calculatedLayout.validationErrors.length > 0) {
      onLayoutError?.(calculatedLayout.validationErrors);
      console.warn('[useCanvasLayout] Layout validation errors:', calculatedLayout.validationErrors);
    }
  }, [calculatedLayout, layoutMode, autoValidate, onLayoutError]);

  // Manual layout validation
  const validateCurrentLayout = useCallback(() => {
    const positionedNodes = layoutState.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      bounds: {
        x: node.position.x,
        y: node.position.y,
        width: node.style?.width as number || getStandardNodeDimensions(node.type).width,
        height: node.style?.height as number || getStandardNodeDimensions(node.type).height
      }
    }));

    return validateLayout(positionedNodes);
  }, [layoutState.nodes]);

  // Change layout mode
  const setLayoutMode = useCallback((newMode: LayoutMode) => {
    setLayoutState(prev => ({ ...prev, layoutMode: newMode }));
  }, []);

  // Get layout statistics
  const getLayoutStats = useCallback(() => {
    return {
      totalNodes: layoutState.nodes.length,
      containerDimensions: layoutState.containerDimensions,
      density: layoutState.nodes.length / (layoutState.containerDimensions.width * layoutState.containerDimensions.height / 1000000), // nodes per million pixels
      isValid: layoutState.isValid,
      errorCount: layoutState.validationErrors.length
    };
  }, [layoutState]);

  return {
    // Layout state
    nodes: layoutState.nodes,
    containerDimensions: layoutState.containerDimensions,
    layoutMode: layoutState.layoutMode,
    isValid: layoutState.isValid,
    validationErrors: layoutState.validationErrors,
    
    // Layout controls
    setLayoutMode,
    validateCurrentLayout,
    getLayoutStats,
    
    // Layout constants for external use
    layoutConstants: CANVAS_LAYOUT
  };
}