import { useState, useCallback } from 'react';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import type { AnalysisError } from '@/components/EnhancedErrorHandler';
import { createAnalysisError } from '@/components/EnhancedErrorHandler';

interface RetryState {
  count: number;
  isRetrying: boolean;
  lastError: AnalysisError | null;
}

interface EnhancedErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToastOnError?: boolean;
  autoRetryNetworkErrors?: boolean;
}

export const useEnhancedErrorHandling = (options: EnhancedErrorHandlingOptions = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToastOnError = true,
    autoRetryNetworkErrors = true
  } = options;

  const { toast } = useFilteredToast();
  const [retryState, setRetryState] = useState<RetryState>({
    count: 0,
    isRetrying: false,
    lastError: null
  });

  const [progressState, setProgressState] = useState({
    loading: false,
    progress: 0
  });

  const clearError = useCallback(() => {
    setRetryState({
      count: 0,
      isRetrying: false,
      lastError: null
    });
  }, []);

  const setProgress = useCallback((progress: number, loading: boolean = true) => {
    setProgressState({ progress, loading });
  }, []);

  const handleError = useCallback(async (
    error: Error | string | AnalysisError,
    context?: string
  ): Promise<void> => {
    let analysisError: AnalysisError;

    if (typeof error === 'string') {
      analysisError = createAnalysisError('unknown', error);
    } else if ('type' in error && 'message' in error && 'retryable' in error) {
      analysisError = error;
    } else {
      // Parse common error types from Error objects
      const errorMessage = error.message || 'Unknown error occurred';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        analysisError = createAnalysisError('network', 'Network connection failed', errorMessage);
      } else if (errorMessage.includes('timeout')) {
        analysisError = createAnalysisError('timeout', 'Analysis request timed out', errorMessage);
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        analysisError = createAnalysisError('validation', 'Invalid data received', errorMessage);
      } else if (errorMessage.includes('API') || errorMessage.includes('server')) {
        analysisError = createAnalysisError('api', 'AI service error', errorMessage);
      } else {
        analysisError = createAnalysisError('unknown', errorMessage, error.stack);
      }
    }

    setRetryState(prev => ({
      ...prev,
      lastError: analysisError,
      isRetrying: false
    }));

    if (showToastOnError) {
      toast({
        title: "Analysis Error",
        description: analysisError.message,
        category: "error"
      });
    }

    console.error('Enhanced error handling:', {
      context,
      error: analysisError,
      retryCount: retryState.count
    });
  }, [showToastOnError, toast, retryState.count]);

  const retry = useCallback(async (operation: () => Promise<any>): Promise<any> => {
    if (!retryState.lastError?.retryable || retryState.count >= maxRetries) {
      throw new Error('Cannot retry: not retryable or max retries reached');
    }

    setRetryState(prev => ({
      ...prev,
      count: prev.count + 1,
      isRetrying: true
    }));

    // Add delay before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * retryState.count));
    }

    try {
      const result = await operation();
      
      // Success - clear error state
      setRetryState({
        count: 0,
        isRetrying: false,
        lastError: null
      });

      toast({
        description: "Analysis completed successfully!",
        category: "success"
      });

      return result;
    } catch (error) {
      setRetryState(prev => ({
        ...prev,
        isRetrying: false
      }));

      // Re-handle the error for potential further retries
      await handleError(error as Error, 'retry-operation');
      throw error;
    }
  }, [retryState, maxRetries, retryDelay, handleError, toast]);

  const executeWithErrorHandling = useCallback(async (
    operation: () => Promise<any>,
    context: string = 'operation',
    onProgress?: (progress: number) => void
  ): Promise<any> => {
    try {
      clearError();
      setProgress(0, true);
      
      if (onProgress) onProgress(0);

      const result = await operation();
      
      setProgress(100, false);
      if (onProgress) onProgress(100);

      return result;
    } catch (error) {
      setProgress(0, false);
      await handleError(error as Error, context);
      
      // Auto-retry network errors if enabled
      if (autoRetryNetworkErrors && 
          retryState.lastError?.type === 'network' && 
          retryState.count < maxRetries) {
        try {
          return await retry(operation);
        } catch (retryError) {
          // Final failure after retry
          return null;
        }
      }
      
      return null;
    }
  }, [clearError, setProgress, handleError, autoRetryNetworkErrors, retryState, maxRetries, retry]);

  const canRetry = retryState.lastError?.retryable && retryState.count < maxRetries;

  return {
    error: retryState.lastError,
    isRetrying: retryState.isRetrying,
    retryCount: retryState.count,
    maxRetries,
    canRetry,
    loading: progressState.loading,
    progress: progressState.progress,
    handleError,
    clearError,
    retry,
    setProgress,
    executeWithErrorHandling
  };
};