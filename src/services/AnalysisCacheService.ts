import { supabase } from '@/integrations/supabase/client';
import crypto from 'crypto-js';

interface CachedAnalysis {
  id: string;
  image_hash: string;
  results: any;
  created_at: string;
}

export class AnalysisCacheService {
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async getCachedAnalysis(imageUrl: string): Promise<any | null> {
    const imageHash = await this.hashImage(imageUrl);
    
    const { data, error } = await supabase
      .rpc('get_cached_analysis', { p_image_hash: imageHash });

    if (error || !data || data.length === 0) return null;
    
    console.log('📦 Cache hit for image:', imageHash);
    return data[0].results;
  }

  async cacheAnalysis(imageUrl: string, results: any): Promise<void> {
    const imageHash = await this.hashImage(imageUrl);
    
    const { error } = await supabase
      .rpc('upsert_cached_analysis', {
        p_image_hash: imageHash,
        p_results: results
      });

    if (error) {
      console.error('Failed to cache analysis:', error);
    } else {
      console.log('✅ Analysis cached:', imageHash);
    }
  }

  private async hashImage(imageUrl: string): Promise<string> {
    // For public URLs, use URL as hash
    if (imageUrl.startsWith('http')) {
      return crypto.SHA256(imageUrl).toString();
    }
    
    // For blob URLs, fetch and hash content
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const wordArray = crypto.lib.WordArray.create(arrayBuffer);
      return crypto.SHA256(wordArray).toString();
    } catch {
      // Fallback to URL hash
      return crypto.SHA256(imageUrl).toString();
    }
  }

  async clearExpiredCache(): Promise<number> {
    const { data, error } = await supabase
      .rpc('clear_expired_cache');

    if (error) {
      console.error('Failed to clear expired cache:', error);
      return 0;
    }

    const deletedCount = data || 0;
    console.log(`🧹 Cleared ${deletedCount} expired cache entries`);
    return deletedCount;
  }

  async clearProblematicCache(imageId: string): Promise<void> {
    try {
      // Clear all cache entries that might reference this image
      const imageHashes = [
        await this.hashImage(imageId),
        await this.hashImage(`blob:${imageId}`),
        await this.hashImage(`http://${imageId}`),
        await this.hashImage(`https://${imageId}`)
      ];

      for (const hash of imageHashes) {
        const { error } = await supabase
          .from('analysis_cache')
          .delete()
          .eq('image_hash', hash);

        if (error) {
          console.warn('Failed to clear cache for hash:', hash, error);
        } else {
          console.log('🧹 Cleared problematic cache for hash:', hash);
        }
      }
    } catch (error) {
      console.error('Error clearing problematic cache:', error);
    }
  }
}