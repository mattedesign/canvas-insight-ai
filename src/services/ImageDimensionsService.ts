/**
 * ImageDimensionsService - Phase 1C: Image Dimensions Extraction
 * Extracts actual image dimensions (not 800x600 defaults)
 * Integrates with upload pipeline and provides backfill migration
 */

import { supabase } from "@/integrations/supabase/client";

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface DimensionExtractionResult {
  success: boolean;
  dimensions?: ImageDimensions;
  error?: string;
  metadata?: {
    fileSize: number;
    fileType: string;
    colorDepth?: number;
    hasAlpha?: boolean;
  };
}

export interface BackfillProgress {
  totalImages: number;
  processedImages: number;
  failedImages: number;
  currentImage?: string;
  isComplete: boolean;
  errors: Array<{ imageId: string; filename: string; error: string }>;
}

export class ImageDimensionsService {
  private static instance: ImageDimensionsService;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  static getInstance(): ImageDimensionsService {
    if (!ImageDimensionsService.instance) {
      ImageDimensionsService.instance = new ImageDimensionsService();
    }
    return ImageDimensionsService.instance;
  }

  /**
   * Extract dimensions from File object (for uploads)
   */
  async extractDimensionsFromFile(file: File): Promise<DimensionExtractionResult> {
    try {
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'File is not an image'
        };
      }

      const dimensions = await this.loadImageFromFile(file);
      
      return {
        success: true,
        dimensions,
        metadata: {
          fileSize: file.size,
          fileType: file.type
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract dimensions'
      };
    }
  }

  /**
   * Extract dimensions from URL (for existing images)
   */
  async extractDimensionsFromUrl(imageUrl: string): Promise<DimensionExtractionResult> {
    try {
      const dimensions = await this.loadImageFromUrl(imageUrl);
      
      return {
        success: true,
        dimensions
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract dimensions from URL'
      };
    }
  }

  /**
   * Extract dimensions from Blob (for storage downloads)
   */
  async extractDimensionsFromBlob(blob: Blob): Promise<DimensionExtractionResult> {
    try {
      if (!blob.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Blob is not an image'
        };
      }

      const dimensions = await this.loadImageFromBlob(blob);
      
      return {
        success: true,
        dimensions,
        metadata: {
          fileSize: blob.size,
          fileType: blob.type
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract dimensions from blob'
      };
    }
  }

  /**
   * Load image from File and extract dimensions
   */
  private loadImageFromFile(file: File): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        };
        resolve(dimensions);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Load image from URL and extract dimensions
   */
  private loadImageFromUrl(imageUrl: string): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        };
        resolve(dimensions);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image from URL: ${imageUrl}`));
      };
      
      // Handle CORS for cross-origin images
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
  }

  /**
   * Load image from Blob and extract dimensions
   */
  private loadImageFromBlob(blob: Blob): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        };
        URL.revokeObjectURL(img.src);
        resolve(dimensions);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image from blob'));
      };
      
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Process uploaded image and update database with real dimensions
   */
  async processUploadedImage(
    imageId: string,
    file: File,
    storagePath: string
  ): Promise<DimensionExtractionResult> {
    try {
      const result = await this.extractDimensionsFromFile(file);
      
      if (!result.success || !result.dimensions) {
        return result;
      }

      // Update image record with real dimensions
      const { error: updateError } = await supabase
        .from('images')
        .update({
          dimensions: {
            width: result.dimensions.width,
            height: result.dimensions.height,
            aspectRatio: result.dimensions.aspectRatio
          },
          file_size: result.metadata?.fileSize,
          file_type: result.metadata?.fileType
        })
        .eq('id', imageId);

      if (updateError) {
        throw updateError;
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process uploaded image'
      };
    }
  }

  /**
   * Backfill dimensions for all existing images
   */
  async backfillImageDimensions(
    onProgress?: (progress: BackfillProgress) => void
  ): Promise<BackfillProgress> {
    try {
      // Get all images with default or missing dimensions
      const { data: images, error } = await supabase
        .from('images')
        .select('id, filename, storage_path, dimensions')
        .or('dimensions.is.null,dimensions->>width.eq.800');

      if (error) throw error;

      const progress: BackfillProgress = {
        totalImages: images?.length || 0,
        processedImages: 0,
        failedImages: 0,
        isComplete: false,
        errors: []
      };

      if (!images || images.length === 0) {
        progress.isComplete = true;
        onProgress?.(progress);
        return progress;
      }

      // Process images in batches
      const batchSize = 5;
      const batches = this.chunkArray(images, batchSize);

      for (const batch of batches) {
        await Promise.all(
          batch.map(async (image) => {
            try {
              await this.updateImageDimensions(image);
              progress.processedImages++;
              progress.currentImage = image.filename;
            } catch (error) {
              progress.failedImages++;
              progress.errors.push({
                imageId: image.id,
                filename: image.filename,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          })
        );
        
        onProgress?.(progress);
        
        // Brief pause between batches to avoid overwhelming storage
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      progress.isComplete = true;
      progress.currentImage = undefined;
      
      onProgress?.(progress);
      return progress;

    } catch (error) {
      console.error('Backfill failed:', error);
      throw error;
    }
  }

  /**
   * Update dimensions for a single image
   */
  private async updateImageDimensions(image: any): Promise<void> {
    try {
      // Download image from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('images')
        .download(image.storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download image: ${downloadError?.message || 'No data'}`);
      }

      // Extract dimensions
      const result = await this.extractDimensionsFromBlob(fileData);
      
      if (!result.success || !result.dimensions) {
        throw new Error(result.error || 'Failed to extract dimensions');
      }

      // Update database
      const { error: updateError } = await supabase
        .from('images')
        .update({
          dimensions: {
            width: result.dimensions.width,
            height: result.dimensions.height,
            aspectRatio: result.dimensions.aspectRatio
          },
          file_size: result.metadata?.fileSize || image.file_size
        })
        .eq('id', image.id);

      if (updateError) {
        throw updateError;
      }

    } catch (error) {
      console.error(`Failed to update dimensions for image ${image.id}:`, error);
      throw error;
    }
  }

  /**
   * Validate dimensions data integrity
   */
  async validateDimensionsIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    statistics: {
      totalImages: number;
      imagesWithDimensions: number;
      imagesWithDefaultDimensions: number;
      imagesWithoutDimensions: number;
    };
  }> {
    try {
      const issues: string[] = [];
      
      // Get all images
      const { data: allImages, error: allError } = await supabase
        .from('images')
        .select('id, filename, dimensions');

      if (allError) throw allError;

      // Get images with dimensions
      const { data: withDimensions, error: dimError } = await supabase
        .from('images')
        .select('id')
        .not('dimensions', 'is', null);

      if (dimError) throw dimError;

      // Get images with default dimensions (800x600) - simplified query
      const { data: withDefaults, error: defaultError } = await supabase
        .from('images')
        .select('id, filename, dimensions');

      if (defaultError) throw defaultError;

      // Filter for default dimensions in JavaScript to avoid deep type recursion
      const defaultDimensionImages = withDefaults?.filter(img => {
        const dims = img.dimensions as Record<string, any>;
        return dims?.width === 800 && dims?.height === 600;
      }) || [];

      // Get images without dimensions
      const { data: withoutDimensions, error: noDimError } = await supabase
        .from('images')
        .select('id, filename')
        .is('dimensions', null);

      if (noDimError) throw noDimError;

      // Check for issues
      if (defaultDimensionImages && defaultDimensionImages.length > 0) {
        issues.push(`${defaultDimensionImages.length} images still have default dimensions (800x600)`);
      }

      if (withoutDimensions && withoutDimensions.length > 0) {
        issues.push(`${withoutDimensions.length} images have no dimensions data`);
      }

      // Validate dimension data structure
      for (const image of allImages || []) {
        if (image.dimensions) {
          const dims = image.dimensions as Record<string, any>;
          if (!dims.width || !dims.height || !dims.aspectRatio) {
            issues.push(`Image ${image.filename} has incomplete dimension data`);
          }
          if (typeof dims.width === 'number' && typeof dims.height === 'number') {
            if (dims.width <= 0 || dims.height <= 0) {
              issues.push(`Image ${image.filename} has invalid dimensions`);
            }
          }
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        statistics: {
          totalImages: allImages?.length || 0,
          imagesWithDimensions: withDimensions?.length || 0,
          imagesWithDefaultDimensions: defaultDimensionImages?.length || 0,
          imagesWithoutDimensions: withoutDimensions?.length || 0
        }
      };

    } catch (error) {
      console.error('Failed to validate dimensions integrity:', error);
      throw error;
    }
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get supported image formats
   */
  getSupportedFormats(): string[] {
    return [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/svg+xml'
    ];
  }

  /**
   * Check if file format is supported
   */
  isSupportedFormat(fileType: string): boolean {
    return this.getSupportedFormats().includes(fileType.toLowerCase());
  }
}

export const imageDimensionsService = ImageDimensionsService.getInstance();