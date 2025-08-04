/**
 * Natural Analysis Pipeline
 * Orchestrates natural AI insights collection and interpretation
 */

import { supabase } from '@/integrations/supabase/client';
import { AnalysisContext } from '@/types/contextTypes';
import { UXAnalysis } from '@/types/ux-analysis';
import { AnalysisDataMapper } from './AnalysisDataMapper';

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
   * Execute natural analysis pipeline
   */
  async execute(
    imageUrl: string,
    userContext?: string,
    analysisContext?: AnalysisContext,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<NaturalAnalysisExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Starting Natural Analysis Pipeline:', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        hasUserContext: !!userContext,
        hasAnalysisContext: !!analysisContext
      });

      onProgress?.(10, 'Collecting natural AI insights...');

      // Step 1: Collect natural responses from AI models
      const naturalResult = await this.collectNaturalInsights({
        imageUrl,
        userContext,
        analysisContext,
        models: ['openai', 'claude', 'google']
      });

      onProgress?.(50, 'Interpreting AI insights...');

      // Step 2: Interpret raw responses into actionable insights
      const interpretedResult = await this.interpretInsights({
        rawResponses: naturalResult.rawResponses,
        analysisContext,
        userContext,
        imageUrl
      });

      onProgress?.(80, 'Synthesizing analysis...');

      // Step 3: Convert interpreted insights to UXAnalysis format
      const synthesizedAnalysis = this.synthesizeToUXAnalysis(
        interpretedResult,
        naturalResult,
        imageUrl,
        userContext
      );

      onProgress?.(100, 'Analysis complete!');

      const executionTime = Date.now() - startTime;

      console.log('✅ Natural Analysis Pipeline completed:', {
        totalInsights: interpretedResult.insights?.length || 0,
        confidenceScore: interpretedResult.summary?.confidenceScore || 0,
        executionTime
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
      console.error('❌ Natural Analysis Pipeline failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * Collect natural insights from AI models
   */
  private async collectNaturalInsights(request: NaturalAnalysisRequest): Promise<NaturalAnalysisResult> {
    console.log('🎯 Collecting natural insights...');
    
    const { data, error } = await supabase.functions.invoke('natural-ai-analysis', {
      body: request
    });

    if (error) {
      console.error('❌ Natural analysis collection failed:', error);
      throw new Error(`Natural analysis failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Interpret raw AI responses into structured insights
   */
  private async interpretInsights(request: {
    rawResponses: ModelResponse[];
    analysisContext?: AnalysisContext;
    userContext?: string;
    imageUrl?: string;
  }): Promise<InterpreterResult> {
    console.log('🧠 Interpreting insights...');
    
    const { data, error } = await supabase.functions.invoke('ai-insight-interpreter', {
      body: request
    });

    if (error) {
      console.error('❌ Insight interpretation failed:', error);
      throw new Error(`Insight interpretation failed: ${error.message}`);
    }

    return data;
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