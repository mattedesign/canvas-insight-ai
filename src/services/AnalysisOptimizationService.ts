import { supabase } from '@/integrations/supabase/client';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class AnalysisCache {
  private static cache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_CACHE_SIZE = 100;

  /**
   * Generate cache key based on image URL and analysis type
   */
  private static generateCacheKey(imageUrl: string, analysisType: 'image' | 'group' | 'concept', context?: string): string {
    const contextHash = context ? btoa(context).slice(0, 8) : '';
    return `${analysisType}-${btoa(imageUrl).slice(0, 16)}-${contextHash}`;
  }

  /**
   * Check if cache entry is valid
   */
  private static isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Clean expired entries and enforce size limit
   */
  private static cleanCache(): void {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }

    // Enforce size limit (LRU-style cleanup)
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const entriesToRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cached analysis result
   */
  static get(imageUrl: string, analysisType: 'image' | 'group' | 'concept', context?: string): any | null {
    const key = this.generateCacheKey(imageUrl, analysisType, context);
    const entry = this.cache.get(key);
    
    if (entry && this.isValidEntry(entry)) {
      console.log('Cache hit for:', key);
      return entry.data;
    }

    if (entry) {
      // Remove expired entry
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Store analysis result in cache
   */
  static set(imageUrl: string, analysisType: 'image' | 'group' | 'concept', data: any, context?: string, customTtl?: number): void {
    const key = this.generateCacheKey(imageUrl, analysisType, context);
    const ttl = customTtl || this.DEFAULT_TTL;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    console.log('Cached analysis result for:', key);
    this.cleanCache();
  }

  /**
   * Clear all cache or specific type
   */
  static clear(analysisType?: 'image' | 'group' | 'concept'): void {
    if (analysisType) {
      for (const [key] of this.cache.entries()) {
        if (key.startsWith(analysisType)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    console.log('Cache cleared for:', analysisType || 'all');
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export class ProgressiveAnalysisLoader {
  private static activeRequests = new Map<string, AbortController>();

  /**
   * Load analysis with progress tracking and caching
   */
  static async loadAnalysis(
    imageUrl: string,
    analysisType: 'image' | 'group' | 'concept',
    payload: any,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<any> {
    const requestId = `${analysisType}-${Date.now()}`;
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);

    try {
      // Check cache first
      onProgress?.('Checking cache...', 10);
      const cached = AnalysisCache.get(imageUrl, analysisType, payload.userContext || payload.prompt);
      if (cached) {
        onProgress?.('Loading from cache...', 100);
        return cached;
      }

      // Progressive loading stages
      onProgress?.('Initializing analysis...', 20);
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for UX

      onProgress?.('Preparing request...', 30);
      const requestPayload = {
        type: analysisType.toUpperCase() + (analysisType === 'image' ? '' : analysisType === 'group' ? '_GROUP' : '_CONCEPT') as any,
        payload
      };

      onProgress?.('Sending to AI...', 40);
      
      const response = await fetch('/functions/v1/ux-analysis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getSupabaseToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal
      });

      onProgress?.('Processing AI response...', 70);

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      onProgress?.('Caching results...', 90);
      
      // Cache the result
      if (result.success) {
        AnalysisCache.set(imageUrl, analysisType, result.data, payload.userContext || payload.prompt);
      }

      onProgress?.('Complete!', 100);
      return result.data;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Analysis request was cancelled');
        throw new Error('Analysis was cancelled');
      }
      console.error('Progressive analysis error:', error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Cancel active analysis request
   */
  static cancelAnalysis(requestId?: string): void {
    if (requestId && this.activeRequests.has(requestId)) {
      this.activeRequests.get(requestId)?.abort();
      this.activeRequests.delete(requestId);
    } else {
      // Cancel all active requests
      for (const [id, controller] of this.activeRequests.entries()) {
        controller.abort();
        this.activeRequests.delete(id);
      }
    }
  }

  /**
   * Get Supabase authentication token
   */
  private static async getSupabaseToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }
}

export class PerformanceOptimizer {
  private static metrics = {
    analysisRequestCount: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    cachedRequests: 0
  };

  /**
   * Track analysis performance metrics
   */
  static trackAnalysis(duration: number, cacheHit: boolean): void {
    this.metrics.totalRequests++;
    this.metrics.analysisRequestCount++;
    
    if (cacheHit) {
      this.metrics.cachedRequests++;
    }

    // Update average response time (for non-cached requests)
    if (!cacheHit) {
      const currentAvg = this.metrics.averageResponseTime;
      const newCount = this.metrics.totalRequests - this.metrics.cachedRequests;
      this.metrics.averageResponseTime = ((currentAvg * (newCount - 1)) + duration) / newCount;
    }

    this.metrics.cacheHitRate = (this.metrics.cachedRequests / this.metrics.totalRequests) * 100;
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): typeof PerformanceOptimizer.metrics {
    return { ...this.metrics };
  }

  /**
   * Optimize image loading for analysis
   */
  static optimizeImageForAnalysis(imageUrl: string): string {
    // Add optimization parameters for faster loading
    const url = new URL(imageUrl);
    
    // For Supabase storage URLs, add transformation parameters
    if (url.hostname.includes('supabase')) {
      url.searchParams.set('width', '1024'); // Limit width for analysis
      url.searchParams.set('quality', '85'); // Reduce quality slightly for speed
    }
    
    return url.toString();
  }

  /**
   * Debounce analysis requests to prevent spam
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Batch multiple analysis requests
   */
  static async batchAnalysis(requests: Array<() => Promise<any>>): Promise<any[]> {
    const BATCH_SIZE = 3; // Process 3 at a time to avoid overwhelming the API
    const results: any[] = [];
    
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(batch.map(req => req()));
      
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : null
      ));
      
      // Small delay between batches
      if (i + BATCH_SIZE < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
}