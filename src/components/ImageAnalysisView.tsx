import { AnalysisContextDisplay } from './AnalysisContextDisplay';
import { ContextDetectionErrorBoundary } from './ContextDetectionErrorBoundary';
import { AnalysisVersionManager } from './AnalysisVersionManager';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Code, Palette, Briefcase, TrendingUp } from 'lucide-react';

interface ImageAnalysisViewProps {
  analysis: any;
  imageId?: string;
  currentAnalysisId?: string;
  onAnalysisSelected?: (analysisId: string) => void;
  onNewAnalysis?: () => void;
}

export function ImageAnalysisView({ 
  analysis, 
  imageId,
  currentAnalysisId, 
  onAnalysisSelected,
  onNewAnalysis 
}: ImageAnalysisViewProps) {
  return (
    <div className="space-y-6">
      {/* Version Management - Show first if imageId is available */}
      {imageId && (
        <AnalysisVersionManager
          imageId={imageId}
          currentAnalysisId={currentAnalysisId}
          onAnalysisSelected={onAnalysisSelected}
          onNewAnalysis={onNewAnalysis}
        />
      )}

      {/* Context Information - PRIORITY DISPLAY */}
      {analysis.analysisContext && (
        <ContextDetectionErrorBoundary>
          <AnalysisContextDisplay context={analysis.analysisContext} />
        </ContextDetectionErrorBoundary>
      )}

      {/* Enhanced Model Information */}
      {analysis.metadata?.modelsUsed && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            {analysis.metadata?.modelsUsed?.length || 0} AI Models Used
          </Badge>
          
          {analysis.metadata.modelsUsed.map((model: string) => (
            <Badge key={model} variant="secondary" className="text-xs">
              {model}
            </Badge>
          ))}
          
          {(analysis.summary?.confidence || analysis.summary?.confidenceScore) && (
            <Badge variant="outline" className="gap-1">
              Confidence: {Math.round((analysis.summary?.confidence || analysis.summary?.confidenceScore || 0) * 100)}%
            </Badge>
          )}
        </div>
      )}

      {/* Enhanced Pipeline Stages Display */}
      {analysis.metadata?.stagesCompleted && (
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Analysis Pipeline</div>
          <div className="flex gap-2">
            {['context', 'vision', 'analysis', 'synthesis'].map((stage) => {
              const completed = analysis.metadata?.stagesCompleted?.includes(stage) || false;
              return (
                <Badge 
                  key={stage} 
                  variant={completed ? 'default' : 'outline'}
                  className="capitalize"
                >
                  {stage}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}