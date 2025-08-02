import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, TrendingUp, Zap, Target } from 'lucide-react';
import { useEnhancedAnalysis } from '@/hooks/useEnhancedAnalysis';

interface EnhancedAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  imageId: string;
  onAnalysisComplete: (analysisData: any) => void;
}

export default function EnhancedAnalysisDialog({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  imageId,
  onAnalysisComplete
}: EnhancedAnalysisDialogProps) {
  const [userContext, setUserContext] = useState('');
  const [selectedAIModel, setSelectedAIModel] = useState('auto');
  
  const {
    isAnalyzing,
    progress,
    stage,
    error,
    qualityMetrics,
    performEnhancedAnalysis,
    resetState
  } = useEnhancedAnalysis();

  const handleAnalyze = async () => {
    const result = await performEnhancedAnalysis(
      imageUrl,
      imageName,
      imageId,
      userContext,
      selectedAIModel
    );

    if (result.success) {
      onAnalysisComplete(result.data);
      setTimeout(() => {
        onClose();
        resetState();
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      onClose();
      resetState();
    }
  };

  const getStageIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (stage === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <TrendingUp className="h-4 w-4 text-blue-500" />;
  };

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Enhanced UX Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Image</h3>
            <div className="relative">
              <img
                src={imageUrl}
                alt={imageName}
                className="w-full h-48 object-cover rounded-lg border"
              />
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {imageName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Context Input */}
          <div className="space-y-2">
            <label htmlFor="context" className="text-sm font-medium">
              Context & Domain Information
            </label>
            <Textarea
              id="context"
              placeholder="Describe the app domain (e.g., financial app, e-commerce, healthcare) and any specific areas you'd like analyzed..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              className="min-h-[80px]"
              disabled={isAnalyzing}
            />
            <p className="text-xs text-muted-foreground">
              More specific context leads to better, domain-aware analysis
            </p>
          </div>

          {/* AI Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Model</label>
            <div className="space-y-2">
              <select
                value={selectedAIModel}
                onChange={(e) => setSelectedAIModel(e.target.value)}
                disabled={isAnalyzing}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="auto">Smart Selection (Recommended)</option>
                <option value="gpt-4o">GPT 4o</option>
                <option value="claude-opus-4-20250514">Claude Opus 4</option>
                <option value="google-vision">Google Vision</option>
                <option value="stability-ai">Stability AI</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Smart Selection automatically chooses the best available model
              </p>
            </div>
          </div>

          {/* Progress Section */}
          {isAnalyzing && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {getStageIcon()}
                <span className="text-sm font-medium capitalize">{stage}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Progress: {progress}%
              </p>
            </div>
          )}

          {/* Quality Metrics */}
          {qualityMetrics && stage === 'completed' && (
            <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Analysis Quality Report
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Annotations:</span>
                  <Badge variant="outline" className="text-xs">
                    {qualityMetrics.annotationCount}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Suggestions:</span>
                  <Badge variant="outline" className="text-xs">
                    {qualityMetrics.suggestionCount}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Domain Relevance:</span>
                  <Badge 
                    variant={getQualityBadgeVariant(qualityMetrics.domainRelevance)} 
                    className="text-xs"
                  >
                    {qualityMetrics.domainRelevance}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Overall Quality:</span>
                  <Badge 
                    variant={getQualityBadgeVariant(qualityMetrics.overallQuality)} 
                    className="text-xs"
                  >
                    {qualityMetrics.overallQuality}%
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Analysis Failed</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? 'Analyzing...' : 'Cancel'}
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || stage === 'completed'}
              className="flex-1"
            >
              {isAnalyzing 
                ? `${stage}...` 
                : stage === 'completed' 
                ? 'Analysis Complete' 
                : 'Start Enhanced Analysis'
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}