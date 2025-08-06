/**
 * Canvas layout utilities for consistent positioning and sizing
 */

import { ImageDimensions, getStandardDisplayDimensions, CANVAS_DISPLAY_CONSTANTS } from './imageUtils';
import { UploadedImage, ImageGroup } from '@/types/ux-analysis';

export interface CanvasNodePosition {
  x: number;
  y: number;
}

export interface CanvasLayoutConfig {
  startX: number;
  startY: number;
  columnSpacing: number;
  rowSpacing: number;
  maxItemsPerRow: number;
}

/**
 * Standard layout configuration for canvas positioning
 */
export const STANDARD_LAYOUT_CONFIG: CanvasLayoutConfig = {
  startX: 50,
  startY: 50,
  columnSpacing: CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH + CANVAS_DISPLAY_CONSTANTS.GROUP_SPACING,
  rowSpacing: CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT + CANVAS_DISPLAY_CONSTANTS.GROUP_SPACING,
  maxItemsPerRow: 3
};

/**
 * Calculate grid position for an item based on index
 */
export function calculateGridPosition(index: number, config: CanvasLayoutConfig = STANDARD_LAYOUT_CONFIG): CanvasNodePosition {
  const row = Math.floor(index / config.maxItemsPerRow);
  const col = index % config.maxItemsPerRow;
  
  return {
    x: config.startX + (col * config.columnSpacing),
    y: config.startY + (row * config.rowSpacing)
  };
}

/**
 * Calculate position for group container based on contained images
 */
export function calculateGroupPosition(
  images: UploadedImage[], 
  groupIndex: number,
  config: CanvasLayoutConfig = STANDARD_LAYOUT_CONFIG
): CanvasNodePosition {
  if (images.length === 0) {
    return calculateGridPosition(groupIndex, config);
  }
  
  // Position group at the first image's expected position
  const firstImageIndex = groupIndex * config.maxItemsPerRow;
  return calculateGridPosition(firstImageIndex, config);
}

/**
 * Calculate group dimensions based on display mode and contained images
 */
export function calculateGroupDimensions(
  images: UploadedImage[],
  displayMode: 'standard' | 'stacked' = 'standard'
): ImageDimensions {
  if (images.length === 0) {
    return { width: CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH, height: CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT };
  }
  
  const imageCount = images.length;
  
  if (displayMode === 'stacked') {
    // Stacked: single column layout
    return {
      width: CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH + (CANVAS_DISPLAY_CONSTANTS.GROUP_SPACING * 2),
      height: (CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT * imageCount) + (CANVAS_DISPLAY_CONSTANTS.GROUP_SPACING * (imageCount + 1))
    };
  }
  
  // Standard: grid layout with max items per row
  const rows = Math.ceil(imageCount / STANDARD_LAYOUT_CONFIG.maxItemsPerRow);
  const cols = Math.min(imageCount, STANDARD_LAYOUT_CONFIG.maxItemsPerRow);
  
  return {
    width: (CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH * cols) + (CANVAS_DISPLAY_CONSTANTS.GROUP_SPACING * (cols + 1)),
    height: (CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT * rows) + (CANVAS_DISPLAY_CONSTANTS.GROUP_SPACING * (rows + 1))
  };
}

/**
 * Calculate positions for images within a group
 */
export function calculateImagePositionsInGroup(
  images: UploadedImage[],
  displayMode: 'standard' | 'stacked' = 'standard'
): CanvasNodePosition[] {
  if (images.length === 0) return [];
  
  const baseSpacing = CANVAS_DISPLAY_CONSTANTS.GROUP_SPACING;
  
  if (displayMode === 'stacked') {
    // Vertical stack
    return images.map((_, index) => ({
      x: baseSpacing,
      y: baseSpacing + (index * (CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT + baseSpacing))
    }));
  }
  
  // Grid layout
  return images.map((_, index) => {
    const row = Math.floor(index / STANDARD_LAYOUT_CONFIG.maxItemsPerRow);
    const col = index % STANDARD_LAYOUT_CONFIG.maxItemsPerRow;
    
    return {
      x: baseSpacing + (col * (CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH + baseSpacing)),
      y: baseSpacing + (row * (CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT + baseSpacing))
    };
  });
}

/**
 * Get next available position avoiding overlaps
 */
export function getNextAvailablePosition(
  existingPositions: CanvasNodePosition[],
  config: CanvasLayoutConfig = STANDARD_LAYOUT_CONFIG
): CanvasNodePosition {
  let index = 0;
  let position = calculateGridPosition(index, config);
  
  // Simple collision detection - find first non-overlapping position
  while (existingPositions.some(pos => 
    Math.abs(pos.x - position.x) < config.columnSpacing / 2 && 
    Math.abs(pos.y - position.y) < config.rowSpacing / 2
  )) {
    index++;
    position = calculateGridPosition(index, config);
    
    // Safety break to prevent infinite loops
    if (index > 100) break;
  }
  
  return position;
}