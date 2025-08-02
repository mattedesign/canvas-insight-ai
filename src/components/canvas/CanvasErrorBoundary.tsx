import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home, Undo2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onNavigateHome?: () => void;
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

export class CanvasErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

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
    console.error('Canvas Error Boundary caught an error:', error, errorInfo);
    
    // Log specific canvas-related errors for debugging
    if (error.message.includes('dimensions') || error.message.includes('Cannot read properties of undefined')) {
      console.error('Dimension-related canvas error detected:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    console.log('[CanvasErrorBoundary] Attempting recovery...');
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1,
      canRollback: false
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
    if (this.props.onRecovery) {
      this.props.onRecovery();
    }
  };

  handleStateRollback = () => {
    console.log('[CanvasErrorBoundary] Attempting state rollback...');
    
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

  handleNavigateHome = () => {
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const isDimensionError = this.state.error?.message?.includes('dimensions') || 
                               this.state.error?.message?.includes('Cannot read properties of undefined');
      const hasExceededRetries = this.state.retryCount >= this.maxRetries;

      return (
        <Card className="max-w-2xl mx-auto m-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Canvas Rendering Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The canvas failed to render properly. This might be due to:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {isDimensionError ? (
                <>
                  <li>Missing or invalid image dimensions data</li>
                  <li>Corrupted image metadata in the database</li>
                  <li>Images uploaded before dimension tracking was implemented</li>
                </>
              ) : (
                <>
                  <li>Large number of images causing memory issues</li>
                  <li>Complex canvas layout calculations</li>
                  <li>Browser rendering limitations</li>
                </>
              )}
              <li>Temporary component state issues</li>
            </ul>
            
            {hasExceededRetries && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Canvas failed to load after multiple attempts. Try navigating to a different page.
                </p>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer">Error Details (Development)</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-2 pt-4">
              {(this.props.enableRecovery !== false) && !hasExceededRetries && (
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again ({this.state.retryCount}/{this.maxRetries})
                </Button>
              )}
              
              {this.props.enableStateRollback && this.state.canRollback && (
                <Button onClick={this.handleStateRollback} variant="outline">
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reset Canvas
                </Button>
              )}
              
              <Button onClick={this.handleNavigateHome} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}