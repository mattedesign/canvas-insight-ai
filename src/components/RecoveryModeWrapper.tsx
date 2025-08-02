/**
 * Phase 5: Recovery Mode Wrapper Component
 * Universal wrapper for any component that needs error recovery and degraded mode support
 */

import React, { ReactNode } from 'react';
import { AnalysisComponentErrorBoundary } from './AnalysisComponentErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Info } from 'lucide-react';

interface RecoveryModeWrapperProps {
  children: ReactNode;
  componentName: string;
  context?: {
    imageUrl?: string;
    userContext?: string;
    analysisId?: string;
  };
  onRetry?: () => void;
  onFallback?: (fallbackData: any) => void;
  enableRecovery?: boolean;
  showDegradedModeUI?: boolean;
  degradedData?: any;
}

export function RecoveryModeWrapper({
  children,
  componentName,
  context,
  onRetry,
  onFallback,
  enableRecovery = true,
  showDegradedModeUI = false,
  degradedData
}: RecoveryModeWrapperProps) {

  const handleFallback = (fallbackData: any) => {
    console.log(`[RecoveryModeWrapper:${componentName}] Using fallback data:`, fallbackData);
    if (onFallback) {
      onFallback(fallbackData);
    }
  };

  // If showing degraded mode, render the degraded UI instead of children
  if (showDegradedModeUI && degradedData) {
    return (
      <div className="space-y-4">
        {/* Degraded Mode Alert */}
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <strong>{componentName} - Degraded Mode</strong>
                <p className="text-sm mt-1">
                  This component is running in degraded mode due to processing issues.
                  Some features may be limited.
                </p>
              </div>
              <Badge variant="outline" className="ml-4 text-amber-700 border-amber-300">
                Limited Functionality
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* Degraded Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              {componentName} - Basic Mode
            </CardTitle>
            <CardDescription>
              Limited functionality available due to system issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            {degradedData ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {typeof degradedData === 'string' ? (
                  <p>{degradedData}</p>
                ) : (
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(degradedData, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No data available in degraded mode
              </p>
            )}

            {onRetry && (
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={onRetry} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Full Functionality
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normal mode with error boundary protection
  return (
    <AnalysisComponentErrorBoundary
      analysisId={context?.analysisId}
      imageUrl={context?.imageUrl}
      userContext={context?.userContext}
      onRetry={onRetry}
      onFallback={handleFallback}
      enableRecovery={enableRecovery}
      maxRetries={3}
    >
      {children}
    </AnalysisComponentErrorBoundary>
  );
}