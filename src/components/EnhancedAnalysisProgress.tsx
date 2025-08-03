import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalysisProgress } from '@/services/EnhancedAnalysisPipeline';
import { 
  Eye, 
  Brain, 
  Target, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  X,
  Smartphone,
  BarChart,
  Globe,
  ShoppingCart,
  FileText,
  Settings
} from 'lucide-react';

interface EnhancedAnalysisProgressProps {
  progress: AnalysisProgress;
  onCancel?: () => void;
  variant?: 'detailed' | 'compact';
  className?: string;
}

export function EnhancedAnalysisProgress({ 
  progress, 
  onCancel, 
  variant = 'detailed',
  className = "" 
}: EnhancedAnalysisProgressProps) {
  
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'google-vision':
        return <Eye className="h-5 w-5 text-blue-600" />;
      case 'context-detection':
        return <Brain className="h-5 w-5 text-purple-600" />;
      case 'ai-analysis':
        return <Target className="h-5 w-5 text-green-600" />;
      case 'enhanced-analysis':
        return <Target className="h-5 w-5 text-green-600" />;
      case 'finalizing':
        return <Settings className="h-5 w-5 text-orange-600" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'clarification-needed':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
  };

  const getInterfaceIcon = (interfaceType: string) => {
    switch (interfaceType?.toLowerCase()) {
      case 'dashboard':
        return <BarChart className="h-4 w-4" />;
      case 'mobile':
      case 'mobile app':
        return <Smartphone className="h-4 w-4" />;
      case 'landing':
      case 'landing page':
        return <Globe className="h-4 w-4" />;
      case 'ecommerce':
      case 'e-commerce':
        return <ShoppingCart className="h-4 w-4" />;
      case 'form':
        return <FileText className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getProgressColor = (stage: string, progress: number) => {
    if (stage === 'error') return 'bg-red-500';
    if (stage === 'complete') return 'bg-green-500';
    if (stage === 'clarification-needed') return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const formatDetectedElements = (elements: string[] = []) => {
    if (elements.length === 0) return '';
    if (elements.length <= 2) return elements.join(' and ');
    return `${elements.slice(0, 2).join(', ')} and ${elements.length - 2} more`;
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm ${className}`}>
        {getStageIcon(progress.stage)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">{progress.message}</span>
            {progress.metadata?.interfaceType && (
              <Badge variant="secondary" className="text-xs">
                <div className="flex items-center gap-1">
                  {getInterfaceIcon(progress.metadata.interfaceType)}
                  {progress.metadata.interfaceType}
                </div>
              </Badge>
            )}
          </div>
          <Progress 
            value={progress.progress} 
            className="h-2"
          />
        </div>
        {onCancel && progress.stage !== 'complete' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getStageIcon(progress.stage)}
            AI Analysis in Progress
          </CardTitle>
          {onCancel && progress.stage !== 'complete' && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{progress.message}</span>
            <span className="text-muted-foreground">{progress.progress}%</span>
          </div>
          <Progress 
            value={progress.progress} 
            className={`h-3 ${getProgressColor(progress.stage, progress.progress)}`}
          />
        </div>

        {/* Context Information */}
        {progress.metadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {progress.metadata.interfaceType && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                {getInterfaceIcon(progress.metadata.interfaceType)}
                <span className="font-medium">Interface:</span>
                <Badge variant="outline">{progress.metadata.interfaceType}</Badge>
              </div>
            )}

            {progress.metadata.detectedElements && progress.metadata.detectedElements.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Elements:</span>
                <span className="text-muted-foreground">
                  {formatDetectedElements(progress.metadata.detectedElements)}
                </span>
              </div>
            )}

            {progress.metadata.contextConfidence !== undefined && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Brain className="h-4 w-4" />
                <span className="font-medium">Confidence:</span>
                <Badge 
                  variant={progress.metadata.contextConfidence > 0.7 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {Math.round(progress.metadata.contextConfidence * 100)}%
                </Badge>
              </div>
            )}

            {progress.metadata.requiresClarification && (
              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">Clarification needed</span>
              </div>
            )}
          </div>
        )}

        {/* Stage-specific information */}
        {progress.stage === 'google-vision' && (
          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Google Vision Analysis</span>
            </div>
            Extracting visual elements, text content, and interface components to understand your design's structure and content.
          </div>
        )}

        {progress.stage === 'context-detection' && (
          <div className="text-sm text-muted-foreground bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-800">Context Detection</span>
            </div>
            Analyzing interface type, user needs, and domain-specific requirements to provide tailored insights.
          </div>
        )}

        {(progress.stage === 'ai-analysis' || progress.stage === 'enhanced-analysis') && (
          <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">AI Analysis</span>
            </div>
            Generating context-aware UX insights, usability recommendations, and accessibility guidance specific to your interface type.
          </div>
        )}

        {progress.stage === 'clarification-needed' && (
          <div className="text-sm text-muted-foreground bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800">Additional Context Needed</span>
            </div>
            To provide the most relevant insights, we need a bit more information about your interface and goals.
          </div>
        )}

        {progress.stage === 'complete' && (
          <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Analysis Complete</span>
            </div>
            Your personalized UX analysis is ready with actionable recommendations and insights.
          </div>
        )}
      </CardContent>
    </Card>
  );
}