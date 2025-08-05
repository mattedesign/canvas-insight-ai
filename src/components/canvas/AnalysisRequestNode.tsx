import React, { memo, useEffect, useState, useRef } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Eye, Search, Lightbulb } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAI } from '@/context/AIContext';
import { ContextClarification } from '@/components/ContextClarification';
import { AnalysisDebugger, AnalysisLifecycle } from '@/utils/analysisDebugging';
import { AnalysisDataMapper } from '@/services/AnalysisDataMapper';

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
  
  const { isAnalyzing, analyzeImageWithAI, analysisProgress } = useAI();

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
          
          // STEP 1: Add Debug Code - Log raw analysis result
          console.log('[AnalysisRequestNode] Raw analysis result:', JSON.stringify(result, null, 2));
          
          // Check if it's wrapped in a response object
          if (result?.data) {
            console.log('[AnalysisRequestNode] Found wrapped data:', JSON.stringify(result.data, null, 2));
          }
          
          // STEP 2: Complete Fix - Handle nested data structures
          const handleAnalysisComplete = (rawResult: any) => {
            console.log('[AnalysisRequestNode] Handling analysis completion:', rawResult);
            
            // Extract the actual analysis data from nested structures
            let analysisData = rawResult;
            
            // Check for success wrapper
            if (rawResult?.success && rawResult?.data) {
              analysisData = rawResult.data;
            }
            
            // Check for synthesizedResult
            if (analysisData?.synthesizedResult) {
              analysisData = analysisData.synthesizedResult;
            }
            
            // Apply the mapper
            const mappedData = AnalysisDataMapper.mapBackendToFrontend(analysisData);
            console.log('[AnalysisRequestNode] Mapped result:', JSON.stringify(mappedData, null, 2));
            
            // Validate we have the required fields
            if (!mappedData.imageId || !mappedData.suggestions) {
              console.error('[AnalysisRequestNode] Missing required fields after mapping:', {
                hasImageId: !!mappedData.imageId,
                hasSuggestions: !!mappedData.suggestions,
                hasVisualAnnotations: !!mappedData.visualAnnotations
              });
              setError('Analysis returned incomplete data - missing required fields');
              return;
            }
            
            AnalysisDebugger.log('AnalysisRequestNode', AnalysisLifecycle.ANALYSIS_COMPLETED, { 
              imageId, 
              imageName,
              analysisId: mappedData.id 
            });
            setIsComplete(true);
            
            // Pass the properly mapped data
            if (onAnalysisComplete) {
              onAnalysisComplete(mappedData);
            }
          };
          
          // Process the result
          handleAnalysisComplete(result);
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

  // Helper functions for dynamic progress display
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'context_detection':
        return <Eye className="h-4 w-4" />;
      case 'analysis':
        return <Search className="h-4 w-4" />;
      case 'generation':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getProgressMessage = () => {
    if (!analysisProgress || !isAnalyzing) {
      return 'Analyzing interface...';
    }

    switch (analysisProgress.stage) {
      case 'context_detection':
        return 'Detecting interface type...';
      case 'analysis':
        return 'Analyzing UX patterns...';
      case 'generation':
        return 'Generating insights...';
      case 'complete':
        return 'Analysis complete';
      default:
        return analysisProgress.message || 'Processing...';
    }
  };

  const getProgressValue = () => {
    if (!analysisProgress || !isAnalyzing) {
      return 0;
    }
    return analysisProgress.progress || 0;
  };

  // Determine current status
  const getStatus = () => {
    if (error) return 'error';
    if (isAnalyzing) return 'loading';
    if (isComplete || analysisProgress?.stage === 'complete') return 'complete';
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
                {analysisProgress?.stage ? getStageIcon(analysisProgress.stage) : <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{getProgressMessage()}</span>
              </div>
              <Progress value={getProgressValue()} className="h-2" />
              {analysisProgress?.progress && (
                <div className="text-xs text-muted-foreground text-right">
                  {Math.round(analysisProgress.progress)}%
                </div>
              )}
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