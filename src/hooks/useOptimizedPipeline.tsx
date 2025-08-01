import { useState, useCallback } from 'react';
import { optimizedPipeline, OptimizedAnalysisPipeline } from '@/services/OptimizedAnalysisPipeline';
import { useToast } from '@/hooks/use-toast';

interface PipelineState {
  isAnalyzing: boolean;
  progress: number;
  stage: string;
  message: string;
  tokenUsage?: { used: number; remaining: number };
  error?: string;
  stages: Array<{
    stage: string;
    model: string;
    success: boolean;
    compressed?: boolean;
  }>;
}

interface OptimizedAnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  tokenStats?: { used: number; budget: number; efficiency: number };
  stages: any[];
}

export function useOptimizedPipeline() {
  const [state, setState] = useState<PipelineState>({
    isAnalyzing: false,
    progress: 0,
    stage: 'idle',
    message: 'Ready for analysis',
    stages: []
  });
  
  const { toast } = useToast();

  const handleProgress = useCallback((progress: any) => {
    setState(prev => ({
      ...prev,
      stage: progress.stage,
      progress: progress.progress,
      message: progress.message,
      tokenUsage: progress.tokenBudget
    }));
  }, []);

  const executeOptimizedAnalysis = useCallback(async (
    imageUrl: string,
    imageName: string,
    imageId: string,
    userContext?: string
  ): Promise<OptimizedAnalysisResult> => {
    setState({
      isAnalyzing: true,
      progress: 0,
      stage: 'initializing',
      message: 'Starting optimized analysis pipeline',
      stages: []
    });

    try {
      // Create new pipeline instance with progress callback
      const pipeline = new OptimizedAnalysisPipeline(handleProgress);
      
      // Reset any previous state
      pipeline.reset();

      // Execute the optimized pipeline
      const result = await pipeline.executeOptimizedPipeline(
        imageUrl,
        imageName,
        imageId,
        userContext
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          progress: 100,
          stage: 'complete',
          message: 'Analysis completed successfully',
          stages: result.stages.map(s => ({
            stage: s.stage,
            model: s.model,
            success: s.success,
            compressed: s.compressed
          }))
        }));

        const tokenStats = pipeline.getTokenStats();
        
        toast({
          title: "Optimized Analysis Complete",
          description: `Pipeline completed with ${tokenStats.efficiency}% token efficiency`,
        });

        return {
          success: true,
          data: result.data,
          tokenStats,
          stages: result.stages
        };
      } else {
        throw new Error(result.error || 'Pipeline failed');
      }

    } catch (error) {
      console.error('Optimized pipeline execution failed:', error);
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        message: 'Analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));

      // Show specific error messages for common issues
      let errorMessage = 'Analysis failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('422') || error.message.includes('character limit')) {
          errorMessage = 'Content too large. The optimized pipeline will automatically compress the data.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Analysis timed out. Please try with a smaller image or less context.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'API rate limit reached. Please wait a moment before trying again.';
        }
      }

      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        stages: []
      };
    }
  }, [handleProgress, toast]);

  const cancelAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAnalyzing: false,
      progress: 0,
      stage: 'cancelled',
      message: 'Analysis cancelled by user'
    }));

    toast({
      title: "Analysis Cancelled",
      description: "The analysis has been cancelled.",
    });
  }, [toast]);

  const resetPipeline = useCallback(() => {
    setState({
      isAnalyzing: false,
      progress: 0,
      stage: 'idle',
      message: 'Ready for analysis',
      stages: []
    });
    
    optimizedPipeline.reset();
  }, []);

  const getAnalysisStats = useCallback(() => {
    return optimizedPipeline.getTokenStats();
  }, []);

  return {
    // State
    isAnalyzing: state.isAnalyzing,
    progress: state.progress,
    stage: state.stage,
    message: state.message,
    tokenUsage: state.tokenUsage,
    error: state.error,
    stages: state.stages,
    
    // Actions
    executeOptimizedAnalysis,
    cancelAnalysis,
    resetPipeline,
    getAnalysisStats
  };
}

export default useOptimizedPipeline;