/**
 * Simplified Image Service - Streamlined image handling for analysis
 * Focuses on reliable URL processing and minimal blob conversion
 */

import { supabase } from '@/integrations/supabase/client';
import type { UploadedImage } from '@/context/AppStateTypes';

export interface ProcessedImage {
  url: string;
  id: string;
  name: string;
  isReady: boolean;
  error?: string;
}

class SimplifiedImageService {
  private readonly imageCache = new Map<string, ProcessedImage>();
  
  /**
   * Process an uploaded image for analysis
   * Handles blob URLs, storage URLs, and regular URLs
   */
  async processImageForAnalysis(image: UploadedImage): Promise<ProcessedImage> {
    const cacheKey = `${image.id}-${image.url}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      const cached = this.imageCache.get(cacheKey)!;
      console.log('📁 Using cached processed image:', cached.id);
      return cached;
    }

    try {
      console.log('🔄 Processing image for analysis:', {
        id: image.id,
        name: image.name,
        urlType: this.getUrlType(image.url),
        hasFile: !!image.file
      });

      let processedUrl = image.url;
      let isReady = true;
      let error: string | undefined;

      // Handle different URL types
      if (this.isBlobUrl(image.url)) {
        console.log('🔵 Processing blob URL...');
        
        // Try to upload to storage if we have the file
        if (image.file) {
          try {
            processedUrl = await this.uploadToStorage(image.file, image.id);
            console.log('✅ Uploaded blob to storage:', processedUrl);
          } catch (uploadError) {
            console.warn('⚠️ Storage upload failed, keeping blob URL:', uploadError);
            // Keep original blob URL as fallback
            processedUrl = image.url;
          }
        }
      } else if (this.isStorageUrl(image.url)) {
        console.log('🗄️ Storage URL detected, using as-is');
        processedUrl = image.url;
      } else if (this.isHttpUrl(image.url)) {
        console.log('🌐 HTTP URL detected, using as-is');
        processedUrl = image.url;
      } else {
        console.warn('❓ Unknown URL type, attempting to use as-is');
        processedUrl = image.url;
      }

      const result: ProcessedImage = {
        url: processedUrl,
        id: image.id,
        name: image.name,
        isReady,
        error
      };

      // Cache the result
      this.imageCache.set(cacheKey, result);
      
      console.log('✅ Image processed successfully:', {
        id: result.id,
        finalUrlType: this.getUrlType(result.url),
        isReady: result.isReady
      });

      return result;
    } catch (error) {
      console.error('❌ Image processing failed:', error);
      
      const errorResult: ProcessedImage = {
        url: image.url, // Fallback to original URL
        id: image.id,
        name: image.name,
        isReady: false,
        error: error instanceof Error ? error.message : 'Image processing failed'
      };
      
      return errorResult;
    }
  }

  /**
   * Upload file to Supabase storage
   */
  private async uploadToStorage(file: File, imageId: string): Promise<string> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'png';
    const filename = `${imageId}_${timestamp}.${extension}`;
    const filePath = `${user.id}/${imageId}/${filename}`;

    console.log('📤 Uploading to storage:', { filePath, size: file.size });

    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return urlData.publicUrl;
  }

  /**
   * Batch process multiple images
   */
  async processMultipleImages(images: UploadedImage[]): Promise<ProcessedImage[]> {
    console.log('🔄 Processing multiple images:', images.length);
    
    const results = await Promise.allSettled(
      images.map(image => this.processImageForAnalysis(image))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`❌ Failed to process image ${index}:`, result.reason);
        return {
          url: images[index].url,
          id: images[index].id,
          name: images[index].name,
          isReady: false,
          error: result.reason instanceof Error ? result.reason.message : 'Processing failed'
        };
      }
    });
  }

  /**
   * Validate if image URL is accessible
   */
  async validateImageUrl(url: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Skip validation for blob URLs since they're always accessible from the current session
      if (this.isBlobUrl(url)) {
        return { valid: true };
      }

      // For other URLs, try a HEAD request
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        return { 
          valid: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      // Check if it's an image
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.startsWith('image/')) {
        return { 
          valid: false, 
          error: `Not an image file: ${contentType}` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  /**
   * URL type detection helpers
   */
  private isBlobUrl(url: string): boolean {
    return url.startsWith('blob:');
  }

  private isStorageUrl(url: string): boolean {
    return url.includes('supabase.co/storage/v1/object/public/');
  }

  private isHttpUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  private getUrlType(url: string): string {
    if (this.isBlobUrl(url)) return 'blob';
    if (this.isStorageUrl(url)) return 'storage';
    if (this.isHttpUrl(url)) return 'http';
    return 'unknown';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.imageCache.clear();
    console.log('🗑️ Simplified image service cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.imageCache.size,
      keys: Array.from(this.imageCache.keys())
    };
  }
}

export const simplifiedImageService = new SimplifiedImageService();
