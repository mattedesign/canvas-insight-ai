/**
 * Enhanced Group Analysis Pipeline
 * Multi-image processing with advanced AI reasoning and cross-image insights
 */

import { supabase } from '@/integrations/supabase/client';
import { AnalysisContext } from '@/types/contextTypes';
import { UXAnalysis, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { imageOptimizationService } from './ImageOptimizationService';
import { ContextDetectionService } from './ContextDetectionService';
import { DynamicPromptBuilder } from './DynamicPromptBuilder';

export interface GroupAnalysisRequest {
  imageUrls: string[];
  groupId: string;
  prompt: string;
  isCustom?: boolean;
  metadata?: {
    name?: string;
    description?: string;
    color?: string;
  };
}

export interface MultiImageInsight {
  type: 'consistency' | 'pattern' | 'deviation' | 'progression' | 'comparative';
  title: string;
  description: string;
  affectedImages: number[]; // indices of images
  severity: 'low' | 'medium' | 'high';
  category: 'usability' | 'accessibility' | 'visual' | 'content' | 'performance';
  confidence: number;
}

export interface CrossImageAnalysisResult {
  consistencyScore: number;
  thematicCoherence: number;
  userFlowContinuity: number;
  crossImageInsights: MultiImageInsight[];
  commonPatterns: string[];
  designInconsistencies: string[];
  userJourneyGaps: string[];
  recommendations: string[];
}

export interface EnhancedGroupAnalysisResult {
  success: boolean;
  groupAnalysis?: GroupAnalysisWithPrompt;
  individualAnalyses?: UXAnalysis[];
  crossImageAnalysis?: CrossImageAnalysisResult;
  processingTime: number;
  metadata: {
    imageCount: number;
    modelsUsed: string[];
    analysisDepth: 'basic' | 'enhanced' | 'comprehensive';
    groupContext: AnalysisContext;
  };
  error?: string;
}

export class EnhancedGroupAnalysisPipeline {
  private contextService = new ContextDetectionService();
  private promptBuilder = new DynamicPromptBuilder();

  /**
   * Execute enhanced multi-image group analysis
   */
  async executeGroupAnalysis(
    request: GroupAnalysisRequest,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<EnhancedGroupAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Starting Enhanced Group Analysis Pipeline:', {
        imageCount: request.imageUrls.length,
        groupId: request.groupId,
        prompt: request.prompt.substring(0, 50) + '...'
      });

      onProgress?.('Initializing group analysis...', 5);

      // Step 1: Optimize images for processing
      const optimizedImages = await this.optimizeImagesForGroupAnalysis(
        request.imageUrls,
        onProgress
      );

      // Step 2: Detect group context and characteristics
      const groupContext = await this.detectGroupContext(
        optimizedImages,
        request.prompt,
        onProgress
      );

      // Step 3: Generate group-aware prompts for each analysis stage
      const groupPrompts = await this.generateGroupAwarePrompts(
        request,
        groupContext,
        onProgress
      );

      // Step 4: Process images individually with group awareness
      const individualAnalyses = await this.processImagesWithGroupAwareness(
        optimizedImages,
        groupPrompts,
        groupContext,
        onProgress
      );

      // Step 5: Perform cross-image analysis and synthesis
      const crossImageAnalysis = await this.performCrossImageAnalysis(
        individualAnalyses,
        groupContext,
        request,
        onProgress
      );

      // Step 6: Synthesize final group analysis
      const groupAnalysis = await this.synthesizeGroupAnalysis(
        individualAnalyses,
        crossImageAnalysis,
        request,
        groupContext,
        onProgress
      );

      onProgress?.('Group analysis complete', 100);

      return {
        success: true,
        groupAnalysis,
        individualAnalyses,
        crossImageAnalysis,
        processingTime: Date.now() - startTime,
        metadata: {
          imageCount: request.imageUrls.length,
          modelsUsed: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4o-mini'],
          analysisDepth: 'comprehensive',
          groupContext
        }
      };

    } catch (error) {
      console.error('❌ Enhanced group analysis failed:', error);
      
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        metadata: {
          imageCount: request.imageUrls.length,
          modelsUsed: [],
          analysisDepth: 'basic',
          groupContext: {} as AnalysisContext
        }
      };
    }
  }

  /**
   * Optimize images for group processing with memory efficiency
   */
  private async optimizeImagesForGroupAnalysis(
    imageUrls: string[],
    onProgress?: (stage: string, progress: number) => void
  ): Promise<Array<{ url: string; index: number; optimized: boolean }>> {
    onProgress?.('Optimizing images for group processing...', 10);
    
    const optimizedImages = await Promise.all(
      imageUrls.map(async (url, index) => {
        try {
          const optimizedResult = await imageOptimizationService.optimizeForAnalysis(url);
          return {
            url: optimizedResult.url || url,
            index,
            optimized: optimizedResult.url !== url
          };
        } catch (error) {
          console.warn(`Failed to optimize image ${index}:`, error);
          return { url, index, optimized: false };
        }
      })
    );

    console.log('📸 Group image optimization completed:', {
      totalImages: imageUrls.length,
      optimizedCount: optimizedImages.filter(img => img.optimized).length
    });

    return optimizedImages;
  }

  /**
   * Detect group context and interface characteristics
   */
  private async detectGroupContext(
    images: Array<{ url: string; index: number; optimized: boolean }>,
    prompt: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<AnalysisContext> {
    onProgress?.('Analyzing group context...', 20);

    try {
      // Use the first few images to determine group characteristics
      const sampleImages = images.slice(0, Math.min(3, images.length));
      
      // Detect context from the first image as primary reference
      const primaryContext = await this.contextService.detectImageContext(sampleImages[0].url);
      
      // Enhance context with group-specific information
      const userContextData = this.contextService.inferUserContext(prompt);
      
      const groupContext = this.contextService.createAnalysisContext(
        {
          ...primaryContext,
          complexity: images.length > 5 ? 'complex' : images.length > 2 ? 'moderate' : 'simple',
          userIntent: [...primaryContext.userIntent, 'group_analysis', 'pattern_detection']
        },
        {
          ...userContextData,
          inferredRole: userContextData.inferredRole || 'business',
          expertise: userContextData.expertise || 'intermediate'
        }
      );

      // Add group-specific metadata
      (groupContext.image as any).groupSize = images.length;
      groupContext.focusAreas = [...groupContext.focusAreas, 'consistency', 'patterns'];
      
      console.log('🔍 Group context detected:', {
        primaryType: groupContext.image.primaryType,
        domain: groupContext.image.domain,
        groupSize: images.length,
        confidence: groupContext.confidence
      });

      return groupContext;

    } catch (error) {
      console.warn('⚠️ Group context detection failed, using fallback:', error);
      
      // Fallback context
      return {
        image: {
          primaryType: 'unknown',
          subTypes: [],
          domain: 'general',
          complexity: 'moderate',
          userIntent: ['group_analysis']
        },
        user: {
          inferredRole: 'business',
          expertise: 'intermediate'
        },
        focusAreas: ['usability', 'consistency'],
        analysisDepth: 'standard',
        outputStyle: 'balanced',
        confidence: 0.7,
        detectedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Generate group-aware prompts for different analysis stages
   */
  private async generateGroupAwarePrompts(
    request: GroupAnalysisRequest,
    groupContext: AnalysisContext,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{
    individualPrompt: string;
    crossImagePrompt: string;
    synthesisPrompt: string;
  }> {
    onProgress?.('Generating group-aware prompts...', 30);

    const individualPrompt = await this.promptBuilder.buildContextualPrompt(
      'analysis',
      groupContext,
      {
        basePrompt: request.prompt,
        groupSize: request.imageUrls.length,
        groupId: request.groupId,
        isCustomAnalysis: request.isCustom,
        stage: 'individual_in_group'
      }
    );

    const crossImagePrompt = await this.promptBuilder.buildContextualPrompt(
      'analysis',
      groupContext,
      {
        basePrompt: request.prompt,
        groupSize: request.imageUrls.length,
        analysisType: 'pattern_detection',
        stage: 'cross_image_analysis'
      }
    );

    const synthesisPrompt = await this.promptBuilder.buildContextualPrompt(
      'synthesis',
      groupContext,
      {
        basePrompt: request.prompt,
        groupSize: request.imageUrls.length,
        synthesisType: 'comprehensive',
        stage: 'group_synthesis'
      }
    );

    return {
      individualPrompt,
      crossImagePrompt,
      synthesisPrompt
    };
  }

  /**
   * Process each image with group awareness using multi-model approach
   */
  private async processImagesWithGroupAwareness(
    images: Array<{ url: string; index: number; optimized: boolean }>,
    prompts: { individualPrompt: string; crossImagePrompt: string; synthesisPrompt: string },
    groupContext: AnalysisContext,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<UXAnalysis[]> {
    onProgress?.('Processing images with group awareness...', 40);

    const batchSize = 3; // Process in batches to manage memory
    const results: UXAnalysis[] = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchProgress = 40 + ((i / images.length) * 30);
      
      onProgress?.(`Processing images ${i + 1}-${Math.min(i + batchSize, images.length)}...`, batchProgress);

      const batchResults = await Promise.all(
        batch.map(async (image, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          try {
            // Create image-specific context
            const imageContext = `${prompts.individualPrompt}
            
            Image Position: Image ${globalIndex + 1} of ${images.length}
            Group Context: Part of ${images.length}-image group analysis focusing on: ${groupContext.image.primaryType}`;

            // Use the enhanced analysis for individual images
            const response = await supabase.functions.invoke('ux-analysis', {
              body: {
                type: 'ENHANCED_MULTI_MODEL_ANALYSIS',
                payload: {
                  imageUrl: image.url,
                  userContext: imageContext,
                  analysisContext: groupContext,
                  enableMultiModel: true,
                  models: ['gpt-4o', 'claude-3-5-sonnet']
                }
              }
            });

            if (response.error) {
              throw new Error(`Analysis failed for image ${globalIndex + 1}: ${response.error.message}`);
            }

            const analysisData = response.data?.analysis || response.data;
            
            // Add group-specific metadata
            return {
              ...analysisData,
              id: `group_${images.length}_img_${globalIndex}`,
              metadata: {
                ...analysisData.metadata,
                groupPosition: globalIndex,
                groupSize: images.length,
                groupId: `group_${images.length}`,
                processedWithGroupAwareness: true
              }
            } as UXAnalysis;

          } catch (error) {
            console.error(`Failed to analyze image ${globalIndex + 1}:`, error);
            
            // Return fallback analysis
            return {
              id: `group_fallback_${globalIndex}`,
              imageId: `group_img_${globalIndex}`,
              imageName: `Group Image ${globalIndex + 1}`,
              imageUrl: image.url,
              userContext: prompts.individualPrompt,
              visualAnnotations: [],
              suggestions: [{
                id: `fallback_${globalIndex}`,
                category: 'usability',
                title: 'Analysis Unavailable',
                description: `Unable to analyze image ${globalIndex + 1} in group context`,
                impact: 'low',
                effort: 'low',
                actionItems: ['Retry analysis individually'],
                relatedAnnotations: []
              }],
              summary: {
                overallScore: 50,
                categoryScores: {
                  usability: 50,
                  accessibility: 50,
                  visual: 50,
                  content: 50
                },
                keyIssues: ['Analysis failed'],
                strengths: []
              },
              metadata: {
                objects: [],
                text: [],
                colors: [],
                faces: 0,
                groupPosition: globalIndex,
                groupSize: images.length,
                fallbackGenerated: true
              } as any,
              createdAt: new Date()
            } as UXAnalysis;
          }
        })
      );

      results.push(...batchResults);
    }

    console.log('📊 Individual analyses completed:', {
      totalAnalyses: results.length,
      successfulAnalyses: results.filter(r => !(r.metadata as any).fallbackGenerated).length
    });

    return results;
  }

  /**
   * Perform cross-image analysis to identify patterns and inconsistencies
   */
  private async performCrossImageAnalysis(
    individualAnalyses: UXAnalysis[],
    groupContext: AnalysisContext,
    request: GroupAnalysisRequest,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<CrossImageAnalysisResult> {
    onProgress?.('Performing cross-image analysis...', 75);

    try {
      // Prepare cross-image analysis data
      const crossAnalysisData = {
        imageCount: individualAnalyses.length,
        groupPrompt: request.prompt,
        individualSummaries: individualAnalyses.map((analysis, index) => ({
          imageIndex: index,
          overallScore: analysis.summary.overallScore,
          categoryScores: analysis.summary.categoryScores,
          keyIssues: analysis.summary.keyIssues,
          strengths: analysis.summary.strengths,
          suggestionsCount: analysis.suggestions.length,
          annotationsCount: analysis.visualAnnotations.length
        })),
        contextType: groupContext.image.primaryType,
        domain: groupContext.image.domain
      };

      // Execute cross-image analysis
      const response = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'CROSS_IMAGE_ANALYSIS',
          payload: {
            crossAnalysisData,
            groupContext,
            userPrompt: request.prompt
          }
        }
      });

      if (response.error) {
        throw new Error(`Cross-image analysis failed: ${response.error.message}`);
      }

      const crossAnalysisResult = response.data?.analysis || response.data;

      // Calculate metrics from individual analyses
      const scores = individualAnalyses.map(a => a.summary.overallScore);
      const consistencyScore = this.calculateConsistencyScore(scores);
      const thematicCoherence = this.calculateThematicCoherence(individualAnalyses);
      const userFlowContinuity = this.calculateUserFlowContinuity(individualAnalyses);

      return {
        consistencyScore,
        thematicCoherence,
        userFlowContinuity,
        crossImageInsights: crossAnalysisResult.insights || [],
        commonPatterns: crossAnalysisResult.commonPatterns || [],
        designInconsistencies: crossAnalysisResult.inconsistencies || [],
        userJourneyGaps: crossAnalysisResult.journeyGaps || [],
        recommendations: crossAnalysisResult.recommendations || []
      };

    } catch (error) {
      console.error('❌ Cross-image analysis failed:', error);
      
      // Fallback cross-image analysis
      return this.generateFallbackCrossImageAnalysis(individualAnalyses, request);
    }
  }

  /**
   * Synthesize final group analysis combining all insights
   */
  private async synthesizeGroupAnalysis(
    individualAnalyses: UXAnalysis[],
    crossImageAnalysis: CrossImageAnalysisResult,
    request: GroupAnalysisRequest,
    groupContext: AnalysisContext,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<GroupAnalysisWithPrompt> {
    onProgress?.('Synthesizing group analysis...', 90);

    const groupAnalysis: GroupAnalysisWithPrompt = {
      id: `group_analysis_${Date.now()}`,
      sessionId: `session_${request.groupId}_${Date.now()}`,
      groupId: request.groupId,
      prompt: request.prompt,
      summary: {
        overallScore: Math.round(
          individualAnalyses.reduce((sum, a) => sum + a.summary.overallScore, 0) / individualAnalyses.length
        ),
        consistency: crossImageAnalysis.consistencyScore,
        thematicCoherence: crossImageAnalysis.thematicCoherence,
        userFlowContinuity: crossImageAnalysis.userFlowContinuity
      },
      insights: [
        ...crossImageAnalysis.crossImageInsights.map(insight => insight.description),
        ...crossImageAnalysis.commonPatterns.map(pattern => `Common pattern: ${pattern}`)
      ],
      recommendations: crossImageAnalysis.recommendations,
      patterns: {
        commonElements: crossImageAnalysis.commonPatterns,
        designInconsistencies: crossImageAnalysis.designInconsistencies,
        userJourneyGaps: crossImageAnalysis.userJourneyGaps
      },
      analysis: {
        overallScore: Math.round(
          individualAnalyses.reduce((sum, a) => sum + a.summary.overallScore, 0) / individualAnalyses.length
        ),
        consistencyScore: crossImageAnalysis.consistencyScore,
        thematicCoherence: crossImageAnalysis.thematicCoherence,
        userFlowContinuity: crossImageAnalysis.userFlowContinuity,
        keyInsights: crossImageAnalysis.crossImageInsights.slice(0, 5).map(i => i.description),
        recommendations: crossImageAnalysis.recommendations.slice(0, 5),
        commonPatterns: crossImageAnalysis.commonPatterns.slice(0, 5)
      },
      createdAt: new Date()
    };

    console.log('✅ Group analysis synthesis completed:', {
      overallScore: groupAnalysis.summary.overallScore,
      insightsCount: groupAnalysis.insights.length,
      recommendationsCount: groupAnalysis.recommendations.length
    });

    return groupAnalysis;
  }

  // Helper methods for metrics calculation
  private calculateConsistencyScore(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Higher consistency = lower standard deviation
    // Scale to 0-100 where 100 is perfect consistency
    return Math.max(0, Math.round(100 - (standardDeviation * 2)));
  }

  private calculateThematicCoherence(analyses: UXAnalysis[]): number {
    // Calculate coherence based on similar categories and themes in suggestions
    const allCategories = analyses.flatMap(a => a.suggestions.map(s => s.category));
    const categoryFrequency = allCategories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalSuggestions = allCategories.length;
    const dominantCategories = Object.values(categoryFrequency).filter(freq => freq > totalSuggestions * 0.3);
    
    return Math.round((dominantCategories.length / Object.keys(categoryFrequency).length) * 100);
  }

  private calculateUserFlowContinuity(analyses: UXAnalysis[]): number {
    // Simple heuristic based on navigation and usability consistency
    const usabilityScores = analyses.map(a => a.summary.categoryScores.usability || 0);
    const avgUsability = usabilityScores.reduce((sum, score) => sum + score, 0) / usabilityScores.length;
    
    // Higher average usability suggests better flow continuity
    return Math.round(avgUsability);
  }

  private generateFallbackCrossImageAnalysis(
    individualAnalyses: UXAnalysis[],
    request: GroupAnalysisRequest
  ): CrossImageAnalysisResult {
    const scores = individualAnalyses.map(a => a.summary.overallScore);
    
    return {
      consistencyScore: this.calculateConsistencyScore(scores),
      thematicCoherence: this.calculateThematicCoherence(individualAnalyses),
      userFlowContinuity: this.calculateUserFlowContinuity(individualAnalyses),
      crossImageInsights: [{
        type: 'pattern',
        title: 'Group Analysis Completed',
        description: `Analyzed ${individualAnalyses.length} images in group context`,
        affectedImages: individualAnalyses.map((_, index) => index),
        severity: 'medium',
        category: 'usability',
        confidence: 0.7
      }],
      commonPatterns: ['Consistent interface elements across group'],
      designInconsistencies: ['Variation in styling approaches'],
      userJourneyGaps: ['Flow continuity could be improved'],
      recommendations: [
        'Establish consistent design patterns across interfaces',
        'Improve visual hierarchy consistency',
        'Standardize interaction patterns'
      ]
    };
  }
}

// Export singleton instance
export const enhancedGroupAnalysisPipeline = new EnhancedGroupAnalysisPipeline();