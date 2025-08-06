/**
 * Enhanced Canvas Layout Utilities
 * Professional layout system with dynamic sizing and intelligent positioning
 */

import { ImageDimensions } from './imageUtils';
import { UploadedImage, ImageGroup } from '@/types/ux-analysis';
import { 
  calculateDynamicDisplayDimensions, 
  DynamicDisplayDimensions,
  getResponsiveDimensions 
} from './dynamicImageSizing';
import { 
  calculateSmartLayout, 
  calculateGroupLayout,
  calculateResponsiveLayout,
  GridPosition,
  LayoutResult 
} from './professionalGridLayout';

export interface CanvasNodePosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface EnhancedCanvasLayoutConfig {
  containerWidth: number;
  containerHeight: number;
  padding: number;
  spacing: number;
  adaptiveLayout: boolean;
  responsiveBreakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

/**
 * Enhanced layout configuration for professional canvas positioning
 */
export const ENHANCED_LAYOUT_CONFIG: EnhancedCanvasLayoutConfig = {
  containerWidth: 1400,
  containerHeight: 1000,
  padding: 40,
  spacing: 24,
  adaptiveLayout: true,
  responsiveBreakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1400
  }
};

/**
 * Calculate professional layout for images using dynamic sizing
 */
export function calculateProfessionalLayout(
  images: UploadedImage[],
  config: EnhancedCanvasLayoutConfig = ENHANCED_LAYOUT_CONFIG
): LayoutResult {
  if (images.length === 0) {
    return {
      positions: [],
      totalWidth: config.containerWidth,
      totalHeight: config.containerHeight,
      columns: 0,
      rows: 0
    };
  }

  // Calculate dynamic dimensions for each image
  const imageDimensions = images.map(image => {
    const originalDimensions = image.dimensions || { width: 400, height: 300 };
    return calculateDynamicDisplayDimensions(originalDimensions, undefined, 'canvas');
  });

  // Use professional grid layout algorithm
  return calculateSmartLayout(images, imageDimensions, {
    containerWidth: config.containerWidth,
    minSpacing: config.spacing,
    maxSpacing: config.spacing * 2,
    adaptiveSpacing: config.adaptiveLayout,
    padding: config.padding,
    autoColumns: true,
    alignItems: 'start',
    justifyContent: 'start'
  });
}

/**
 * Calculate responsive layout based on viewport size
 */
export function calculateResponsiveCanvasLayout(
  images: UploadedImage[],
  viewportWidth: number,
  viewportHeight: number,
  config: EnhancedCanvasLayoutConfig = ENHANCED_LAYOUT_CONFIG
): LayoutResult {
  // Calculate responsive dimensions for each image
  const imageDimensions = images.map(image => {
    const originalDimensions = image.dimensions || { width: 400, height: 300 };
    return getResponsiveDimensions(originalDimensions, viewportWidth, 'canvas');
  });

  return calculateResponsiveLayout(images, imageDimensions, viewportWidth, viewportHeight);
}

/**
 * Calculate enhanced group layout with dynamic sizing
 */
export function calculateEnhancedGroupLayout(
  group: ImageGroup,
  images: UploadedImage[],
  displayMode: 'grid' | 'stacked' = 'grid',
  config: Partial<EnhancedCanvasLayoutConfig> = {}
): LayoutResult {
  if (images.length === 0) {
    return {
      positions: [],
      totalWidth: 400,
      totalHeight: 300,
      columns: 0,
      rows: 0
    };
  }

  // Calculate dynamic dimensions for group images
  const imageDimensions = images.map(image => {
    const originalDimensions = image.dimensions || { width: 400, height: 300 };
    return calculateDynamicDisplayDimensions(originalDimensions, undefined, 'group');
  });

  // Use group-specific layout algorithm
  return calculateGroupLayout(group, images, imageDimensions, {
    containerWidth: 800,
    minSpacing: 16,
    maxSpacing: 24,
    padding: 20,
    ...config
  });
}

/**
 * Get optimal image dimensions for canvas display
 */
export function getOptimalImageDimensions(
  image: UploadedImage,
  context: 'canvas' | 'group' | 'gallery' = 'canvas',
  viewportWidth?: number
): DynamicDisplayDimensions {
  const originalDimensions = image.dimensions || { width: 400, height: 300 };
  
  if (viewportWidth) {
    return getResponsiveDimensions(originalDimensions, viewportWidth, context);
  }
  
  return calculateDynamicDisplayDimensions(originalDimensions, undefined, context);
}

/**
 * Convert layout result to canvas node positions
 */
export function convertLayoutToCanvasPositions(
  layoutResult: LayoutResult
): Array<CanvasNodePosition & { imageId: string }> {
  return layoutResult.positions.map(position => ({
    imageId: position.imageId,
    x: position.x,
    y: position.y,
    width: position.width,
    height: position.height
  }));
}

/**
 * Calculate optimal viewport bounds for canvas content
 */
export function calculateCanvasViewportBounds(
  layoutResult: LayoutResult,
  padding: number = 50
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (layoutResult.positions.length === 0) {
    return {
      minX: 0,
      maxX: 1200,
      minY: 0,
      maxY: 800,
      width: 1200,
      height: 800
    };
  }

  const positions = layoutResult.positions;
  const minX = Math.min(...positions.map(p => p.x)) - padding;
  const maxX = Math.max(...positions.map(p => p.x + p.width)) + padding;
  const minY = Math.min(...positions.map(p => p.y)) - padding;
  const maxY = Math.max(...positions.map(p => p.y + p.height)) + padding;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Legacy support function - maintains backward compatibility
 */
export function getNextAvailablePosition(
  existingPositions: CanvasNodePosition[],
  newItemDimensions: { width: number; height: number } = { width: 400, height: 300 },
  spacing: number = 24
): CanvasNodePosition {
  if (existingPositions.length === 0) {
    return { x: spacing, y: spacing };
  }

  // Find position with least overlap
  let bestPosition = { x: spacing, y: spacing };
  let minOverlap = Infinity;

  for (let x = spacing; x < 2000; x += spacing) {
    for (let y = spacing; y < 2000; y += spacing) {
      const candidate = { x, y };
      
      // Check for overlaps
      let hasOverlap = false;
      for (const existing of existingPositions) {
        const existingWidth = existing.width || 400;
        const existingHeight = existing.height || 300;
        
        if (x < existing.x + existingWidth + spacing &&
            x + newItemDimensions.width + spacing > existing.x &&
            y < existing.y + existingHeight + spacing &&
            y + newItemDimensions.height + spacing > existing.y) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        return candidate;
      }
    }
  }

  // Fallback: place at end
  const lastPosition = existingPositions[existingPositions.length - 1];
  return {
    x: lastPosition.x,
    y: (lastPosition.y || 0) + (lastPosition.height || 300) + spacing
  };
}