import { supabase } from '@/integrations/supabase/client';
import { UXAnalysis } from '@/types/ux-analysis';

interface PerformanceMetrics {
  analysisTime: number;
  cacheHitRate: number;
  errorRate: number;
  retryCount: number;
  memoryUsage: number;
}

interface AnalysisValidation {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

export class AnalysisPerformanceService {
  private static cache = new Map<string, { analysis: UXAnalysis; timestamp: number }>();
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private static metrics: PerformanceMetrics = {
    analysisTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    retryCount: 0,
    memoryUsage: 0
  };

  /**
   * Validate analysis data structure for completeness
   */
  static validateAnalysis(analysis: any): AnalysisValidation {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!analysis.id) missingFields.push('id');
    if (!analysis.imageId) missingFields.push('imageId');
    if (!analysis.summary) missingFields.push('summary');
    if (!analysis.visualAnnotations) missingFields.push('visualAnnotations');
    if (!analysis.suggestions) missingFields.push('suggestions');
    if (!analysis.metadata) missingFields.push('metadata');

    // Summary validation
    if (analysis.summary) {
      if (typeof analysis.summary.overallScore !== 'number') {
        missingFields.push('summary.overallScore');
      }
      if (!analysis.summary.categoryScores) {
        missingFields.push('summary.categoryScores');
      } else {
        const requiredCategories = ['usability', 'accessibility', 'visual', 'content'];
        requiredCategories.forEach(category => {
          if (typeof analysis.summary.categoryScores[category] !== 'number') {
            missingFields.push(`summary.categoryScores.${category}`);
          }
        });
      }
    }

    // Visual annotations validation
    if (Array.isArray(analysis.visualAnnotations)) {
      analysis.visualAnnotations.forEach((annotation: any, index: number) => {
        if (!annotation.id) missingFields.push(`visualAnnotations[${index}].id`);
        if (!annotation.type) missingFields.push(`visualAnnotations[${index}].type`);
        if (typeof annotation.x !== 'number') missingFields.push(`visualAnnotations[${index}].x`);
        if (typeof annotation.y !== 'number') missingFields.push(`visualAnnotations[${index}].y`);
      });
    }

    // Suggestions validation
    if (Array.isArray(analysis.suggestions)) {
      analysis.suggestions.forEach((suggestion: any, index: number) => {
        if (!suggestion.id) missingFields.push(`suggestions[${index}].id`);
        if (!suggestion.category) missingFields.push(`suggestions[${index}].category`);
        if (!suggestion.title) missingFields.push(`suggestions[${index}].title`);
      });
    }

    // Quality warnings
    if (analysis.visualAnnotations?.length === 0) {
      warnings.push('No visual annotations detected');
    }
    if (analysis.suggestions?.length === 0) {
      warnings.push('No suggestions generated');
    }
    if (analysis.summary?.overallScore === 0) {
      warnings.push('Overall score is zero');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Get analysis with caching and validation
   */
  static async getCachedAnalysis(imageId: string, userContext?: string): Promise<UXAnalysis | null> {
    const cacheKey = `${imageId}_${userContext || 'default'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.updateMetrics({ cacheHit: true });
      return cached.analysis;
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }

    this.updateMetrics({ cacheHit: false });
    return null;
  }

  /**
   * Set analysis in cache with validation
   */
  static setCachedAnalysis(imageId: string, analysis: UXAnalysis, userContext?: string): void {
    const validation = this.validateAnalysis(analysis);
    
    if (!validation.isValid) {
      console.warn('Analysis validation failed:', validation.missingFields);
      // Still cache but with warning
    }

    const cacheKey = `${imageId}_${userContext || 'default'}`;
    this.cache.set(cacheKey, {
      analysis,
      timestamp: Date.now()
    });

    this.updateCacheMetrics();
  }

  /**
   * Perform analysis with retry and error recovery
   */
  static async performAnalysisWithRetry(
    imageId: string,
    imageUrl: string,
    imageName: string,
    userContext?: string,
    maxRetries = 3
  ): Promise<{ success: boolean; analysis?: UXAnalysis; error?: string }> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Check cache first
    const cached = await this.getCachedAnalysis(imageId, userContext);
    if (cached) {
      return { success: true, analysis: cached };
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Analysis attempt ${attempt + 1}/${maxRetries} for image: ${imageName}`);

        const { data, error } = await supabase.functions.invoke('ux-analysis', {
          body: {
            type: 'ANALYZE_IMAGE',
            payload: {
              imageId,
              imageUrl,
              imageName,
              userContext: userContext || ''
            }
          }
        });

        if (error) throw error;

        if (data.success && data.data) {
          const analysis = data.data as UXAnalysis;
          
          // Validate analysis before caching
          const validation = this.validateAnalysis(analysis);
          if (!validation.isValid) {
            console.warn('Received invalid analysis:', validation);
            // Continue with analysis but log warning
          }

          // Cache the successful analysis
          this.setCachedAnalysis(imageId, analysis, userContext);

          // Update performance metrics
          const analysisTime = Date.now() - startTime;
          this.updateMetrics({ 
            analysisTime,
            success: true,
            retryCount: attempt
          });

          return { success: true, analysis };
        } else {
          throw new Error(data.error || 'Analysis failed');
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Analysis attempt ${attempt + 1} failed:`, error);

        // Exponential backoff for retries
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.updateMetrics({ 
      success: false,
      retryCount: maxRetries,
      analysisTime: Date.now() - startTime
    });

    return { 
      success: false, 
      error: lastError?.message || 'Analysis failed after all retries'
    };
  }

  /**
   * Batch analysis with progress tracking
   */
  static async performBatchAnalysis(
    images: Array<{ id: string; url: string; name: string }>,
    userContext?: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ imageId: string; success: boolean; analysis?: UXAnalysis; error?: string }>> {
    const results: Array<{ imageId: string; success: boolean; analysis?: UXAnalysis; error?: string }> = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const result = await this.performAnalysisWithRetry(
        image.id,
        image.url,
        image.name,
        userContext
      );

      results.push({
        imageId: image.id,
        ...result
      });

      onProgress?.(i + 1, images.length);
    }

    return results;
  }

  /**
   * Update performance metrics
   */
  private static updateMetrics(update: {
    analysisTime?: number;
    cacheHit?: boolean;
    success?: boolean;
    retryCount?: number;
  }): void {
    if (update.analysisTime) {
      this.metrics.analysisTime = (this.metrics.analysisTime + update.analysisTime) / 2;
    }
    
    if (update.cacheHit !== undefined) {
      const totalRequests = this.metrics.cacheHitRate * 100 + 1;
      const cacheHits = update.cacheHit ? this.metrics.cacheHitRate * (totalRequests - 1) + 1 : this.metrics.cacheHitRate * (totalRequests - 1);
      this.metrics.cacheHitRate = cacheHits / totalRequests;
    }

    if (update.success !== undefined) {
      const totalAnalyses = this.metrics.errorRate * 100 + 1;
      const errors = update.success ? this.metrics.errorRate * (totalAnalyses - 1) : this.metrics.errorRate * (totalAnalyses - 1) + 1;
      this.metrics.errorRate = errors / totalAnalyses;
    }

    if (update.retryCount !== undefined) {
      this.metrics.retryCount = (this.metrics.retryCount + update.retryCount) / 2;
    }
  }

  /**
   * Update cache memory usage metrics
   */
  private static updateCacheMetrics(): void {
    const memoryUsage = JSON.stringify(Array.from(this.cache.values())).length;
    this.metrics.memoryUsage = memoryUsage;
  }

  /**
   * Get current performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    this.updateCacheMetrics();
    return { ...this.metrics };
  }

  /**
   * Clear cache and reset metrics
   */
  static clearCache(): void {
    this.cache.clear();
    this.metrics = {
      analysisTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      retryCount: 0,
      memoryUsage: 0
    };
  }

  /**
   * Cleanup expired cache entries
   */
  static cleanupCache(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.updateCacheMetrics();
    return cleaned;
  }
}