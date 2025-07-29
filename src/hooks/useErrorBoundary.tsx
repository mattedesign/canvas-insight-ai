/**
 * Error Boundary Hook - Enhanced error handling and recovery
 * Provides graceful error handling with recovery options
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFilteredToast } from './use-filtered-toast';

export interface ErrorInfo {
  error: Error;
  errorInfo?: React.ErrorInfo;
  timestamp: Date;
  componentStack?: string;
  retryCount: number;
  context?: Record<string, unknown>;
}

interface UseErrorBoundaryOptions {
  maxRetries?: number;
  enableLogging?: boolean;
  onError?: (errorInfo: ErrorInfo) => void;
  onRecovery?: () => void;
  fallbackComponent?: React.ComponentType<{ error: ErrorInfo; onRetry: () => void }>;
}

export function useErrorBoundary(options: UseErrorBoundaryOptions = {}) {
  const {
    maxRetries = 3,
    enableLogging = true,
    onError,
    onRecovery,
  } = options;
  
  const [error, setError] = useState<ErrorInfo | null>(null);
  const { toast } = useFilteredToast();
  const retryTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  
  const logError = useCallback((errorInfo: ErrorInfo) => {
    if (enableLogging) {
      console.group('🚨 Error Boundary Triggered');
      console.error('Error:', errorInfo.error);
      console.log('Timestamp:', errorInfo.timestamp);
      console.log('Retry count:', errorInfo.retryCount);
      if (errorInfo.context) {
        console.log('Context:', errorInfo.context);
      }
      if (errorInfo.componentStack) {
        console.log('Component stack:', errorInfo.componentStack);
      }
      console.groupEnd();
    }
  }, [enableLogging]);
  
  const captureError = useCallback((
    error: Error, 
    errorInfo?: React.ErrorInfo,
    context?: Record<string, unknown>
  ) => {
    const errorData: ErrorInfo = {
      error,
      errorInfo,
      timestamp: new Date(),
      componentStack: errorInfo?.componentStack,
      retryCount: 0,
      context,
    };
    
    setError(errorData);
    logError(errorData);
    onError?.(errorData);
    
    toast({
      title: "Something went wrong",
      description: error.message,
      variant: "destructive",
    });
  }, [logError, onError, toast]);
  
  const retry = useCallback(() => {
    if (!error) return;
    
    if (error.retryCount >= maxRetries) {
      toast({
        title: "Max retries reached",
        description: "Please refresh the page or contact support.",
        variant: "destructive",
      });
      return;
    }
    
    const newRetryCount = error.retryCount + 1;
    const updatedError = { ...error, retryCount: newRetryCount };
    
    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 5000);
    
    const timeout = setTimeout(() => {
      setError(null);
      onRecovery?.();
      retryTimeouts.current.delete(timeout);
      
      toast({
        title: "Attempting recovery...",
        description: `Retry ${newRetryCount}/${maxRetries}`,
      });
    }, delay);
    
    retryTimeouts.current.add(timeout);
    setError(updatedError);
  }, [error, maxRetries, onRecovery, toast]);
  
  const clearError = useCallback(() => {
    setError(null);
    onRecovery?.();
  }, [onRecovery]);
  
  const reportError = useCallback((error: Error, context?: Record<string, unknown>) => {
    // This can be extended to send errors to a logging service
    captureError(error, undefined, context);
  }, [captureError]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
    };
  }, []);
  
  return {
    error,
    hasError: error !== null,
    captureError,
    retry,
    clearError,
    reportError,
    canRetry: error ? error.retryCount < maxRetries : false,
  };
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryOptions: UseErrorBoundaryOptions = {}
) {
  return function WrappedComponent(props: P) {
    const { error, hasError, retry, captureError } = useErrorBoundary(errorBoundaryOptions);
    
    useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        captureError(event.error);
      };
      
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        captureError(new Error(event.reason));
      };
      
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, [captureError]);
    
    if (hasError && error) {
      if (errorBoundaryOptions.fallbackComponent) {
        const FallbackComponent = errorBoundaryOptions.fallbackComponent;
        return <FallbackComponent error={error} onRetry={retry} />;
      }
      
      return (
        <div className="p-4 border border-destructive rounded-lg">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error.error.message}
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

// Async error handling hook
export function useAsyncError() {
  const { reportError } = useErrorBoundary();
  
  const executeAsync = useCallback(
    async function<T>(
      asyncFn: () => Promise<T>,
      context?: Record<string, unknown>
    ): Promise<T | null> {
      try {
        return await asyncFn();
      } catch (error) {
        reportError(error instanceof Error ? error : new Error(String(error)), context);
        return null;
      }
    }, 
    [reportError]
  );
  
  return { executeAsync };
}