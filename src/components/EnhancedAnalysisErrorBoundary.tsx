/**
 * Phase 1: Enhanced Error Boundary for Analysis Components
 * Catches and recovers from pipeline-related errors
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Settings, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ValidationService } from '@/services/ValidationService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
  maxRetries?: number;
  context?: 'analysis' | 'vision' | 'synthesis' | 'storage';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  validationErrors: any[];
}

export class EnhancedAnalysisErrorBoundary extends Component<Props, State> {
  private validationService = ValidationService.getInstance();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      validationErrors: []
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[EnhancedAnalysisErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context
    });

    // Get validation errors for additional context
    const validationStats = this.validationService.getValidationStats();
    const recentValidationErrors = this.validationService.getValidationHistory()
      .slice(-5)
      .filter(result => !result.isValid);

    this.setState({
      errorInfo,
      validationErrors: recentValidationErrors
    });

    // Dispatch custom event for monitoring
    window.dispatchEvent(new CustomEvent('analysis-error', {
      detail: {
        error: error.message,
        context: this.props.context,
        componentStack: errorInfo.componentStack,
        validationStats,
        timestamp: new Date().toISOString()
      }
    }));

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = async () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('[EnhancedAnalysisErrorBoundary] Max retries reached');
      return;
    }

    this.setState({ isRetrying: true });

    try {
      // Clear validation history before retry
      this.validationService.clearHistory();
      
      // Wait a moment before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.props.onRetry?.();
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false,
        validationErrors: []
      });
    } catch (retryError) {
      console.error('[EnhancedAnalysisErrorBoundary] Retry failed:', retryError);
      this.setState({ 
        isRetrying: false,
        error: retryError instanceof Error ? retryError : new Error('Retry failed')
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  getErrorType(error: Error): 'validation' | 'api' | 'parsing' | 'network' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('api') || message.includes('401') || message.includes('403')) {
      return 'api';
    }
    if (message.includes('json') || message.includes('parse')) {
      return 'parsing';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    
    return 'unknown';
  }

  getErrorMessage(errorType: string): { title: string; description: string; suggestions: string[] } {
    const suggestions = {
      validation: {
        title: 'Data Validation Error',
        description: 'The analysis pipeline encountered invalid data that couldn\'t be processed.',
        suggestions: [
          'Try uploading a different image with clearer content',
          'Check if the image contains recognizable UI elements',
          'Verify your internet connection and try again'
        ]
      },
      api: {
        title: 'API Configuration Error',
        description: 'There\'s an issue with the AI model configuration or API keys.',
        suggestions: [
          'Check API key configuration in Settings',
          'Verify your subscription status',
          'Contact support if the issue persists'
        ]
      },
      parsing: {
        title: 'Response Parsing Error',
        description: 'The AI response couldn\'t be processed correctly.',
        suggestions: [
          'This is usually temporary - try again',
          'Check for any recent system updates',
          'Contact support if the error continues'
        ]
      },
      network: {
        title: 'Network Connection Error',
        description: 'Unable to connect to the analysis service.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again'
        ]
      },
      unknown: {
        title: 'Unexpected Error',
        description: 'An unexpected error occurred during analysis.',
        suggestions: [
          'Try refreshing the page',
          'Clear your browser cache',
          'Contact support with the error details below'
        ]
      }
    };

    return suggestions[errorType] || suggestions.unknown;
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType(this.state.error!);
      const errorMessage = this.getErrorMessage(errorType);
      const maxRetries = this.props.maxRetries || 3;
      const canRetry = this.state.retryCount < maxRetries;

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {errorMessage.title}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {errorMessage.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Suggested Solutions */}
            <div>
              <h4 className="font-medium mb-2">Suggested Solutions:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {errorMessage.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Validation Errors */}
            {this.state.validationErrors.length > 0 && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Recent Validation Issues:</div>
                  <div className="text-sm space-y-1">
                    {this.state.validationErrors.slice(0, 3).map((result, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        {result.errors[0]?.message || 'Validation error'}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {this.state.isRetrying ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Try Again ({this.state.retryCount}/{maxRetries})
                </Button>
              )}
              
              <Button
                onClick={this.handleReload}
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
                Check Settings
              </Button>
            </div>

            {/* Technical Details (Development Mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Technical Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono">
                  <div><strong>Error:</strong> {this.state.error.message}</div>
                  <div className="mt-2"><strong>Context:</strong> {this.props.context || 'unknown'}</div>
                  {this.state.error.stack && (
                    <div className="mt-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{this.state.error.stack}</pre>
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

    return this.props.children;
  }
}