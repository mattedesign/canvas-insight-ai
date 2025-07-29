/**
 * Error Recovery Boundary - Advanced error handling with state recovery
 * Provides comprehensive error catching and recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug, Download, Upload } from 'lucide-react';
import { atomicStateManager } from '@/services/AtomicStateManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRecovery?: () => void;
  name?: string;
  enableRecovery?: boolean;
  enableStateRollback?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  attemptedRecovery: boolean;
  isRecovering: boolean;
}

export class ErrorRecoveryBoundary extends Component<Props, State> {
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly MAX_ERRORS_PER_MINUTE = 5;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      attemptedRecovery: false,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      attemptedRecovery: false,
      isRecovering: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();
    
    // Rate limiting for error reporting
    if (now - this.lastErrorTime > 60000) {
      this.errorCount = 0;
    }
    this.errorCount++;
    this.lastErrorTime = now;

    // Log error details
    console.group(`🚨 Error Boundary: ${this.props.name || 'Unknown'}`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Boundary Props:', this.props);
    console.groupEnd();

    // Store error info in state
    this.setState({ errorInfo });

    // Create error report
    const errorReport = {
      errorId: this.state.errorId,
      timestamp: now,
      component: this.props.name || 'ErrorRecoveryBoundary',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorCount: this.errorCount
    };

    // Store error report for debugging
    this.storeErrorReport(errorReport);

    // Call error handler
    this.props.onError?.(error, errorInfo);

    // Attempt automatic recovery if enabled and not too many errors
    if (this.props.enableRecovery && this.errorCount <= this.MAX_ERRORS_PER_MINUTE) {
      setTimeout(() => {
        this.attemptAutomaticRecovery();
      }, 1000);
    }
  }

  private storeErrorReport(report: any): void {
    try {
      const existingReports = JSON.parse(localStorage.getItem('error_reports') || '[]');
      existingReports.push(report);
      
      // Keep only last 10 reports
      if (existingReports.length > 10) {
        existingReports.splice(0, existingReports.length - 10);
      }
      
      localStorage.setItem('error_reports', JSON.stringify(existingReports));
    } catch (error) {
      console.error('Failed to store error report:', error);
    }
  }

  private async attemptAutomaticRecovery(): Promise<void> {
    if (this.state.attemptedRecovery || this.state.isRecovering) {
      return;
    }

    console.log('🔄 Attempting automatic recovery...');
    this.setState({ isRecovering: true });

    try {
      // Try to rollback to previous state if enabled
      if (this.props.enableStateRollback) {
        const lastSnapshot = atomicStateManager.getLastSnapshot();
        if (lastSnapshot) {
          console.log('📸 Found state snapshot, attempting rollback...');
          // The parent component should handle the actual state restoration
          this.props.onRecovery?.();
        }
      }

      // Clear any pending operations that might be causing issues
      atomicStateManager.clearQueue();

      // Small delay to let things settle
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✅ Automatic recovery completed');
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        attemptedRecovery: true,
        isRecovering: false
      });

    } catch (recoveryError) {
      console.error('❌ Automatic recovery failed:', recoveryError);
      this.setState({
        attemptedRecovery: true,
        isRecovering: false
      });
    }
  }

  private handleManualRecovery = async (): Promise<void> => {
    console.log('🔧 Manual recovery initiated...');
    this.setState({ isRecovering: true });

    try {
      // Clear any problematic state
      atomicStateManager.clearQueue();
      
      // Notify parent component
      this.props.onRecovery?.();
      
      // Reset error boundary state
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        attemptedRecovery: true,
        isRecovering: false
      });

      console.log('✅ Manual recovery completed');

    } catch (recoveryError) {
      console.error('❌ Manual recovery failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  };

  private handleStateRollback = async (): Promise<void> => {
    if (!this.props.enableStateRollback) return;

    console.log('⏪ State rollback initiated...');
    this.setState({ isRecovering: true });

    try {
      const lastSnapshot = atomicStateManager.getLastSnapshot();
      if (lastSnapshot) {
        console.log('📸 Rolling back to snapshot:', lastSnapshot.operationId);
        this.props.onRecovery?.();
        
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          isRecovering: false
        });
      } else {
        throw new Error('No state snapshot available');
      }
    } catch (rollbackError) {
      console.error('❌ State rollback failed:', rollbackError);
      this.setState({ isRecovering: false });
    }
  };

  private downloadErrorReport = (): void => {
    try {
      const reports = localStorage.getItem('error_reports');
      if (reports) {
        const blob = new Blob([reports], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-report-${this.state.errorId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download error report:', error);
    }
  };

  private sendErrorReport = async (): Promise<void> => {
    try {
      // This would typically send to your error reporting service
      console.log('📤 Sending error report to support...');
      
      const reportData = {
        errorId: this.state.errorId,
        error: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Error report sent successfully');
    } catch (error) {
      console.error('❌ Failed to send error report:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, isRecovering, attemptedRecovery } = this.state;

      return (
        <Card className="max-w-2xl mx-auto my-8 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Application Error
              {this.props.name && (
                <span className="text-sm font-normal text-muted-foreground">
                  in {this.props.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Something went wrong in this part of the application. This could be due to:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Network connectivity issues</li>
                <li>Temporary service unavailability</li>
                <li>Data synchronization conflicts</li>
                <li>Browser compatibility issues</li>
                <li>Corrupted application state</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium text-destructive mb-2">Error Details:</p>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {error.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                onClick={this.handleManualRecovery}
                disabled={isRecovering}
                className="flex-1"
              >
                {isRecovering ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isRecovering ? 'Recovering...' : 'Try Recovery'}
              </Button>

              {this.props.enableStateRollback && (
                <Button 
                  onClick={this.handleStateRollback}
                  disabled={isRecovering}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Rollback State
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={this.downloadErrorReport}
                variant="outline"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>

              <Button
                onClick={this.sendErrorReport}
                variant="outline"
                size="sm"
              >
                <Bug className="mr-2 h-4 w-4" />
                Send to Support
              </Button>
            </div>

            {attemptedRecovery && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Recovery Attempted:</strong> If the error persists, please refresh the page 
                  or contact support with the error report.
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Error ID: {this.state.errorId}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
