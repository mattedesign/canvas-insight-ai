/**
 * ✅ PHASE 4.1: ROUTE ERROR BOUNDARY
 * Route-specific error boundaries with navigation recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Home, ArrowLeft, AlertTriangle } from 'lucide-react';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName: string;
  fallbackRoute?: string;
  enableNavigation?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  retryable?: boolean;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  shouldNavigateAway: boolean;
  fallbackRoute: string | null;
}

interface RouteError {
  type: 'navigation' | 'component' | 'data' | 'network' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000;

  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      shouldNavigateAway: false,
      fallbackRoute: null
    };
  }

  /**
   * ✅ PHASE 4.1: Catch and classify errors
   */
  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    console.error('[RouteErrorBoundary] Error caught:', error);
    
    return {
      hasError: true,
      error
    };
  }

  /**
   * ✅ PHASE 4.1: Handle error with detailed logging and classification
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const routeError = this.classifyError(error);
    
    console.error(`[RouteErrorBoundary] Route error in ${this.props.routeName}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      classification: routeError
    });

    const recoveryStrategy = this.determineRecoveryStrategy(routeError);
    this.setState({
      errorInfo,
      shouldNavigateAway: recoveryStrategy.shouldNavigateAway || false,
      fallbackRoute: recoveryStrategy.fallbackRoute || null
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service
    this.logErrorToMonitoring(error, errorInfo, routeError);
  }

  /**
   * ✅ PHASE 4.1: Classify error type and severity
   */
  private classifyError(error: Error): RouteError {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Navigation errors
    if (message.includes('navigation') || message.includes('route') || message.includes('history')) {
      return {
        type: 'navigation',
        severity: 'medium',
        recoverable: true,
        userMessage: 'There was a problem navigating to this page.',
        technicalMessage: error.message
      };
    }

    // Network/API errors
    if (message.includes('fetch') || message.includes('network') || message.includes('api')) {
      return {
        type: 'network',
        severity: 'medium',
        recoverable: true,
        userMessage: 'Unable to load data. Please check your connection.',
        technicalMessage: error.message
      };
    }

    // Data/state errors
    if (message.includes('undefined') || message.includes('null') || message.includes('state')) {
      return {
        type: 'data',
        severity: 'high',
        recoverable: true,
        userMessage: 'There was a problem loading the page data.',
        technicalMessage: error.message
      };
    }

    // Component rendering errors
    if (stack.includes('render') || message.includes('element') || message.includes('component')) {
      return {
        type: 'component',
        severity: 'high',
        recoverable: this.props.retryable !== false,
        userMessage: 'The page encountered a rendering error.',
        technicalMessage: error.message
      };
    }

    // Critical errors that require navigation
    if (message.includes('infinite') || message.includes('memory') || message.includes('maximum')) {
      return {
        type: 'unknown',
        severity: 'critical',
        recoverable: false,
        userMessage: 'A critical error occurred. Redirecting to safety.',
        technicalMessage: error.message
      };
    }

    // Default unknown error
    return {
      type: 'unknown',
      severity: 'medium',
      recoverable: this.props.retryable !== false,
      userMessage: 'An unexpected error occurred.',
      technicalMessage: error.message
    };
  }

  /**
   * ✅ PHASE 4.1: Determine recovery strategy based on error classification
   */
  private determineRecoveryStrategy(routeError: RouteError): { shouldNavigateAway?: boolean; fallbackRoute?: string | null } {
    // Critical errors require immediate navigation
    if (routeError.severity === 'critical') {
      return {
        shouldNavigateAway: true,
        fallbackRoute: this.props.fallbackRoute || '/'
      };
    }

    // Navigation errors should try fallback route
    if (routeError.type === 'navigation') {
      return {
        shouldNavigateAway: true,
        fallbackRoute: this.props.fallbackRoute || '/'
      };
    }

    // Other errors can be retried
    return {
      shouldNavigateAway: false,
      fallbackRoute: null
    };
  }

  /**
   * ✅ PHASE 4.1: Retry rendering the component
   */
  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn(`[RouteErrorBoundary] Max retries reached for ${this.props.routeName}`);
      this.setState({
        shouldNavigateAway: true,
        fallbackRoute: this.props.fallbackRoute || '/'
      });
      return;
    }

    console.log(`[RouteErrorBoundary] Retrying ${this.props.routeName} (attempt ${this.state.retryCount + 1})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // Delay retry to allow cleanup
    this.retryTimeout = setTimeout(() => {
      this.forceUpdate();
    }, this.retryDelay);
  };

  /**
   * ✅ PHASE 4.1: Navigate to home page
   */
  private handleNavigateHome = () => {
    this.setState({
      shouldNavigateAway: true,
      fallbackRoute: '/'
    });
  };

  /**
   * ✅ PHASE 4.1: Navigate to previous page
   */
  private handleNavigateBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.handleNavigateHome();
    }
  };

  /**
   * ✅ PHASE 4.1: Navigate to fallback route
   */
  private handleNavigateToFallback = () => {
    this.setState({
      shouldNavigateAway: true,
      fallbackRoute: this.props.fallbackRoute || '/'
    });
  };

  /**
   * ✅ PHASE 4.1: Log error to monitoring service
   */
  private logErrorToMonitoring(error: Error, errorInfo: ErrorInfo, routeError: RouteError) {
    // In a real application, this would send to your monitoring service
    const errorData = {
      route: this.props.routeName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo,
      classification: routeError,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('[RouteErrorBoundary] Error logged:', errorData);
    
    // You could send this to your monitoring service:
    // MonitoringService.logError(errorData);
  }

  /**
   * ✅ PHASE 4.1: Cleanup on unmount
   */
  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  /**
   * ✅ PHASE 4.1: Render error UI or redirect
   */
  render() {
    // Navigate away if required
    if (this.state.shouldNavigateAway && this.state.fallbackRoute) {
      return <Navigate to={this.state.fallbackRoute} replace />;
    }

    // Show error UI if there's an error
    if (this.state.hasError && this.state.error) {
      const routeError = this.classifyError(this.state.error);
      const canRetry = this.props.retryable !== false && 
                      routeError.recoverable && 
                      this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription>
                Error in {this.props.routeName}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {routeError.userMessage}
                </AlertDescription>
              </Alert>

              {process.env.NODE_ENV === 'development' && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs font-mono">
                    {routeError.technicalMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="default"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/${this.maxRetries})`}
                  </Button>
                )}

                {this.props.enableNavigation !== false && (
                  <>
                    <Button 
                      onClick={this.handleNavigateHome}
                      variant="outline"
                      className="w-full"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Go to Home
                    </Button>

                    <Button 
                      onClick={this.handleNavigateBack}
                      variant="outline"
                      className="w-full"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Go Back
                    </Button>

                    {this.props.fallbackRoute && this.props.fallbackRoute !== '/' && (
                      <Button 
                        onClick={this.handleNavigateToFallback}
                        variant="outline"
                        className="w-full"
                      >
                        Safe Mode
                      </Button>
                    )}
                  </>
                )}
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Error ID: {Date.now().toString(36)}
                {this.state.retryCount > 0 && ` • Retries: ${this.state.retryCount}`}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render children normally if no error
    return this.props.children;
  }
}

/**
 * ✅ PHASE 4.1: HOC for wrapping routes with error boundary
 */
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  routeName: string,
  options: Omit<RouteErrorBoundaryProps, 'children' | 'routeName'> = {}
) {
  const WrappedComponent = (props: P) => (
    <RouteErrorBoundary routeName={routeName} {...options}>
      <Component {...props} />
    </RouteErrorBoundary>
  );

  WrappedComponent.displayName = `withRouteErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * ✅ PHASE 4.1: Hook for route error reporting
 */
export function useRouteErrorReporting(routeName: string) {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.error(`[RouteError] ${routeName}${context ? ` - ${context}` : ''}:`, error);
    
    // In a real application, send to monitoring service
    const errorData = {
      route: routeName,
      context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // MonitoringService.logError(errorData);
  }, [routeName]);

  return { reportError };
}
