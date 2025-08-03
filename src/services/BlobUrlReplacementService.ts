import { supabase } from '@/integrations/supabase/client';
import { UploadedImage } from '@/types/ux-analysis';

/**
 * PHASE 2: Blob URL Resolution Service
 * 
 * This service handles immediate storage of images to Supabase storage
 * and replaces blob URLs with Supabase storage URLs to prevent edge function failures.
 */
export class BlobUrlReplacementService {
  private static readonly STORAGE_BUCKET = 'images';
  private static urlCache = new Map<string, string>(); // Cache blob->storage URL mappings

  /**
   * Immediately upload file to Supabase storage and return storage URL
   */
  static async uploadFileToStorage(file: File, imageId: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Sanitize filename for storage
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${user.id}/${imageId}/${sanitizedName}`;

      console.log('[BlobUrlReplacementService] Uploading file to storage:', fileName);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting if exists
        });

      if (error) {
        console.error('[BlobUrlReplacementService] Upload failed:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      console.log('[BlobUrlReplacementService] Upload successful, public URL:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.error('[BlobUrlReplacementService] Failed to upload to storage:', error);
      throw error;
    }
  }

  /**
   * Process uploaded image: upload to storage immediately and replace blob URL
   */
  static async processUploadedImage(uploadedImage: UploadedImage): Promise<UploadedImage> {
    try {
      // If already has a storage URL, return as is
      if (uploadedImage.url && (uploadedImage.url.includes('supabase') || uploadedImage.url.startsWith('http'))) {
        console.log('[BlobUrlReplacementService] Image already has storage URL:', uploadedImage.url);
        return uploadedImage;
      }

      // If it's a blob URL and we have the file, upload to storage
      if (uploadedImage.url?.startsWith('blob:') && uploadedImage.file) {
        console.log('[BlobUrlReplacementService] Converting blob URL to storage URL for:', uploadedImage.name);
        
        // Check cache first
        const cachedUrl = this.urlCache.get(uploadedImage.url);
        if (cachedUrl) {
          console.log('[BlobUrlReplacementService] Using cached storage URL');
          return {
            ...uploadedImage,
            url: cachedUrl
          };
        }

        // Upload to storage
        const storageUrl = await this.uploadFileToStorage(uploadedImage.file, uploadedImage.id);
        
        // Cache the mapping
        this.urlCache.set(uploadedImage.url, storageUrl);
        
        // Clean up blob URL
        URL.revokeObjectURL(uploadedImage.url);

        return {
          ...uploadedImage,
          url: storageUrl
        };
      }

      // Return as is if no processing needed
      return uploadedImage;

    } catch (error) {
      console.error('[BlobUrlReplacementService] Failed to process image:', error);
      // Return original image if processing fails
      return uploadedImage;
    }
  }

  /**
   * Convert blob URL to base64 for edge function compatibility
   */
  static async blobUrlToBase64(blobUrl: string): Promise<string> {
    try {
      console.log('[BlobUrlReplacementService] Converting blob URL to base64');
      
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix to get just the base64 data
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[BlobUrlReplacementService] Failed to convert blob URL to base64:', error);
      throw error;
    }
  }

  /**
   * Get storage URL from image, with fallback to blob URL processing
   */
  static async getValidImageUrl(image: UploadedImage): Promise<{ url: string; base64?: string }> {
    try {
      // If already has a valid storage URL, return it
      if (image.url && (image.url.includes('supabase') || image.url.startsWith('http'))) {
        return { url: image.url };
      }

      // If it's a blob URL, try to convert to storage URL first
      if (image.url?.startsWith('blob:') && image.file) {
        try {
          const processedImage = await this.processUploadedImage(image);
          if (processedImage.url !== image.url) {
            return { url: processedImage.url };
          }
        } catch (error) {
          console.warn('[BlobUrlReplacementService] Failed to convert to storage URL, falling back to base64:', error);
        }

        // Fallback: convert blob URL to base64 for edge function compatibility
        const base64 = await this.blobUrlToBase64(image.url);
        return { url: image.url, base64 };
      }

      // Return original URL if no processing needed
      return { url: image.url || '' };

    } catch (error) {
      console.error('[BlobUrlReplacementService] Failed to get valid image URL:', error);
      return { url: image.url || '' };
    }
  }

  /**
   * Clear URL cache
   */
  static clearCache(): void {
    this.urlCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): { size: number; entries: Array<{ blobUrl: string; storageUrl: string }> } {
    return {
      size: this.urlCache.size,
      entries: Array.from(this.urlCache.entries()).map(([blobUrl, storageUrl]) => ({
        blobUrl: blobUrl.substring(0, 50) + '...',
        storageUrl
      }))
    };
  }
}