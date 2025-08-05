/**
 * Image Optimization Service - Reduces image size before analysis
 */

export interface OptimizedImage {
  url: string;
  originalSize: number;
  optimizedSize: number;
  format: string;
  dimensions: { width: number; height: number };
  compressionRatio: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  targetSizeKB?: number;
}

class ImageOptimizationService {
  private static readonly DEFAULT_MAX_WIDTH = 1200;
  private static readonly DEFAULT_MAX_HEIGHT = 800;
  private static readonly DEFAULT_QUALITY = 0.8;
  private static readonly TARGET_SIZE_KB = 500; // Target 500KB for edge function processing

  /**
   * Optimize image for analysis to reduce memory usage
   */
  async optimizeForAnalysis(
    imageUrl: string, 
    options: CompressionOptions = {}
  ): Promise<OptimizedImage> {
    const {
      maxWidth = ImageOptimizationService.DEFAULT_MAX_WIDTH,
      maxHeight = ImageOptimizationService.DEFAULT_MAX_HEIGHT,
      quality = ImageOptimizationService.DEFAULT_QUALITY,
      format = 'jpeg',
      targetSizeKB = ImageOptimizationService.TARGET_SIZE_KB
    } = options;

    try {
      console.log('🔧 Optimizing image for analysis:', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        targetSizeKB,
        maxDimensions: `${maxWidth}x${maxHeight}`
      });

      // Get original image data
      const originalData = await this.loadImageData(imageUrl);
      
      // Create canvas for optimization
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Calculate optimal dimensions
      const { width: optimalWidth, height: optimalHeight } = this.calculateOptimalDimensions(
        originalData.width, 
        originalData.height, 
        maxWidth, 
        maxHeight
      );

      canvas.width = optimalWidth;
      canvas.height = optimalHeight;

      // Draw and compress image
      ctx.drawImage(originalData.image, 0, 0, optimalWidth, optimalHeight);

      // Try different quality levels to meet target size
      let optimizedUrl = '';
      let optimizedSize = 0;
      let currentQuality = quality;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const dataUrl = canvas.toDataURL(`image/${format}`, currentQuality);
        const sizeKB = this.getDataUrlSizeKB(dataUrl);
        
        console.log(`🔧 Compression attempt ${attempts + 1}: ${sizeKB}KB at quality ${currentQuality}`);
        
        if (sizeKB <= targetSizeKB || currentQuality <= 0.3) {
          optimizedUrl = dataUrl;
          optimizedSize = sizeKB * 1024; // Convert to bytes
          break;
        }

        // Reduce quality for next attempt
        currentQuality = Math.max(0.3, currentQuality - 0.15);
        attempts++;
      }

      // If still too large, try more aggressive resizing
      if (optimizedSize > targetSizeKB * 1024 && attempts >= maxAttempts) {
        console.log('🔧 Applying aggressive resizing...');
        const aggressiveWidth = Math.floor(optimalWidth * 0.7);
        const aggressiveHeight = Math.floor(optimalHeight * 0.7);
        
        canvas.width = aggressiveWidth;
        canvas.height = aggressiveHeight;
        ctx.drawImage(originalData.image, 0, 0, aggressiveWidth, aggressiveHeight);
        
        optimizedUrl = canvas.toDataURL(`image/${format}`, 0.6);
        optimizedSize = this.getDataUrlSizeKB(optimizedUrl) * 1024;
      }

      const result: OptimizedImage = {
        url: optimizedUrl,
        originalSize: originalData.size,
        optimizedSize,
        format,
        dimensions: { width: canvas.width, height: canvas.height },
        compressionRatio: originalData.size / optimizedSize
      };

      console.log('✅ Image optimization complete:', {
        originalSize: `${Math.round(originalData.size / 1024)}KB`,
        optimizedSize: `${Math.round(optimizedSize / 1024)}KB`,
        compressionRatio: `${result.compressionRatio.toFixed(2)}x`,
        finalDimensions: `${result.dimensions.width}x${result.dimensions.height}`
      });

      return result;

    } catch (error) {
      console.error('❌ Image optimization failed:', error);
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  /**
   * Load image data for processing
   */
  private async loadImageData(imageUrl: string): Promise<{
    image: HTMLImageElement;
    width: number;
    height: number;
    size: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Estimate size from data URL if possible
        let estimatedSize = 0;
        if (imageUrl.startsWith('data:')) {
          estimatedSize = this.getDataUrlSizeKB(imageUrl) * 1024;
        } else {
          // Rough estimation based on dimensions
          estimatedSize = img.width * img.height * 3; // RGB bytes
        }

        resolve({
          image: img,
          width: img.width || img.naturalWidth,
          height: img.height || img.naturalHeight,
          size: estimatedSize
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      img.src = imageUrl;
    });
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Scale down if exceeds max dimensions
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Get size of data URL in KB
   */
  private getDataUrlSizeKB(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1] || dataUrl;
    const sizeBytes = (base64.length * 3) / 4;
    return sizeBytes / 1024;
  }

  /**
   * Batch optimize multiple images
   */
  async optimizeMultipleImages(
    imageUrls: string[],
    options: CompressionOptions = {}
  ): Promise<OptimizedImage[]> {
    console.log(`🔧 Batch optimizing ${imageUrls.length} images...`);

    const results = await Promise.allSettled(
      imageUrls.map(url => this.optimizeForAnalysis(url, options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`❌ Failed to optimize image ${index}:`, result.reason);
        // Return minimal fallback
        return {
          url: imageUrls[index],
          originalSize: 0,
          optimizedSize: 0,
          format: 'unknown',
          dimensions: { width: 0, height: 0 },
          compressionRatio: 1
        };
      }
    });
  }

  /**
   * Check if image needs optimization
   */
  async checkOptimizationNeeded(imageUrl: string): Promise<{
    needsOptimization: boolean;
    estimatedSize: number;
    reason?: string;
  }> {
    try {
      const imageData = await this.loadImageData(imageUrl);
      const sizeKB = imageData.size / 1024;
      
      const needsOptimization = sizeKB > ImageOptimizationService.TARGET_SIZE_KB ||
                               imageData.width > ImageOptimizationService.DEFAULT_MAX_WIDTH ||
                               imageData.height > ImageOptimizationService.DEFAULT_MAX_HEIGHT;

      let reason = '';
      if (sizeKB > ImageOptimizationService.TARGET_SIZE_KB) {
        reason = `Size ${Math.round(sizeKB)}KB exceeds ${ImageOptimizationService.TARGET_SIZE_KB}KB target`;
      } else if (imageData.width > ImageOptimizationService.DEFAULT_MAX_WIDTH || 
                 imageData.height > ImageOptimizationService.DEFAULT_MAX_HEIGHT) {
        reason = `Dimensions ${imageData.width}x${imageData.height} exceed optimal size`;
      }

      return {
        needsOptimization,
        estimatedSize: imageData.size,
        reason: needsOptimization ? reason : undefined
      };

    } catch (error) {
      console.error('❌ Failed to check optimization need:', error);
      return {
        needsOptimization: true,
        estimatedSize: 0,
        reason: 'Unable to analyze image, optimization recommended'
      };
    }
  }
}

export const imageOptimizationService = new ImageOptimizationService();