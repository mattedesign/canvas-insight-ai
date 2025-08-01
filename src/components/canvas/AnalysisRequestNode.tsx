import React, { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface AnalysisRequestNodeData {
  imageId: string;
  imageName: string;
  status: 'loading' | 'clarification' | 'error' | 'complete';
  progress?: number;
  stage?: string;
  clarificationQuestions?: string[];
  error?: string;
}

interface AnalysisRequestNodeProps {
  data: AnalysisRequestNodeData;
}

export const AnalysisRequestNode = memo(({ data }: AnalysisRequestNodeProps) => {
  const { imageName, status, progress = 0, stage, clarificationQuestions, error } = data;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      
      <Card className="w-80 p-4 bg-background/95 backdrop-blur">
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Analyzing {imageName}</h3>
          
          {status === 'loading' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{stage || 'Initializing analysis...'}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          {status === 'clarification' && clarificationQuestions && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                I need some clarification to provide the best analysis:
              </p>
              <div className="space-y-2">
                {clarificationQuestions.map((question, index) => (
                  <div key={index} className="p-2 bg-muted/50 rounded text-sm">
                    {question}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to answer questions →
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{error || 'Analysis failed'}</span>
            </div>
          )}
        </div>
      </Card>
      
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
});

AnalysisRequestNode.displayName = 'AnalysisRequestNode';