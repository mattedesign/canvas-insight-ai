import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UXAnalysis, GeneratedConcept } from '@/types/ux-analysis';
import { useToast } from '@/hooks/use-toast';
import { enhancedDomainDetector, DomainAnalysis } from '@/services/EnhancedDomainDetector';
import { retryService, RetryState } from '@/services/RetryService';

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
  domainAnalysis?: DomainAnalysis;
  retryState?: RetryState;
  canRetry?: boolean;
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
      stage: 'initializing',
      canRetry: false
    });

    try {
      // Stage 1: Enhanced Domain Detection
      setState(prev => ({ ...prev, progress: 15, stage: 'analyzing domain context' }));
      
      const domainAnalysis = enhancedDomainDetector.detectDomain(imageName, userContext);
      console.log('Domain Analysis:', domainAnalysis);
      
      setState(prev => ({ 
        ...prev, 
        progress: 25, 
        stage: `detected ${domainAnalysis.uiType}`,
        domainAnalysis 
      }));

      // Stage 2: AI analysis with retry logic
      setState(prev => ({ ...prev, progress: 30, stage: 'performing AI analysis' }));
      
      const analysisWrapper = retryService.createAnalysisRetryWrapper();
      
      const analysisResult = await analysisWrapper.retryAnalysis(
        async () => {
          console.log(`🔄 [Enhanced Analysis] Starting analysis request:`, {
            imageId,
            imageName,
            userContextLength: userContext?.length || 0,
            domainType: domainAnalysis.uiType,
            modelPreference: aiModel || 'auto'
          });
          
          const { data, error } = await supabase.functions.invoke('ux-analysis', {
            body: {
              type: 'ANALYZE_IMAGE',
              payload: {
                imageId,
                imageUrl,
                imageName,
                userContext: userContext ? `${userContext}\n\nDomain Context: ${domainAnalysis.uiType} - ${domainAnalysis.characteristics.join(', ')}` : `Domain Context: ${domainAnalysis.uiType}`,
                domainInstructions: enhancedDomainDetector.getDomainInstructions(domainAnalysis.detectedDomain)
              },
              aiModel: aiModel || 'auto'
            }
          });

          console.log(`📥 [Enhanced Analysis] Edge function response:`, {
            hasData: !!data,
            hasError: !!error,
            dataKeys: data ? Object.keys(data) : [],
            errorMessage: error?.message
          });

          if (error) {
            console.error(`❌ [Enhanced Analysis] Edge function error:`, error);
            throw new Error(error.message || 'Analysis failed');
          }

          if (!data?.success) {
            console.error(`❌ [Enhanced Analysis] Analysis failed:`, data?.error);
            throw new Error(data?.error || 'Analysis failed');
          }

          // 🚨 CRITICAL: Check for fallback data usage
          if (data.debugInfo?.fallbacksUsed > 0) {
            console.warn(`⚠️ [Enhanced Analysis] FALLBACK DATA DETECTED!`, {
              fallbacksUsed: data.debugInfo.fallbacksUsed,
              pipelineSuccess: data.debugInfo.pipelineSuccess,
              stages: data.debugInfo.stages,
              availableAPIs: data.debugInfo.availableAPIs
            });
          }

          return data;
        },
        (retryState) => {
          setState(prev => ({ 
            ...prev, 
            retryState,
            stage: retryService.formatRetryState(retryState),
            progress: 30 + (retryState.attempts.length * 10)
          }));
        }
      );

      // Stage 3: Quality validation
      setState(prev => ({ ...prev, progress: 80, stage: 'validating analysis quality' }));
      
      const qualityMetrics = validateAnalysisQuality(analysisResult.data);
      
      // Enhanced quality scoring with domain context
      if (domainAnalysis.confidence > 70) {
        qualityMetrics.domainRelevance = Math.min(qualityMetrics.domainRelevance + 20, 100);
      }
      
      console.log('Enhanced Analysis Quality Metrics:', qualityMetrics);
      
      // Quality feedback with retry suggestion
      if (qualityMetrics.overallQuality < 60) {
        setState(prev => ({ ...prev, canRetry: true }));
        toast({
          title: "Analysis Quality Notice",
          description: `Analysis quality: ${qualityMetrics.overallQuality}%. Domain: ${domainAnalysis.uiType}. Consider retrying with more specific context.`,
          variant: "default"
        });
      }

      setState({
        isAnalyzing: false,
        progress: 100,
        stage: 'completed',
        qualityMetrics,
        domainAnalysis,
        canRetry: qualityMetrics.overallQuality < 60
      });

      // Analysis completion - real data only
      toast({
        title: "Analysis Complete",
        description: `Generated ${qualityMetrics.annotationCount} annotations and ${qualityMetrics.suggestionCount} suggestions for ${domainAnalysis.uiType}`,
        variant: "default"
      });
      // COMMENTED OUT: Regular success toast
      // else {
      //   toast({
      //     title: "Analysis Complete",
      //     description: `Generated ${qualityMetrics.annotationCount} annotations and ${qualityMetrics.suggestionCount} suggestions for ${domainAnalysis.uiType}`,
      //     variant: "default"
      //   });
      // }

      return {
        success: true,
        data: analysisResult.data,
        qualityMetrics,
        domainAnalysis
      };

    } catch (error) {
      console.error('Enhanced analysis failed:', error);
      
      const canRetry = retryService.isRetryableError(error);
      
      setState({
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed',
        canRetry
      });

      toast({
        title: "Analysis Failed",
        description: canRetry 
          ? `${error instanceof Error ? error.message : 'Analysis failed'}. Retry available.`
          : error instanceof Error ? error.message : 'Please check your configuration and try again',
        variant: "destructive"
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        canRetry
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
      stage: 'generating concept',
      canRetry: false
    });

    try {
      setState(prev => ({ ...prev, progress: 20, stage: 'authenticating user' }));
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated');
      }

      setState(prev => ({ ...prev, progress: 30, stage: 'analyzing design context' }));
      
      const conceptWrapper = retryService.createAnalysisRetryWrapper();
      
      const conceptResult = await conceptWrapper.retryConceptGeneration(
        async () => {
          const { data, error } = await supabase.functions.invoke('ux-analysis', {
            body: {
              type: 'GENERATE_CONCEPT',
              payload: {
                analysisData,
                imageUrl,
                imageName,
                userId: userData.user.id,
                imageId: analysisData.imageId
              }
            }
          });

          if (error) {
            throw new Error(error.message || 'Concept generation failed');
          }

          if (!data?.success) {
            throw new Error(data?.error || 'Concept generation failed');
          }

          return data;
        },
        (retryState) => {
          setState(prev => ({ 
            ...prev, 
            retryState,
            stage: `generating concept - ${retryService.formatRetryState(retryState)}`,
            progress: 30 + (retryState.attempts.length * 15)
          }));
        }
      );

      setState(prev => ({ ...prev, progress: 100, stage: 'concept generated' }));

      toast({
        title: "Concept Generated",
        description: "Enhanced design concept created based on analysis insights",
      });

      return {
        success: true,
        data: conceptResult.data
      };

    } catch (error) {
      console.error('Enhanced concept generation failed:', error);
      
      const canRetry = retryService.isRetryableError(error);
      
      setState({
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Concept generation failed',
        canRetry
      });

      toast({
        title: "Concept Generation Failed",
        description: canRetry 
          ? `${error instanceof Error ? error.message : 'Concept generation failed'}. Retry available.`
          : error instanceof Error ? error.message : 'Please check your configuration and try again',
        variant: "destructive"
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Concept generation failed',
        canRetry
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