/**
 * Data Loading Error Boundary - Fixed version without hooks in fallback
 */

import React from 'react';
import { ErrorRecoveryBoundary } from './ErrorRecoveryBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DataLoadingErrorBoundaryProps {
  children: React.ReactNode;
}

// Standalone error UI component - NO HOOKS
const DataLoadingErrorUI: React.FC<{ 
  error: Error; 
  onRetry: () => void;
  onClear: () => void;
}> = ({ error, onRetry, onClear }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">Data Loading Failed</CardTitle>
          <CardDescription className="text-center">
            We encountered an error while loading your data from the cloud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Error:</strong> {error.message || 'Unknown error occurred'}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={onRetry} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry Loading Data
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClear}
              className="w-full"
            >
              Start Fresh
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            If this issue persists, please contact support or try refreshing the page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const DataLoadingErrorBoundary: React.FC<DataLoadingErrorBoundaryProps> = ({ children }) => {
  const handleRetry = () => {
    // Reload the page to retry data loading
    window.location.reload();
  };

  const handleClear = () => {
    // Clear local storage and reload
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  // Create the error UI as a component instance, not a function
  const errorFallback = (
    <DataLoadingErrorUI 
      error={new Error('Data loading failed')} 
      onRetry={handleRetry}
      onClear={handleClear}
    />
  );

  return (
    <ErrorRecoveryBoundary
      name="DataLoading"
      enableRecovery={true}
      enableStateRollback={false}
      fallback={errorFallback}
    >
      {children}
    </ErrorRecoveryBoundary>
  );
};