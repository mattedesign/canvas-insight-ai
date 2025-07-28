import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Image, 
  Brain, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';

interface AnalysisStage {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface EnhancedUploadProgressProps {
  stages: AnalysisStage[];
  currentStage?: string;
  overallProgress: number;
  isActive: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  error?: string;
}

export const EnhancedUploadProgress: React.FC<EnhancedUploadProgressProps> = ({
  stages,
  currentStage,
  overallProgress,
  isActive,
  onCancel,
  onRetry,
  error
}) => {
  if (!isActive && !error && overallProgress === 0) {
    return null;
  }

  const hasError = error || stages.some(stage => stage.status === 'error');
  const isCompleted = overallProgress === 100 && !hasError;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {hasError ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : isCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {hasError ? 'Analysis Failed' : isCompleted ? 'Analysis Complete' : 'Analyzing Images'}
          </CardTitle>
          {isActive && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Progress value={overallProgress} className="h-2" />
        <div className="text-sm text-muted-foreground">
          {Math.round(overallProgress)}% complete
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isCurrentStage = currentStage === stage.id;
            
            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrentStage ? 'bg-accent' : ''
                }`}
              >
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  ${stage.status === 'completed' ? 'bg-green-100 text-green-600' : 
                    stage.status === 'error' ? 'bg-red-100 text-red-600' :
                    stage.status === 'active' ? 'bg-primary/10 text-primary' :
                    'bg-muted text-muted-foreground'}
                `}>
                  {stage.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : stage.status === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : stage.status === 'active' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      stage.status === 'error' ? 'text-destructive' : ''
                    }`}>
                      {stage.name}
                    </span>
                    {stage.status === 'active' && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(stage.progress)}%
                      </span>
                    )}
                  </div>
                  
                  {stage.status === 'active' && (
                    <Progress value={stage.progress} className="h-1 mt-1" />
                  )}
                  
                  {stage.error && (
                    <div className="text-xs text-destructive mt-1">
                      {stage.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {(hasError || error) && onRetry && (
          <div className="mt-4 pt-3 border-t">
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function to create default analysis stages
export const createAnalysisStages = (): AnalysisStage[] => [
  {
    id: 'upload',
    name: 'Uploading Images',
    icon: Upload,
    status: 'pending',
    progress: 0
  },
  {
    id: 'processing',
    name: 'Processing Images',
    icon: Image,
    status: 'pending',
    progress: 0
  },
  {
    id: 'analysis',
    name: 'AI Analysis',
    icon: Brain,
    status: 'pending',
    progress: 0
  },
  {
    id: 'enhancement',
    name: 'Generating Insights',
    icon: Sparkles,
    status: 'pending',
    progress: 0
  }
];