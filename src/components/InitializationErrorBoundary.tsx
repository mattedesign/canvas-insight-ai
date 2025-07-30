import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * ✅ PHASE 3.2: INITIALIZATION ERROR BOUNDARY
 * Catches initialization errors and provides retry mechanism
 * Implements proper error boundaries for failed data loads
 */
export class InitializationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // ✅ PHASE 3.2: Update state when error occurs
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ✅ PHASE 3.2: Log initialization errors
    console.error('[Initialization Error Boundary] Caught error:', {
      error,
      errorInfo,
      retryCount: this.state.retryCount,
    });

    // ✅ PHASE 3.2: Fire error event for monitoring
    window.dispatchEvent(new CustomEvent('initializationError', {
      detail: {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      }
    }));
  }

  handleRetry = async () => {
    const { onRetry, maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('[Initialization Error Boundary] Max retries exceeded');
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: retryCount + 1,
    });

    try {
      // ✅ PHASE 3.2: Call retry callback if provided
      if (onRetry) {
        await onRetry();
      }

      // ✅ PHASE 3.2: Reset error state on successful retry
      this.setState({
        hasError: false,
        error: null,
        isRetrying: false,
      });

      console.log('[Initialization Error Boundary] Retry successful');
    } catch (retryError) {
      console.error('[Initialization Error Boundary] Retry failed:', retryError);
      
      this.setState({
        isRetrying: false,
        error: retryError instanceof Error ? retryError : new Error('Retry failed'),
      });
    }
  };

  render() {
    const { children, fallback, maxRetries = 3 } = this.props;
    const { hasError, error, retryCount, isRetrying } = this.state;

    if (hasError) {
      // ✅ PHASE 3.2: Custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // ✅ PHASE 3.2: Default error UI with retry
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Initialization Error</AlertTitle>
              <AlertDescription className="mt-2">
                {error?.message || 'An unexpected error occurred during app initialization.'}
                {retryCount > 0 && (
                  <p className="mt-2 text-sm">
                    Retry attempt: {retryCount}/{maxRetries}
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={this.handleRetry}
                disabled={isRetrying || retryCount >= maxRetries}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry ({maxRetries - retryCount} left)
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>

            {error?.stack && (
              <details className="mt-4 p-2 bg-muted rounded text-xs">
                <summary className="cursor-pointer mb-2">Error Details</summary>
                <pre className="whitespace-pre-wrap">{error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}