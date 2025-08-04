/**
 * Analysis Constraint Error Boundary
 * Specialized error boundary for handling database constraint violations
 * and analysis version conflicts in the new storage system
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Clock, 
  Layers,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Props {
  children: ReactNode;
  imageId?: string;
  onAnalysisConflict?: (imageId: string, conflictType: string) => void;
  onRetryRequested?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorType?: 'constraint_violation' | 'analysis_conflict' | 'version_mismatch' | 'storage_error' | 'unknown';
  retryCount: number;
  conflictDetails?: {
    existingAnalysisId?: string;
    conflictingVersion?: number;
    constraintName?: string;
  };
}

export class AnalysisConstraintErrorBoundary extends Component<Props, State> {
  private maxRetries = 2; // Lower retry count for constraint issues

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = AnalysisConstraintErrorBoundary.detectErrorType(error);
    const conflictDetails = AnalysisConstraintErrorBoundary.parseConflictDetails(error);
    
    return { 
      hasError: true, 
      error,
      errorType,
      conflictDetails
    };
  }

  static detectErrorType(error: Error): State['errorType'] {
    const message = error.message.toLowerCase();
    
    // Database constraint violations
    if (message.includes('constraint') || message.includes('23505') || message.includes('unique')) {
      return 'constraint_violation';
    }
    
    // Analysis conflicts
    if (message.includes('analysis already exists') || message.includes('recent analysis')) {
      return 'analysis_conflict';
    }
    
    // Version mismatches
    if (message.includes('version') && message.includes('conflict')) {
      return 'version_mismatch';
    }
    
    // Storage errors
    if (message.includes('storage') || message.includes('database')) {
      return 'storage_error';
    }
    
    return 'unknown';
  }

  static parseConflictDetails(error: Error): State['conflictDetails'] {
    const message = error.message;
    const details: State['conflictDetails'] = {};
    
    // Extract existing analysis ID
    const idMatch = message.match(/analysis[:\s]+([a-f0-9-]{36})/i);
    if (idMatch) {
      details.existingAnalysisId = idMatch[1];
    }
    
    // Extract version number
    const versionMatch = message.match(/version[:\s]+(\d+)/i);
    if (versionMatch) {
      details.conflictingVersion = parseInt(versionMatch[1], 10);
    }
    
    // Extract constraint name
    const constraintMatch = message.match(/constraint[:\s]+"([^"]+)"/i);
    if (constraintMatch) {
      details.constraintName = constraintMatch[1];
    }
    
    return details;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Analysis Constraint Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      errorType: this.state.errorType,
      imageId: this.props.imageId,
      conflictDetails: this.state.conflictDetails,
      componentStack: errorInfo.componentStack
    });

    // Notify parent component about analysis conflicts
    if (this.state.errorType === 'analysis_conflict' && this.props.imageId) {
      this.props.onAnalysisConflict?.(this.props.imageId, this.state.errorType!);
    }

    // Show appropriate toast notification
    this.showConstraintErrorToast(this.state.errorType!, this.state.conflictDetails);
  }

  showConstraintErrorToast(errorType: string, details?: State['conflictDetails']) {
    switch (errorType) {
      case 'constraint_violation':
        toast({
          title: "Analysis Already Exists",
          description: `A recent analysis for this image already exists${details?.conflictingVersion ? ` (version ${details.conflictingVersion})` : ''}.`,
          variant: "default",
          duration: 5000,
        });
        break;
      
      case 'analysis_conflict':
        toast({
          title: "Analysis Conflict Detected",
          description: "An analysis for this image was recently completed. You can view the existing analysis or create a new version.",
          variant: "default",
          duration: 6000,
        });
        break;
      
      case 'version_mismatch':
        toast({
          title: "Version Mismatch",
          description: "Another analysis version was created while processing. Please refresh to see the latest version.",
          variant: "destructive",
          duration: 7000,
        });
        break;
      
      case 'storage_error':
        toast({
          title: "Storage Error",
          description: "Unable to save analysis results. Please try again or contact support.",
          variant: "destructive",
          duration: 5000,
        });
        break;
      
      default:
        toast({
          title: "Analysis Error",
          description: "An unexpected error occurred during analysis processing.",
          variant: "destructive",
          duration: 4000,
        });
    }
  }

  handleRetry = () => {
    console.log('[AnalysisConstraintErrorBoundary] Attempting retry with constraint awareness...');
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorType: undefined,
      conflictDetails: undefined,
      retryCount: this.state.retryCount + 1
    });

    // Notify parent to retry
    this.props.onRetryRequested?.();
  };

  handleViewExisting = () => {
    if (this.state.conflictDetails?.existingAnalysisId) {
      // Navigate to existing analysis or trigger view action
      console.log('Viewing existing analysis:', this.state.conflictDetails.existingAnalysisId);
      
      toast({
        title: "Viewing Existing Analysis",
        description: "Loading the most recent analysis for this image.",
        duration: 3000,
      });
    }
  };

  handleForceNew = () => {
    console.log('[AnalysisConstraintErrorBoundary] Forcing new analysis...');
    
    // Clear error state and force retry
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorType: undefined,
      conflictDetails: undefined,
      retryCount: this.state.retryCount + 1
    });

    // Show notification
    toast({
      title: "Creating New Analysis Version",
      description: "Forcing creation of a new analysis version...",
      duration: 3000,
    });

    this.props.onRetryRequested?.();
  };

  getErrorDisplay() {
    const { errorType, conflictDetails } = this.state;
    
    switch (errorType) {
      case 'constraint_violation':
      case 'analysis_conflict':
        return {
          icon: Clock,
          title: 'Analysis Already Exists',
          description: 'A recent analysis for this image was found.',
          color: 'text-blue-600',
          variant: 'secondary' as const,
          showExistingOption: true,
          suggestions: [
            'View the existing analysis to see current insights',
            'Create a new analysis version if significant changes were made',
            'Check the analysis history to compare different versions'
          ]
        };
      
      case 'version_mismatch':
        return {
          icon: Layers,
          title: 'Version Conflict',
          description: 'Multiple analysis versions were created simultaneously.',
          color: 'text-yellow-600',
          variant: 'secondary' as const,
          showExistingOption: false,
          suggestions: [
            'Refresh the page to see the latest analysis version',
            'Check the analysis history for all available versions',
            'Try creating a new analysis if needed'
          ]
        };
      
      case 'storage_error':
        return {
          icon: Database,
          title: 'Storage Error',
          description: 'Unable to save the analysis to the database.',
          color: 'text-red-600',
          variant: 'destructive' as const,
          showExistingOption: false,
          suggestions: [
            'Check your internet connection',
            'Try the analysis again after a moment',
            'Contact support if the error persists'
          ]
        };
      
      default:
        return {
          icon: AlertTriangle,
          title: 'Analysis Error',
          description: 'An unexpected error occurred.',
          color: 'text-gray-600',
          variant: 'outline' as const,
          showExistingOption: false,
          suggestions: [
            'Try the analysis again',
            'Refresh the page if problems continue',
            'Contact support with error details'
          ]
        };
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorDisplay = this.getErrorDisplay();
      const canRetry = this.state.retryCount < this.maxRetries;
      const IconComponent = errorDisplay.icon;

      return (
        <Card className="border-border bg-background">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${errorDisplay.color}`}>
              <IconComponent className="h-5 w-5" />
              {errorDisplay.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {errorDisplay.description}
            </p>

            {/* Conflict Details */}
            {this.state.conflictDetails && (
              <div className="flex gap-2">
                {this.state.conflictDetails.conflictingVersion && (
                  <Badge variant="outline" className="text-xs">
                    Version {this.state.conflictDetails.conflictingVersion}
                  </Badge>
                )}
                {this.state.conflictDetails.existingAnalysisId && (
                  <Badge variant="outline" className="text-xs">
                    ID: {this.state.conflictDetails.existingAnalysisId.slice(-8)}
                  </Badge>
                )}
              </div>
            )}

            {/* Suggestions */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">What you can do:</div>
                  <ul className="text-sm space-y-1">
                    {errorDisplay.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {errorDisplay.showExistingOption && (
                <Button
                  onClick={this.handleViewExisting}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  View Existing Analysis
                </Button>
              )}
              
              {canRetry && (
                <Button
                  onClick={this.handleForceNew}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Create New Version
                </Button>
              )}
              
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={!canRetry}
              >
                <RefreshCw className="h-4 w-4" />
                {canRetry ? `Retry (${this.state.retryCount}/${this.maxRetries})` : 'Max Retries Reached'}
              </Button>
            </div>

            {/* Technical Details for Development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Technical Details (Development)
                </summary>
                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                  Error Type: {this.state.errorType}
                  {'\n'}Message: {this.state.error.message}
                  {'\n'}Stack: {this.state.error.stack}
                  {this.state.conflictDetails && (
                    '\n' + JSON.stringify(this.state.conflictDetails, null, 2)
                  )}
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