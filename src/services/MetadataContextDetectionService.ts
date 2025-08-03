import { ImageContext, UserContext, AnalysisContext } from '@/types/contextTypes';
import { PipelineError } from '@/types/pipelineErrors';

/**
 * Optimized context detection using existing metadata
 * Falls back to AI vision only when necessary
 */
export class MetadataContextDetectionService {
  private cache = new Map<string, ImageContext>();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Detect context from existing Google Vision metadata
   */
  async detectImageContextFromMetadata(
    imageMetadata: any,
    imageUrl?: string,
    imageBase64?: string
  ): Promise<ImageContext> {
    try {
      console.log('[MetadataContext] Starting metadata-based context detection');
      
      // Try cache first
      const cacheKey = this.generateCacheKey(imageMetadata);
      if (this.cache.has(cacheKey)) {
        console.log('[MetadataContext] Using cached result');
        return this.cache.get(cacheKey)!;
      }

      // Analyze metadata first
      const metadataContext = this.analyzeVisionMetadata(imageMetadata);
      
      // If confidence is high enough, use metadata result
      if (metadataContext.confidence >= 0.7) {
        console.log('[MetadataContext] High confidence from metadata, using result');
        this.cacheResult(cacheKey, metadataContext.context);
        return metadataContext.context;
      }
      
      // Fall back to AI vision with optimized prompt
      console.log('[MetadataContext] Low confidence from metadata, falling back to AI vision');
      return await this.fallbackToAIVision(imageUrl, imageBase64, metadataContext.context);
      
    } catch (error) {
      console.error('[MetadataContext] Error in context detection:', error);
      throw new PipelineError(
        'Failed to detect context from metadata',
        'metadata-context-detection',
        { originalError: error }
      );
    }
  }

  /**
   * Analyze Google Vision metadata to infer context
   */
  private analyzeVisionMetadata(metadata: any): { context: ImageContext; confidence: number } {
    console.log('[MetadataContext] Analyzing vision metadata:', metadata);
    
    const context: ImageContext = {
      primaryType: 'unknown',
      subTypes: [],
      domain: 'general',
      complexity: 'moderate',
      userIntent: [],
      platform: 'web',
      designSystem: {
        detected: false,
        consistency: 0.5
      }
    };

    let confidence = 0.5;

    // Analyze text annotations for interface type
    if (metadata.textAnnotations) {
      const textAnalysis = this.analyzeTextAnnotations(metadata.textAnnotations);
      context.primaryType = textAnalysis.interfaceType;
      context.domain = textAnalysis.domain;
      context.userIntent = textAnalysis.userIntent;
      confidence += textAnalysis.confidence;
    }

    // Analyze object annotations for UI elements
    if (metadata.localizedObjectAnnotations) {
      const objectAnalysis = this.analyzeObjectAnnotations(metadata.localizedObjectAnnotations);
      context.subTypes = objectAnalysis.subTypes;
      context.complexity = objectAnalysis.complexity;
      confidence += objectAnalysis.confidence;
    }

    // Analyze face annotations for audience targeting
    if (metadata.faceAnnotations) {
      const faceAnalysis = this.analyzeFaceAnnotations(metadata.faceAnnotations);
      context.targetAudience = faceAnalysis.targetAudience;
      confidence += faceAnalysis.confidence;
    }

    // Analyze color properties for design system detection
    if (metadata.imagePropertiesAnnotation) {
      const colorAnalysis = this.analyzeColorProperties(metadata.imagePropertiesAnnotation);
      context.designSystem = colorAnalysis.designSystem;
      context.maturityStage = colorAnalysis.maturityStage;
      confidence += colorAnalysis.confidence;
    }

    // Determine platform from image properties
    if (metadata.crop_hints || metadata.imagePropertiesAnnotation) {
      const platformAnalysis = this.analyzePlatformIndicators(metadata);
      context.platform = platformAnalysis.platform;
      confidence += platformAnalysis.confidence;
    }

    return { context, confidence: Math.min(confidence, 1.0) };
  }

  /**
   * Analyze text annotations for interface patterns
   */
  private analyzeTextAnnotations(textAnnotations: any[]): {
    interfaceType: ImageContext['primaryType'];
    domain: string;
    userIntent: string[];
    confidence: number;
  } {
    const allText = textAnnotations.map(ann => ann.description).join(' ').toLowerCase();
    
    // Interface type detection patterns
    const interfacePatterns = {
      dashboard: /dashboard|metrics|analytics|kpi|chart|graph|widget/,
      landing: /hero|cta|sign up|get started|learn more|pricing|testimonial/,
      ecommerce: /add to cart|buy now|checkout|product|price|\$|shop|store/,
      form: /submit|form|input|required|email|password|register|login/,
      mobile: /swipe|tap|menu|hamburger|bottom nav|tab bar/,
      saas: /workspace|project|team|collaboration|subscription|upgrade/,
      content: /article|blog|read more|share|comment|author|publish/,
      portfolio: /portfolio|work|project|case study|skills|about/
    };

    let interfaceType: ImageContext['primaryType'] = 'unknown';
    let confidence = 0.1;

    for (const [type, pattern] of Object.entries(interfacePatterns)) {
      if (pattern.test(allText)) {
        interfaceType = type as ImageContext['primaryType'];
        confidence = 0.3;
        break;
      }
    }

    // Domain detection patterns
    const domainPatterns = {
      finance: /bank|financial|investment|loan|credit|payment|wallet/,
      healthcare: /health|medical|doctor|patient|appointment|prescription/,
      education: /course|learn|student|teacher|education|university/,
      retail: /shop|store|product|sale|discount|brand|fashion/,
      technology: /tech|software|api|developer|code|platform/,
      real_estate: /property|house|rent|buy|agent|listing/
    };

    let domain = 'general';
    for (const [dom, pattern] of Object.entries(domainPatterns)) {
      if (pattern.test(allText)) {
        domain = dom;
        confidence += 0.1;
        break;
      }
    }

    // User intent detection
    const intentPatterns = {
      'convert': /buy|purchase|subscribe|sign up|get started/,
      'inform': /learn|read|about|info|details|features/,
      'navigate': /menu|search|filter|sort|categories/,
      'engage': /share|comment|like|follow|contact/,
      'manage': /dashboard|settings|profile|account|manage/
    };

    const userIntent: string[] = [];
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(allText)) {
        userIntent.push(intent);
        confidence += 0.05;
      }
    }

    return { interfaceType, domain, userIntent, confidence };
  }

  /**
   * Analyze object annotations for UI complexity
   */
  private analyzeObjectAnnotations(objectAnnotations: any[]): {
    subTypes: string[];
    complexity: ImageContext['complexity'];
    confidence: number;
  } {
    const objects = objectAnnotations.map(obj => obj.name.toLowerCase());
    let complexity: ImageContext['complexity'] = 'moderate';
    let confidence = 0.1;
    const subTypes: string[] = [];

    // UI complexity indicators
    const complexityScore = objects.length;
    if (complexityScore < 5) {
      complexity = 'simple';
    } else if (complexityScore > 15) {
      complexity = 'complex';
    }

    // UI element detection
    const uiElements = {
      'navigation': ['menu', 'navbar', 'breadcrumb'],
      'form-elements': ['textbox', 'button', 'dropdown'],
      'data-display': ['table', 'chart', 'list'],
      'media': ['image', 'video', 'gallery'],
      'interactive': ['slider', 'carousel', 'modal']
    };

    for (const [category, elements] of Object.entries(uiElements)) {
      if (elements.some(element => objects.includes(element))) {
        subTypes.push(category);
        confidence += 0.05;
      }
    }

    return { subTypes, complexity, confidence };
  }

  /**
   * Analyze face annotations for audience targeting
   */
  private analyzeFaceAnnotations(faceAnnotations: any[]): {
    targetAudience: string;
    confidence: number;
  } {
    const faceCount = faceAnnotations.length;
    let targetAudience = 'general users';
    let confidence = 0.05;

    if (faceCount > 0) {
      // Analyze age and emotion indicators
      const hasMultipleFaces = faceCount > 1;
      if (hasMultipleFaces) {
        targetAudience = 'teams and professionals';
        confidence = 0.1;
      } else {
        targetAudience = 'individual users';
        confidence = 0.1;
      }
    }

    return { targetAudience, confidence };
  }

  /**
   * Analyze color properties for design system detection
   */
  private analyzeColorProperties(imageProperties: any): {
    designSystem: ImageContext['designSystem'];
    maturityStage: ImageContext['maturityStage'];
    confidence: number;
  } {
    let confidence = 0.05;
    let designSystemDetected = false;
    let consistency = 0.5;
    let maturityStage: ImageContext['maturityStage'] = 'mvp';

    if (imageProperties.dominantColors?.colors) {
      const colors = imageProperties.dominantColors.colors;
      
      // Analyze color consistency
      if (colors.length <= 5) {
        designSystemDetected = true;
        consistency = 0.8;
        maturityStage = 'mature';
        confidence = 0.15;
      } else if (colors.length <= 8) {
        designSystemDetected = true;
        consistency = 0.6;
        maturityStage = 'growth';
        confidence = 0.1;
      }
    }

    return {
      designSystem: { detected: designSystemDetected, consistency },
      maturityStage,
      confidence
    };
  }

  /**
   * Analyze platform indicators from image properties
   */
  private analyzePlatformIndicators(metadata: any): {
    platform: ImageContext['platform'];
    confidence: number;
  } {
    let platform: ImageContext['platform'] = 'web';
    let confidence = 0.05;

    // Analyze image dimensions for mobile indicators
    if (metadata.imagePropertiesAnnotation?.cropHints?.[0]) {
      const cropHint = metadata.imagePropertiesAnnotation.cropHints[0];
      const aspectRatio = cropHint.boundingPoly?.vertices ? 
        this.calculateAspectRatio(cropHint.boundingPoly.vertices) : null;
      
      if (aspectRatio && aspectRatio < 0.75) {
        platform = 'mobile';
        confidence = 0.15;
      } else if (aspectRatio && aspectRatio > 1.5) {
        platform = 'desktop';
        confidence = 0.1;
      } else {
        platform = 'responsive';
        confidence = 0.1;
      }
    }

    return { platform, confidence };
  }

  /**
   * Calculate aspect ratio from bounding vertices
   */
  private calculateAspectRatio(vertices: any[]): number {
    if (vertices.length < 4) return 1;
    
    const width = Math.abs(vertices[1].x - vertices[0].x);
    const height = Math.abs(vertices[2].y - vertices[0].y);
    
    return width / height;
  }

  /**
   * Fall back to AI vision with optimized prompt
   */
  private async fallbackToAIVision(
    imageUrl?: string,
    imageBase64?: string,
    baseContext?: ImageContext
  ): Promise<ImageContext> {
    console.log('[MetadataContext] Falling back to AI vision analysis');
    
    // Use a more focused prompt for faster processing
    const optimizedPrompt = `Based on the UI screenshot, quickly determine:
1. Interface type: ${baseContext?.primaryType || 'unknown'} (confirm or correct)
2. Industry domain: ${baseContext?.domain || 'general'} (confirm or correct)
3. Complexity: simple/moderate/complex
4. Platform: web/mobile/desktop/responsive

Return JSON with primaryType, domain, complexity, platform fields only.`;

    const { supabase } = await import('@/integrations/supabase/client');

    try {
      const { data, error } = await supabase.functions.invoke('context-detection', {
        body: {
          imageUrl,
          imageBase64,
          prompt: optimizedPrompt,
          model: 'gpt-4o',
          maxTokens: 300, // Reduced for faster response
          useMetadataMode: true // Flag for optimized processing
        }
      });

      if (error) throw error;

      return this.parseOptimizedResponse(data, baseContext);
    } catch (error) {
      console.warn('[MetadataContext] AI fallback failed, using base context');
      return baseContext || this.createDefaultContext();
    }
  }

  /**
   * Parse optimized AI response
   */
  private parseOptimizedResponse(data: any, baseContext?: ImageContext): ImageContext {
    const response = data.data || data;
    
    return {
      primaryType: response.primaryType || baseContext?.primaryType || 'app',
      subTypes: baseContext?.subTypes || [],
      domain: response.domain || baseContext?.domain || 'general',
      complexity: response.complexity || baseContext?.complexity || 'moderate',
      userIntent: baseContext?.userIntent || [],
      platform: response.platform || baseContext?.platform || 'web',
      businessModel: baseContext?.businessModel,
      targetAudience: baseContext?.targetAudience,
      maturityStage: baseContext?.maturityStage || 'mvp',
      designSystem: baseContext?.designSystem || {
        detected: false,
        consistency: 0.5
      }
    };
  }

  /**
   * Create default context when all else fails
   */
  private createDefaultContext(): ImageContext {
    return {
      primaryType: 'app',
      subTypes: [],
      domain: 'general',
      complexity: 'moderate',
      userIntent: ['general analysis'],
      platform: 'web',
      designSystem: {
        detected: false,
        consistency: 0.5
      }
    };
  }

  /**
   * Generate cache key from metadata
   */
  private generateCacheKey(metadata: any): string {
    // Create a simple hash from key metadata properties
    const keyData = {
      textCount: metadata.textAnnotations?.length || 0,
      objectCount: metadata.localizedObjectAnnotations?.length || 0,
      faceCount: metadata.faceAnnotations?.length || 0,
      colorCount: metadata.imagePropertiesAnnotation?.dominantColors?.colors?.length || 0
    };
    
    return JSON.stringify(keyData);
  }

  /**
   * Cache the result with TTL
   */
  private cacheResult(key: string, context: ImageContext): void {
    this.cache.set(key, context);
    
    // Clear cache after TTL
    setTimeout(() => {
      this.cache.delete(key);
    }, this.CACHE_TTL);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const metadataContextService = new MetadataContextDetectionService();