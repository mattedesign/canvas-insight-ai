import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AnalysisJob } from '@/hooks/useAnalysisJob';

interface Props {
  job: AnalysisJob | null;
}

export const AnalysisJobProgress: React.FC<Props> = ({ job }) => {
  if (!job) return null;

  const pct = Math.max(0, Math.min(100, job.progress ?? 0));
  const isDone = job.status === 'completed';
  const isFail = job.status === 'failed';

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={isDone ? 'default' : isFail ? 'destructive' : 'secondary'}>
          {job.status}
        </Badge>
        {job.current_stage && (
          <span className="text-sm text-muted-foreground">Stage: {job.current_stage}</span>
        )}
      </div>
      <Progress value={isDone ? 100 : pct} />
      {job.error && (
        <p className="text-sm text-destructive">{job.error}</p>
      )}
    </section>
  );
};
