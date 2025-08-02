import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { DomainAnalysis } from '@/services/EnhancedDomainDetector';
import { RetryState } from '@/services/RetryService';
import { EnhancedErrorDisplay } from './EnhancedErrorDisplay';
import { useEnhancedAnalysis } from '@/hooks/useEnhancedAnalysis';

interface EnhancedAnalysisPanelProps {
  analysis: UXAnalysis | null;
  image: UploadedImage | null;
  isOpen: boolean;
  onClose: () => void;
  onConceptGenerate?: (analysis: UXAnalysis) => void;
}

export const EnhancedAnalysisPanel = React.memo<EnhancedAnalysisPanelProps>(({
  analysis,
  image,
  isOpen,
  onClose,
  onConceptGenerate
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    isAnalyzing, 
    progress, 
    stage, 
    error, 
    qualityMetrics, 
    domainAnalysis, 
    retryState,
    canRetry,
    performEnhancedAnalysis,
    resetState 
  } = useEnhancedAnalysis();

  if (!isOpen) return null;

  const handleRetryAnalysis = async () => {
    if (!image) return;
    
    resetState();
    const result = await performEnhancedAnalysis(
      image.url,
      image.name,
      image.id,
      analysis?.userContext
    );
    
    if (result.success) {
      // Handle success - maybe refresh the parent component
      window.location.reload();
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Enhanced UX Analysis
                {domainAnalysis && (
                  <Badge variant="outline" className="ml-2">
                    {domainAnalysis.uiType}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {image?.name || 'Analysis Results'}
                {domainAnalysis && (
                  <span className="ml-2">
                    • {domainAnalysis.confidence}% domain confidence
                  </span>
                )}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
              <TabsTrigger value="domain">Domain Analysis</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>

            {/* Loading State */}
            {isAnalyzing && (
              <TabsContent value="overview" className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="font-medium">{stage}</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  {retryState && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Retry attempt {retryState.attempts.length}/{retryState.config.maxRetries}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Error State */}
            {error && (
              <TabsContent value="overview" className="p-6">
                <EnhancedErrorDisplay
                  error={error}
                  retryState={retryState}
                  canRetry={canRetry}
                  onRetry={handleRetryAnalysis}
                  onCancel={onClose}
                  context="Analysis"
                />
              </TabsContent>
            )}

            {/* Overview Tab */}
            {analysis && !isAnalyzing && !error && (
              <TabsContent value="overview" className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Image Preview */}
                  {image && (
                    <div className="flex justify-center">
                      <img 
                        src={image.url} 
                        alt={image.name}
                        className="max-w-full max-h-48 object-contain rounded-lg border"
                      />
                    </div>
                  )}

                  {/* Overall Score */}
                  {analysis.summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Overall Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-center">
                          {analysis.summary?.overallScore || 'N/A'}/100
                        </div>
                        <Progress 
                          value={analysis.summary?.overallScore || 0} 
                          className="mt-2"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Key Issues and Strengths */}
                  {analysis.summary && (
                    <div className="grid md:grid-cols-2 gap-4">
                       {(analysis.summary?.keyIssues?.length || 0) > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-5 w-5" />
                              Key Issues
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {(analysis.summary?.keyIssues || []).map((issue, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                                  <span className="text-sm">{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {(analysis.summary?.strengths?.length || 0) > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-5 w-5" />
                              Strengths
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {(analysis.summary?.strengths || []).map((strength, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                                  <span className="text-sm">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => onConceptGenerate?.(analysis)}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Improved Concept
                    </Button>
                    {canRetry && (
                      <Button 
                        variant="outline" 
                        onClick={handleRetryAnalysis}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry Analysis
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Quality Metrics Tab */}
            <TabsContent value="quality" className="p-6 max-h-[70vh] overflow-y-auto">
              {qualityMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {qualityMetrics.annotationCount}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Annotations
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {qualityMetrics.suggestionCount}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Suggestions
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className={`text-2xl font-bold ${getQualityColor(qualityMetrics.domainRelevance)}`}>
                          {qualityMetrics.domainRelevance}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Domain Relevance
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className={`text-2xl font-bold ${getQualityColor(qualityMetrics.overallQuality)}`}>
                          {qualityMetrics.overallQuality}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Overall Quality
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      Analysis quality: <Badge variant={getQualityBadge(qualityMetrics.overallQuality)}>
                        {qualityMetrics.overallQuality >= 80 ? 'Excellent' : 
                         qualityMetrics.overallQuality >= 60 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                      {qualityMetrics.overallQuality < 60 && (
                        <span className="ml-2">Consider providing more specific context and retrying.</span>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  Quality metrics not available
                </div>
              )}
            </TabsContent>

            {/* Domain Analysis Tab */}
            <TabsContent value="domain" className="p-6 max-h-[70vh] overflow-y-auto">
              {domainAnalysis ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detected Domain</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{domainAnalysis.uiType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {domainAnalysis.confidence}% confidence
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Domain Characteristics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {domainAnalysis.characteristics.map((char, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{char}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recommended Focus Areas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {domainAnalysis.recommendedPrompts.map((prompt, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span className="text-sm">{prompt}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  Domain analysis not available
                </div>
              )}
            </TabsContent>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions" className="p-6 max-h-[70vh] overflow-y-auto">
              {analysis?.suggestions?.length ? (
                <div className="space-y-4">
                  {analysis.suggestions.map((suggestion, index) => (
                    <Card key={suggestion.id || index}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Badge variant="outline">{suggestion.category}</Badge>
                            {suggestion.title}
                          </span>
                          <Badge variant={suggestion.impact === 'high' ? 'destructive' : 
                                        suggestion.impact === 'medium' ? 'default' : 'secondary'}>
                            {suggestion.impact} impact
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {suggestion.description}
                        </CardDescription>
                      </CardHeader>
                      {suggestion.actionItems?.length > 0 && (
                        <CardContent>
                          <div className="space-y-1">
                            <span className="text-sm font-medium">Action Items:</span>
                            <ul className="space-y-1">
                              {suggestion.actionItems.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  No suggestions available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});