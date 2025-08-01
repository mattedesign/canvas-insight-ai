import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useResilientPipeline } from '@/hooks/useResilientPipeline';
import { X, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

interface ResilientAnalysisDialogProps {
  imageId: string;
  imageUrl: string;
  imageName: string;
  onClose: () => void;
  onComplete: (analysis: any) => void;
}

export const ResilientAnalysisDialog: React.FC<ResilientAnalysisDialogProps> = ({
  imageId,
  imageUrl,
  imageName,
  onClose,
  onComplete
}) => {
  const [userContext, setUserContext] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'resilient' | 'standard'>('resilient');
  
  const {
    isAnalyzing,
    progress,
    stage,
    message,
    stages,
    successfulStages,
    totalStages,
    qualityScore,
    isPartialResult,
    executeResilientAnalysis,
    cancelAnalysis,
    getQualityIndicator,
    getStageHealthSummary
  } = useResilientPipeline();

  const handleAnalyze = async () => {
    try {
      const result = await executeResilientAnalysis(
        imageUrl,
        imageName,
        imageId,
        userContext
      );
      
      if (result.success) {
        onComplete(result.data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const qualityIndicator = getQualityIndicator();
  const stageHealth = getStageHealthSummary();

  const getStageIcon = (stageData: any) => {
    if (stageData.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (stageData.retryCount && stageData.retryCount > 0) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStageStatus = (stageData: any) => {
    if (stageData.success) return 'success';
    if (stageData.retryCount && stageData.retryCount > 0) return 'retry';
    return 'failed';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Resilient AI Analysis</h2>
              <p className="text-muted-foreground">
                Multi-stage pipeline with graceful failure handling
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isAnalyzing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Preview */}
          <div className="relative">
            <img
              src={imageUrl}
              alt={imageName}
              className="w-full h-48 object-contain rounded-lg border bg-muted"
            />
            <div className="absolute top-2 right-2">
              <Badge variant="secondary">{imageName}</Badge>
            </div>
          </div>

          {/* Analysis Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Analysis Mode</label>
            <Select value={analysisMode} onValueChange={(value: 'resilient' | 'standard') => setAnalysisMode(value)} disabled={isAnalyzing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resilient">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Resilient Pipeline - Continues on failures
                  </div>
                </SelectItem>
                <SelectItem value="standard">Standard Pipeline - All stages required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Context (Optional)</label>
            <Textarea
              placeholder="Describe what you'd like to focus on in this analysis..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              disabled={isAnalyzing}
              rows={3}
            />
          </div>

          {/* Progress Section */}
          {isAnalyzing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pipeline Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {successfulStages}/{totalStages} stages completed
                  </span>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>

              {/* Quality Score */}
              {qualityScore > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Quality Score:</span>
                  <Badge variant="outline" className={qualityIndicator.color}>
                    {qualityScore}% ({qualityIndicator.level})
                  </Badge>
                </div>
              )}

              {/* Stage Status */}
              {stages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Stage Status</span>
                  <div className="space-y-1">
                    {stages.map((stage, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {getStageIcon(stage)}
                        <span className="font-medium">{stage.stage.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">({stage.model})</span>
                        {stage.retryCount && stage.retryCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {stage.retryCount} retries
                          </Badge>
                        )}
                        {stage.error && (
                          <span className="text-xs text-red-500 truncate max-w-48">
                            {stage.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Summary */}
              {stageHealth.total > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{stageHealth.successful} successful</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>{stageHealth.failed} failed</span>
                  </div>
                  <Badge variant="outline">
                    {stageHealth.healthPercentage}% health
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Results Summary */}
          {!isAnalyzing && stages.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Analysis Complete</h3>
              
              {isPartialResult && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Partial results available - some stages failed but analysis contains useful insights
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Quality Score:</span>
                  <div className={`text-lg font-bold ${qualityIndicator.color}`}>
                    {qualityScore}%
                  </div>
                </div>
                <div>
                  <span className="font-medium">Stages:</span>
                  <div className="text-lg font-bold">
                    {successfulStages}/{totalStages}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex-1"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Start Resilient Analysis
                </>
              )}
            </Button>
            
            {isAnalyzing ? (
              <Button
                variant="outline"
                onClick={cancelAnalysis}
                size="lg"
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={onClose}
                size="lg"
              >
                Close
              </Button>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-blue-900 mb-2">Resilient Pipeline Benefits</h4>
            <ul className="space-y-1 text-blue-800">
              <li>• Continues processing even if individual AI services fail</li>
              <li>• Provides partial results when some stages succeed</li>
              <li>• Built-in retry logic with exponential backoff</li>
              <li>• Circuit breaker prevents cascading failures</li>
              <li>• Quality scoring helps assess result reliability</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ResilientAnalysisDialog;