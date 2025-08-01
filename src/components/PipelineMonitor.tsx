import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';

interface PipelineMonitorProps {
  progress: number;
  stage: string;
  message: string;
  error: string | null;
}

export function PipelineMonitor({ progress, stage, message, error }: PipelineMonitorProps) {
  const stages = [
    { id: 'context', label: 'Context Detection', threshold: 5 },
    { id: 'vision', label: 'Vision Analysis', threshold: 30 },
    { id: 'analysis', label: 'Deep Analysis', threshold: 60 },
    { id: 'synthesis', label: 'Synthesis', threshold: 90 },
    { id: 'completed', label: 'Complete', threshold: 100 }
  ];

  const getStageStatus = (stageThreshold: number) => {
    if (error) return 'error';
    if (progress >= stageThreshold) return 'complete';
    if (progress > stageThreshold - 10 && progress < stageThreshold) return 'active';
    return 'pending';
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-4 w-4" />;
      case 'active': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analysis Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="w-full" />
        
        <div className="space-y-2">
          {stages.map((s) => {
            const status = getStageStatus(s.threshold);
            return (
              <div key={s.id} className="flex items-center gap-2">
                {getStageIcon(status)}
                <span className={`text-sm ${status === 'active' ? 'font-medium' : ''}`}>
                  {s.label}
                </span>
                {status === 'complete' && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Complete
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {message && (
          <div className="text-sm text-muted-foreground mt-2">
            {message}
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive mt-2">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}