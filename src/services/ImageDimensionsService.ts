/**
 * Image Dimensions Extraction Service
 * Extracts actual dimensions from image files and integrates with upload pipeline
 * Replaces hardcoded 800x600 defaults with real measurements
 */

import { supabase } from "@/integrations/supabase/client";

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

interface DimensionExtractionResult {
  dimensions: ImageDimensions | null;
  fileSize: number;
  mimeType: string;
  error?: string;
}

export class ImageDimensionsService {
  private static instance: ImageDimensionsService;

  static getInstance(): ImageDimensionsService {
    if (!ImageDimensionsService.instance) {
      ImageDimensionsService.instance = new ImageDimensionsService();
    }
    return ImageDimensionsService.instance;
  }

  /**
   * Extract dimensions from an image file
   */
  async extractDimensionsFromFile(file: File): Promise<DimensionExtractionResult> {
    try {
      const dimensions = await this.loadImageDimensions(file);
      
      return {
        dimensions,
        fileSize: file.size,
        mimeType: file.type,
      };
    } catch (error) {
      return {
        dimensions: null,
        fileSize: file.size,
        mimeType: file.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract dimensions from an image URL
   */
  async extractDimensionsFromUrl(imageUrl: string): Promise<DimensionExtractionResult> {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const dimensions: ImageDimensions = {
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: img.naturalWidth / img.naturalHeight
          };

          resolve({
            dimensions,
            fileSize: 0, // Unknown from URL
            mimeType: this.inferMimeTypeFromUrl(imageUrl)
          });
        };

        img.onerror = () => {
          resolve({
            dimensions: null,
            fileSize: 0,
            mimeType: this.inferMimeTypeFromUrl(imageUrl),
            error: 'Failed to load image from URL'
          });
        };

        img.src = imageUrl;
      });
    } catch (error) {
      return {
        dimensions: null,
        fileSize: 0,
        mimeType: this.inferMimeTypeFromUrl(imageUrl),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load image dimensions using FileReader and Image object
   */
  private loadImageDimensions(file: File): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          const dimensions: ImageDimensions = {
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: img.naturalWidth / img.naturalHeight
          };

          // Validate dimensions
          if (dimensions.width <= 0 || dimensions.height <= 0) {
            reject(new Error('Invalid image dimensions'));
            return;
          }

          resolve(dimensions);
        };

        img.onerror = () => {
          reject(new Error('Failed to load image data'));
        };

        if (event.target?.result) {
          img.src = event.target.result as string;
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Infer MIME type from URL extension
   */
  private inferMimeTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      case 'bmp':
        return 'image/bmp';
      default:
        return 'image/unknown';
    }
  }

  /**
   * Create standardized dimensions object for database storage
   */
  createDimensionsObject(
    width: number, 
    height: number, 
    metadata?: any
  ): any {
    return {
      width,
      height,
      aspectRatio: width / height,
      ...metadata,
      extractedAt: new Date().toISOString(),
      extractionMethod: 'client-side'
    };
  }

  /**
   * Extract and validate dimensions with fallback
   */
  async extractWithFallback(
    file: File, 
    fallbackDimensions?: ImageDimensions
  ): Promise<ImageDimensions> {
    try {
      const result = await this.extractDimensionsFromFile(file);
      
      if (result.dimensions) {
        return result.dimensions;
      }
      
      // Use fallback if provided
      if (fallbackDimensions) {
        console.warn('[Image Dimensions] Using fallback dimensions:', fallbackDimensions);
        return fallbackDimensions;
      }

      // Last resort: reasonable defaults based on file size
      return this.estimateDimensionsFromFileSize(file.size);
      
    } catch (error) {
      console.warn('[Image Dimensions] Extraction failed:', error);
      
      if (fallbackDimensions) {
        return fallbackDimensions;
      }
      
      return this.estimateDimensionsFromFileSize(file.size);
    }
  }

  /**
   * Estimate reasonable dimensions based on file size
   */
  private estimateDimensionsFromFileSize(fileSize: number): ImageDimensions {
    // Very rough estimation based on typical image compression
    let estimatedPixels: number;
    
    if (fileSize < 100000) { // < 100KB
      estimatedPixels = 400 * 300; // Small image
    } else if (fileSize < 500000) { // < 500KB
      estimatedPixels = 800 * 600; // Medium image
    } else if (fileSize < 2000000) { // < 2MB
      estimatedPixels = 1200 * 900; // Large image
    } else {
      estimatedPixels = 1920 * 1080; // Very large image
    }

    // Assume 16:9 aspect ratio for estimation
    const aspectRatio = 16 / 9;
    const width = Math.round(Math.sqrt(estimatedPixels * aspectRatio));
    const height = Math.round(width / aspectRatio);

    return {
      width,
      height,
      aspectRatio
    };
  }

  /**
   * Backfill dimensions for existing images
   */
  async backfillExistingImages(options: {
    batchSize?: number;
    onProgress?: (current: number, total: number) => void;
    onError?: (imageId: string, error: string) => void;
  } = {}): Promise<{
    processed: number;
    updated: number;
    failed: number;
    skipped: number;
  }> {
    const { batchSize = 20, onProgress, onError } = options;
    
    const result = {
      processed: 0,
      updated: 0,
      failed: 0,
      skipped: 0
    };

    try {
      // Get all images that need dimension extraction
      const { data: images, error: fetchError } = await supabase
        .from('images')
        .select('id, storage_path, dimensions, original_name')
        .or('dimensions.is.null,dimensions.eq.{}');

      if (fetchError) {
        console.error('[Image Dimensions] Failed to fetch images:', fetchError);
        return result;
      }

      if (!images || images.length === 0) {
        console.log('[Image Dimensions] No images need dimension extraction');
        return result;
      }

      console.log(`[Image Dimensions] Found ${images.length} images to process`);

      // Process in batches
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        for (const image of batch) {
          result.processed++;
          
          try {
            await this.backfillSingleImage(image);
            result.updated++;
          } catch (error) {
            result.failed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (onError) {
              onError(image.id, errorMessage);
            }
            
            console.warn(`[Image Dimensions] Failed to process ${image.id}:`, errorMessage);
          }
        }

        // Report progress
        if (onProgress) {
          onProgress(Math.min(i + batchSize, images.length), images.length);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('[Image Dimensions] Backfill completed:', result);
      return result;

    } catch (error) {
      console.error('[Image Dimensions] Backfill failed:', error);
      return result;
    }
  }

  /**
   * Backfill dimensions for a single image
   */
  private async backfillSingleImage(image: any): Promise<void> {
    try {
      // Check if image already has valid dimensions
      if (image.dimensions && 
          typeof image.dimensions === 'object' && 
          image.dimensions.width > 0 && 
          image.dimensions.height > 0) {
        return; // Skip - already has dimensions
      }

      // Get image URL for dimension extraction
      const { data: urlData } = await supabase.storage
        .from('images')
        .createSignedUrl(image.storage_path, 60); // 1 minute expiry

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get signed URL for image');
      }

      // Extract dimensions from URL
      const result = await this.extractDimensionsFromUrl(urlData.signedUrl);
      
      if (!result.dimensions) {
        throw new Error(result.error || 'Failed to extract dimensions');
      }

      // Create dimensions object
      const dimensionsObject = this.createDimensionsObject(
        result.dimensions.width,
        result.dimensions.height,
        {
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          backfilled: true
        }
      );

      // Update database
      const { error: updateError } = await supabase
        .from('images')
        .update({ dimensions: dimensionsObject })
        .eq('id', image.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(`[Image Dimensions] Updated ${image.id}: ${result.dimensions.width}x${result.dimensions.height}`);

    } catch (error) {
      throw new Error(`Backfill failed for ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get dimensions statistics
   */
  async getDimensionsStatistics(): Promise<{
    total: number;
    withDimensions: number;
    withoutDimensions: number;
    averageWidth: number;
    averageHeight: number;
    aspectRatios: { [key: string]: number };
  }> {
    try {
      const { data: images, error } = await supabase
        .from('images')
        .select('dimensions');

      if (error || !images) {
        throw new Error(error?.message || 'Failed to fetch images');
      }

      const stats = {
        total: images.length,
        withDimensions: 0,
        withoutDimensions: 0,
        averageWidth: 0,
        averageHeight: 0,
        aspectRatios: {} as { [key: string]: number }
      };

      let totalWidth = 0;
      let totalHeight = 0;

      for (const image of images) {
        if (image.dimensions && 
            typeof image.dimensions === 'object' && 
            !Array.isArray(image.dimensions) &&
            typeof (image.dimensions as any).width === 'number' &&
            typeof (image.dimensions as any).height === 'number' &&
            (image.dimensions as any).width > 0 && 
            (image.dimensions as any).height > 0) {
          stats.withDimensions++;
          totalWidth += (image.dimensions as any).width;
          totalHeight += (image.dimensions as any).height;

          // Track aspect ratios
          const aspectRatio = Math.round((image.dimensions as any).aspectRatio * 100) / 100;
          const aspectKey = `${aspectRatio}:1`;
          stats.aspectRatios[aspectKey] = (stats.aspectRatios[aspectKey] || 0) + 1;
        } else {
          stats.withoutDimensions++;
        }
      }

      if (stats.withDimensions > 0) {
        stats.averageWidth = Math.round(totalWidth / stats.withDimensions);
        stats.averageHeight = Math.round(totalHeight / stats.withDimensions);
      }

      return stats;

    } catch (error) {
      console.error('[Image Dimensions] Failed to get statistics:', error);
      return {
        total: 0,
        withDimensions: 0,
        withoutDimensions: 0,
        averageWidth: 0,
        averageHeight: 0,
        aspectRatios: {}
      };
    }
  }
}

export const imageDimensionsService = ImageDimensionsService.getInstance();