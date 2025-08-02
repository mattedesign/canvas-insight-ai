import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Brain, Settings } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ContextDetectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ContextDetection] Error boundary caught:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onRetry?.();
  };

  getErrorType = (error: Error): 'api' | 'parsing' | 'network' | 'unknown' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('api') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'api';
    }
    if (message.includes('parse') || message.includes('json') || message.includes('syntax')) {
      return 'parsing';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    return 'unknown';
  };

  getErrorMessage = (errorType: string): { title: string; description: string; suggestions: string[] } => {
    switch (errorType) {
      case 'api':
        return {
          title: 'API Configuration Issue',
          description: 'The AI service is not properly configured or accessible.',
          suggestions: [
            'Check that API keys are properly configured in Settings',
            'Verify your internet connection',
            'Try again in a few moments'
          ]
        };
      case 'parsing':
        return {
          title: 'Response Processing Error',
          description: 'The AI response could not be processed correctly.',
          suggestions: [
            'This is usually temporary - try analyzing again',
            'If the issue persists, try with a different image',
            'Check that the image is clear and well-lit'
          ]
        };
      case 'network':
        return {
          title: 'Network Connection Issue',
          description: 'Unable to connect to the AI analysis service.',
          suggestions: [
            'Check your internet connection',
            'Try again in a few moments',
            'If using a VPN, try disabling it temporarily'
          ]
        };
      default:
        return {
          title: 'Context Detection Failed',
          description: 'An unexpected error occurred during context detection.',
          suggestions: [
            'Try analyzing the image again',
            'If the issue persists, try with a different image',
            'Check the browser console for more details'
          ]
        };
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType(this.state.error);
      const errorDetails = this.getErrorMessage(errorType);

      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {errorDetails.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                {errorDetails.description}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Suggested Solutions:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {errorDetails.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={this.handleReset} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/settings'}
              >
                <Settings className="mr-2 h-4 w-4" />
                Check Settings
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}