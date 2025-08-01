import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedPipeline } from '@/hooks/useOptimizedPipeline';
import { ContextClarification } from '@/components/ContextClarification';
import { AnalysisContextDisplay } from '@/components/AnalysisContextDisplay';
import { Loader2, CheckCircle, AlertCircle, Zap, TrendingUp, Database } from 'lucide-react';

interface OptimizedAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  imageId: string;
  onAnalysisComplete: (analysis: any) => void;
}

const OptimizedAnalysisDialog: React.FC<OptimizedAnalysisDialogProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  imageId,
  onAnalysisComplete,
}) => {
  const [userContext, setUserContext] = useState('');
  
  const {
    isAnalyzing,
    progress,
    stage,
    message,
    tokenUsage,
    error,
    stages,
    analysisContext,
    requiresClarification,
    clarificationQuestions,
    executeOptimizedAnalysis,
    resumeWithClarification,
    cancelAnalysis,
    resetPipeline
  } = useOptimizedPipeline();

  const handleAnalyze = async () => {
    try {
      const result = await executeOptimizedAnalysis(
        imageUrl,
        imageName,
        imageId,
        userContext
      );

      if (result.success && result.data) {
        onAnalysisComplete(result.data);
        handleClose();
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const handleClarificationSubmit = async (responses: Record<string, string>) => {
    try {
      const result = await resumeWithClarification(responses, '', imageUrl, userContext);
      if (result.success && result.data) {
        onAnalysisComplete(result.data);
        handleClose();
      }
    } catch (err) {
      console.error('Clarification analysis failed:', err);
    }
  };

  const handleClarificationCancel = () => {
    resetPipeline();
  };

  const handleClose = () => {
    if (isAnalyzing) {
      cancelAnalysis();
    }
    resetPipeline();
    onClose();
  };

  const getStageIcon = (stageName: string, stageStatus: boolean) => {
    if (stage === stageName && isAnalyzing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (stageStatus) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <div className="h-4 w-4 rounded-full bg-muted" />;
  };

  const getTokenEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimized Multi-Stage AI Analysis
          </DialogTitle>
          <DialogDescription>
            Advanced pipeline that automatically manages token limits and compresses data to prevent 422 errors
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          <div className="flex items-center gap-4">
            <img
              src={imageUrl}
              alt={imageName}
              className="w-16 h-16 object-cover rounded-lg border"
            />
            <div>
              <h3 className="font-medium">{imageName}</h3>
              <p className="text-sm text-muted-foreground">Ready for optimized analysis</p>
            </div>
          </div>

          {/* Clarification Flow */}
          {requiresClarification && clarificationQuestions.length > 0 ? (
            <div className="space-y-4">
              {/* Show detected context during clarification */}
              {analysisContext && (
                <Card className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Context Detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AnalysisContextDisplay context={analysisContext} />
                  </CardContent>
                </Card>
              )}
              
              <ContextClarification
                questions={clarificationQuestions}
                partialContext={analysisContext}
                onSubmit={handleClarificationSubmit}
                onCancel={handleClarificationCancel}
              />
            </div>
          ) : (
            <>
              {/* User Context Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Context & Focus Areas (Optional)
                </label>
                <Textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="Describe what you want to focus on in this analysis... (e.g., accessibility, mobile usability, conversion optimization)"
                  className="min-h-[80px]"
                  disabled={isAnalyzing}
                />
                <p className="text-xs text-muted-foreground">
                  The optimized pipeline will automatically compress context if needed to prevent API limits
                </p>
              </div>

              {/* Analysis Context Display */}
              {analysisContext && (
                <AnalysisContextDisplay context={analysisContext} />
              )}
            </>
          )}

          {/* Progress Indicator */}
          {isAnalyzing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Analysis Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {stage === 'Analyzing image context...' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {stage === 'Understanding user needs...' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {stage === 'Context clarification needed...' && <AlertCircle className="h-3 w-3 text-amber-500" />}
                      {message || stage}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Token Usage Display */}
                {tokenUsage && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      Token Usage
                    </span>
                    <span className={getTokenEfficiencyColor(((tokenUsage.remaining / (tokenUsage.used + tokenUsage.remaining)) * 100))}>
                      {tokenUsage.used} / {tokenUsage.used + tokenUsage.remaining}
                    </span>
                  </div>
                )}

                {/* Stage Progress */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Pipeline Stages</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {getStageIcon('metadata', stages.some(s => s.stage === 'compressed_metadata' && s.success))}
                      <span>Metadata Compression</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStageIcon('vision', stages.some(s => s.stage === 'optimized_vision' && s.success))}
                      <span>Optimized Vision</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStageIcon('comprehensive', stages.some(s => s.stage === 'token_managed_comprehensive' && s.success))}
                      <span>Token-Managed Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStageIcon('consolidation', stages.length > 0)}
                      <span>Data Consolidation</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pipeline Features */}
          {!isAnalyzing && !error && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Optimization Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Data Compression
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Token Management
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      422 Error Prevention
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Multi-Stage Pipeline
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Analysis Failed</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                
                {/* Specific error guidance */}
                {error.includes('API key') && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-xs font-medium">Quick Fix:</p>
                    <p className="text-xs text-muted-foreground">
                      Configure your API keys in Supabase Edge Functions settings. 
                      At least one of OpenAI, Anthropic, or Google Vision API key is required.
                    </p>
                  </div>
                )}
                
                {error.includes('Network') && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-xs font-medium">Quick Fix:</p>
                    <p className="text-xs text-muted-foreground">
                      Check your internet connection and try again. The analysis requires stable connectivity.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {!requiresClarification && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isAnalyzing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="min-w-[120px]"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start Optimized Analysis
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptimizedAnalysisDialog;