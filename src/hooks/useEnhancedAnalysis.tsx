import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UXAnalysis, GeneratedConcept } from '@/types/ux-analysis';
import { useToast } from '@/hooks/use-toast';

interface AnalysisQualityMetrics {
  annotationCount: number;
  suggestionCount: number;
  domainRelevance: number;
  implementationFeasibility: number;
  overallQuality: number;
}

interface EnhancedAnalysisState {
  isAnalyzing: boolean;
  progress: number;
  stage: string;
  error?: string;
  qualityMetrics?: AnalysisQualityMetrics;
}

export function useEnhancedAnalysis() {
  const [state, setState] = useState<EnhancedAnalysisState>({
    isAnalyzing: false,
    progress: 0,
    stage: 'idle'
  });
  const { toast } = useToast();

  const validateAnalysisQuality = useCallback((analysis: any): AnalysisQualityMetrics => {
    const annotationCount = analysis.visualAnnotations?.length || 0;
    const suggestionCount = analysis.suggestions?.length || 0;
    
    // Domain relevance scoring based on content specificity
    const hasSpecificTitles = analysis.suggestions?.some((s: any) => 
      s.title && s.title.length > 20 && !s.title.includes('Generic')
    ) || false;
    
    const hasDetailedDescriptions = analysis.suggestions?.some((s: any) => 
      s.description && s.description.length > 50
    ) || false;
    
    const domainRelevance = (hasSpecificTitles ? 50 : 0) + (hasDetailedDescriptions ? 50 : 0);
    
    // Implementation feasibility based on action items
    const hasActionItems = analysis.suggestions?.every((s: any) => 
      s.actionItems && s.actionItems.length > 0
    ) || false;
    
    const implementationFeasibility = hasActionItems ? 100 : 30;
    
    // Overall quality score
    const annotationScore = Math.min(annotationCount * 12.5, 100); // Max 8 annotations
    const suggestionScore = Math.min(suggestionCount * 16.6, 100); // Max 6 suggestions
    
    const overallQuality = (
      annotationScore * 0.3 + 
      suggestionScore * 0.3 + 
      domainRelevance * 0.25 + 
      implementationFeasibility * 0.15
    );

    return {
      annotationCount,
      suggestionCount,
      domainRelevance,
      implementationFeasibility,
      overallQuality: Math.round(overallQuality)
    };
  }, []);

  const performEnhancedAnalysis = useCallback(async (
    imageUrl: string,
    imageName: string,
    imageId: string,
    userContext?: string,
    aiModel?: string
  ) => {
    setState({
      isAnalyzing: true,
      progress: 0,
      stage: 'initializing'
    });

    try {
      // Stage 1: Domain detection
      setState(prev => ({ ...prev, progress: 20, stage: 'detecting domain context' }));
      
      // Stage 2: AI analysis
      setState(prev => ({ ...prev, progress: 40, stage: 'performing AI analysis' }));
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_IMAGE',
          payload: {
            imageId,
            imageUrl,
            imageName,
            userContext
          },
          aiModel: aiModel || 'auto'
        }
      });

      if (error) {
        throw new Error(error.message || 'Analysis failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Analysis failed');
      }

      // Stage 3: Quality validation
      setState(prev => ({ ...prev, progress: 80, stage: 'validating analysis quality' }));
      
      const qualityMetrics = validateAnalysisQuality(data.data);
      
      // Log quality metrics for improvement tracking
      console.log('Analysis Quality Metrics:', qualityMetrics);
      
      // Warn if quality is below threshold
      if (qualityMetrics.overallQuality < 60) {
        toast({
          title: "Analysis Quality Notice",
          description: `Analysis quality: ${qualityMetrics.overallQuality}%. Consider retrying with more context.`,
          variant: "default"
        });
      }

      setState({
        isAnalyzing: false,
        progress: 100,
        stage: 'completed',
        qualityMetrics
      });

      toast({
        title: "Analysis Complete",
        description: `Generated ${qualityMetrics.annotationCount} annotations and ${qualityMetrics.suggestionCount} suggestions`,
      });

      return {
        success: true,
        data: data.data,
        qualityMetrics
      };

    } catch (error) {
      console.error('Enhanced analysis failed:', error);
      
      setState({
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });

      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }, [toast, validateAnalysisQuality]);

  const generateEnhancedConcept = useCallback(async (
    analysisData: UXAnalysis,
    imageUrl?: string,
    imageName?: string
  ) => {
    setState({
      isAnalyzing: true,
      progress: 0,
      stage: 'generating concept'
    });

    try {
      setState(prev => ({ ...prev, progress: 30, stage: 'analyzing design context' }));
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'GENERATE_CONCEPT',
          payload: {
            analysisData,
            imageUrl,
            imageName
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Concept generation failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Concept generation failed');
      }

      setState(prev => ({ ...prev, progress: 100, stage: 'concept generated' }));

      toast({
        title: "Concept Generated",
        description: "Enhanced design concept created based on analysis insights",
      });

      return {
        success: true,
        data: data.data
      };

    } catch (error) {
      console.error('Enhanced concept generation failed:', error);
      
      setState({
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Concept generation failed'
      });

      toast({
        title: "Concept Generation Failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Concept generation failed'
      };
    }
  }, [toast]);

  const resetState = useCallback(() => {
    setState({
      isAnalyzing: false,
      progress: 0,
      stage: 'idle'
    });
  }, []);

  return {
    ...state,
    performEnhancedAnalysis,
    generateEnhancedConcept,
    resetState
  };
}