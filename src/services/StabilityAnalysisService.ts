/**
 * Stability Analysis Service
 * Bridges UX analysis results with Stability.ai visual generation capabilities
 */

import { UXAnalysis } from '@/types/ux-analysis';
import { AnalysisContext } from '@/types/contextTypes';
import { supabase } from '@/integrations/supabase/client';

export interface VisualSuggestion {
  id: string;
  type: 'mockup' | 'improvement' | 'variation' | 'inpainting';
  title: string;
  description: string;
  prompt: string;
  targetElement?: string;
  maskData?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export interface StabilityAnalysisRequest {
  imageUrl: string;
  analysis: UXAnalysis;
  context?: AnalysisContext;
  generationType: 'suggestions' | 'mockups' | 'variations' | 'inpainting';
  userPreferences?: {
    style?: 'modern' | 'minimalist' | 'bold' | 'classic';
    colorScheme?: 'current' | 'high-contrast' | 'accessible' | 'brand-aligned';
    complexity?: 'simple' | 'detailed' | 'comprehensive';
  };
}

export interface StabilityAnalysisResult {
  success: boolean;
  visualSuggestions: VisualSuggestion[];
  generatedImages?: Array<{
    suggestionId: string;
    imageUrl: string;
    prompt: string;
    model: string;
  }>;
  analysisInsights: {
    visualOpportunities: string[];
    designPatterns: string[];
    accessibilityImprovements: string[];
    conversionOptimizations: string[];
  };
  error?: string;
}

export class StabilityAnalysisService {
  private static readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private static cache = new Map<string, { data: StabilityAnalysisResult; timestamp: number }>();

  /**
   * Analyzes UX analysis results and generates visual suggestions using Stability.ai
   */
  static async generateVisualSuggestions(request: StabilityAnalysisRequest): Promise<StabilityAnalysisResult> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Call Supabase edge function for Stability.ai integration
      const { data, error } = await supabase.functions.invoke('stability-analysis', {
        body: request
      });

      if (error) {
        throw new Error(`Stability analysis failed: ${error.message}`);
      }

      const result: StabilityAnalysisResult = data;

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Error in generateVisualSuggestions:', error);
      return {
        success: false,
        visualSuggestions: [],
        analysisInsights: {
          visualOpportunities: [],
          designPatterns: [],
          accessibilityImprovements: [],
          conversionOptimizations: []
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generates specific visual mockups based on UX issues
   */
  static async generateMockups(
    imageUrl: string,
    suggestions: VisualSuggestion[],
    context?: AnalysisContext
  ): Promise<Array<{ suggestionId: string; imageUrl: string; prompt: string }>> {
    try {
      const { data, error } = await supabase.functions.invoke('stability-mockup-generator', {
        body: {
          imageUrl,
          suggestions,
          context
        }
      });

      if (error) {
        throw new Error(`Mockup generation failed: ${error.message}`);
      }

      return data.generatedMockups || [];
    } catch (error) {
      console.error('Error in generateMockups:', error);
      return [];
    }
  }

  /**
   * Performs inpainting based on specific UX recommendations
   */
  static async performInpainting(
    imageUrl: string,
    maskData: string,
    suggestion: VisualSuggestion
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('inpainting-service', {
        body: {
          imageUrl,
          maskData,
          prompt: suggestion.prompt,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        throw new Error(`Inpainting failed: ${error.message}`);
      }

      return { success: true, imageUrl: data.imageUrl };
    } catch (error) {
      console.error('Error in performInpainting:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Extracts visual suggestions from UX analysis results
   */
  static extractVisualSuggestions(analysis: UXAnalysis, context?: AnalysisContext): VisualSuggestion[] {
    const suggestions: VisualSuggestion[] = [];

    // Extract from suggestions (general UX suggestions)
    if (analysis.suggestions) {
      analysis.suggestions.forEach((suggestion, index) => {
        if (suggestion.impact === 'high' || suggestion.impact === 'medium') {
          suggestions.push({
            id: `suggestion-${index}`,
            type: 'improvement',
            title: `${suggestion.category}: ${suggestion.title}`,
            description: suggestion.description,
            prompt: this.generatePromptFromSuggestion(suggestion, context),
            priority: suggestion.impact as 'high' | 'medium' | 'low',
            estimatedImpact: `${suggestion.impact} impact improvement in ${suggestion.category}`
          });
        }
      });
    }

    // Extract from visual annotations
    if (analysis.visualAnnotations) {
      analysis.visualAnnotations.forEach((annotation, index) => {
        if (annotation.severity === 'high' || annotation.severity === 'medium') {
          suggestions.push({
            id: `annotation-${index}`,
            type: 'inpainting',
            title: `Fix: ${annotation.title}`,
            description: annotation.description,
            prompt: this.generatePromptFromAnnotation(annotation, context),
            priority: annotation.severity as 'high' | 'medium' | 'low',
            estimatedImpact: `Address ${annotation.type} issue at specific location`
          });
        }
      });
    }

    // Add some default suggestions if none found
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'default-improvement',
        type: 'mockup',
        title: 'Visual Enhancement',
        description: 'General visual improvements based on modern UX principles',
        prompt: this.generateDefaultPrompt(context),
        priority: 'medium',
        estimatedImpact: 'Modernize interface with current design trends'
      });
    }

    return suggestions;
  }

  private static generateCacheKey(request: StabilityAnalysisRequest): string {
    const keyData = {
      imageUrl: request.imageUrl,
      generationType: request.generationType,
      analysisHash: this.hashAnalysis(request.analysis),
      preferences: request.userPreferences
    };
    return btoa(JSON.stringify(keyData));
  }

  private static hashAnalysis(analysis: UXAnalysis): string {
    const relevantData = {
      suggestions: analysis.suggestions?.length || 0,
      visualAnnotations: analysis.visualAnnotations?.length || 0,
      summaryScore: analysis.summary?.overallScore || 0
    };
    return btoa(JSON.stringify(relevantData));
  }

  private static generatePromptFromSuggestion(suggestion: any, context?: AnalysisContext): string {
    const interfaceType = context?.image?.primaryType || 'interface';
    return `Create an improved ${interfaceType} design that addresses the ${suggestion.category} issue: ${suggestion.description}. Focus on modern UX best practices and visual clarity.`;
  }

  private static generatePromptFromAnnotation(annotation: any, context?: AnalysisContext): string {
    const interfaceType = context?.image?.primaryType || 'interface';
    return `Design an improved ${interfaceType} element that fixes the ${annotation.type} issue: ${annotation.description}. Focus on the specific area and maintain overall design consistency.`;
  }

  private static generateDefaultPrompt(context?: AnalysisContext): string {
    const interfaceType = context?.image?.primaryType || 'interface';
    const domain = context?.image?.domain || 'general';
    return `Create a modern, accessible ${interfaceType} design for the ${domain} domain. Focus on clean typography, proper spacing, intuitive navigation, and current design trends.`;
  }

  /**
   * Clears the analysis cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}