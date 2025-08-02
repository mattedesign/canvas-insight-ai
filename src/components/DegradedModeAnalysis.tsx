/**
 * Phase 5: Degraded Mode Analysis UI Component
 * Displays analysis when full pipeline fails but recovery provides basic results
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Info } from 'lucide-react';

interface DegradedModeAnalysisProps {
  analysis: any;
  onRetry?: () => void;
  onContactSupport?: () => void;
}

export function DegradedModeAnalysis({ 
  analysis, 
  onRetry, 
  onContactSupport 
}: DegradedModeAnalysisProps) {
  const { metadata, summary, suggestions = [] } = analysis || {};
  const limitations = metadata?.limitations || [];
  const originalFailure = metadata?.originalFailure || 'Unknown error';

  return (
    <div className="space-y-6">
      {/* Recovery Mode Notice */}
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <strong>Analysis Generated in Recovery Mode</strong>
              <p className="text-sm mt-1">
                Due to processing issues ({originalFailure}), this analysis was created using fallback methods.
                Results may be limited compared to full analysis.
              </p>
            </div>
            <Badge variant="outline" className="ml-4 text-amber-700 border-amber-300">
              Degraded Mode
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Limitations Notice */}
      {limitations.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Analysis Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
              {limitations.map((limitation: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  {limitation}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Basic Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Analysis Summary</CardTitle>
            <CardDescription>
              Limited analysis results available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {typeof summary === 'string' ? (
                <p>{summary}</p>
              ) : (
                <div>
                  {summary.overview && <p className="mb-4">{summary.overview}</p>}
                  {summary.keyFindings && summary.keyFindings.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Key Findings:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {summary.keyFindings.map((finding: string, index: number) => (
                          <li key={index}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Recommendations</CardTitle>
            <CardDescription>
              Basic recommendations based on available data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion: any, index: number) => (
                <div key={suggestion.id || index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    {suggestion.priority && (
                      <Badge variant={
                        suggestion.priority === 'high' ? 'destructive' :
                        suggestion.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {suggestion.priority}
                      </Badge>
                    )}
                  </div>
                  {suggestion.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {suggestion.description}
                    </p>
                  )}
                  {suggestion.actionItems && suggestion.actionItems.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Action Items:</p>
                      <ul className="text-sm space-y-1">
                        {suggestion.actionItems.map((item: string, itemIndex: number) => (
                          <li key={itemIndex} className="flex items-start gap-2">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery Actions */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Recovery Options
          </CardTitle>
          <CardDescription>
            Actions you can take to get better analysis results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            {onRetry && (
              <Button 
                onClick={onRetry} 
                className="flex items-center gap-2"
                variant="default"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Analysis
              </Button>
            )}
            {onContactSupport && (
              <Button 
                onClick={onContactSupport} 
                variant="outline"
              >
                Contact Support
              </Button>
            )}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              • <strong>Retry Analysis:</strong> Try running the analysis again when system issues are resolved
            </p>
            <p className="mt-1">
              • <strong>Contact Support:</strong> Get help if issues persist or you need full analysis features
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {metadata && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Analysis Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Mode:</span>
                <span className="ml-2 text-muted-foreground">
                  {metadata.recoveryMode || 'degraded'}
                </span>
              </div>
              <div>
                <span className="font-medium">Generated:</span>
                <span className="ml-2 text-muted-foreground">
                  {metadata.generatedAt ? new Date(metadata.generatedAt).toLocaleString() : 'Unknown'}
                </span>
              </div>
              {metadata.availableStages && (
                <div className="col-span-2">
                  <span className="font-medium">Available Data:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.availableStages.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}