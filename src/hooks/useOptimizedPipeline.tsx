import { useState, useCallback, useRef } from 'react';
import { BoundaryPushingPipeline } from '@/services/BoundaryPushingPipeline';
import { AnalysisContext } from '@/types/contextTypes';

interface PipelineState {
  isAnalyzing: boolean;
  progress: number;
  stage: string;
  analysisContext?: AnalysisContext;
  requiresClarification: boolean;
  clarificationQuestions?: string[];
  message?: string;
  error?: string;
  tokenUsage?: any;
  stages?: any[];
}

export function useOptimizedPipeline() {
  const [state, setState] = useState<PipelineState>({
    isAnalyzing: false,
    progress: 0,
    stage: 'idle',
    requiresClarification: false
  });

  const pipelineRef = useRef<BoundaryPushingPipeline | null>(null);

  const handleProgress = useCallback((progress: number, stage: string) => {
    setState(prev => ({
      ...prev,
      progress,
      stage
    }));
  }, []);

  const executeAnalysis = useCallback(async (
    imageUrl: string,
    userContext: string
  ) => {
    setState({
      isAnalyzing: true,
      progress: 0,
      stage: 'initializing',
      requiresClarification: false
    });

    try {
      pipelineRef.current = new BoundaryPushingPipeline();
      
      const result = await pipelineRef.current.execute(
        imageUrl,
        userContext,
        handleProgress
      );

      if (result.requiresClarification) {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          requiresClarification: true,
          clarificationQuestions: result.clarificationQuestions,
          analysisContext: result.partialContext
        }));
        return { requiresClarification: true, questions: result.clarificationQuestions };
      }

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 100,
        stage: 'complete',
        analysisContext: result.analysisContext
      }));

      return { success: true, data: result };

    } catch (error) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 0,
        stage: 'error'
      }));

      throw error;
    }
  }, [handleProgress]);

  const resumeWithClarification = useCallback(async (
    clarificationResponses: Record<string, string>,
    resumeToken: string,
    imageUrl: string,
    userContext: string
  ) => {
    if (!pipelineRef.current) {
      throw new Error('No active pipeline to resume');
    }

    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      requiresClarification: false,
      stage: 'resuming'
    }));

    try {
      const result = await pipelineRef.current.resumeWithClarification(
        resumeToken,
        clarificationResponses,
        imageUrl,
        userContext,
        handleProgress
      );
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 100,
        stage: 'complete',
        analysisContext: result.analysisContext
      }));

      return { success: true, data: result };

    } catch (error) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        stage: 'error'
      }));

      throw error;
    }
  }, [handleProgress]);

  const cancelAnalysis = useCallback(() => {
    if (pipelineRef.current) {
      pipelineRef.current.cancel();
    }
    
    setState({
      isAnalyzing: false,
      progress: 0,
      stage: 'cancelled',
      requiresClarification: false
    });
  }, []);

  // Backwards compatibility wrapper
  const executeOptimizedAnalysis = useCallback(async (
    imageUrl: string,
    imageName: string,
    imageId: string,
    userContext?: string
  ) => {
    return executeAnalysis(imageUrl, userContext || '');
  }, [executeAnalysis]);

  const resetPipeline = useCallback(() => {
    cancelAnalysis();
  }, [cancelAnalysis]);

  return {
    isAnalyzing: state.isAnalyzing,
    progress: state.progress,
    stage: state.stage,
    analysisContext: state.analysisContext,
    requiresClarification: state.requiresClarification,
    clarificationQuestions: state.clarificationQuestions,
    message: state.message,
    error: state.error,
    tokenUsage: state.tokenUsage,
    stages: state.stages,
    executeAnalysis,
    executeOptimizedAnalysis,
    resumeWithClarification,
    cancelAnalysis,
    resetPipeline
  };
}