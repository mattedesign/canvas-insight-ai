import { useState, useCallback } from 'react';
import { AnalysisContext } from '@/types/contextTypes';
import { optimizedContextPipeline } from '@/services/OptimizedContextDetectionPipeline';
import { useToast } from '@/hooks/use-toast';

interface UseOptimizedContextDetectionProps {
  onContextDetected?: (context: AnalysisContext) => void;
  onError?: (error: Error) => void;
}

export function useOptimizedContextDetection({
  onContextDetected,
  onError
}: UseOptimizedContextDetectionProps = {}) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [context, setContext] = useState<AnalysisContext | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const { toast } = useToast();

  const detectContext = useCallback(async (
    imageData: {
      url?: string;
      base64?: string;
      metadata?: any;
    },
    userInput?: string,
    options: {
      useConfidenceRouting?: boolean;
      minConfidence?: number;
    } = {}
  ) => {
    setIsDetecting(true);
    
    try {
      console.log('[useOptimizedContext] Starting context detection');
      
      let detectedContext: AnalysisContext;
      
      if (options.useConfidenceRouting) {
        detectedContext = await optimizedContextPipeline.detectContextWithConfidenceRouting(
          imageData,
          userInput,
          options.minConfidence
        );
      } else {
        detectedContext = await optimizedContextPipeline.detectContext(
          imageData,
          userInput
        );
      }
      
      setContext(detectedContext);
      setPerformance(optimizedContextPipeline.getPerformanceMetrics());
      
      // Show success feedback
      if (detectedContext.confidence >= 0.7) {
        toast({
          title: "Context Detected",
          description: `Successfully identified ${detectedContext.image.primaryType} interface with high confidence`,
        });
      } else if (detectedContext.clarificationNeeded) {
        toast({
          title: "Context Needs Clarification",
          description: "Additional information needed for accurate analysis",
          variant: "default"
        });
      }
      
      onContextDetected?.(detectedContext);
      return detectedContext;
      
    } catch (error) {
      console.error('[useOptimizedContext] Detection failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Context Detection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      onError?.(error as Error);
      throw error;
      
    } finally {
      setIsDetecting(false);
    }
  }, [onContextDetected, onError, toast]);

  const detectBatchContext = useCallback(async (
    images: Array<{
      url?: string;
      base64?: string;
      metadata?: any;
    }>,
    userInput?: string
  ) => {
    setIsDetecting(true);
    
    try {
      console.log(`[useOptimizedContext] Starting batch detection for ${images.length} images`);
      
      const contexts = await optimizedContextPipeline.detectContextBatch(images, userInput);
      setPerformance(optimizedContextPipeline.getPerformanceMetrics());
      
      toast({
        title: "Batch Processing Complete",
        description: `Processed ${contexts.length} images successfully`,
      });
      
      return contexts;
      
    } catch (error) {
      console.error('[useOptimizedContext] Batch detection failed:', error);
      
      toast({
        title: "Batch Processing Failed",
        description: "Some images could not be processed",
        variant: "destructive"
      });
      
      throw error;
      
    } finally {
      setIsDetecting(false);
    }
  }, [toast]);

  const clearCache = useCallback(() => {
    optimizedContextPipeline.clearCaches();
    toast({
      title: "Cache Cleared",
      description: "Context detection cache has been cleared",
    });
  }, [toast]);

  const resetMetrics = useCallback(() => {
    optimizedContextPipeline.resetMetrics();
    setPerformance(optimizedContextPipeline.getPerformanceMetrics());
    toast({
      title: "Metrics Reset",
      description: "Performance metrics have been reset",
    });
  }, [toast]);

  return {
    // State
    isDetecting,
    context,
    performance,
    
    // Actions
    detectContext,
    detectBatchContext,
    clearCache,
    resetMetrics,
    
    // Utilities
    getPerformanceMetrics: () => optimizedContextPipeline.getPerformanceMetrics()
  };
}