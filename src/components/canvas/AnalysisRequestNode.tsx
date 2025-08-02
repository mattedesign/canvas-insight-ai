import React, { memo, useEffect, useState } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useOptimizedPipeline } from '@/hooks/useOptimizedPipeline';
import { ContextClarification } from '@/components/ContextClarification';

export interface AnalysisRequestNodeData extends Record<string, unknown> {
  imageId: string;
  imageName: string;
  imageUrl: string;
  userContext?: string;
  onAnalysisComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface AnalysisRequestNodeProps extends NodeProps {
  data: AnalysisRequestNodeData;
}

export const AnalysisRequestNode = memo(({ data, id }: AnalysisRequestNodeProps) => {
  const { imageId, imageName, imageUrl, userContext, onAnalysisComplete, onError } = data;
  const [showClarification, setShowClarification] = useState(false);
  const [resumeToken, setResumeToken] = useState<string>('');
  
  const {
    isAnalyzing,
    progress,
    stage,
    requiresClarification,
    clarificationQuestions,
    error,
    executeAnalysis,
    resumeWithClarification
  } = useOptimizedPipeline();

  // Start analysis when node is created
  useEffect(() => {
    if (!isAnalyzing && !requiresClarification && !error) {
      console.log('Starting analysis for:', imageName);
      executeAnalysis(imageUrl, userContext || '')
        .then((result) => {
          if (result.requiresClarification) {
            setShowClarification(true);
            // Store questions for resume token - using a simple identifier
            setResumeToken('resume-' + Date.now());
          } else if (result.success && onAnalysisComplete) {
            onAnalysisComplete(result.data);
          }
        })
        .catch((err) => {
          console.error('Analysis failed:', err);
          if (onError) {
            onError(err.message || 'Analysis failed');
          }
        });
    }
  }, [imageUrl, imageName, userContext, executeAnalysis, isAnalyzing, requiresClarification, error, onAnalysisComplete, onError]);

  const handleClarificationSubmit = async (responses: Record<string, string>) => {
    setShowClarification(false);
    
    try {
      const result = await resumeWithClarification(
        responses,
        resumeToken,
        imageUrl,
        userContext || ''
      );
      
      if (result.success && onAnalysisComplete) {
        onAnalysisComplete(result.data);
      }
    } catch (err) {
      console.error('Clarification resume failed:', err);
      if (onError) {
        onError(err.message || 'Analysis failed after clarification');
      }
    }
  };

  // Determine current status
  const getStatus = () => {
    if (error) return 'error';
    if (requiresClarification || showClarification) return 'clarification';
    if (isAnalyzing) return 'loading';
    return 'complete';
  };

  const currentStatus = getStatus();

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      
      <Card className="w-80 p-4 bg-background/95 backdrop-blur">
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Analyzing {imageName}</h3>
          
          {currentStatus === 'loading' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{stage || 'Initializing analysis...'}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          {currentStatus === 'clarification' && !showClarification && clarificationQuestions && (
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
              <button 
                onClick={() => setShowClarification(true)}
                className="text-xs text-primary hover:underline"
              >
                Click to answer questions →
              </button>
            </div>
          )}
          
          {currentStatus === 'error' && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{error || 'Analysis failed'}</span>
            </div>
          )}

          {currentStatus === 'complete' && !isAnalyzing && !error && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span>Analysis complete</span>
            </div>
          )}
        </div>
      </Card>
      
      {showClarification && clarificationQuestions && (
        <ContextClarification
          questions={clarificationQuestions}
          partialContext={{}}
          onSubmit={handleClarificationSubmit}
          onCancel={() => setShowClarification(false)}
        />
      )}
      
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
});

AnalysisRequestNode.displayName = 'AnalysisRequestNode';