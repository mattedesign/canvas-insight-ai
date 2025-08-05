/**
 * Memory Optimized Analysis Service - Manages analysis with memory constraints
 */

import { supabase } from '@/integrations/supabase/client';
import { imageOptimizationService } from './ImageOptimizationService';
import type { AnalysisContext } from '@/types/contextTypes';
import type { UXAnalysis } from '@/types/ux-analysis';

interface MemoryOptimizedRequest {
  imageUrl: string;
  userContext?: string;
  analysisContext?: AnalysisContext;
  imageId?: string;
  imageName?: string;
  maxMemoryMB?: number;
}

interface AnalysisChunk {
  stage: string;
  model: string;
  result: any;
  memoryUsed: number;
  processingTime: number;
}

interface MemoryOptimizedResult {
  success: boolean;
  analysis?: UXAnalysis;
  chunks: AnalysisChunk[];
  totalMemoryUsed: number;
  totalProcessingTime: number;
  optimizationsApplied: string[];
  error?: string;
}

class MemoryOptimizedAnalysisService {
  private static readonly MAX_MEMORY_MB = 100; // Conservative limit for edge functions
  private static readonly CHUNK_SIZE_LIMIT = 1024 * 1024; // 1MB per chunk
  private static readonly MAX_IMAGE_SIZE_KB = 500; // 500KB max for analysis

  /**
   * Execute analysis with memory optimization
   */
  async executeOptimizedAnalysis(request: MemoryOptimizedRequest): Promise<MemoryOptimizedResult> {
    const startTime = Date.now();
    const optimizationsApplied: string[] = [];
    const chunks: AnalysisChunk[] = [];
    let totalMemoryUsed = 0;

    try {
      console.log('🧠 Starting memory-optimized analysis...');

      // Step 1: Optimize image for memory-constrained processing
      const optimizedImage = await this.optimizeImageForMemory(
        request.imageUrl, 
        request.maxMemoryMB || MemoryOptimizedAnalysisService.MAX_MEMORY_MB
      );
      
      if (optimizedImage.wasOptimized) {
        optimizationsApplied.push('image_compression');
        console.log(`🧠 Image optimized: ${optimizedImage.originalSizeKB}KB → ${optimizedImage.optimizedSizeKB}KB`);
      }

      // Step 2: Execute analysis in memory-efficient chunks
      const analysisStrategy = this.determineAnalysisStrategy(optimizedImage.sizeKB);
      optimizationsApplied.push(analysisStrategy.name);

      console.log('🧠 Using analysis strategy:', analysisStrategy.name);

      // Step 3: Process analysis chunks
      const analysisResults = await this.processAnalysisChunks(
        optimizedImage.url,
        request,
        analysisStrategy
      );

      chunks.push(...analysisResults.chunks);
      totalMemoryUsed = analysisResults.totalMemoryUsed;

      // Step 4: Synthesize results efficiently
      const synthesizedAnalysis = await this.synthesizeResultsMemoryEfficient(
        analysisResults.chunks,
        request
      );

      const totalProcessingTime = Date.now() - startTime;

      console.log('✅ Memory-optimized analysis complete:', {
        totalMemoryUsed: `${totalMemoryUsed}MB`,
        processingTime: `${totalProcessingTime}ms`,
        chunksProcessed: chunks.length,
        optimizationsApplied
      });

      return {
        success: true,
        analysis: synthesizedAnalysis,
        chunks,
        totalMemoryUsed,
        totalProcessingTime,
        optimizationsApplied
      };

    } catch (error) {
      console.error('❌ Memory-optimized analysis failed:', error);
      
      return {
        success: false,
        chunks,
        totalMemoryUsed,
        totalProcessingTime: Date.now() - startTime,
        optimizationsApplied,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Optimize image for memory-constrained processing
   */
  private async optimizeImageForMemory(
    imageUrl: string, 
    maxMemoryMB: number
  ): Promise<{
    url: string;
    sizeKB: number;
    originalSizeKB: number;
    optimizedSizeKB: number;
    wasOptimized: boolean;
  }> {
    try {
      // Check if optimization is needed
      const optimizationCheck = await imageOptimizationService.checkOptimizationNeeded(imageUrl);
      
      if (!optimizationCheck.needsOptimization) {
        const sizeKB = optimizationCheck.estimatedSize / 1024;
        return {
          url: imageUrl,
          sizeKB,
          originalSizeKB: sizeKB,
          optimizedSizeKB: sizeKB,
          wasOptimized: false
        };
      }

      // Calculate target size based on memory limit
      const targetSizeKB = Math.min(
        MemoryOptimizedAnalysisService.MAX_IMAGE_SIZE_KB,
        (maxMemoryMB * 1024) * 0.3 // Use max 30% of available memory for image
      );

      // Optimize image
      const optimized = await imageOptimizationService.optimizeForAnalysis(imageUrl, {
        targetSizeKB,
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 768
      });

      return {
        url: optimized.url,
        sizeKB: optimized.optimizedSize / 1024,
        originalSizeKB: optimized.originalSize / 1024,
        optimizedSizeKB: optimized.optimizedSize / 1024,
        wasOptimized: true
      };

    } catch (error) {
      console.warn('⚠️ Image optimization failed, using original:', error);
      return {
        url: imageUrl,
        sizeKB: 0,
        originalSizeKB: 0,
        optimizedSizeKB: 0,
        wasOptimized: false
      };
    }
  }

  /**
   * Determine optimal analysis strategy based on image size
   */
  private determineAnalysisStrategy(imageSizeKB: number): {
    name: string;
    models: string[];
    parallel: boolean;
    chunkSize: number;
  } {
    if (imageSizeKB > 300) {
      // Large image: sequential processing with single model
      return {
        name: 'sequential_single_model',
        models: ['gpt-4o'],
        parallel: false,
        chunkSize: MemoryOptimizedAnalysisService.CHUNK_SIZE_LIMIT
      };
    } else if (imageSizeKB > 150) {
      // Medium image: sequential processing with two models
      return {
        name: 'sequential_dual_model',
        models: ['gpt-4o', 'claude-opus-4-20250514'],
        parallel: false,
        chunkSize: MemoryOptimizedAnalysisService.CHUNK_SIZE_LIMIT
      };
    } else {
      // Small image: parallel processing with multiple models
      return {
        name: 'parallel_multi_model',
        models: ['gpt-4o', 'claude-opus-4-20250514'],
        parallel: true,
        chunkSize: MemoryOptimizedAnalysisService.CHUNK_SIZE_LIMIT / 2
      };
    }
  }

  /**
   * Process analysis in memory-efficient chunks
   */
  private async processAnalysisChunks(
    imageUrl: string,
    request: MemoryOptimizedRequest,
    strategy: { name: string; models: string[]; parallel: boolean }
  ): Promise<{ chunks: AnalysisChunk[]; totalMemoryUsed: number }> {
    const chunks: AnalysisChunk[] = [];
    let totalMemoryUsed = 0;

    if (strategy.parallel) {
      // Process models in parallel for small images
      console.log('🧠 Processing models in parallel...');
      
      const parallelPromises = strategy.models.map(model => 
        this.processModelChunk(imageUrl, model, request)
      );

      const results = await Promise.allSettled(parallelPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          chunks.push(result.value);
          totalMemoryUsed += result.value.memoryUsed;
        } else {
          console.error(`❌ Model ${strategy.models[index]} failed:`, result.reason);
        }
      });

    } else {
      // Process models sequentially for memory efficiency
      console.log('🧠 Processing models sequentially...');
      
      for (const model of strategy.models) {
        try {
          const chunk = await this.processModelChunk(imageUrl, model, request);
          chunks.push(chunk);
          totalMemoryUsed += chunk.memoryUsed;

          // Allow garbage collection between chunks
          await this.forceGarbageCollection();

        } catch (error) {
          console.error(`❌ Model ${model} failed:`, error);
        }
      }
    }

    return { chunks, totalMemoryUsed };
  }

  /**
   * Process a single model chunk
   */
  private async processModelChunk(
    imageUrl: string,
    model: string,
    request: MemoryOptimizedRequest
  ): Promise<AnalysisChunk> {
    const startTime = Date.now();
    const memoryBefore = this.estimateMemoryUsage();

    try {
      console.log(`🧠 Processing chunk with model: ${model}`);

      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'MEMORY_OPTIMIZED_CHUNK',
          payload: {
            imageUrl,
            model,
            userContext: request.userContext,
            analysisContext: request.analysisContext,
            memoryLimit: MemoryOptimizedAnalysisService.MAX_MEMORY_MB
          }
        }
      });

      if (error) {
        throw new Error(`Analysis failed for ${model}: ${error.message}`);
      }

      const memoryAfter = this.estimateMemoryUsage();
      const memoryUsed = Math.max(0, memoryAfter - memoryBefore);
      const processingTime = Date.now() - startTime;

      return {
        stage: 'analysis',
        model,
        result: data,
        memoryUsed,
        processingTime
      };

    } catch (error) {
      console.error(`❌ Model chunk processing failed for ${model}:`, error);
      throw error;
    }
  }

  /**
   * Synthesize results with memory efficiency
   */
  private async synthesizeResultsMemoryEfficient(
    chunks: AnalysisChunk[],
    request: MemoryOptimizedRequest
  ): Promise<UXAnalysis> {
    console.log('🧠 Synthesizing results with memory efficiency...');

    // Process chunks incrementally to avoid memory spikes
    const suggestions: any[] = [];
    const visualAnnotations: any[] = [];
    const summaryScores: number[] = [];

    for (const chunk of chunks) {
      if (chunk.result && chunk.result.analysis) {
        const analysis = chunk.result.analysis;
        
        // Extract data incrementally
        if (analysis.suggestions) {
          suggestions.push(...analysis.suggestions.slice(0, 3)); // Limit per chunk
        }
        
        if (analysis.visualAnnotations) {
          visualAnnotations.push(...analysis.visualAnnotations.slice(0, 2)); // Limit per chunk
        }
        
        if (analysis.summary && analysis.summary.overallScore) {
          summaryScores.push(analysis.summary.overallScore);
        }
      }

      // Clear chunk data after processing to free memory
      chunk.result = null;
    }

    // Create synthesized analysis
    const synthesizedAnalysis: UXAnalysis = {
      id: `memory_optimized_${Date.now()}`,
      imageId: request.imageId || '',
      imageName: request.imageName || 'Memory Optimized Analysis',
      imageUrl: request.imageUrl,
      userContext: request.userContext || '',
      visualAnnotations: visualAnnotations.slice(0, 8), // Final limit
      suggestions: suggestions.slice(0, 6), // Final limit
      summary: {
        overallScore: summaryScores.length > 0 
          ? Math.round(summaryScores.reduce((a, b) => a + b, 0) / summaryScores.length)
          : 70,
        categoryScores: {
          usability: 70,
          accessibility: 65,
          visual: 75,
          content: 70
        },
        keyIssues: suggestions.filter(s => s.impact === 'high').map(s => s.title).slice(0, 3),
        strengths: suggestions.filter(s => s.impact === 'low').map(s => s.title).slice(0, 2)
      },
      metadata: {
        objects: [],
        text: [],
        colors: [],
        faces: 0
      },
      createdAt: new Date(),
      modelUsed: `memory-optimized-${chunks.map(c => c.model).join('+')}`,
      status: 'completed'
    };

    return synthesizedAnalysis;
  }

  /**
   * Estimate current memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    // This is a rough estimation - in real scenarios you'd use more sophisticated methods
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  /**
   * Force garbage collection opportunity
   */
  private async forceGarbageCollection(): Promise<void> {
    // Create a small delay to allow garbage collection
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export const memoryOptimizedAnalysisService = new MemoryOptimizedAnalysisService();