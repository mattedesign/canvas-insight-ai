import { supabase } from '@/integrations/supabase/client';

export interface ImageMask {
  x: number;
  y: number;
  width: number;
  height: number;
  toBase64(): Promise<string>;
}

export interface UXSuggestion {
  prompt: string;
  masks: ImageMask[];
}

export class InpaintingService {
  private static readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private static cache = new Map<string, { url: string; timestamp: number }>();

  /**
   * Generates an inpainted image using the inpainting-service edge function
   */
  static async generateInpaintingSuggestion(
    imageUrl: string,
    mask: ImageMask,
    suggestion: UXSuggestion
  ): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `${imageUrl}-${mask.x}-${mask.y}-${suggestion.prompt}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.url;
      }

      // Convert mask to base64
      const maskBase64 = await mask.toBase64();

      // Use the inpainting-service edge function
      const { data, error } = await supabase.functions.invoke('inpainting-service', {
        body: {
          imageUrl,
          maskData: maskBase64,
          prompt: suggestion.prompt,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        throw new Error(`Inpainting service error: ${error.message}`);
      }

      const resultUrl = data.imageUrl;

      // Cache the result
      this.cache.set(cacheKey, { url: resultUrl, timestamp: Date.now() });

      return resultUrl;
    } catch (error) {
      console.error('Error generating inpainting suggestion:', error);
      throw error;
    }
  }

  /**
   * Generates multiple inpainting variations
   */
  static async generateInpaintingVariations(
    imageUrl: string,
    mask: ImageMask,
    basePrompt: string,
    variations: string[] = ['modern', 'minimalist', 'colorful']
  ): Promise<Array<{ variation: string; imageUrl: string }>> {
    const results = await Promise.allSettled(
      variations.map(async (variation) => {
        const suggestion: UXSuggestion = {
          prompt: `${basePrompt}, ${variation} style`,
          masks: [mask]
        };
        const resultUrl = await this.generateInpaintingSuggestion(imageUrl, mask, suggestion);
        return { variation, imageUrl: resultUrl };
      })
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{ variation: string; imageUrl: string }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Clears the inpainting cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private static base64ToBlob(base64: string): Blob {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: 'image/png' });
  }
}