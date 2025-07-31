import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, AlertCircle } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';

interface AnalysisLoadingNodeData {
  imageId: string;
  imageName: string;
  status: 'analyzing' | 'error' | 'completed';
  stage?: string;
  progress?: number;
  error?: string;
  onCancel?: () => void;
}

interface AnalysisLoadingNodeProps {
  data: AnalysisLoadingNodeData;
}

export const AnalysisLoadingNode: React.FC<AnalysisLoadingNodeProps> = ({ data }) => {
  const { imageName, status, stage, progress, error } = data;

  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'completed':
        return <Brain className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'analyzing':
        return stage || 'Processing...';
      case 'error':
        return error || 'Analysis failed';
      case 'completed':
        return 'Analysis complete!';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'analyzing':
        return 'default';
      case 'error':
        return 'destructive';
      case 'completed':
        return 'default';
    }
  };

  return (
    <Card className="w-80 shadow-lg">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="bg-primary border-2 border-background"
      />
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium text-sm">AI Analysis</span>
            </div>
            <Badge variant={getStatusColor() as any} className="text-xs">
              {status === 'analyzing' ? 'In Progress' : status}
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {imageName}
          </div>
          
          <div className="space-y-1">
            <div className="text-xs font-medium">{getStatusText()}</div>
            {status === 'analyzing' && progress !== undefined && (
              <Progress value={progress} className="h-2" />
            )}
          </div>
        </div>
      </CardContent>
      
      {status === 'completed' && (
        <Handle 
          type="source" 
          position={Position.Right} 
          className="bg-green-500 border-2 border-background"
        />
      )}
    </Card>
  );
};