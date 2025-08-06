/**
 * Image utility functions for loading dimensions and processing images
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Load image dimensions from a File object
 * Returns a promise that resolves with the image dimensions
 */
export function loadImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      // For non-image files (like HTML), return default dimensions
      resolve({ width: 800, height: 600 });
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      // Clean up object URL to prevent memory leaks
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      console.warn(`Failed to load dimensions for image: ${file.name}`);
      // Fallback to reasonable default dimensions
      resolve({ width: 800, height: 600 });
      URL.revokeObjectURL(img.src);
    };
    
    // Create object URL for the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Load dimensions for multiple image files
 * Returns a promise that resolves with an array of dimensions in the same order
 */
export async function loadMultipleImageDimensions(files: File[]): Promise<ImageDimensions[]> {
  try {
    const dimensionPromises = files.map(file => loadImageDimensions(file));
    return await Promise.all(dimensionPromises);
  } catch (error) {
    console.error('Error loading multiple image dimensions:', error);
    // Return fallback dimensions for all files
    return files.map(() => ({ width: 800, height: 600 }));
  }
}

/**
 * Validate image file and return safe dimensions
 */
export function getImageDimensionsWithFallback(
  file: File, 
  fallback: ImageDimensions = { width: 800, height: 600 }
): Promise<ImageDimensions> {
  return loadImageDimensions(file).catch(() => {
    console.warn(`Using fallback dimensions for ${file.name}`);
    return fallback;
  });
}

/**
 * Legacy display constants - kept for backward compatibility
 * @deprecated Use dynamicImageSizing utilities instead
 */
export const CANVAS_DISPLAY_CONSTANTS = {
  MAX_WIDTH: 600,  // Increased for better quality
  MAX_HEIGHT: 450, // Increased for better quality
  MIN_WIDTH: 200,  // Increased minimum
  MIN_HEIGHT: 150, // Increased minimum
  ASPECT_RATIO_THRESHOLD: 3,
  GROUP_SPACING: 24, // Increased spacing
  GRID_PADDING: 20   // Increased padding
} as const;

/**
 * Legacy function for standardized display dimensions
 * @deprecated Use calculateDynamicDisplayDimensions from dynamicImageSizing instead
 */
export function getStandardDisplayDimensions(
  originalDimensions: ImageDimensions
): ImageDimensions {
  const { width: origWidth, height: origHeight } = originalDimensions;
  
  // Handle invalid dimensions
  if (!origWidth || !origHeight || origWidth <= 0 || origHeight <= 0) {
    return { width: CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH, height: CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT };
  }
  
  const aspectRatio = origWidth / origHeight;
  
  // Handle extreme aspect ratios
  if (aspectRatio > CANVAS_DISPLAY_CONSTANTS.ASPECT_RATIO_THRESHOLD) {
    return { width: CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH, height: CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT / 2 };
  }
  if (aspectRatio < 1 / CANVAS_DISPLAY_CONSTANTS.ASPECT_RATIO_THRESHOLD) {
    return { width: CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH / 2, height: CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT };
  }
  
  // Calculate proportional scaling within max bounds
  const widthRatio = CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH / origWidth;
  const heightRatio = CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT / origHeight;
  const scale = Math.min(widthRatio, heightRatio, 1); // Never scale up
  
  const displayWidth = Math.round(origWidth * scale);
  const displayHeight = Math.round(origHeight * scale);
  
  // Ensure minimum dimensions
  return {
    width: Math.max(displayWidth, CANVAS_DISPLAY_CONSTANTS.MIN_WIDTH),
    height: Math.max(displayHeight, CANVAS_DISPLAY_CONSTANTS.MIN_HEIGHT)
  };
}

/**
 * Enhanced dimensions calculation using dynamic sizing
 */
export function getEnhancedDisplayDimensions(
  originalDimensions: ImageDimensions,
  context: 'canvas' | 'group' | 'gallery' = 'canvas',
  viewportWidth?: number
): ImageDimensions {
  // Import dynamically to avoid circular dependencies
  const { calculateDynamicDisplayDimensions, getResponsiveDimensions } = require('./dynamicImageSizing');
  
  if (viewportWidth) {
    const result = getResponsiveDimensions(originalDimensions, viewportWidth, context);
    return { width: result.width, height: result.height };
  }
  
  const result = calculateDynamicDisplayDimensions(originalDimensions, undefined, context);
  return { width: result.width, height: result.height };
}

/**
 * Get safe dimensions from image object with enhanced sizing
 */
export function getSafeDimensions(
  image: { dimensions?: { width: number; height: number } },
  fallback: ImageDimensions = { width: CANVAS_DISPLAY_CONSTANTS.MAX_WIDTH, height: CANVAS_DISPLAY_CONSTANTS.MAX_HEIGHT },
  context: 'canvas' | 'group' | 'gallery' = 'canvas'
): ImageDimensions {
  if (!image.dimensions || 
      typeof image.dimensions.width !== 'number' || 
      typeof image.dimensions.height !== 'number' ||
      image.dimensions.width <= 0 || 
      image.dimensions.height <= 0) {
    console.warn('Invalid or missing image dimensions, using enhanced fallback:', fallback);
    return getEnhancedDisplayDimensions(fallback, context);
  }
  return getEnhancedDisplayDimensions(image.dimensions, context);
}