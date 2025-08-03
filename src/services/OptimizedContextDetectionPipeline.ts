import { ImageContext, UserContext, AnalysisContext } from '@/types/contextTypes';
import { ContextDetectionService } from './ContextDetectionService';
import { MetadataContextDetectionService } from './MetadataContextDetectionService';
import { PipelineError } from '@/types/pipelineErrors';

/**
 * Optimized context detection pipeline that prioritizes speed and accuracy
 */
export class OptimizedContextDetectionPipeline {
  private contextService = new ContextDetectionService();
  private metadataService = new MetadataContextDetectionService();
  private performanceMetrics = {
    metadataHits: 0,
    visionFallbacks: 0,
    totalRequests: 0,
    averageTime: 0
  };

  /**
   * Main context detection method - optimized for speed
   */
  async detectContext(
    imageData: {
      url?: string;
      base64?: string;
      metadata?: any; // Google Vision metadata if available
    },
    userInput?: string
  ): Promise<AnalysisContext> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;

    try {
      console.log('[OptimizedPipeline] Starting optimized context detection');

      // Phase 1: Quick metadata-based detection if available
      let imageContext: ImageContext;
      
      if (imageData.metadata && this.hasUsefulMetadata(imageData.metadata)) {
        console.log('[OptimizedPipeline] Using metadata-based detection');
        imageContext = await this.metadataService.detectImageContextFromMetadata(
          imageData.metadata,
          imageData.url,
          imageData.base64
        );
        this.performanceMetrics.metadataHits++;
      } else {
        console.log('[OptimizedPipeline] Falling back to vision-based detection');
        imageContext = await this.contextService.detectImageContext(
          imageData.url || '',
          imageData.base64
        );
        this.performanceMetrics.visionFallbacks++;
      }

      // Phase 2: Process user context (fast)
      const userContext = userInput ? 
        this.contextService.inferUserContext(userInput) : 
        this.createDefaultUserContext();

      // Phase 3: Create unified analysis context
      const analysisContext = this.contextService.createAnalysisContext(
        imageContext,
        userContext
      );

      // Update performance metrics
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);

      console.log(`[OptimizedPipeline] Context detection completed in ${duration}ms`);
      return analysisContext;

    } catch (error) {
      console.error('[OptimizedPipeline] Context detection failed:', error);
      
      // Create minimal fallback context to avoid pipeline failure
      const fallbackContext = this.createFallbackAnalysisContext(userInput);
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);
      
      return fallbackContext;
    }
  }

  /**
   * Batch context detection for multiple images
   */
  async detectContextBatch(
    images: Array<{
      url?: string;
      base64?: string;
      metadata?: any;
    }>,
    userInput?: string
  ): Promise<AnalysisContext[]> {
    console.log(`[OptimizedPipeline] Processing batch of ${images.length} images`);
    
    // Process in parallel for speed
    const promises = images.map(imageData => 
      this.detectContext(imageData, userInput)
    );
    
    return Promise.all(promises);
  }

  /**
   * Check if metadata contains useful information for context detection
   */
  private hasUsefulMetadata(metadata: any): boolean {
    return !!(
      metadata?.textAnnotations?.length > 0 ||
      metadata?.localizedObjectAnnotations?.length > 0 ||
      metadata?.imagePropertiesAnnotation?.dominantColors
    );
  }

  /**
   * Create default user context when none provided
   */
  private createDefaultUserContext(): UserContext {
    return {
      technicalLevel: 'some-technical',
      expertise: 'intermediate',
      outputPreferences: {
        detailLevel: 'detailed',
        jargonLevel: 'minimal',
        prioritization: 'impact'
      }
    };
  }

  /**
   * Create fallback analysis context when detection fails
   */
  private createFallbackAnalysisContext(userInput?: string): AnalysisContext {
    const imageContext: ImageContext = {
      primaryType: 'app',
      subTypes: ['fallback'],
      domain: 'general',
      complexity: 'moderate',
      userIntent: ['general analysis'],
      platform: 'web',
      designSystem: {
        detected: false,
        consistency: 0.5
      }
    };

    const userContext = userInput ? 
      this.contextService.inferUserContext(userInput) : 
      this.createDefaultUserContext();

    return {
      image: imageContext,
      user: userContext,
      focusAreas: ['usability', 'design'],
      analysisDepth: 'standard',
      outputStyle: 'balanced',
      industryStandards: ['WCAG-AA'],
      confidence: 0.3, // Low confidence for fallback
      detectedAt: new Date().toISOString(),
      clarificationNeeded: true,
      clarificationQuestions: [
        'What type of interface is this?',
        'What would you like me to focus on in the analysis?'
      ]
    };
  }

  /**
   * Update performance tracking
   */
  private updatePerformanceMetrics(duration: number): void {
    const { totalRequests, averageTime } = this.performanceMetrics;
    this.performanceMetrics.averageTime = 
      (averageTime * (totalRequests - 1) + duration) / totalRequests;
  }

  /**
   * Get performance statistics
   */
  getPerformanceMetrics() {
    const { metadataHits, visionFallbacks, totalRequests, averageTime } = this.performanceMetrics;
    
    return {
      totalRequests,
      averageTime: Math.round(averageTime),
      metadataHitRate: totalRequests > 0 ? (metadataHits / totalRequests * 100).toFixed(1) : '0',
      visionFallbackRate: totalRequests > 0 ? (visionFallbacks / totalRequests * 100).toFixed(1) : '0',
      metadataHits,
      visionFallbacks
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.performanceMetrics = {
      metadataHits: 0,
      visionFallbacks: 0,
      totalRequests: 0,
      averageTime: 0
    };
  }

  /**
   * Clear caches in both services
   */
  clearCaches(): void {
    this.metadataService.clearCache();
    console.log('[OptimizedPipeline] Caches cleared');
  }

  /**
   * Smart context detection with confidence-based routing
   */
  async detectContextWithConfidenceRouting(
    imageData: {
      url?: string;
      base64?: string;
      metadata?: any;
    },
    userInput?: string,
    minConfidence: number = 0.7
  ): Promise<AnalysisContext> {
    console.log('[OptimizedPipeline] Using confidence-based routing');
    
    // Always try metadata first if available
    if (imageData.metadata && this.hasUsefulMetadata(imageData.metadata)) {
      try {
        const metadataContext = await this.metadataService.detectImageContextFromMetadata(
          imageData.metadata,
          imageData.url,
          imageData.base64
        );
        
        const userContext = userInput ? 
          this.contextService.inferUserContext(userInput) : 
          this.createDefaultUserContext();
          
        const analysisContext = this.contextService.createAnalysisContext(
          metadataContext,
          userContext
        );
        
        // If confidence is sufficient, use metadata result
        if (analysisContext.confidence >= minConfidence) {
          console.log(`[OptimizedPipeline] High confidence (${analysisContext.confidence}) from metadata`);
          this.performanceMetrics.metadataHits++;
          return analysisContext;
        }
        
        console.log(`[OptimizedPipeline] Low confidence (${analysisContext.confidence}) from metadata, using vision fallback`);
      } catch (error) {
        console.warn('[OptimizedPipeline] Metadata detection failed, falling back to vision');
      }
    }
    
    // Fall back to full vision analysis
    return this.detectContext(imageData, userInput);
  }
}

export const optimizedContextPipeline = new OptimizedContextDetectionPipeline();