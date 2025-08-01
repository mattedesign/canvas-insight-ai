import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle,
  Info,
  Wifi,
  Key,
  Server
} from 'lucide-react';
import { RetryState } from '@/services/RetryService';

interface EnhancedErrorDisplayProps {
  error?: string;
  retryState?: RetryState;
  canRetry?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  context?: string;
}

export function EnhancedErrorDisplay({
  error,
  retryState,
  canRetry,
  onRetry,
  onCancel,
  context = 'Operation'
}: EnhancedErrorDisplayProps) {
  if (!error && !retryState) return null;

  const getErrorIcon = (errorMessage?: string) => {
    if (!errorMessage) return <AlertTriangle className="h-5 w-5" />;
    
    const message = errorMessage.toLowerCase();
    if (message.includes('network') || message.includes('timeout')) {
      return <Wifi className="h-5 w-5" />;
    }
    if (message.includes('api key') || message.includes('unauthorized')) {
      return <Key className="h-5 w-5" />;
    }
    if (message.includes('server') || message.includes('internal')) {
      return <Server className="h-5 w-5" />;
    }
    return <AlertTriangle className="h-5 w-5" />;
  };

  const getErrorSeverity = (errorMessage?: string) => {
    if (!errorMessage) return 'destructive';
    
    const message = errorMessage.toLowerCase();
    if (message.includes('rate limit') || message.includes('timeout')) {
      return 'default'; // Less severe, temporary
    }
    if (message.includes('api key') || message.includes('unauthorized')) {
      return 'destructive'; // Needs immediate attention
    }
    return 'destructive';
  };

  const getHelpfulSuggestion = (errorMessage?: string) => {
    if (!errorMessage) return 'Please try again or contact support if the issue persists.';
    
    const message = errorMessage.toLowerCase();
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'Check your internet connection and try again. This is usually a temporary issue.';
    }
    if (message.includes('rate limit')) {
      return 'You\'ve reached the API rate limit. Please wait a moment before trying again.';
    }
    if (message.includes('api key') || message.includes('unauthorized')) {
      return 'There seems to be an authentication issue. Please check your API configuration.';
    }
    if (message.includes('server') || message.includes('internal')) {
      return 'There\'s a temporary server issue. Our team has been notified and this should resolve shortly.';
    }
    if (message.includes('not found')) {
      return 'The requested resource was not found. Please check your input and try again.';
    }
    
    return 'If this problem continues, please try refreshing the page or contact support.';
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          {getErrorIcon(error)}
          {context} Failed
        </CardTitle>
        {error && (
          <CardDescription className="text-sm">
            {error}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Retry State Information */}
        {retryState && retryState.attempts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Retry History</span>
              <Badge variant="outline">
                {retryState.attempts.length}/{retryState.config.maxRetries} attempts
              </Badge>
            </div>
            
            <div className="space-y-2">
              {retryState.attempts.map((attempt, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                  {attempt.error ? (
                    <XCircle className="h-3 w-3 text-destructive" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  <span className="flex-1">
                    Attempt {attempt.attempt}: {attempt.error || 'Success'}
                  </span>
                  {attempt.duration && (
                    <span className="text-muted-foreground">
                      {attempt.duration}ms
                    </span>
                  )}
                </div>
              ))}
            </div>

            {retryState.nextRetryIn && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Next retry in {Math.ceil(retryState.nextRetryIn / 1000)} seconds...
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Helpful Suggestion */}
        <Alert variant={getErrorSeverity(error) as any}>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {getHelpfulSuggestion(error)}
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {canRetry && onRetry && (
            <Button 
              onClick={onRetry} 
              variant="default" 
              size="sm"
              disabled={retryState?.isRetrying}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${retryState?.isRetrying ? 'animate-spin' : ''}`} />
              {retryState?.isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
          
          {onCancel && (
            <Button onClick={onCancel} variant="outline" size="sm">
              Cancel
            </Button>
          )}
        </div>

        {/* Technical Details (for development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify({ error, retryState }, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}