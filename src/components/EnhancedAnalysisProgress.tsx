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
  Settings,
  Clock,
  TrendingUp
} from 'lucide-react';

interface EnhancedAnalysisProgressProps {
  progress: AnalysisProgress;
  onCancel?: () => void;
  variant?: 'detailed' | 'compact';
  className?: string;
}

interface ExtendedMetadata {
  interfaceType?: string;
  detectedElements?: string[];
  contextConfidence?: number;
  requiresClarification?: boolean;
  subSteps?: string[];
  estimatedDuration?: number;
  icon?: string;
  color?: string;
}

export function EnhancedAnalysisProgress({ 
  progress, 
  onCancel, 
  variant = 'detailed',
  className = "" 
}: EnhancedAnalysisProgressProps) {
  const metadata = progress.metadata as ExtendedMetadata;
  
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
      <div className={`flex items-center gap-3 p-3 bg-card border rounded-lg ${className}`}>
        {getStageIcon(progress.stage)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">{progress.message}</span>
            {metadata?.interfaceType && (
              <Badge variant="secondary" className="text-xs">
                <div className="flex items-center gap-1">
                  {getInterfaceIcon(metadata.interfaceType)}
                  {metadata.interfaceType}
                </div>
              </Badge>
            )}
          </div>
          
          {/* Show current sub-step if available */}
          {metadata?.subSteps && metadata.subSteps.length > 0 && (
            <div className="text-xs text-muted-foreground mb-1 truncate">
              {metadata.subSteps[0]}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Progress 
              value={progress.progress} 
              className="h-2 flex-1"
            />
            <span className="text-xs text-muted-foreground">{progress.progress}%</span>
          </div>
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

        {/* Enhanced Technical Information */}
        {metadata && (
          <div className="space-y-3">
            {/* Context Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {metadata.interfaceType && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  {getInterfaceIcon(metadata.interfaceType)}
                  <span className="font-medium">Interface:</span>
                  <Badge variant="outline">{metadata.interfaceType}</Badge>
                </div>
              )}

              {metadata.detectedElements && metadata.detectedElements.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">Elements:</span>
                  <span className="text-muted-foreground">
                    {formatDetectedElements(metadata.detectedElements)}
                  </span>
                </div>
              )}

              {metadata.contextConfidence !== undefined && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Confidence:</span>
                  <Badge 
                    variant={metadata.contextConfidence > 0.7 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(metadata.contextConfidence * 100)}%
                  </Badge>
                </div>
              )}

              {metadata.estimatedDuration && progress.stage !== 'complete' && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Est. Time:</span>
                  <span className="text-muted-foreground">
                    {Math.round(metadata.estimatedDuration / 1000)}s
                  </span>
                </div>
              )}
            </div>
            
            {/* Technical Sub-Steps */}
            {metadata.subSteps && metadata.subSteps.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Technical Steps:</span>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {metadata.subSteps.slice(0, 4).map((step, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {metadata.requiresClarification && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-200">Clarification needed</span>
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