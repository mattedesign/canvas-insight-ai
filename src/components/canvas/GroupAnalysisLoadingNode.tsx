import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Loader2, 
  Clock, 
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface GroupAnalysisLoadingNodeData {
  groupId: string;
  groupName: string;
  imageCount: number;
  stage: string;
  progress: number;
  status: 'analyzing' | 'processing' | 'synthesizing' | 'error' | 'completed';
  message?: string;
  error?: string;
  startTime?: Date;
  onCancel?: (groupId: string) => void;
}

export const GroupAnalysisLoadingNode: React.FC<NodeProps> = ({ data }) => {
  const { 
    groupId, 
    groupName, 
    imageCount, 
    stage, 
    progress, 
    status, 
    message, 
    error,
    startTime,
    onCancel 
  } = data as unknown as GroupAnalysisLoadingNodeData;

  const getStatusConfig = () => {
    switch (status) {
      case 'analyzing':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          borderColor: 'border-blue-200 dark:border-blue-800',
          spin: true
        };
      case 'processing':
        return {
          icon: Users,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          spin: false
        };
      case 'synthesizing':
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-950',
          borderColor: 'border-green-200 dark:border-green-800',
          spin: false
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800',
          spin: false
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-950',
          borderColor: 'border-green-200 dark:border-green-800',
          spin: false
        };
      default:
        return {
          icon: Loader2,
          color: 'text-primary',
          bgColor: 'bg-primary/5',
          borderColor: 'border-primary/20',
          spin: true
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  const getElapsedTime = () => {
    if (!startTime) return null;
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getStageDisplay = () => {
    const stageMap: Record<string, string> = {
      'starting': 'Initializing analysis...',
      'context-detection': 'Analyzing group context...',
      'individual-analysis': 'Processing individual images...',
      'cross-image-analysis': 'Identifying patterns...',
      'synthesizing': 'Generating insights...',
      'finalizing': 'Completing analysis...',
      'complete': 'Analysis complete',
      'error': 'Analysis failed'
    };
    return stageMap[stage] || stage;
  };

  return (
    <div className="w-80">
      <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon 
                className={`w-5 h-5 ${config.color} ${config.spin ? 'animate-spin' : ''}`} 
              />
              <CardTitle className="text-lg">Group Analysis</CardTitle>
            </div>
            {onCancel && status !== 'completed' && status !== 'error' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(groupId)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <ImageIcon className="w-3 h-3" />
              {imageCount} images
            </Badge>
            <span>•</span>
            <span className="truncate max-w-32">{groupName}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{getStageDisplay()}</span>
              <span className={config.color}>{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
            />
          </div>

          {/* Status Message */}
          {message && (
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              {message}
            </div>
          )}

          {/* Error Message */}
          {error && status === 'error' && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Analysis failed</p>
                  <p className="text-xs mt-1 opacity-90">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Processing Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getElapsedTime() || '0s'}
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Stage-specific indicators */}
          {stage === 'individual-analysis' && (
            <div className="flex gap-1 overflow-hidden">
              {Array.from({ length: imageCount }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i < Math.floor((progress / 100) * imageCount)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-primary !border-primary"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-primary !border-primary"
      />
    </div>
  );
};