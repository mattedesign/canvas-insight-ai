import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Brain, Loader2, AlertCircle } from 'lucide-react';

interface AnalysisLoadingNodeData {
  imageId: string;
  imageName: string;
  status: 'processing' | 'analyzing' | 'error';
  progress: number;
  stage: string;
  error?: string;
  onCancel?: () => void;
}

interface AnalysisLoadingNodeProps {
  data: AnalysisLoadingNodeData;
}

const statusConfig = {
  processing: {
    icon: Loader2,
    label: 'Processing image...',
    color: 'text-blue-500'
  },
  analyzing: {
    icon: Brain,
    label: 'AI analyzing UX...',
    color: 'text-purple-500'
  },
  error: {
    icon: AlertCircle,
    label: 'Analysis failed',
    color: 'text-red-500'
  }
};

export const AnalysisLoadingNode: React.FC<AnalysisLoadingNodeProps> = ({ data }) => {
  const config = statusConfig[data.status];
  const Icon = config.icon;

  return (
    <Card className="w-[320px] p-4 bg-card border border-border">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color} ${data.status !== 'error' ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium text-foreground">{config.label}</span>
          </div>
          {data.onCancel && data.status !== 'error' && (
            <button
              onClick={data.onCancel}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          Stage: <span className="font-medium text-foreground">{data.stage}</span>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Category Scores</div>
            <div className="grid grid-cols-2 gap-2">
              {['Usability', 'Accessibility', 'Visual', 'Content'].map((category) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{category}</span>
                    <Skeleton className="h-3 w-6" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Key Insights</div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
          
          <Progress value={data.progress} className="h-2" />
          <div className="text-xs text-center text-muted-foreground">
            {Math.round(data.progress)}% complete
          </div>
        </div>
        
        {data.error && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
            {data.error}
          </div>
        )}
      </div>
    </Card>
  );
};