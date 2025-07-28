import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface UploadStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface CanvasUploadProgressProps {
  stages: UploadStage[];
  overallProgress: number;
  isVisible: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
}

export const CanvasUploadProgress: React.FC<CanvasUploadProgressProps> = ({
  stages,
  overallProgress,
  isVisible,
  onCancel,
  onRetry
}) => {
  if (!isVisible || stages.length === 0) return null;

  const hasErrors = stages.some(stage => stage.status === 'error');
  const isCompleted = stages.every(stage => stage.status === 'completed');

  return (
    <Card className="fixed top-6 right-6 z-50 w-80 p-4 bg-card/95 backdrop-blur-sm border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">
          {isCompleted ? 'Upload Complete' : hasErrors ? 'Upload Issues' : 'Processing Upload'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {stages.map((stage) => (
            <div key={stage.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {stage.status === 'completed' && (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
                {stage.status === 'processing' && (
                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                )}
                {stage.status === 'error' && (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
                {stage.status === 'pending' && (
                  <div className="w-3 h-3 rounded-full bg-muted" />
                )}
                <span className="truncate">{stage.name}</span>
              </div>
              
              {stage.status !== 'pending' && (
                <Progress 
                  value={stage.progress} 
                  className="h-1"
                />
              )}
              
              {stage.error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-1 rounded">
                  {stage.error}
                </p>
              )}
            </div>
          ))}
        </div>

        {hasErrors && onRetry && (
          <Button 
            onClick={onRetry}
            size="sm"
            className="w-full"
          >
            Retry Failed Uploads
          </Button>
        )}
      </div>
    </Card>
  );
};