/**
 * Data Loading Error Boundary - Phase 3.2: Proper error boundaries for failed data loads
 */

import React from 'react';
import { ErrorRecoveryBoundary } from './ErrorRecoveryBoundary';
import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DataLoadingErrorBoundaryProps {
  children: React.ReactNode;
}

const DataLoadingErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => {
  const { stableHelpers } = useSimplifiedAppContext();

  const handleRetryLoad = async () => {
    try {
      await stableHelpers.loadData();
      reset();
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  const handleClearAndReload = () => {
    stableHelpers.clearCanvas();
    reset();
  };

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
            <Button onClick={handleRetryLoad} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry Loading Data
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClearAndReload}
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
  return (
    <ErrorRecoveryBoundary
      name="DataLoading"
      enableRecovery={true}
      enableStateRollback={false}
    >
      {children}
    </ErrorRecoveryBoundary>
  );
};