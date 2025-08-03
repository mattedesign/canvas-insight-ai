import React, { memo, useEffect, useState, useRef } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAI } from '@/context/AIContext';
import { ContextClarification } from '@/components/ContextClarification';
import { AnalysisDebugger, AnalysisLifecycle } from '@/utils/analysisDebugging';

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
  AnalysisDebugger.log('AnalysisRequestNode', 'COMPONENT_MOUNTED', { 
    imageId: data.imageId, 
    imageName: data.imageName, 
    nodeId: id 
  });
  
  const { imageId, imageName, imageUrl, userContext, onAnalysisComplete, onError } = data;
  const [showClarification, setShowClarification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  // PHASE 2: Re-rendering Fixes - Track mount state
  const isMountedRef = useRef(true);
  const hasExecutedRef = useRef(false);
  
  const { isAnalyzing, analyzeImageWithAI } = useAI();

  // PHASE 2: Re-rendering Fixes - Prevent duplicate executions
  useEffect(() => {
    console.log('[AnalysisRequestNode] useEffect triggered with:', {
      imageId,
      hasExecuted: hasExecutedRef.current,
      isAnalyzing,
      error
    });
    
    // Only execute once per imageId and if not already executed
    if (!hasExecutedRef.current && imageId && !isAnalyzing && !error && !isComplete) {
      hasExecutedRef.current = true;
      AnalysisDebugger.log('AnalysisRequestNode', AnalysisLifecycle.ANALYSIS_STARTED, { 
        imageId, 
        imageName 
      });
      
      analyzeImageWithAI(imageId, imageUrl, imageName, userContext)
        .then((result) => {
          if (!isMountedRef.current) return; // Check if still mounted
          
          console.log('[AnalysisRequestNode] Analysis result:', result);
          
          // Validate result structure before marking complete
          const analysisData = result?.data || result;
          const validation = AnalysisDebugger.validateAnalysisStructure(analysisData);
          
          if (validation.valid) {
            AnalysisDebugger.log('AnalysisRequestNode', AnalysisLifecycle.ANALYSIS_COMPLETED, { 
              imageId, 
              imageName,
              analysisId: analysisData.id 
            });
            setIsComplete(true);
            if (onAnalysisComplete) {
              onAnalysisComplete(result);
            }
          } else {
            AnalysisDebugger.log('AnalysisRequestNode', 'VALIDATION_FAILED', { 
              imageId, 
              issues: validation.issues 
            });
            setError('Analysis returned invalid or incomplete data');
          }
        })
        .catch((err) => {
          if (!isMountedRef.current) return; // Check if still mounted
          
          console.error('Analysis failed:', err);
          setError(err.message || 'Analysis failed');
          if (onError) {
            onError(err.message || 'Analysis failed');
          }
        });
    }
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [imageId, analyzeImageWithAI]); // Only depend on imageId and analyzeImageWithAI

  // Determine current status
  const getStatus = () => {
    if (error) return 'error';
    if (isAnalyzing) return 'loading';
    if (isComplete) return 'complete';
    return 'loading';
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
                <span>Analyzing interface...</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
          )}
          
          {currentStatus === 'error' && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{error || 'Analysis failed'}</span>
            </div>
          )}

          {currentStatus === 'complete' && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span>Analysis complete</span>
            </div>
          )}
        </div>
      </Card>
      
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
});

AnalysisRequestNode.displayName = 'AnalysisRequestNode';