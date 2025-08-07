/**
 * React hook for Stability.ai analysis integration
 */

import { useState, useCallback } from 'react';
import { StabilityAnalysisService, StabilityAnalysisRequest, StabilityAnalysisResult } from '@/services/StabilityAnalysisService';
import { UXAnalysis } from '@/types/ux-analysis';
import { AnalysisContext } from '@/types/contextTypes';
import { toast } from 'sonner';

interface StabilityAnalysisState {
  isLoading: boolean;
  result: StabilityAnalysisResult | null;
  error: string | null;
}

export function useStabilityAnalysis() {
  const [state, setState] = useState<StabilityAnalysisState>({
    isLoading: false,
    result: null,
    error: null
  });

  const generateVisualSuggestions = useCallback(async (
    imageUrl: string,
    analysis: UXAnalysis,
    context?: AnalysisContext,
    generationType: 'suggestions' | 'mockups' | 'variations' | 'inpainting' = 'suggestions',
    userPreferences?: {
      style?: 'modern' | 'minimalist' | 'bold' | 'classic';
      colorScheme?: 'current' | 'high-contrast' | 'accessible' | 'brand-aligned';
      complexity?: 'simple' | 'detailed' | 'comprehensive';
    }
  ): Promise<StabilityAnalysisResult | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const request: StabilityAnalysisRequest = {
        imageUrl,
        analysis,
        context,
        generationType,
        userPreferences
      };

      const result = await StabilityAnalysisService.generateVisualSuggestions(request);
      
      setState(prev => ({ ...prev, result, isLoading: false }));

      if (result.success) {
        toast.success(`Generated ${result.visualSuggestions.length} visual suggestions`);
      } else {
        toast.error(result.error || 'Failed to generate visual suggestions');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(`Error generating visual suggestions: ${errorMessage}`);
      return null;
    }
  }, []);

  const generateMockups = useCallback(async (
    imageUrl: string,
    suggestions: any[],
    context?: AnalysisContext
  ): Promise<Array<{ suggestionId: string; imageUrl: string; prompt: string }>> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const mockups = await StabilityAnalysisService.generateMockups(imageUrl, suggestions, context);
      setState(prev => ({ ...prev, isLoading: false }));
      
      if (mockups.length > 0) {
        toast.success(`Generated ${mockups.length} mockups`);
      } else {
        toast.warning('No mockups were generated');
      }

      return mockups;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(`Error generating mockups: ${errorMessage}`);
      return [];
    }
  }, []);

  const performInpainting = useCallback(async (
    imageUrl: string,
    maskData: string,
    suggestion: any
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await StabilityAnalysisService.performInpainting(imageUrl, maskData, suggestion);
      setState(prev => ({ ...prev, isLoading: false }));

      if (result.success) {
        toast.success('Inpainting completed successfully');
      } else {
        toast.error(result.error || 'Inpainting failed');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(`Error performing inpainting: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }, []);

  const extractSuggestionsFromAnalysis = useCallback((
    analysis: UXAnalysis,
    context?: AnalysisContext
  ) => {
    return StabilityAnalysisService.extractVisualSuggestions(analysis, context);
  }, []);

  const clearCache = useCallback(() => {
    StabilityAnalysisService.clearCache();
    toast.success('Stability analysis cache cleared');
  }, []);

  const getCacheStats = useCallback(() => {
    return StabilityAnalysisService.getCacheStats();
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      result: null,
      error: null
    });
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    result: state.result,
    error: state.error,
    
    // Actions
    generateVisualSuggestions,
    generateMockups,
    performInpainting,
    extractSuggestionsFromAnalysis,
    clearCache,
    getCacheStats,
    reset,
    
    // Computed values
    visualSuggestions: state.result?.visualSuggestions || [],
    generatedImages: state.result?.generatedImages || [],
    analysisInsights: state.result?.analysisInsights || {
      visualOpportunities: [],
      designPatterns: [],
      accessibilityImprovements: [],
      conversionOptimizations: []
    }
  };
}