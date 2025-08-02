/**
 * ✅ PHASE 3.2: DATA TRANSFORMATION PIPELINE
 * Central service for standardized data transformations with validation and caching
 */

import { TransformationCache } from './TransformationCache';
import { validateTransformationInput, validateTransformationOutput } from '@/utils/dataValidation';

interface TransformationContext {
  userId?: string;
  projectId?: string;
  source: string;
  timestamp: number;
  cacheKey?: string;
}

interface TransformationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached: boolean;
  duration: number;
  validationPassed: boolean;
}

interface TransformationMetrics {
  transformationType: string;
  duration: number;
  cacheHit: boolean;
  validationTime: number;
  inputSize: number;
  outputSize: number;
}

export class DataTransformationPipeline {
  private static cache = new TransformationCache();
  private static metrics: TransformationMetrics[] = [];
  private static readonly MAX_METRICS = 1000;

  /**
   * ✅ PHASE 3.2: Core transformation method with validation and caching
   */
  static async transform<TInput, TOutput>(
    type: string,
    input: TInput,
    transformer: (input: TInput) => Promise<TOutput> | TOutput,
    context: TransformationContext,
    options: {
      enableCaching?: boolean;
      validateInput?: boolean;
      validateOutput?: boolean;
      cacheTimeout?: number;
    } = {}
  ): Promise<TransformationResult<TOutput>> {
    const startTime = Date.now();
    const {
      enableCaching = true,
      validateInput = true,
      validateOutput = true,
      cacheTimeout = 300000 // 5 minutes default
    } = options;

    try {
      // Step 1: Input validation
      let validationPassed = true;
      const validationStartTime = Date.now();
      
      if (validateInput) {
        const inputValidation = validateTransformationInput(type, input);
        if (!inputValidation.valid) {
          console.warn(`[DataTransformationPipeline] Input validation failed for ${type}:`, inputValidation.errors);
          validationPassed = false;
          return {
            success: false,
            error: `Input validation failed: ${inputValidation.errors.join(', ')}`,
            cached: false,
            duration: Date.now() - startTime,
            validationPassed: false
          };
        }
      }

      const validationTime = Date.now() - validationStartTime;

      // Step 2: Check cache if enabled
      const cacheKey = context.cacheKey || this.generateCacheKey(type, input, context);
      let cached = false;
      
      if (enableCaching) {
        const cachedResult = await this.cache.get<TOutput>(cacheKey);
        if (cachedResult) {
          console.log(`[DataTransformationPipeline] Cache hit for ${type}`);
          this.recordMetrics({
            transformationType: type,
            duration: Date.now() - startTime,
            cacheHit: true,
            validationTime,
            inputSize: this.estimateSize(input),
            outputSize: this.estimateSize(cachedResult)
          });
          
          return {
            success: true,
            data: cachedResult,
            cached: true,
            duration: Date.now() - startTime,
            validationPassed: true
          };
        }
      }

      // Step 3: Execute transformation
      console.log(`[DataTransformationPipeline] Executing transformation: ${type}`);
      const transformationStart = Date.now();
      const result = await transformer(input);
      const transformationDuration = Date.now() - transformationStart;

      // Step 4: Output validation
      if (validateOutput) {
        const outputValidation = validateTransformationOutput(type, result);
        if (!outputValidation.valid) {
          console.warn(`[DataTransformationPipeline] Output validation failed for ${type}:`, outputValidation.errors);
          return {
            success: false,
            error: `Output validation failed: ${outputValidation.errors.join(', ')}`,
            cached: false,
            duration: Date.now() - startTime,
            validationPassed: false
          };
        }
      }

      // Step 5: Cache result if enabled
      if (enableCaching && result) {
        await this.cache.set(cacheKey, result, cacheTimeout);
      }

      // Step 6: Record metrics
      this.recordMetrics({
        transformationType: type,
        duration: Date.now() - startTime,
        cacheHit: false,
        validationTime,
        inputSize: this.estimateSize(input),
        outputSize: this.estimateSize(result)
      });

      console.log(`[DataTransformationPipeline] Transformation ${type} completed in ${transformationDuration}ms`);
      
      return {
        success: true,
        data: result,
        cached: false,
        duration: Date.now() - startTime,
        validationPassed: true
      };

    } catch (error) {
      console.error(`[DataTransformationPipeline] Transformation ${type} failed:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error',
        cached: false,
        duration: Date.now() - startTime,
        validationPassed: false
      };
    }
  }

  /**
   * ✅ PHASE 3.2: Image data transformation
   */
  static async transformImageData(
    imageData: any,
    context: TransformationContext
  ): Promise<TransformationResult<any>> {
    return this.transform(
      'image_data',
      imageData,
      async (input) => {
        // Standardize image data structure
        return {
          id: input.id,
          filename: input.filename || input.name,
          url: input.storage_path || input.url,
          metadata: {
            ...input.metadata,
            dimensions: input.dimensions,
            fileSize: input.file_size,
            fileType: input.file_type,
            uploadedAt: input.uploaded_at || input.created_at
          },
          projectId: input.project_id,
          originalData: input
        };
      },
      context,
      { enableCaching: true, cacheTimeout: 600000 } // 10 minutes for image data
    );
  }

  /**
   * ✅ PHASE 3.2: Analysis data transformation
   */
  static async transformAnalysisData(
    analysisData: any,
    context: TransformationContext
  ): Promise<TransformationResult<any>> {
    return this.transform(
      'analysis_data',
      analysisData,
      async (input) => {
        // Standardize analysis data structure
        return {
          id: input.id,
          imageId: input.image_id,
          projectId: input.project_id,
          results: input.results || input.summary,
          suggestions: input.suggestions || [],
          visualAnnotations: input.visual_annotations || [],
          metadata: {
            ...input.metadata,
            analysisType: input.analysis_type,
            status: input.status,
            createdAt: input.created_at,
            userContext: input.user_context
          },
          originalData: input
        };
      },
      context,
      { enableCaching: true, cacheTimeout: 300000 } // 5 minutes for analysis data
    );
  }

  /**
   * ✅ PHASE 3.2: Group data transformation
   */
  static async transformGroupData(
    groupData: any,
    context: TransformationContext
  ): Promise<TransformationResult<any>> {
    return this.transform(
      'group_data',
      groupData,
      async (input) => {
        // Standardize group data structure
        return {
          id: input.id,
          name: input.name,
          description: input.description,
          color: input.color,
          position: input.position,
          projectId: input.project_id,
          imageIds: input.imageIds || [],
          metadata: {
            ...input.metadata,
            createdAt: input.created_at
          },
          originalData: input
        };
      },
      context,
      { enableCaching: true, cacheTimeout: 300000 } // 5 minutes for group data
    );
  }

  /**
   * ✅ PHASE 3.2: Project data transformation
   */
  static async transformProjectData(
    projectData: any,
    context: TransformationContext
  ): Promise<TransformationResult<any>> {
    return this.transform(
      'project_data',
      projectData,
      async (input) => {
        // Standardize project data structure
        return {
          id: input.id,
          name: input.name,
          description: input.description,
          slug: input.slug,
          userId: input.user_id,
          metadata: {
            ...input.metadata,
            createdAt: input.created_at,
            updatedAt: input.updated_at
          },
          originalData: input
        };
      },
      context,
      { enableCaching: true, cacheTimeout: 600000 } // 10 minutes for project data
    );
  }

  /**
   * ✅ PHASE 3.2: Batch transformation for multiple items
   */
  static async transformBatch<TInput, TOutput>(
    type: string,
    inputs: TInput[],
    transformer: (input: TInput) => Promise<TOutput> | TOutput,
    context: TransformationContext,
    options: {
      batchSize?: number;
      enableCaching?: boolean;
      validateInput?: boolean;
      validateOutput?: boolean;
    } = {}
  ): Promise<{
    results: Array<TransformationResult<TOutput>>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      cached: number;
      totalDuration: number;
    };
  }> {
    const { batchSize = 10 } = options;
    const startTime = Date.now();
    const results: Array<TransformationResult<TOutput>> = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const batchPromises = batch.map((input, index) =>
        this.transform(
          `${type}_batch_${i + index}`,
          input,
          transformer,
          { ...context, source: `${context.source}_batch` },
          options
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Batch transformation failed',
            cached: false,
            duration: 0,
            validationPassed: false
          });
        }
      });
    }

    const summary = {
      total: inputs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      cached: results.filter(r => r.cached).length,
      totalDuration: Date.now() - startTime
    };

    console.log(`[DataTransformationPipeline] Batch transformation completed:`, summary);
    return { results, summary };
  }

  /**
   * ✅ PHASE 3.2: Generate cache key for transformation
   */
  private static generateCacheKey(type: string, input: any, context: TransformationContext): string {
    const inputHash = this.hashObject(input);
    const contextHash = this.hashObject({
      userId: context.userId,
      projectId: context.projectId,
      source: context.source
    });
    
    return `transform:${type}:${inputHash}:${contextHash}`;
  }

  /**
   * ✅ PHASE 3.2: Simple object hashing for cache keys
   */
  private static hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * ✅ PHASE 3.2: Estimate object size for metrics
   */
  private static estimateSize(obj: any): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * ✅ PHASE 3.2: Record transformation metrics
   */
  private static recordMetrics(metrics: TransformationMetrics): void {
    this.metrics.push(metrics);
    
    // Keep metrics array size manageable
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS / 2);
    }
  }

  /**
   * ✅ PHASE 3.2: Get transformation metrics for debugging
   */
  static getMetrics(): {
    recent: TransformationMetrics[];
    summary: {
      totalTransformations: number;
      averageDuration: number;
      cacheHitRate: number;
      mostUsedTypes: Array<{ type: string; count: number }>;
    };
  } {
    const recent = this.metrics.slice(-100); // Last 100 transformations
    
    const summary = {
      totalTransformations: this.metrics.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length || 0,
      cacheHitRate: (this.metrics.filter(m => m.cacheHit).length / this.metrics.length) * 100 || 0,
      mostUsedTypes: this.getMostUsedTypes()
    };

    return { recent, summary };
  }

  /**
   * ✅ PHASE 3.2: Get most frequently used transformation types
   */
  private static getMostUsedTypes(): Array<{ type: string; count: number }> {
    const typeCounts = this.metrics.reduce((acc, metric) => {
      acc[metric.transformationType] = (acc[metric.transformationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * ✅ PHASE 3.2: Clear transformation cache
   */
  static async clearCache(): Promise<void> {
    await this.cache.clear();
    console.log('[DataTransformationPipeline] Cache cleared');
  }

  /**
   * ✅ PHASE 3.2: Clear transformation metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    console.log('[DataTransformationPipeline] Metrics cleared');
  }
}
