/**
 * Phase 3: Unified Canvas Layout Constants
 * Centralized spacing and layout configuration for consistent canvas positioning
 */

export interface CanvasLayoutConfig {
  // Base spacing constants
  NODE_MIN_SPACING: number;
  NODE_MAX_SPACING: number;
  
  // Grid system
  GRID_CELL_SIZE: number;
  GRID_PADDING: number;
  
  // Node dimensions
  IMAGE_NODE_MAX_WIDTH: number;
  IMAGE_NODE_MAX_HEIGHT: number;
  ANALYSIS_CARD_WIDTH: number;
  ANALYSIS_CARD_HEIGHT: number;
  
  // Group layout
  GROUP_PADDING: number;
  GROUP_HEADER_HEIGHT: number;
  GROUP_MIN_SPACING: number;
  
  // Canvas viewport
  CANVAS_PADDING: number;
  CANVAS_MIN_WIDTH: number;
  CANVAS_MIN_HEIGHT: number;
}

export const CANVAS_LAYOUT: CanvasLayoutConfig = {
  // Base spacing - ensures nodes don't overlap
  NODE_MIN_SPACING: 200,
  NODE_MAX_SPACING: 400,
  
  // Grid system for consistent positioning
  GRID_CELL_SIZE: 300,
  GRID_PADDING: 50,
  
  // Standard node dimensions to prevent size conflicts
  IMAGE_NODE_MAX_WIDTH: 600,
  IMAGE_NODE_MAX_HEIGHT: 400,
  ANALYSIS_CARD_WIDTH: 400,
  ANALYSIS_CARD_HEIGHT: 300,
  
  // Group layout configuration
  GROUP_PADDING: 40,
  GROUP_HEADER_HEIGHT: 80,
  GROUP_MIN_SPACING: 250,
  
  // Canvas bounds
  CANVAS_PADDING: 100,
  CANVAS_MIN_WIDTH: 1200,
  CANVAS_MIN_HEIGHT: 800,
};

export const LAYOUT_MODES = {
  GRID: 'grid',
  FLOW: 'flow',
  COMPACT: 'compact'
} as const;

export type LayoutMode = typeof LAYOUT_MODES[keyof typeof LAYOUT_MODES];

/**
 * Calculate optimal node spacing based on content and layout mode
 */
export function calculateNodeSpacing(
  nodeWidth: number, 
  nodeHeight: number, 
  layoutMode: LayoutMode = 'flow'
): { horizontal: number; vertical: number } {
  const baseSpacing = CANVAS_LAYOUT.NODE_MIN_SPACING;
  
  switch (layoutMode) {
    case 'grid':
      return {
        horizontal: Math.max(baseSpacing, nodeWidth * 0.5),
        vertical: Math.max(baseSpacing, nodeHeight * 0.5)
      };
    case 'compact':
      return {
        horizontal: Math.max(baseSpacing * 0.7, nodeWidth * 0.3),
        vertical: Math.max(baseSpacing * 0.7, nodeHeight * 0.3)
      };
    case 'flow':
    default:
      return {
        horizontal: Math.max(baseSpacing, nodeWidth * 0.6),
        vertical: Math.max(baseSpacing, nodeHeight * 0.4)
      };
  }
}

/**
 * Get standardized dimensions for different node types
 */
export function getStandardNodeDimensions(nodeType: string) {
  switch (nodeType) {
    case 'image':
      return {
        width: CANVAS_LAYOUT.IMAGE_NODE_MAX_WIDTH,
        height: CANVAS_LAYOUT.IMAGE_NODE_MAX_HEIGHT
      };
    case 'analysisCard':
      return {
        width: CANVAS_LAYOUT.ANALYSIS_CARD_WIDTH,
        height: CANVAS_LAYOUT.ANALYSIS_CARD_HEIGHT
      };
    default:
      return {
        width: CANVAS_LAYOUT.GRID_CELL_SIZE,
        height: CANVAS_LAYOUT.GRID_CELL_SIZE
      };
  }
}