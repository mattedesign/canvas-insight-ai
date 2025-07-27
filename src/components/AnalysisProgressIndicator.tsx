import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AnalysisProgress } from '@/hooks/useOptimizedAnalysis';

interface AnalysisProgressIndicatorProps {
  progress: AnalysisProgress;
  onCancel?: () => void;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export const AnalysisProgressIndicator: React.FC<AnalysisProgressIndicatorProps> = ({
  progress,
  onCancel,
  variant = 'detailed',
  className = ''
}) => {
  const getProgressColor = () => {
    if (progress.error) return 'destructive';
    if (progress.progress === 100) return 'default';
    return 'default';
  };

  const getIcon = () => {
    if (progress.error) return <AlertCircle className="w-4 h-4 text-destructive" />;
    if (progress.progress === 100) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (progress.isLoading) return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
    return null;
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getIcon()}
        <span className="text-sm text-muted-foreground">
          {progress.error ? 'Error' : progress.stage}
        </span>
        {progress.isLoading && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getIcon()}
              <span className="font-medium">
                {progress.error ? 'Analysis Failed' : 'AI Analysis'}
              </span>
            </div>
            {progress.isLoading && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-8"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {!progress.error && (
            <div className="space-y-1">
              <Progress 
                value={progress.progress} 
                className="h-2"
                // @ts-ignore - Progress component color prop
                color={getProgressColor()}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.stage}</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {progress.error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{progress.error}</p>
            </div>
          )}

          {/* Success State */}
          {progress.progress === 100 && !progress.error && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 dark:bg-green-950 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                Analysis completed successfully!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};