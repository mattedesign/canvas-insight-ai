import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, AlertCircle } from 'lucide-react';

interface ImageLoadingNodeData {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'analyzing' | 'error';
  error?: string;
}

interface ImageLoadingNodeProps {
  data: ImageLoadingNodeData;
}

const statusConfig = {
  uploading: {
    icon: Upload,
    label: 'Uploading...',
    color: 'text-blue-500',
    progress: 25
  },
  processing: {
    icon: Loader2,
    label: 'Processing...',
    color: 'text-yellow-500',
    progress: 50
  },
  analyzing: {
    icon: Loader2,
    label: 'Analyzing...',
    color: 'text-green-500',
    progress: 75
  },
  error: {
    icon: AlertCircle,
    label: 'Upload failed',
    color: 'text-red-500',
    progress: 0
  }
};

export const ImageLoadingNode: React.FC<ImageLoadingNodeProps> = ({ data }) => {
  const config = statusConfig[data.status];
  const Icon = config.icon;

  return (
    <Card className="w-[280px] p-4 bg-card border border-border">
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color} ${data.status !== 'error' ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-foreground">{config.label}</span>
        </div>
        
        <Skeleton className="w-full h-32 rounded" />
        
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground truncate">{data.name}</div>
          <Progress value={config.progress} className="h-2" />
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