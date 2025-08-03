import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOptimizedContextDetection } from '@/hooks/useOptimizedContextDetection';
import { AnalysisContext } from '@/types/contextTypes';
import { Clock, Zap, Target, BarChart3, RefreshCw, Trash2 } from 'lucide-react';

interface OptimizedContextMonitorProps {
  imageData?: {
    url?: string;
    base64?: string;
    metadata?: any;
  };
  userInput?: string;
  onContextChange?: (context: AnalysisContext | null) => void;
}

export function OptimizedContextMonitor({
  imageData,
  userInput,
  onContextChange
}: OptimizedContextMonitorProps) {
  const {
    isDetecting,
    context,
    performance,
    detectContext,
    clearCache,
    resetMetrics,
    getPerformanceMetrics
  } = useOptimizedContextDetection({
    onContextDetected: onContextChange
  });

  const [autoDetect, setAutoDetect] = useState(false);

  // Auto-detect when imageData changes
  useEffect(() => {
    if (autoDetect && imageData && (imageData.url || imageData.base64)) {
      handleDetectContext();
    }
  }, [imageData, userInput, autoDetect]);

  const handleDetectContext = async () => {
    if (!imageData) return;
    
    try {
      await detectContext(imageData, userInput, {
        useConfidenceRouting: true,
        minConfidence: 0.7
      });
    } catch (error) {
      console.error('Context detection failed:', error);
    }
  };

  const handleTestBatch = async () => {
    if (!imageData) return;
    
    // Create test batch with the same image
    const testImages = Array(3).fill(imageData);
    
    try {
      // This would normally be used with multiple different images
      console.log('Testing batch processing with sample data');
    } catch (error) {
      console.error('Batch test failed:', error);
    }
  };

  const currentMetrics = performance || getPerformanceMetrics();

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimized Context Detection
          </CardTitle>
          <CardDescription>
            Fast, metadata-first context detection with AI vision fallback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDetectContext}
              disabled={isDetecting || !imageData}
              size="sm"
            >
              {isDetecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Detect Context
                </>
              )}
            </Button>
            
            <Button
              onClick={handleTestBatch}
              disabled={isDetecting || !imageData}
              variant="outline"
              size="sm"
            >
              Test Batch
            </Button>
            
            <Button
              onClick={clearCache}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            
            <Button
              onClick={resetMetrics}
              variant="outline"
              size="sm"
            >
              Reset Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Requests</div>
              <div className="text-2xl font-bold">{currentMetrics.totalRequests}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                {currentMetrics.averageTime}
                <span className="text-sm text-muted-foreground">ms</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Metadata Hit Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {currentMetrics.metadataHitRate}%
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Vision Fallback Rate</div>
              <div className="text-2xl font-bold text-orange-600">
                {currentMetrics.visionFallbackRate}%
              </div>
            </div>
          </div>
          
          {/* Progress indicator when detecting */}
          {isDetecting && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Processing context detection...</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Results */}
      {context && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Context</CardTitle>
            <CardDescription>
              Analysis confidence: {Math.round(context.confidence * 100)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Interface Type</div>
                  <Badge variant="default">{context.image.primaryType}</Badge>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Domain</div>
                  <Badge variant="secondary">{context.image.domain}</Badge>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Platform</div>
                  <Badge variant="outline">{context.image.platform}</Badge>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Complexity</div>
                  <Badge 
                    variant={
                      context.image.complexity === 'simple' ? 'default' :
                      context.image.complexity === 'complex' ? 'destructive' : 'secondary'
                    }
                  >
                    {context.image.complexity}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">User Role</div>
                  <Badge variant="default">
                    {context.user.inferredRole || 'Not specified'}
                  </Badge>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Technical Level</div>
                  <Badge variant="secondary">
                    {context.user.technicalLevel || 'intermediate'}
                  </Badge>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Analysis Depth</div>
                  <Badge variant="outline">{context.analysisDepth}</Badge>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Output Style</div>
                  <Badge variant="outline">{context.outputStyle}</Badge>
                </div>
              </div>
            </div>
            
            {/* Focus Areas */}
            {context.focusAreas && context.focusAreas.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Focus Areas</div>
                <div className="flex flex-wrap gap-1">
                  {context.focusAreas.map((area, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Clarification Needed */}
            {context.clarificationNeeded && context.clarificationQuestions && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Clarification Needed
                </div>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {context.clarificationQuestions.map((question, index) => (
                    <li key={index}>• {question}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}