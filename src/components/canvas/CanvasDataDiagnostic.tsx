import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDataLoadingDiagnostic } from '@/hooks/useDataLoadingDiagnostic';

export const CanvasDataDiagnostic: React.FC = () => {
  const { imageCount, analysisCount, groupCount, hasIssues, isLoading, error } = useDataLoadingDiagnostic();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 p-4 bg-background/95 backdrop-blur-sm border-2 border-primary/20 z-50 max-w-md">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Canvas Data Diagnostic</Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Images:</span>
            <Badge variant={imageCount > 0 ? "default" : "destructive"}>
              {imageCount}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span>Analyses:</span>
            <Badge variant={analysisCount > 0 ? "default" : "secondary"}>
              {analysisCount}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span>Groups:</span>
            <Badge variant={groupCount > 0 ? "default" : "secondary"}>
              {groupCount}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span>Status:</span>
            <Badge variant={isLoading ? "secondary" : error ? "destructive" : hasIssues ? "secondary" : "default"}>
              {isLoading ? "Loading" : error ? "Error" : hasIssues ? "Issues" : "OK"}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            Error: {error}
          </div>
        )}

        {hasIssues && !error && (
          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            ⚠️ Some images have loading issues - check console
          </div>
        )}
      </div>
    </Card>
  );
};