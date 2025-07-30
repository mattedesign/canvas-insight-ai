import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  BarChart3, 
  Wand2, 
  Settings, 
  Zap, 
  Eye,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIModelSelector } from '../AIModelSelector';
import { ModelComparisonPanel } from '../ModelComparisonPanel';
import { useAI } from '@/context/AIContext';
import { useAIModelComparison } from '@/hooks/useAIModelComparison';

interface AICanvasToolbarProps {
  selectedImageIds: string[];
  selectedImages: Array<{ id: string; name: string; url: string }>;
  onAnalysisTriggered?: (imageId: string, analysis: any) => void;
  onBatchAnalysis?: (imageIds: string[]) => void;
  onGroupAnalysis?: (imageIds: string[]) => void;
}

export const AICanvasToolbar: React.FC<AICanvasToolbarProps> = ({
  selectedImageIds,
  selectedImages,
  onAnalysisTriggered,
  onBatchAnalysis,
  onGroupAnalysis
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
  const { selectedAIModel, setSelectedAIModel, isAnalyzing, analyzeImageWithAI } = useAI();
  const { isComparing, compareModels, getBestPerformingModel } = useAIModelComparison();

  const handleSingleAnalysis = async () => {
    if (selectedImages.length !== 1) return;
    
    const image = selectedImages[0];
    try {
      const analysis = await analyzeImageWithAI(image.id, image.url, image.name);
      onAnalysisTriggered?.(image.id, analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const handleBatchAnalysis = async () => {
    if (selectedImageIds.length === 0) return;
    onBatchAnalysis?.(selectedImageIds);
  };

  const handleGroupAnalysis = async () => {
    if (selectedImageIds.length < 2) return;
    onGroupAnalysis?.(selectedImageIds);
  };

  const handleModelComparison = async () => {
    if (selectedImages.length !== 1) return;
    
    const image = selectedImages[0];
    await compareModels(image.id, image.url, image.name);
  };

  const getActionButtonText = () => {
    if (selectedImageIds.length === 0) return 'Select images to analyze';
    if (selectedImageIds.length === 1) return 'Analyze Image';
    return `Analyze ${selectedImageIds.length} Images`;
  };

  const canAnalyze = selectedImageIds.length > 0;
  const canCompare = selectedImages.length === 1;
  const canGroup = selectedImageIds.length >= 2;

  return (
    <Card className="fixed top-4 right-4 z-40 w-80 bg-background/95 backdrop-blur-sm border shadow-lg">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold">AI Analysis</span>
            {selectedImageIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedImageIds.length} selected
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 mb-3">
          <Button
            onClick={selectedImageIds.length === 1 ? handleSingleAnalysis : handleBatchAnalysis}
            disabled={!canAnalyze || isAnalyzing}
            className="w-full"
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                {getActionButtonText()}
              </>
            )}
          </Button>

          {canGroup && (
            <Button
              onClick={handleGroupAnalysis}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Group Analysis
            </Button>
          )}
        </div>

        {/* Expanded Options */}
        {isExpanded && (
          <>
            <Separator className="mb-3" />
            
            {/* Model Selection Toggle */}
            <div className="space-y-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                AI Model Settings
              </Button>

              {canCompare && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Model Comparison
                </Button>
              )}
            </div>

            {/* Current Model Display */}
            <div className="text-xs text-muted-foreground mb-3">
              <div className="flex items-center justify-between">
                <span>Current Model:</span>
                <Badge variant="outline" className="text-xs">
                  {selectedAIModel === 'auto' ? 'Smart Selection' : selectedAIModel}
                </Badge>
              </div>
            </div>

            {/* Model Selector */}
            {showModelSelector && (
              <div className="mb-3">
                <AIModelSelector
                  selectedModel={selectedAIModel}
                  onModelChange={setSelectedAIModel}
                  onAnalyze={selectedImageIds.length === 1 ? handleSingleAnalysis : handleBatchAnalysis}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            )}

            {/* Model Comparison */}
            {showComparison && canCompare && (
              <div className="mb-3">
                <ModelComparisonPanel
                  imageId={selectedImages[0]?.id}
                  imageUrl={selectedImages[0]?.url}
                  onAnalysisComplete={(results) => {
                    console.log('Comparison complete:', results);
                    // Optionally trigger analysis with best model
                  }}
                />
              </div>
            )}

            {/* Advanced Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleModelComparison}
                disabled={!canCompare || isComparing}
                className="w-full"
              >
                {isComparing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Compare Models
                  </>
                )}
              </Button>

              {selectedImageIds.length === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // TODO: Implement enhanced analysis
                    console.log('Enhanced analysis for:', selectedImages[0]);
                  }}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Enhanced Analysis
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};