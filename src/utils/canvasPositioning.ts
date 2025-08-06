/**
 * Phase 2: Enhanced Canvas Node Positioning Logic
 * Improved algorithms for positioning nodes to prevent overlapping
 */

import { CANVAS_LAYOUT, calculateNodeSpacing, LayoutMode } from './canvasLayoutConstants';
import { getSafeDimensions, ImageDimensions } from './imageUtils';

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedNode {
  id: string;
  type: string;
  position: NodePosition;
  bounds: NodeBounds;
}

/**
 * Phase 1: Improved Container Dimension Calculations
 * Calculate container dimensions that prevent node overlap
 */
export function calculateContainerDimensions(
  nodes: Array<{ width: number; height: number }>,
  layoutMode: LayoutMode = 'flow'
): { width: number; height: number } {
  if (nodes.length === 0) {
    return {
      width: CANVAS_LAYOUT.CANVAS_MIN_WIDTH,
      height: CANVAS_LAYOUT.CANVAS_MIN_HEIGHT
    };
  }

  const maxNodeWidth = Math.max(...nodes.map(n => n.width));
  const maxNodeHeight = Math.max(...nodes.map(n => n.height));
  
  const spacing = calculateNodeSpacing(maxNodeWidth, maxNodeHeight, layoutMode);
  
  // Calculate grid dimensions based on node count
  const nodeCount = nodes.length;
  const optimalColumns = Math.ceil(Math.sqrt(nodeCount * 1.5)); // Wider layout
  const rows = Math.ceil(nodeCount / optimalColumns);
  
  const totalWidth = (optimalColumns * maxNodeWidth) + 
                    ((optimalColumns - 1) * spacing.horizontal) + 
                    (CANVAS_LAYOUT.CANVAS_PADDING * 2);
                    
  const totalHeight = (rows * maxNodeHeight) + 
                     ((rows - 1) * spacing.vertical) + 
                     (CANVAS_LAYOUT.CANVAS_PADDING * 2);

  return {
    width: Math.max(totalWidth, CANVAS_LAYOUT.CANVAS_MIN_WIDTH),
    height: Math.max(totalHeight, CANVAS_LAYOUT.CANVAS_MIN_HEIGHT)
  };
}

/**
 * Position nodes in a non-overlapping grid layout
 */
export function positionNodesInGrid(
  nodes: Array<{
    id: string;
    type: string;
    width: number;
    height: number;
  }>,
  layoutMode: LayoutMode = 'flow'
): PositionedNode[] {
  if (nodes.length === 0) return [];

  const positioned: PositionedNode[] = [];
  const maxNodeWidth = Math.max(...nodes.map(n => n.width));
  const maxNodeHeight = Math.max(...nodes.map(n => n.height));
  const spacing = calculateNodeSpacing(maxNodeWidth, maxNodeHeight, layoutMode);
  
  // Calculate optimal columns for layout
  const optimalColumns = Math.ceil(Math.sqrt(nodes.length * 1.5));
  
  let currentX = CANVAS_LAYOUT.CANVAS_PADDING;
  let currentY = CANVAS_LAYOUT.CANVAS_PADDING;
  let currentColumn = 0;
  let rowMaxHeight = 0;

  nodes.forEach((node, index) => {
    // Move to next row if we've reached the column limit
    if (currentColumn >= optimalColumns) {
      currentColumn = 0;
      currentX = CANVAS_LAYOUT.CANVAS_PADDING;
      currentY += rowMaxHeight + spacing.vertical;
      rowMaxHeight = 0;
    }

    const position = { x: currentX, y: currentY };
    const bounds = {
      x: currentX,
      y: currentY,
      width: node.width,
      height: node.height
    };

    positioned.push({
      id: node.id,
      type: node.type,
      position,
      bounds
    });

    // Update position for next node
    currentX += node.width + spacing.horizontal;
    rowMaxHeight = Math.max(rowMaxHeight, node.height);
    currentColumn++;
  });

  return positioned;
}

/**
 * Phase 4: Image Scaling for Consistent Layout
 * Scale image dimensions while maintaining aspect ratio
 */
export function scaleImageDimensions(
  originalDimensions: ImageDimensions,
  maxWidth: number = CANVAS_LAYOUT.IMAGE_NODE_MAX_WIDTH,
  maxHeight: number = CANVAS_LAYOUT.IMAGE_NODE_MAX_HEIGHT
): ImageDimensions {
  const { width: originalWidth, height: originalHeight } = originalDimensions;
  
  // If image is already within bounds, return as-is
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return originalDimensions;
  }

  // Calculate scale factor to fit within bounds while maintaining aspect ratio
  const widthScale = maxWidth / originalWidth;
  const heightScale = maxHeight / originalHeight;
  const scale = Math.min(widthScale, heightScale);

  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale)
  };
}

/**
 * Position image and analysis pairs in flow layout
 */
export function positionImageAnalysisPairs(
  imagePairs: Array<{
    imageId: string;
    imageDimensions: ImageDimensions;
    analysisId?: string;
  }>,
  layoutMode: LayoutMode = 'flow'
): PositionedNode[] {
  const positioned: PositionedNode[] = [];
  let currentY = CANVAS_LAYOUT.CANVAS_PADDING;

  imagePairs.forEach((pair) => {
    // Scale image to standard dimensions
    const scaledDimensions = scaleImageDimensions(pair.imageDimensions);
    const spacing = calculateNodeSpacing(scaledDimensions.width, scaledDimensions.height, layoutMode);

    // Position image node
    const imagePosition = {
      x: CANVAS_LAYOUT.CANVAS_PADDING,
      y: currentY
    };

    positioned.push({
      id: pair.imageId,
      type: 'image',
      position: imagePosition,
      bounds: {
        x: imagePosition.x,
        y: imagePosition.y,
        width: scaledDimensions.width,
        height: scaledDimensions.height
      }
    });

    // Position analysis card if it exists
    if (pair.analysisId) {
      const analysisPosition = {
        x: CANVAS_LAYOUT.CANVAS_PADDING + scaledDimensions.width + spacing.horizontal,
        y: currentY
      };

      positioned.push({
        id: pair.analysisId,
        type: 'analysisCard',
        position: analysisPosition,
        bounds: {
          x: analysisPosition.x,
          y: analysisPosition.y,
          width: CANVAS_LAYOUT.ANALYSIS_CARD_WIDTH,
          height: CANVAS_LAYOUT.ANALYSIS_CARD_HEIGHT
        }
      });
    }

    // Move to next row with proper spacing
    const pairHeight = Math.max(scaledDimensions.height, CANVAS_LAYOUT.ANALYSIS_CARD_HEIGHT);
    currentY += pairHeight + spacing.vertical;
  });

  return positioned;
}

/**
 * Check if two node bounds overlap
 */
export function nodesOverlap(bounds1: NodeBounds, bounds2: NodeBounds): boolean {
  return !(
    bounds1.x + bounds1.width <= bounds2.x ||
    bounds2.x + bounds2.width <= bounds1.x ||
    bounds1.y + bounds1.height <= bounds2.y ||
    bounds2.y + bounds2.height <= bounds1.y
  );
}

/**
 * Validate layout to ensure no overlapping nodes
 */
export function validateLayout(nodes: PositionedNode[]): {
  isValid: boolean;
  overlaps: Array<{ node1: string; node2: string }>;
} {
  const overlaps: Array<{ node1: string; node2: string }> = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodesOverlap(nodes[i].bounds, nodes[j].bounds)) {
        overlaps.push({
          node1: nodes[i].id,
          node2: nodes[j].id
        });
      }
    }
  }

  return {
    isValid: overlaps.length === 0,
    overlaps
  };
}