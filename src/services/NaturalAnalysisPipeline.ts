/**
 * Natural Analysis Pipeline
 * Orchestrates natural AI insights collection and interpretation
 */

import { supabase } from '@/integrations/supabase/client';
import { AnalysisContext } from '@/types/contextTypes';
import { UXAnalysis } from '@/types/ux-analysis';
import { AnalysisDataMapper } from './AnalysisDataMapper';
import { imageOptimizationService } from './ImageOptimizationService';
import { enhancedErrorRecoveryService } from './EnhancedErrorRecoveryService';

interface NaturalAnalysisRequest {
  imageUrl: string;
  userContext?: string;
  analysisContext?: AnalysisContext;
  models?: string[];
}

interface ModelResponse {
  model: string;
  response: string;
  confidence: number;
  processingTime: number;
  error?: string;
}

interface NaturalAnalysisResult {
  imageUrl: string;
  userContext?: string;
  analysisContext?: AnalysisContext;
  rawResponses: ModelResponse[];
  timestamp: string;
  totalProcessingTime: number;
}

interface InterpretedInsight {
  category: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  suggestions: string[];
  sourceModels: string[];
}

interface InterpreterResult {
  insights: InterpretedInsight[];
  summary: {
    overallAssessment: string;
    keyStrengths: string[];
    criticalIssues: string[];
    recommendedActions: string[];
    confidenceScore: number;
  };
  domainSpecificFindings: Record<string, any>;
  metadata: {
    totalInsights: number;
    interpretationTime: number;
    sourceModels: string[];
    timestamp: string;
  };
}

interface NaturalAnalysisExecutionResult {
  success: boolean;
  analysis?: UXAnalysis;
  rawResponses?: ModelResponse[];
  interpretedResult?: InterpreterResult;
  error?: string;
  executionTime: number;
}

export class NaturalAnalysisPipeline {
  
  /**
   * Execute natural analysis pipeline with memory optimization and error recovery
   */
  async execute(
    imageUrl: string,
    userContext?: string,
    analysisContext?: AnalysisContext,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<NaturalAnalysisExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Starting Enhanced Natural Analysis Pipeline:', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        hasUserContext: !!userContext,
        hasAnalysisContext: !!analysisContext
      });

      onProgress?.(5, 'Optimizing image for analysis...');

      // Step 1: Optimize image to prevent memory issues
      const optimizedImageResult = await this.optimizeImageForAnalysis(imageUrl);
      const processImageUrl = optimizedImageResult.wasOptimized ? optimizedImageResult.url : imageUrl;

      console.log('🎯 Image optimization result:', {
        wasOptimized: optimizedImageResult.wasOptimized,
        originalSize: optimizedImageResult.originalSizeKB ? `${optimizedImageResult.originalSizeKB}KB` : 'unknown',
        optimizedSize: optimizedImageResult.optimizedSizeKB ? `${optimizedImageResult.optimizedSizeKB}KB` : 'unknown'
      });

      onProgress?.(15, 'Collecting natural AI insights...');

      // Step 2: Collect natural responses from AI models with error handling
      let naturalResult: NaturalAnalysisResult;
      try {
        naturalResult = await this.collectNaturalInsights({
          imageUrl: processImageUrl,
          userContext,
          analysisContext,
          models: ['openai', 'claude', 'google']
        });
      } catch (insightError) {
        console.warn('🎯 Primary insight collection failed, attempting recovery...');
        
        const recoveryResult = await enhancedErrorRecoveryService.attemptRecovery({
          imageUrl: processImageUrl,
          userContext,
          originalError: insightError as Error,
          failedStages: ['natural_insights']
        });

        if (recoveryResult.success && recoveryResult.analysis) {
          // Convert recovered analysis back to expected format
          return {
            success: true,
            analysis: recoveryResult.analysis,
            rawResponses: [],
            interpretedResult: this.createFallbackInterpretedResult(),
            executionTime: Date.now() - startTime
          };
        }
        
        throw insightError;
      }

      onProgress?.(50, 'Interpreting AI insights...');

      // Step 3: Interpret raw responses into actionable insights
      const interpretedResult = await this.interpretInsights({
        rawResponses: naturalResult.rawResponses,
        analysisContext,
        userContext,
        imageUrl: processImageUrl
      });

      onProgress?.(80, 'Synthesizing analysis...');

      // Step 4: Convert interpreted insights to UXAnalysis format
      const synthesizedAnalysis = this.synthesizeToUXAnalysis(
        interpretedResult,
        naturalResult,
        processImageUrl,
        userContext
      );

      onProgress?.(100, 'Analysis complete!');

      const executionTime = Date.now() - startTime;

      console.log('✅ Enhanced Natural Analysis Pipeline completed:', {
        totalInsights: interpretedResult.insights?.length || 0,
        confidenceScore: interpretedResult.summary?.confidenceScore || 0,
        executionTime,
        imageOptimized: optimizedImageResult.wasOptimized
      });

      return {
        success: true,
        analysis: synthesizedAnalysis,
        rawResponses: naturalResult.rawResponses,
        interpretedResult,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ Enhanced Natural Analysis Pipeline failed:', error);
      
      // Attempt final error recovery
      try {
        console.log('🎯 Attempting final error recovery...');
        
        const recoveryResult = await enhancedErrorRecoveryService.attemptRecovery({
          imageUrl,
          userContext,
          originalError: error as Error,
          failedStages: ['full_pipeline']
        });

        if (recoveryResult.success && recoveryResult.analysis) {
          console.log('✅ Final error recovery successful');
          return {
            success: true,
            analysis: recoveryResult.analysis,
            rawResponses: [],
            interpretedResult: this.createFallbackInterpretedResult(),
            executionTime
          };
        }
      } catch (recoveryError) {
        console.error('❌ Final error recovery also failed:', recoveryError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * Optimize image for analysis to prevent memory issues
   */
  private async optimizeImageForAnalysis(imageUrl: string): Promise<{
    url: string;
    wasOptimized: boolean;
    originalSizeKB?: number;
    optimizedSizeKB?: number;
  }> {
    try {
      const optimizationCheck = await imageOptimizationService.checkOptimizationNeeded(imageUrl);
      
      if (!optimizationCheck.needsOptimization) {
        return {
          url: imageUrl,
          wasOptimized: false,
          originalSizeKB: optimizationCheck.estimatedSize / 1024
        };
      }

      const optimized = await imageOptimizationService.optimizeForAnalysis(imageUrl, {
        targetSizeKB: 400, // Conservative target for analysis
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 768
      });

      return {
        url: optimized.url,
        wasOptimized: true,
        originalSizeKB: optimized.originalSize / 1024,
        optimizedSizeKB: optimized.optimizedSize / 1024
      };

    } catch (error) {
      console.warn('🎯 Image optimization failed, using original:', error);
      return {
        url: imageUrl,
        wasOptimized: false
      };
    }
  }

  /**
   * Create fallback interpreted result for error recovery
   */
  private createFallbackInterpretedResult(): InterpreterResult {
    return {
      insights: [{
        category: 'usability',
        title: 'Recovery Analysis',
        description: 'Analysis completed after error recovery',
        severity: 'low',
        confidence: 0.7,
        actionable: true,
        suggestions: ['Review interface design'],
        sourceModels: ['recovery']
      }],
      summary: {
        overallAssessment: 'Analysis recovered successfully',
        keyStrengths: ['Recovery system functioning'],
        criticalIssues: [],
        recommendedActions: ['Consider re-running full analysis'],
        confidenceScore: 0.7
      },
      domainSpecificFindings: {},
      metadata: {
        totalInsights: 1,
        interpretationTime: 0,
        sourceModels: ['recovery'],
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Collect natural insights from AI models using ux-analysis function with memory optimizations
   */
  private async collectNaturalInsights(request: NaturalAnalysisRequest): Promise<NaturalAnalysisResult> {
    console.log('🎯 Collecting natural insights using memory-optimized ux-analysis function...');
    
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: {
        type: 'MEMORY_OPTIMIZED_NATURAL_ANALYSIS',
        payload: {
          imageUrl: request.imageUrl,
          userContext: request.userContext,
          analysisContext: request.analysisContext,
          naturalMode: true,
          memoryOptimized: true,
          maxMemoryMB: 80 // Conservative memory limit for natural analysis
        }
      }
    });

    if (error) {
      console.error('❌ Memory-optimized natural analysis collection failed:', error);
      
      // Check if it's a memory-related error and suggest optimization
      if (error.message && error.message.toLowerCase().includes('memory')) {
        throw new Error(`Memory limit exceeded during analysis. Image optimization may be required. Original error: ${error.message}`);
      }
      
      throw new Error(`Natural analysis failed: ${error.message}`);
    }

    // Transform the response to match expected structure
    if (data && data.analysis) {
      return {
        imageUrl: request.imageUrl,
        userContext: request.userContext,
        analysisContext: request.analysisContext,
        rawResponses: data.rawResponses || [],
        timestamp: new Date().toISOString(),
        totalProcessingTime: data.metadata?.processingTime || 0
      };
    }

    throw new Error('Invalid response from memory-optimized natural analysis');
  }

  /**
   * Interpret raw AI responses - for natural mode, this is already done by the ux-analysis function
   */
  private async interpretInsights(request: {
    rawResponses: ModelResponse[];
    analysisContext?: AnalysisContext;
    userContext?: string;
    imageUrl?: string;
  }): Promise<InterpreterResult> {
    console.log('🧠 Interpreting insights from natural analysis...');
    
    // Since the ux-analysis function already handles interpretation in natural mode,
    // we create a compatible structure from the raw responses
    const insights: InterpretedInsight[] = request.rawResponses.map((response, index) => ({
      category: 'usability',
      title: `${response.model} Analysis`,
      description: response.response.substring(0, 200) + '...',
      severity: 'medium' as const,
      confidence: response.confidence,
      actionable: true,
      suggestions: [response.response.substring(0, 100) + '...'],
      sourceModels: [response.model]
    }));

    return {
      insights,
      summary: {
        overallAssessment: 'Natural analysis completed with multiple AI models',
        keyStrengths: [],
        criticalIssues: [],
        recommendedActions: [],
        confidenceScore: request.rawResponses.reduce((acc, r) => acc + r.confidence, 0) / request.rawResponses.length
      },
      domainSpecificFindings: {},
      metadata: {
        totalInsights: insights.length,
        interpretationTime: 0,
        sourceModels: request.rawResponses.map(r => r.model),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Synthesize interpreted insights into UXAnalysis format
   */
  private synthesizeToUXAnalysis(
    interpretedResult: InterpreterResult,
    naturalResult: NaturalAnalysisResult,
    imageUrl: string,
    userContext?: string
  ): UXAnalysis {
    // Generate dynamic annotations from insights
    const visualAnnotations = interpretedResult.insights
      .filter(insight => insight.actionable)
      .slice(0, 8) // Limit to 8 visual annotations
      .map((insight, index) => ({
        id: `insight-${index}`,
        x: 50 + (index % 4) * 200, // Distribute across interface
        y: 50 + Math.floor(index / 4) * 150,
        type: this.mapSeverityToType(insight.severity),
        title: insight.title,
        description: insight.description,
        severity: insight.severity
      }));

    // Generate dynamic suggestions from insights
    const suggestions = interpretedResult.insights.map((insight, index) => ({
      id: `suggestion-${index}`,
      category: this.mapToSuggestionCategory(insight.category),
      title: insight.title,
      description: insight.description,
      impact: this.mapSeverityToImpact(insight.severity),
      effort: this.estimateEffort(insight),
      actionItems: insight.suggestions,
      relatedAnnotations: [`insight-${index}`]
    }));

    // Create dynamic summary
    const summary = {
      overallScore: Math.round(interpretedResult.summary.confidenceScore * 100),
      categoryScores: this.generateCategoryScores(interpretedResult.insights),
      keyIssues: interpretedResult.summary.criticalIssues,
      strengths: interpretedResult.summary.keyStrengths
    };

    // Create metadata from natural analysis
    const metadata = {
      objects: [], // Could be enhanced with Google Vision data
      text: this.extractTextFromResponses(naturalResult.rawResponses),
      colors: [], // Could be enhanced with color analysis
      faces: 0,
      naturalAnalysisMetadata: {
        sourceModels: interpretedResult.metadata.sourceModels,
        totalProcessingTime: naturalResult.totalProcessingTime,
        interpretationTime: interpretedResult.metadata.interpretationTime,
        rawResponseCount: naturalResult.rawResponses.length,
        domainSpecificFindings: interpretedResult.domainSpecificFindings
      }
    };

    return {
      id: `natural-analysis-${Date.now()}`,
      imageId: '', // Will be set by caller
      imageName: 'Natural Analysis',
      imageUrl,
      userContext: userContext || '',
      visualAnnotations,
      suggestions,
      summary,
      metadata,
      createdAt: new Date(),
      modelUsed: `natural-pipeline-${interpretedResult.metadata.sourceModels.join('+')}`,
      status: 'completed'
    };
  }

  /**
   * Map insight severity to annotation type
   */
  private mapSeverityToType(severity: string): 'issue' | 'suggestion' | 'success' {
    switch (severity) {
      case 'high': return 'issue';
      case 'medium': return 'suggestion';
      case 'low': return 'success';
      default: return 'suggestion';
    }
  }

  /**
   * Map insight category to suggestion category
   */
  private mapToSuggestionCategory(category: string): 'usability' | 'accessibility' | 'visual' | 'content' | 'performance' {
    switch (category.toLowerCase()) {
      case 'usability': return 'usability';
      case 'accessibility': return 'accessibility';
      case 'visual': return 'visual';
      case 'content': return 'content';
      case 'performance': return 'performance';
      default: return 'usability';
    }
  }

  /**
   * Map severity to impact level
   */
  private mapSeverityToImpact(severity: string): 'low' | 'medium' | 'high' {
    return severity as 'low' | 'medium' | 'high';
  }

  /**
   * Estimate effort based on insight characteristics
   */
  private estimateEffort(insight: InterpretedInsight): 'low' | 'medium' | 'high' {
    // Simple heuristic based on number of suggestions and category
    const suggestionCount = insight.suggestions.length;
    
    if (insight.category === 'visual' && suggestionCount <= 2) return 'low';
    if (insight.category === 'accessibility' && suggestionCount > 3) return 'high';
    if (suggestionCount <= 2) return 'low';
    if (suggestionCount <= 4) return 'medium';
    return 'high';
  }

  /**
   * Generate category scores from insights
   */
  private generateCategoryScores(insights: InterpretedInsight[]): {
    usability: number;
    accessibility: number;
    visual: number;
    content: number;
  } {
    const categories = ['usability', 'accessibility', 'visual', 'content'];
    const scores: any = {};

    categories.forEach(category => {
      const categoryInsights = insights.filter(i => i.category.toLowerCase() === category);
      
      if (categoryInsights.length === 0) {
        scores[category] = 75; // Default score
        return;
      }

      // Calculate score based on severity and confidence
      const avgSeverityScore = categoryInsights.reduce((sum, insight) => {
        const severityScore = insight.severity === 'high' ? 40 : 
                             insight.severity === 'medium' ? 65 : 85;
        return sum + (severityScore * insight.confidence);
      }, 0) / categoryInsights.length;

      scores[category] = Math.round(avgSeverityScore);
    });

    return scores;
  }

  /**
   * Extract text content from AI responses
   */
  private extractTextFromResponses(responses: ModelResponse[]): string[] {
    const googleResponse = responses.find(r => r.model === 'google-vision');
    if (googleResponse && googleResponse.response.includes('Contains text content')) {
      return ['Text content detected'];
    }
    return [];
  }
}

export const naturalAnalysisPipeline = new NaturalAnalysisPipeline();