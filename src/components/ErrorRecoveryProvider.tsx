/**
 * ErrorRecoveryProvider - Enhanced error boundary with state rollback capabilities
 * Phase 1, Step 1.1: Enhanced Error Boundary System
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Undo2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  name: string;
  enableRecovery?: boolean;
  enableStateRollback?: boolean;
  onRecovery?: () => void;
  onStateRollback?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  canRollback: boolean;
}

export class ErrorRecoveryProvider extends Component<Props, State> {
  private lastGoodState: any = null;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      canRollback: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      canRollback: true
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorRecoveryProvider:${this.props.name}] Error caught:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    });

    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Store last good state when there's no error
    if (!this.state.hasError && prevState.hasError) {
      this.lastGoodState = null;
    } else if (!this.state.hasError) {
      // Store current state as last good state
      this.lastGoodState = { timestamp: Date.now() };
    }
  }

  handleRecovery = () => {
    console.log(`[ErrorRecoveryProvider:${this.props.name}] Attempting recovery...`);
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
      canRollback: false
    });

    if (this.props.onRecovery) {
      this.props.onRecovery();
    }
  };

  handleStateRollback = () => {
    console.log(`[ErrorRecoveryProvider:${this.props.name}] Attempting state rollback...`);
    
    if (this.props.onStateRollback) {
      this.props.onStateRollback();
    }
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
      canRollback: false
    });
  };

  handleReload = () => {
    console.log(`[ErrorRecoveryProvider:${this.props.name}] Reloading page...`);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-2xl mx-auto my-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error in {this.props.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Something went wrong in this component:</p>
              <p className="mt-1">{this.state.error?.message}</p>
              <p className="text-xs mt-2">Error ID: {this.state.errorId}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {this.props.enableRecovery && (
                <Button onClick={this.handleRecovery} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
              
              {this.props.enableStateRollback && this.state.canRollback && (
                <Button onClick={this.handleStateRollback} variant="outline">
                  <Undo2 className="mr-2 h-4 w-4" />
                  Rollback State
                </Button>
              )}
              
              <Button onClick={this.handleReload} variant="secondary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
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