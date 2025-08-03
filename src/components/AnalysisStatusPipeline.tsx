import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Brain, 
  Zap,
  X
} from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  duration?: number;
  error?: string;
}

interface AnalysisStatusPipelineProps {
  stages: PipelineStage[];
  overallProgress: number;
  isComplete: boolean;
  hasError: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  estimatedTimeRemaining?: number;
}

export function AnalysisStatusPipeline({
  stages,
  overallProgress,
  isComplete,
  hasError,
  onCancel,
  onRetry,
  estimatedTimeRemaining
}: AnalysisStatusPipelineProps) {
  
  const getStageIcon = (stage: PipelineStage) => {
    const iconMap = {
      'context-detection': Eye,
      'vision-analysis': Eye,
      'ai-analysis': Brain,
      'synthesis': Zap,
      'finalization': CheckCircle
    };
    
    const IconComponent = iconMap[stage.id] || Brain;
    
    switch (stage.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <IconComponent className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStageStatus = (stage: PipelineStage) => {
    switch (stage.status) {
      case 'completed':
        return <Badge variant="default" className="text-xs">Complete</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      case 'running':
        return <Badge variant="secondary" className="text-xs">Running</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimeRemaining = (ms: number) => {
    if (ms < 1000) return 'Almost done';
    if (ms < 60000) return `~${Math.ceil(ms / 1000)}s remaining`;
    return `~${Math.ceil(ms / 60000)}m remaining`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Analysis Pipeline</span>
          <div className="flex items-center gap-2">
            {estimatedTimeRemaining && !isComplete && !hasError && (
              <span className="text-xs text-muted-foreground">
                {formatTimeRemaining(estimatedTimeRemaining)}
              </span>
            )}
            {onCancel && !isComplete && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCancel}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Pipeline Stages */}
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStageIcon(stage)}
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {stage.duration && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(stage.duration)}
                    </span>
                  )}
                  {getStageStatus(stage)}
                </div>
              </div>
              
              {/* Stage Progress Bar */}
              {stage.status === 'running' && stage.progress !== undefined && (
                <Progress value={stage.progress} className="h-1" />
              )}
              
              {/* Error Display */}
              {stage.status === 'error' && stage.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-xs text-red-600">{stage.error}</p>
                </div>
              )}
              
              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div className="ml-2 w-0.5 h-2 bg-border"></div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {hasError && onRetry && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="w-full"
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {/* Completion Status */}
        {isComplete && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700 font-medium">
                Analysis Complete
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}