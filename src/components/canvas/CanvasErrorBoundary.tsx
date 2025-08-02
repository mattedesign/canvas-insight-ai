import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
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
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
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
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
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