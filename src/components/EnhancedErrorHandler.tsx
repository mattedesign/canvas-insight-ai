import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useFilteredToast } from '@/hooks/use-filtered-toast';

export interface AnalysisError {
  type: 'network' | 'api' | 'validation' | 'cache' | 'timeout' | 'unknown';
  message: string;
  details?: string;
  retryable: boolean;
  suggestions?: string[];
}

interface EnhancedErrorHandlerProps {
  error: AnalysisError | null;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  progress?: number;
}

export const EnhancedErrorHandler: React.FC<EnhancedErrorHandlerProps> = ({
  error,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  onRetry,
  onCancel,
  loading = false,
  progress = 0
}) => {
  const { toast } = useFilteredToast();
  const [dismissed, setDismissed] = useState(false);

  if (!error || dismissed) {
    if (loading) {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing Image...
            </CardTitle>
            <CardDescription>
              AI is processing your image for UX insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {progress < 25 && "Initializing analysis..."}
              {progress >= 25 && progress < 50 && "Processing image..."}
              {progress >= 50 && progress < 75 && "Generating insights..."}
              {progress >= 75 && "Finalizing results..."}
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const getErrorIcon = () => {
    if (isRetrying) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (error.retryable) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getErrorTitle = () => {
    if (isRetrying) return "Retrying Analysis...";
    
    switch (error.type) {
      case 'network':
        return "Connection Issue";
      case 'api':
        return "AI Service Unavailable";
      case 'validation':
        return "Invalid Analysis Data";
      case 'cache':
        return "Cache Error";
      case 'timeout':
        return "Analysis Timeout";
      default:
        return "Analysis Error";
    }
  };

  const getErrorDescription = () => {
    if (isRetrying) {
      return `Attempting retry ${retryCount + 1} of ${maxRetries}...`;
    }
    return error.message;
  };

  const handleRetry = () => {
    if (onRetry && error.retryable && retryCount < maxRetries) {
      toast({
        description: "Retrying analysis...",
        category: "info"
      });
      onRetry();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onCancel) onCancel();
  };

  return (
    <Alert className="w-full max-w-md mx-auto">
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1">
          <AlertTitle className="text-sm font-medium">
            {getErrorTitle()}
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-1">
            {getErrorDescription()}
          </AlertDescription>
          
          {error.details && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Technical Details
              </summary>
              <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-2 rounded">
                {error.details}
              </p>
            </details>
          )}

          {error.suggestions && error.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Suggestions:</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-primary">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {error.retryable && retryCount < maxRetries && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {isRetrying ? 'Retrying...' : 'Retry Analysis'}
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>

          {retryCount >= maxRetries && error.retryable && (
            <div className="mt-3 p-2 bg-muted rounded text-xs">
              <p className="text-muted-foreground">
                Maximum retry attempts reached. Please try uploading a different image or check your connection.
              </p>
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

// Helper function to create structured error objects
export const createAnalysisError = (
  type: AnalysisError['type'],
  message: string,
  details?: string,
  suggestions?: string[]
): AnalysisError => {
  const retryableTypes = ['network', 'api', 'timeout', 'cache'];
  
  const defaultSuggestions: Record<AnalysisError['type'], string[]> = {
    network: [
      "Check your internet connection",
      "Try again in a few moments",
      "Ensure the image URL is accessible"
    ],
    api: [
      "The AI service may be temporarily unavailable",
      "Try again in a few minutes",
      "Check if API keys are configured"
    ],
    validation: [
      "Ensure the image is valid and accessible",
      "Try uploading a different image format",
      "Check image file size (max 10MB)"
    ],
    cache: [
      "Clear your browser cache",
      "Try refreshing the page",
      "The issue should resolve automatically"
    ],
    timeout: [
      "The analysis is taking longer than expected",
      "Try with a smaller image",
      "Check your connection speed"
    ],
    unknown: [
      "Try refreshing the page",
      "Upload a different image",
      "Contact support if the issue persists"
    ]
  };

  return {
    type,
    message,
    details,
    retryable: retryableTypes.includes(type),
    suggestions: suggestions || defaultSuggestions[type]
  };
};