import { useState, useCallback } from 'react';
import { resilientPipeline, ResilientAnalysisPipeline } from '@/services/ResilientAnalysisPipeline';
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
    error?: string;
    retryCount?: number;
  }>;
  successfulStages: number;
  totalStages: number;
  qualityScore: number;
  isPartialResult: boolean;
}

interface ResilientAnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  qualityMetrics?: {
    completeness: number;
    dataRichness: number;
    analysisDepth: number;
    overallQuality: number;
  };
  stages: any[];
  partialResult: boolean;
}

export function useResilientPipeline() {
  const [state, setState] = useState<PipelineState>({
    isAnalyzing: false,
    progress: 0,
    stage: 'idle',
    message: 'Ready for resilient analysis',
    stages: [],
    successfulStages: 0,
    totalStages: 3,
    qualityScore: 0,
    isPartialResult: false
  });
  
  const { toast } = useToast();

  const handleProgress = useCallback((progress: any) => {
    setState(prev => ({
      ...prev,
      stage: progress.stage,
      progress: progress.progress,
      message: progress.message,
      tokenUsage: progress.tokenBudget,
      successfulStages: progress.successfulStages || 0,
      totalStages: progress.totalStages || 3,
      qualityScore: progress.qualityScore || 0
    }));
  }, []);

  const executeResilientAnalysis = useCallback(async (
    imageUrl: string,
    imageName: string,
    imageId: string,
    userContext?: string
  ): Promise<ResilientAnalysisResult> => {
    setState({
      isAnalyzing: true,
      progress: 0,
      stage: 'initializing',
      message: 'Starting resilient analysis pipeline',
      stages: [],
      successfulStages: 0,
      totalStages: 3,
      qualityScore: 0,
      isPartialResult: false
    });

    try {
      // Create new pipeline instance with progress callback
      const pipeline = new ResilientAnalysisPipeline(handleProgress);
      
      // Reset any previous state
      pipeline.reset();

      // Execute the resilient pipeline
      const result = await pipeline.executeResilientPipeline(
        imageUrl,
        imageName,
        imageId,
        userContext
      );

      const successfulStages = result.stages.filter(s => s.success).length;
      const isPartialResult = result.partialResult;

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 100,
        stage: 'complete',
        message: isPartialResult 
          ? `Partial analysis completed - ${successfulStages}/${result.stages.length} stages successful`
          : 'Complete analysis finished successfully',
        stages: result.stages.map(s => ({
          stage: s.stage,
          model: s.model,
          success: s.success,
          compressed: s.compressed,
          error: s.error,
          retryCount: s.retryCount
        })),
        successfulStages,
        totalStages: result.stages.length,
        qualityScore: result.qualityMetrics?.overallQuality || 0,
        isPartialResult
      }));

      const tokenStats = pipeline.getTokenStats();
      
      // Show appropriate toast based on result quality
      if (result.success) {
        if (isPartialResult) {
          toast({
            title: "Partial Analysis Complete",
            description: `${successfulStages}/${result.stages.length} stages completed. Quality: ${result.qualityMetrics?.overallQuality}%`,
            variant: "default"
          });
        } else {
          toast({
            title: "Complete Analysis Successful",
            description: `All stages completed with ${result.qualityMetrics?.overallQuality}% quality score`,
          });
        }
      } else {
        toast({
          title: "Analysis Failed",
          description: "All pipeline stages failed. Please check connectivity and try again.",
          variant: "destructive"
        });
      }

      return {
        success: result.success,
        data: result.data,
        qualityMetrics: result.qualityMetrics,
        stages: result.stages,
        partialResult: isPartialResult
      };

    } catch (error) {
      console.error('Resilient pipeline execution failed:', error);
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        message: 'Pipeline initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));

      toast({
        title: "Pipeline Error",
        description: "Failed to initialize analysis pipeline. Please try again.",
        variant: "destructive"
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pipeline failed',
        stages: [],
        partialResult: false
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
      description: "The resilient analysis has been cancelled.",
    });
  }, [toast]);

  const resetPipeline = useCallback(() => {
    setState({
      isAnalyzing: false,
      progress: 0,
      stage: 'idle',
      message: 'Ready for resilient analysis',
      stages: [],
      successfulStages: 0,
      totalStages: 3,
      qualityScore: 0,
      isPartialResult: false
    });
    
    resilientPipeline.reset();
  }, []);

  const getAnalysisStats = useCallback(() => {
    return resilientPipeline.getTokenStats();
  }, []);

  const getQualityIndicator = useCallback(() => {
    if (state.qualityScore >= 80) return { level: 'excellent', color: 'text-green-600' };
    if (state.qualityScore >= 60) return { level: 'good', color: 'text-blue-600' };
    if (state.qualityScore >= 40) return { level: 'partial', color: 'text-yellow-600' };
    return { level: 'limited', color: 'text-orange-600' };
  }, [state.qualityScore]);

  const getStageHealthSummary = useCallback(() => {
    const total = state.stages.length;
    const successful = state.successfulStages;
    const failed = total - successful;
    
    return {
      successful,
      failed,
      total,
      healthPercentage: total > 0 ? Math.round((successful / total) * 100) : 0
    };
  }, [state.stages.length, state.successfulStages]);

  return {
    // State
    isAnalyzing: state.isAnalyzing,
    progress: state.progress,
    stage: state.stage,
    message: state.message,
    tokenUsage: state.tokenUsage,
    error: state.error,
    stages: state.stages,
    successfulStages: state.successfulStages,
    totalStages: state.totalStages,
    qualityScore: state.qualityScore,
    isPartialResult: state.isPartialResult,
    
    // Actions
    executeResilientAnalysis,
    cancelAnalysis,
    resetPipeline,
    getAnalysisStats,
    
    // Quality indicators
    getQualityIndicator,
    getStageHealthSummary
  };
}

export default useResilientPipeline;