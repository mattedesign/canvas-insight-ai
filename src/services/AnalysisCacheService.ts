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
      .from('analysis_cache')
      .select('*')
      .eq('image_hash', imageHash)
      .gte('created_at', new Date(Date.now() - this.CACHE_DURATION).toISOString())
      .single();

    if (error || !data) return null;
    
    console.log('📦 Cache hit for image:', imageHash);
    return data.results;
  }

  async cacheAnalysis(imageUrl: string, results: any): Promise<void> {
    const imageHash = await this.hashImage(imageUrl);
    
    const { error } = await supabase
      .from('analysis_cache')
      .upsert({
        image_hash: imageHash,
        results,
        created_at: new Date().toISOString()
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

  async clearExpiredCache(): Promise<void> {
    const { error } = await supabase
      .from('analysis_cache')
      .delete()
      .lt('created_at', new Date(Date.now() - this.CACHE_DURATION).toISOString());

    if (error) {
      console.error('Failed to clear expired cache:', error);
    }
  }
}