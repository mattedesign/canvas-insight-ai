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
 * Get safe dimensions from image object with fallback
 */
export function getSafeDimensions(
  image: { dimensions?: { width: number; height: number } },
  fallback: ImageDimensions = { width: 800, height: 600 }
): ImageDimensions {
  if (!image.dimensions || 
      typeof image.dimensions.width !== 'number' || 
      typeof image.dimensions.height !== 'number' ||
      image.dimensions.width <= 0 || 
      image.dimensions.height <= 0) {
    console.warn('Invalid or missing image dimensions, using fallback:', fallback);
    return fallback;
  }
  return image.dimensions;
}