/**
 * Professional Grid Layout Algorithm
 * Advanced masonry/grid layout system with collision detection and adaptive spacing
 */

import { UploadedImage, ImageGroup } from '@/types/ux-analysis';
import { DynamicDisplayDimensions } from './dynamicImageSizing';

export interface GridPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  column: number;
}

export interface LayoutResult {
  positions: Array<GridPosition & { imageId: string }>;
  totalWidth: number;
  totalHeight: number;
  columns: number;
  rows: number;
}

export interface GridLayoutConfig {
  containerWidth?: number;
  containerHeight?: number;
  minSpacing: number;
  maxSpacing: number;
  adaptiveSpacing: boolean;
  columnCount?: number;
  autoColumns: boolean;
  alignItems: 'start' | 'center' | 'end';
  justifyContent: 'start' | 'center' | 'end' | 'space-between';
  padding: number;
}

export const DEFAULT_GRID_CONFIG: GridLayoutConfig = {
  minSpacing: 16,
  maxSpacing: 32,
  adaptiveSpacing: true,
  autoColumns: true,
  alignItems: 'start',
  justifyContent: 'start',
  padding: 20
};

/**
 * Advanced masonry layout algorithm
 */
export function calculateMasonryLayout(
  images: UploadedImage[],
  imageDimensions: DynamicDisplayDimensions[],
  config: GridLayoutConfig = DEFAULT_GRID_CONFIG
): LayoutResult {
  if (images.length === 0) {
    return {
      positions: [],
      totalWidth: 0,
      totalHeight: 0,
      columns: 0,
      rows: 0
    };
  }

  const { containerWidth = 1200, padding, minSpacing, adaptiveSpacing } = config;
  const availableWidth = containerWidth - (padding * 2);

  // Calculate optimal column count based on image sizes
  const avgImageWidth = imageDimensions.reduce((sum, dim) => sum + dim.width, 0) / imageDimensions.length;
  const optimalColumns = Math.max(1, Math.floor(availableWidth / (avgImageWidth + minSpacing)));
  const columns = config.columnCount || optimalColumns;

  // Calculate column width and spacing
  const totalSpacingWidth = (columns - 1) * minSpacing;
  const columnWidth = (availableWidth - totalSpacingWidth) / columns;
  
  // Adaptive spacing based on available space
  const spacing = adaptiveSpacing 
    ? Math.min(config.maxSpacing, Math.max(minSpacing, (availableWidth - (columns * avgImageWidth)) / (columns - 1)))
    : minSpacing;

  // Track column heights for masonry placement
  const columnHeights = new Array(columns).fill(padding);
  const positions: Array<GridPosition & { imageId: string }> = [];

  // Place each image in the shortest column
  imageDimensions.forEach((dimensions, index) => {
    const image = images[index];
    
    // Find the shortest column
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    const currentColumnHeight = columnHeights[shortestColumnIndex];

    // Calculate position
    const x = padding + (shortestColumnIndex * (columnWidth + spacing));
    const y = currentColumnHeight;

    // Scale image to fit column width while maintaining aspect ratio
    const scaledHeight = (dimensions.height * columnWidth) / dimensions.width;

    positions.push({
      imageId: image.id,
      x,
      y,
      width: columnWidth,
      height: scaledHeight,
      row: Math.floor(y / (scaledHeight + spacing)),
      column: shortestColumnIndex
    });

    // Update column height
    columnHeights[shortestColumnIndex] += scaledHeight + spacing;
  });

  return {
    positions,
    totalWidth: containerWidth,
    totalHeight: Math.max(...columnHeights),
    columns,
    rows: Math.max(...positions.map(p => p.row)) + 1
  };
}

/**
 * Grid layout with uniform column widths
 */
export function calculateGridLayout(
  images: UploadedImage[],
  imageDimensions: DynamicDisplayDimensions[],
  config: GridLayoutConfig = DEFAULT_GRID_CONFIG
): LayoutResult {
  if (images.length === 0) {
    return {
      positions: [],
      totalWidth: 0,
      totalHeight: 0,
      columns: 0,
      rows: 0
    };
  }

  const { containerWidth = 1200, padding, minSpacing } = config;
  const availableWidth = containerWidth - (padding * 2);

  // Determine columns
  const columns = config.columnCount || Math.min(images.length, Math.floor(availableWidth / 300));
  const rows = Math.ceil(images.length / columns);

  // Calculate cell dimensions
  const cellWidth = (availableWidth - ((columns - 1) * minSpacing)) / columns;
  const positions: Array<GridPosition & { imageId: string }> = [];

  let maxRowHeight = 0;
  const rowHeights: number[] = [];

  // Place images in grid
  imageDimensions.forEach((dimensions, index) => {
    const image = images[index];
    const row = Math.floor(index / columns);
    const col = index % columns;

    // Calculate cell height based on aspect ratio
    const cellHeight = (dimensions.height * cellWidth) / dimensions.width;
    
    // Track row heights
    if (!rowHeights[row] || cellHeight > rowHeights[row]) {
      rowHeights[row] = cellHeight;
    }
  });

  // Position images with row height alignment
  imageDimensions.forEach((dimensions, index) => {
    const image = images[index];
    const row = Math.floor(index / columns);
    const col = index % columns;

    const x = padding + (col * (cellWidth + minSpacing));
    const y = padding + rowHeights.slice(0, row).reduce((sum, height) => sum + height + minSpacing, 0);

    positions.push({
      imageId: image.id,
      x,
      y,
      width: cellWidth,
      height: rowHeights[row],
      row,
      column: col
    });
  });

  const totalHeight = padding + rowHeights.reduce((sum, height) => sum + height, 0) + ((rows - 1) * minSpacing) + padding;

  return {
    positions,
    totalWidth: containerWidth,
    totalHeight,
    columns,
    rows
  };
}

/**
 * Smart layout that chooses between masonry and grid based on content
 */
export function calculateSmartLayout(
  images: UploadedImage[],
  imageDimensions: DynamicDisplayDimensions[],
  config: GridLayoutConfig = DEFAULT_GRID_CONFIG
): LayoutResult {
  if (images.length === 0) {
    return {
      positions: [],
      totalWidth: 0,
      totalHeight: 0,
      columns: 0,
      rows: 0
    };
  }

  // Analyze aspect ratio diversity
  const aspectRatios = imageDimensions.map(dim => dim.aspectRatio);
  const avgAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0) / aspectRatios.length;
  const aspectRatioVariance = aspectRatios.reduce((sum, ratio) => sum + Math.pow(ratio - avgAspectRatio, 2), 0) / aspectRatios.length;

  // Use masonry for diverse aspect ratios, grid for uniform ratios
  if (aspectRatioVariance > 0.2 || images.length > 10) {
    return calculateMasonryLayout(images, imageDimensions, config);
  } else {
    return calculateGridLayout(images, imageDimensions, config);
  }
}

/**
 * Calculate layout for grouped images
 */
export function calculateGroupLayout(
  group: ImageGroup,
  images: UploadedImage[],
  imageDimensions: DynamicDisplayDimensions[],
  config: Partial<GridLayoutConfig> = {}
): LayoutResult {
  const groupConfig: GridLayoutConfig = {
    ...DEFAULT_GRID_CONFIG,
    containerWidth: 800,
    minSpacing: 12,
    maxSpacing: 24,
    padding: 16,
    ...config
  };

  // For small groups, use grid layout
  if (images.length <= 4) {
    return calculateGridLayout(images, imageDimensions, groupConfig);
  }

  // For larger groups, use smart layout
  return calculateSmartLayout(images, imageDimensions, groupConfig);
}

/**
 * Optimize layout for viewport size
 */
export function calculateResponsiveLayout(
  images: UploadedImage[],
  imageDimensions: DynamicDisplayDimensions[],
  viewportWidth: number,
  viewportHeight: number
): LayoutResult {
  const config: GridLayoutConfig = {
    ...DEFAULT_GRID_CONFIG,
    containerWidth: viewportWidth,
    containerHeight: viewportHeight
  };

  // Adjust layout based on viewport
  if (viewportWidth < 768) {
    // Mobile: single column or two columns max
    config.columnCount = images.length === 1 ? 1 : 2;
    config.minSpacing = 8;
    config.padding = 12;
  } else if (viewportWidth < 1024) {
    // Tablet: up to 3 columns
    config.columnCount = Math.min(3, Math.ceil(images.length / 2));
    config.minSpacing = 12;
    config.padding = 16;
  } else {
    // Desktop: auto-calculate optimal columns
    config.autoColumns = true;
    config.minSpacing = 16;
    config.padding = 20;
  }

  return calculateSmartLayout(images, imageDimensions, config);
}

/**
 * Collision detection for manual positioning
 */
export function detectCollisions(
  position: GridPosition,
  existingPositions: GridPosition[],
  tolerance: number = 8
): boolean {
  return existingPositions.some(existing => {
    const horizontalOverlap = 
      position.x < existing.x + existing.width + tolerance &&
      position.x + position.width + tolerance > existing.x;
      
    const verticalOverlap = 
      position.y < existing.y + existing.height + tolerance &&
      position.y + position.height + tolerance > existing.y;

    return horizontalOverlap && verticalOverlap;
  });
}

/**
 * Find next available position avoiding collisions
 */
export function findAvailablePosition(
  desiredPosition: Partial<GridPosition>,
  imageDimensions: DynamicDisplayDimensions,
  existingPositions: GridPosition[],
  containerBounds: { width: number; height: number }
): GridPosition {
  const { width, height } = imageDimensions;
  let { x = 0, y = 0 } = desiredPosition;

  const spacing = 16;
  const maxAttempts = 100;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const candidate: GridPosition = {
      x,
      y,
      width,
      height,
      row: Math.floor(y / (height + spacing)),
      column: Math.floor(x / (width + spacing))
    };

    // Check bounds
    const withinBounds = 
      x + width <= containerBounds.width &&
      y + height <= containerBounds.height;

    // Check collisions
    const hasCollision = detectCollisions(candidate, existingPositions);

    if (withinBounds && !hasCollision) {
      return candidate;
    }

    // Move to next position
    x += spacing;
    if (x + width > containerBounds.width) {
      x = 0;
      y += spacing;
    }

    attempts++;
  }

  // Fallback: place at end of layout
  const lastPosition = existingPositions[existingPositions.length - 1];
  if (lastPosition) {
    return {
      x: lastPosition.x,
      y: lastPosition.y + lastPosition.height + spacing,
      width,
      height,
      row: lastPosition.row + 1,
      column: lastPosition.column
    };
  }

  return {
    x: 0,
    y: 0,
    width,
    height,
    row: 0,
    column: 0
  };
}