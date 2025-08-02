/**
 * Phase 5: Analysis Component Error Boundary
 * Specialized error boundary for analysis display components
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FileWarning, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PipelineRecoveryService } from '@/services/PipelineRecoveryService';

interface Props {
  children: ReactNode;
  analysisId?: string;
  imageUrl?: string;
  userContext?: string;
  onRetry?: () => void;
  onFallback?: (fallbackData: any) => void;
  fallbackComponent?: ReactNode;
  enableRecovery?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
  recoveryResult: any | null;
  lastErrorTimestamp: number;
}

export class AnalysisComponentErrorBoundary extends Component<Props, State> {
  private recoveryService = PipelineRecoveryService.getInstance();
  private errorReportingTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      recoveryResult: null,
      lastErrorTimestamp: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTimestamp: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AnalysisComponentErrorBoundary] Component error caught:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      analysisId: this.props.analysisId,
      timestamp: new Date().toISOString()
    });

    this.setState({ errorInfo });

    // Dispatch error event for monitoring
    window.dispatchEvent(new CustomEvent('analysis-component-error', {
      detail: {
        error: error.message,
        componentStack: errorInfo.componentStack,
        analysisId: this.props.analysisId,
        context: 'analysis-display',
        timestamp: new Date().toISOString()
      }
    }));

    // Schedule error reporting (debounced)
    if (this.errorReportingTimer) {
      clearTimeout(this.errorReportingTimer);
    }
    
    this.errorReportingTimer = setTimeout(() => {
      this.reportError(error, errorInfo);
    }, 1000);

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && this.shouldAttemptRecovery(error)) {
      this.attemptRecovery(error);
    }
  }

  componentWillUnmount() {
    if (this.errorReportingTimer) {
      clearTimeout(this.errorReportingTimer);
    }
  }

  private shouldAttemptRecovery(error: Error): boolean {
    const { maxRetries = 2 } = this.props;
    
    // Don't retry if we've exceeded max retries
    if (this.state.retryCount >= maxRetries) {
      return false;
    }

    // Don't retry if error occurred too recently (within 5 seconds)
    const timeSinceLastError = Date.now() - this.state.lastErrorTimestamp;
    if (timeSinceLastError < 5000) {
      return false;
    }

    // Check if error is recoverable
    return this.recoveryService.isTransientError(error);
  }

  private async attemptRecovery(error: Error) {
    const { imageUrl, userContext, analysisId } = this.props;
    
    if (!imageUrl || !userContext) {
      console.warn('[AnalysisComponentErrorBoundary] Cannot attempt recovery: missing required props');
      return;
    }

    this.setState({ isRecovering: true });

    try {
      const recoveryResult = await this.recoveryService.attemptRecovery(
        imageUrl,
        userContext,
        [], // No failed stages data available at component level
        error,
        {
          enablePartialRecovery: true,
          maxRetryAttempts: 1,
          retryDelayMs: 500,
          enableDegradedMode: true,
          logRecoveryAttempts: true
        }
      );

      if (recoveryResult.success && recoveryResult.data) {
        console.log('[AnalysisComponentErrorBoundary] Recovery successful:', recoveryResult.mode);
        
        this.setState({
          recoveryResult,
          isRecovering: false
        });

        // Notify parent component of fallback data
        if (this.props.onFallback) {
          this.props.onFallback(recoveryResult.data);
        }
      } else {
        console.warn('[AnalysisComponentErrorBoundary] Recovery failed:', recoveryResult.errors);
        this.setState({ isRecovering: false });
      }
    } catch (recoveryError) {
      console.error('[AnalysisComponentErrorBoundary] Recovery attempt failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  }

  private reportError(error: Error, errorInfo: React.ErrorInfo) {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      console.log('Would report error to tracking service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        analysisId: this.props.analysisId,
        url: window.location.href
      });
    }
  }

  handleRetry = async () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('[AnalysisComponentErrorBoundary] Max retries exceeded');
      return;
    }

    this.setState(prevState => ({ 
      retryCount: prevState.retryCount + 1,
      isRecovering: true 
    }));

    try {
      // Wait a moment before retry
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        recoveryResult: null
      });

      // Call parent retry handler
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    } catch (retryError) {
      console.error('[AnalysisComponentErrorBoundary] Retry failed:', retryError);
      this.setState({ isRecovering: false });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      recoveryResult: null,
      lastErrorTimestamp: 0
    });
  };

  getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    if (message.includes('out of memory') || message.includes('maximum call stack')) {
      return 'critical';
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'medium';
    }
    
    if (message.includes('validation') || message.includes('parsing')) {
      return 'low';
    }
    
    return 'high';
  }

  render() {
    const { children, fallbackComponent, analysisId } = this.props;
    const { hasError, error, isRecovering, recoveryResult, retryCount } = this.state;

    if (hasError) {
      // Use custom fallback if provided
      if (fallbackComponent) {
        return fallbackComponent;
      }

      // Show recovery result if available
      if (recoveryResult && recoveryResult.success) {
        return (
          <div className="space-y-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <FileWarning className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Analysis recovered in {recoveryResult.mode} mode</span>
                  <Badge variant="outline" className="text-xs">
                    {recoveryResult.mode}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
            
            {/* Render recovered data - this would be customized based on data structure */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results (Recovery Mode)</CardTitle>
                <CardDescription>
                  Results may be limited due to processing issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Recovery mode: {recoveryResult.mode}
                  <br />
                  Warnings: {recoveryResult.warnings?.length || 0}
                  <br />
                  Recovery steps: {recoveryResult.recoverySteps?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      const severity = error ? this.getErrorSeverity(error) : 'medium';
      const maxRetries = this.props.maxRetries || 3;
      const canRetry = retryCount < maxRetries;

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Analysis Display Error
              <Badge variant={severity === 'critical' ? 'destructive' : 'secondary'}>
                {severity}
              </Badge>
            </CardTitle>
            <CardDescription>
              An error occurred while displaying the analysis results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Information */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Error:</strong> {error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Analysis Context */}
            {analysisId && (
              <div className="text-sm text-muted-foreground">
                <strong>Analysis ID:</strong> {analysisId}
              </div>
            )}

            {/* Recovery Status */}
            {isRecovering && (
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Attempting to recover analysis data...
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {canRetry && !isRecovering && (
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry ({retryCount}/{maxRetries})
                </Button>
              )}
              
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>

              <Button
                onClick={() => window.open('/settings', '_blank')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>

            {/* Technical Details (Development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Technical Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono">
                  <div><strong>Error:</strong> {error.message}</div>
                  <div><strong>Retry Count:</strong> {retryCount}</div>
                  <div><strong>Recovery Enabled:</strong> {this.props.enableRecovery ? 'Yes' : 'No'}</div>
                  {error.stack && (
                    <div className="mt-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <div className="mt-2">
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}