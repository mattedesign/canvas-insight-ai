/**
 * Dynamic Image Sizing System
 * Intelligent scaling based on actual image dimensions with aspect ratio preservation
 */

import { ImageDimensions } from './imageUtils';
import { UploadedImage } from '@/types/ux-analysis';

export interface DynamicDisplayDimensions extends ImageDimensions {
  scale: number;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
}

export interface SizingConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  preferredMaxWidth: number;
  preferredMaxHeight: number;
}

// Adaptive sizing constraints based on viewport and context
export const SIZING_CONSTRAINTS: SizingConstraints = {
  minWidth: 200,
  maxWidth: 1200,
  minHeight: 150,
  maxHeight: 900,
  preferredMaxWidth: 600,
  preferredMaxHeight: 450
};

/**
 * Calculate optimal display dimensions based on actual image size
 */
export function calculateDynamicDisplayDimensions(
  originalDimensions: ImageDimensions,
  constraints: SizingConstraints = SIZING_CONSTRAINTS,
  context: 'canvas' | 'group' | 'gallery' = 'canvas'
): DynamicDisplayDimensions {
  const { width: origWidth, height: origHeight } = originalDimensions;
  
  // Handle invalid dimensions
  if (!origWidth || !origHeight || origWidth <= 0 || origHeight <= 0) {
    return {
      width: constraints.preferredMaxWidth,
      height: constraints.preferredMaxHeight,
      scale: 1,
      originalWidth: constraints.preferredMaxWidth,
      originalHeight: constraints.preferredMaxHeight,
      aspectRatio: constraints.preferredMaxWidth / constraints.preferredMaxHeight
    };
  }

  const aspectRatio = origWidth / origHeight;
  
  // Context-specific max dimensions
  let maxWidth = constraints.preferredMaxWidth;
  let maxHeight = constraints.preferredMaxHeight;
  
  if (context === 'group') {
    // Slightly smaller for group contexts
    maxWidth = Math.min(constraints.preferredMaxWidth * 0.8, 480);
    maxHeight = Math.min(constraints.preferredMaxHeight * 0.8, 360);
  } else if (context === 'gallery') {
    // Larger for gallery views
    maxWidth = constraints.maxWidth;
    maxHeight = constraints.maxHeight;
  }

  // Calculate scale factors
  const widthScale = maxWidth / origWidth;
  const heightScale = maxHeight / origHeight;
  
  // Use the smaller scale to maintain aspect ratio
  let scale = Math.min(widthScale, heightScale, 1.0); // Never scale up beyond original
  
  // Apply minimum size constraints
  const scaledWidth = origWidth * scale;
  const scaledHeight = origHeight * scale;
  
  if (scaledWidth < constraints.minWidth) {
    scale = constraints.minWidth / origWidth;
  }
  if (scaledHeight < constraints.minHeight) {
    scale = Math.max(scale, constraints.minHeight / origHeight);
  }

  // Final dimensions
  const displayWidth = Math.round(origWidth * scale);
  const displayHeight = Math.round(origHeight * scale);

  return {
    width: displayWidth,
    height: displayHeight,
    scale,
    originalWidth: origWidth,
    originalHeight: origHeight,
    aspectRatio
  };
}

/**
 * Get responsive sizing for different viewport sizes
 */
export function getResponsiveDimensions(
  originalDimensions: ImageDimensions,
  viewportWidth: number,
  context: 'canvas' | 'group' | 'gallery' = 'canvas'
): DynamicDisplayDimensions {
  // Adaptive constraints based on viewport
  let constraints = { ...SIZING_CONSTRAINTS };
  
  if (viewportWidth < 768) {
    // Mobile - smaller images
    constraints.preferredMaxWidth = 320;
    constraints.preferredMaxHeight = 240;
    constraints.maxWidth = 400;
    constraints.maxHeight = 300;
  } else if (viewportWidth < 1024) {
    // Tablet - medium images
    constraints.preferredMaxWidth = 480;
    constraints.preferredMaxHeight = 360;
  } else {
    // Desktop - larger images
    constraints.preferredMaxWidth = 600;
    constraints.preferredMaxHeight = 450;
  }

  return calculateDynamicDisplayDimensions(originalDimensions, constraints, context);
}

/**
 * Calculate dimensions for images within groups
 */
export function calculateGroupImageDimensions(
  images: UploadedImage[],
  groupDisplayMode: 'grid' | 'stacked' = 'grid'
): DynamicDisplayDimensions[] {
  if (images.length === 0) return [];

  const baseConstraints = { ...SIZING_CONSTRAINTS };
  
  if (groupDisplayMode === 'stacked') {
    // Uniform width for stacked layout
    baseConstraints.preferredMaxWidth = 400;
    baseConstraints.preferredMaxHeight = 300;
    
    return images.map(image => 
      calculateDynamicDisplayDimensions(
        image.dimensions || { width: 400, height: 300 },
        baseConstraints,
        'group'
      )
    );
  }

  // Grid layout - adaptive sizing based on image count
  const gridConstraints = { ...baseConstraints };
  
  if (images.length <= 2) {
    // Larger images for small groups
    gridConstraints.preferredMaxWidth = 480;
    gridConstraints.preferredMaxHeight = 360;
  } else if (images.length <= 4) {
    // Medium images for moderate groups
    gridConstraints.preferredMaxWidth = 400;
    gridConstraints.preferredMaxHeight = 300;
  } else {
    // Smaller images for large groups
    gridConstraints.preferredMaxWidth = 320;
    gridConstraints.preferredMaxHeight = 240;
  }

  return images.map(image => 
    calculateDynamicDisplayDimensions(
      image.dimensions || { width: 400, height: 300 },
      gridConstraints,
      'group'
    )
  );
}

/**
 * Get optimal image size for a specific container
 */
export function getContainerOptimizedDimensions(
  originalDimensions: ImageDimensions,
  containerWidth: number,
  containerHeight: number,
  padding: number = 16
): DynamicDisplayDimensions {
  const availableWidth = containerWidth - (padding * 2);
  const availableHeight = containerHeight - (padding * 2);
  
  const constraints: SizingConstraints = {
    minWidth: Math.min(200, availableWidth * 0.3),
    maxWidth: availableWidth,
    minHeight: Math.min(150, availableHeight * 0.3),
    maxHeight: availableHeight,
    preferredMaxWidth: availableWidth * 0.8,
    preferredMaxHeight: availableHeight * 0.8
  };

  return calculateDynamicDisplayDimensions(originalDimensions, constraints);
}

/**
 * Calculate dimensions for masonry/grid layouts
 */
export function calculateMasonryDimensions(
  images: UploadedImage[],
  columns: number = 3,
  columnWidth: number = 300,
  spacing: number = 20
): Array<DynamicDisplayDimensions & { column: number; row: number }> {
  const constraints: SizingConstraints = {
    minWidth: columnWidth * 0.6,
    maxWidth: columnWidth,
    minHeight: 150,
    maxHeight: columnWidth * 1.5, // Allow tall images
    preferredMaxWidth: columnWidth,
    preferredMaxHeight: columnWidth * 0.75
  };

  const columnHeights = new Array(columns).fill(0);
  
  return images.map((image, index) => {
    const dimensions = calculateDynamicDisplayDimensions(
      image.dimensions || { width: 400, height: 300 },
      constraints,
      'gallery'
    );

    // Find shortest column
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    const row = Math.floor(columnHeights[shortestColumnIndex] / (dimensions.height + spacing));
    
    // Update column height
    columnHeights[shortestColumnIndex] += dimensions.height + spacing;

    return {
      ...dimensions,
      column: shortestColumnIndex,
      row
    };
  });
}