import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProgressiveAnalysisLoader, AnalysisCache, PerformanceOptimizer } from '@/services/AnalysisOptimizationService';
import { naturalAnalysisPipeline } from '@/services/NaturalAnalysisPipeline';
import { AnalysisContext } from '@/types/contextTypes';
import { useFilteredToast } from '@/hooks/use-filtered-toast';

console.log('🔍 BUILD DEBUG: useOptimizedAnalysis hook loading...');

export interface AnalysisProgress {
  stage: string;
  progress: number;
  isLoading: boolean;
  error?: string;
}

interface AnalyzeImageOptions {
  useNaturalPipeline?: boolean;
  analysisContext?: AnalysisContext;
}

export const useOptimizedAnalysis = () => {
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: '',
    progress: 0,
    isLoading: false
  });
  
  const { toast } = useFilteredToast();
  const currentRequestRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const updateProgress = useCallback((stage: string, progress: number) => {
    setProgress(prev => ({
      ...prev,
      stage,
      progress,
      isLoading: progress < 100
    }));
  }, []);

  const analyzeImage = useCallback(async (
    imageUrl: string, 
    payload: any, 
    options: AnalyzeImageOptions = {}
  ) => {
    const optimizedImageUrl = PerformanceOptimizer.optimizeImageForAnalysis(imageUrl);
    startTimeRef.current = Date.now();
    
    try {
      setProgress({
        stage: 'Starting analysis...',
        progress: 0,
        isLoading: true
      });

      // Check if using natural pipeline
      if (options.useNaturalPipeline) {
        console.log('🎯 Using Natural Analysis Pipeline via ux-analysis function');
        
        setProgress({ stage: 'Starting natural analysis...', progress: 10, isLoading: true });
        
        const { data, error } = await supabase.functions.invoke('ux-analysis', {
          body: {
            type: 'NATURAL_ANALYSIS',
            payload: {
              imageUrl: optimizedImageUrl,
              userContext: payload.userContext,
              analysisContext: options.analysisContext,
              naturalMode: true
            }
          }
        });
        
        if (error) {
          throw new Error(`Natural analysis failed: ${error.message}`);
        }
        
        if (!data || !data.analysis) {
          throw new Error('Invalid response from natural analysis');
        }

        const duration = Date.now() - startTimeRef.current;
        PerformanceOptimizer.trackAnalysis(duration, false);

        setProgress({
          stage: 'Complete',
          progress: 100,
          isLoading: false
        });

        // Cache the result
        AnalysisCache.set(optimizedImageUrl, 'image', data.analysis, payload.userContext);
        
        // Flag as natural analysis to bypass client-side validation
        const result = {
          ...data.analysis,
          _isNaturalAnalysis: true
        };
        
        console.log('🎯 Natural analysis complete, bypassing validation:', {
          hasResult: !!result,
          hasData: !!data.analysis,
          resultKeys: result ? Object.keys(result) : [],
          hasSummary: !!result.summary,
          summaryKeys: result.summary ? Object.keys(result.summary) : []
        });
        
        return result;
      }

      // Original pipeline logic
      const cached = AnalysisCache.get(optimizedImageUrl, 'image', payload.userContext);
      if (cached) {
        const duration = Date.now() - startTimeRef.current;
        PerformanceOptimizer.trackAnalysis(duration, true);
        
        setProgress({
          stage: 'Loaded from cache',
          progress: 100,
          isLoading: false
        });
        
        return cached;
      }

      const result = await ProgressiveAnalysisLoader.loadAnalysis(
        optimizedImageUrl,
        'image',
        { ...payload, imageUrl: optimizedImageUrl },
        updateProgress
      );

      const duration = Date.now() - startTimeRef.current;
      PerformanceOptimizer.trackAnalysis(duration, false);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setProgress({
        stage: 'Error',
        progress: 0,
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  }, [updateProgress]);

  const analyzeGroup = useCallback(async (imageUrls: string[], payload: any) => {
    const optimizedUrls = imageUrls.map(url => PerformanceOptimizer.optimizeImageForAnalysis(url));
    startTimeRef.current = Date.now();
    
    try {
      setProgress({
        stage: 'Starting group analysis...',
        progress: 0,
        isLoading: true
      });

      // Check cache for group analysis
      const cacheKey = optimizedUrls.join(',');
      const cached = AnalysisCache.get(cacheKey, 'group', payload.prompt);
      if (cached) {
        const duration = Date.now() - startTimeRef.current;
        PerformanceOptimizer.trackAnalysis(duration, true);
        
        setProgress({
          stage: 'Loaded from cache',
          progress: 100,
          isLoading: false
        });
        
        return cached;
      }

      const result = await ProgressiveAnalysisLoader.loadAnalysis(
        cacheKey,
        'group',
        { ...payload, imageUrls: optimizedUrls },
        updateProgress
      );

      const duration = Date.now() - startTimeRef.current;
      PerformanceOptimizer.trackAnalysis(duration, false);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Group analysis failed';
      
      // Show user-friendly error notification
      toast({
        category: 'error',
        title: 'Group Analysis Failed',
        description: errorMessage.includes('validation') 
          ? 'Analysis completed but results could not be processed. Please try again.'
          : 'Network error or AI service unavailable. Please check your connection and try again.'
      });
      
      setProgress({
        stage: 'Error',
        progress: 0,
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  }, [updateProgress, toast]);

  const generateConcept = useCallback(async (imageUrl: string, analysisData: any) => {
    const optimizedImageUrl = PerformanceOptimizer.optimizeImageForAnalysis(imageUrl);
    startTimeRef.current = Date.now();
    
    try {
      setProgress({
        stage: 'Generating concept...',
        progress: 0,
        isLoading: true
      });

      // Check cache for concept generation
      const cacheKey = `${optimizedImageUrl}-${JSON.stringify(analysisData.summary)}`;
      const cached = AnalysisCache.get(cacheKey, 'concept');
      if (cached) {
        const duration = Date.now() - startTimeRef.current;
        PerformanceOptimizer.trackAnalysis(duration, true);
        
        setProgress({
          stage: 'Loaded from cache',
          progress: 100,
          isLoading: false
        });
        
        return cached;
      }

      const result = await ProgressiveAnalysisLoader.loadAnalysis(
        cacheKey,
        'concept',
        { 
          imageUrl: optimizedImageUrl,
          analysisData 
        },
        updateProgress
      );

      const duration = Date.now() - startTimeRef.current;
      PerformanceOptimizer.trackAnalysis(duration, false);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Concept generation failed';
      setProgress({
        stage: 'Error',
        progress: 0,
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  }, [updateProgress]);

  const batchAnalyzeImages = useCallback(async (requests: Array<{ imageUrl: string; payload: any }>) => {
    setProgress({
      stage: 'Processing batch...',
      progress: 0,
      isLoading: true
    });

    try {
      const analysisRequests = requests.map(req => 
        () => analyzeImage(req.imageUrl, req.payload)
      );

      const results = await PerformanceOptimizer.batchAnalysis(analysisRequests);
      
      setProgress({
        stage: 'Batch completed',
        progress: 100,
        isLoading: false
      });

      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch analysis failed';
      setProgress({
        stage: 'Error',
        progress: 0,
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  }, [analyzeImage]);

  const cancelAnalysis = useCallback(() => {
    ProgressiveAnalysisLoader.cancelAnalysis();
    setProgress({
      stage: 'Cancelled',
      progress: 0,
      isLoading: false
    });
  }, []);

  const clearCache = useCallback((type?: 'image' | 'group' | 'concept') => {
    AnalysisCache.clear(type);
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    return {
      ...PerformanceOptimizer.getMetrics(),
      cacheStats: AnalysisCache.getStats()
    };
  }, []);

  return {
    progress,
    analyzeImage,
    analyzeGroup,
    generateConcept,
    batchAnalyzeImages,
    cancelAnalysis,
    clearCache,
    getPerformanceMetrics
  };
};