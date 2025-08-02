import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Undo2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  enableStateRollback?: boolean;
  onRecovery?: () => void;
  onStateRollback?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  canRollback: boolean;
}

export class AnalysisErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      canRollback: false 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      canRollback: true 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Analysis Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    console.log('[AnalysisErrorBoundary] Attempting recovery...');
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1,
      canRollback: false
    });

    if (this.props.onRecovery) {
      this.props.onRecovery();
    }
  };

  handleStateRollback = () => {
    console.log('[AnalysisErrorBoundary] Attempting state rollback...');
    
    if (this.props.onStateRollback) {
      this.props.onStateRollback();
    }
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: 0,
      canRollback: false
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const hasExceededRetries = this.state.retryCount >= this.maxRetries;

      return (
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Something went wrong during the analysis process. This might be due to:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Network connectivity issues</li>
              <li>API service temporarily unavailable</li>
              <li>Image processing problems</li>
              <li>Server capacity limits</li>
            </ul>
            
            {hasExceededRetries && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Multiple retry attempts failed. Try refreshing the page or check your connection.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {(this.props.enableRecovery !== false) && !hasExceededRetries && (
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again ({this.state.retryCount}/{this.maxRetries})
                </Button>
              )}
              
              {this.props.enableStateRollback && this.state.canRollback && (
                <Button onClick={this.handleStateRollback} variant="outline">
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reset State
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Developer Details
                </summary>
                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
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