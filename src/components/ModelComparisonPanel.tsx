import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, BarChart3, Eye, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ModelAnalysis {
  id: string;
  model: string;
  imageId: string;
  analysis: any;
  processingTime: number;
  createdAt: string;
}

interface ComparisonMetrics {
  accuracy: number;
  consistency: number;
  performance: number;
  coverage: number;
}

interface ModelComparisonPanelProps {
  imageId?: string;
  imageUrl?: string;
  onAnalysisComplete?: (results: ModelAnalysis[]) => void;
}

export function ModelComparisonPanel({ 
  imageId, 
  imageUrl, 
  onAnalysisComplete 
}: ModelComparisonPanelProps) {
  const [analyses, setAnalyses] = useState<ModelAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, ComparisonMetrics>>({});
  const [selectedModels, setSelectedModels] = useState<string[]>(['openai', 'claude-vision', 'google-vision']);
  const { toast } = useToast();

  const availableModels = [
    { id: 'openai', name: 'OpenAI GPT-4o', icon: '🧠', color: 'bg-green-500' },
    { id: 'claude-vision', name: 'Claude Opus 4 (claude-opus-4-20250514)', icon: '🎯', color: 'bg-blue-500' },
    { id: 'google-vision', name: 'Google Vision', icon: '👁️', color: 'bg-red-500' },
    { id: 'stability-ai', name: 'Stability.ai', icon: '🎨', color: 'bg-purple-500' }
  ];

  const runMultiModelAnalysis = async () => {
    if (!imageId || !imageUrl) {
      toast({
        title: "Error",
        description: "Image ID and URL are required for analysis",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const results: ModelAnalysis[] = [];

    try {
      // Run analysis for each selected model in parallel
      const analysisPromises = selectedModels.map(async (model) => {
        const startTime = Date.now();
        
        const { data, error } = await supabase.functions.invoke('ux-analysis', {
          body: {
            type: 'ANALYZE_IMAGE',
            payload: {
              imageId,
              imageUrl,
              imageName: `comparison-${imageId}`,
              userContext: 'Multi-model comparison analysis'
            },
            aiModel: model
          }
        });

        const processingTime = Date.now() - startTime;

        if (error) throw error;

        return {
          id: `${model}-${Date.now()}`,
          model,
          imageId,
          analysis: data.data,
          processingTime,
          createdAt: new Date().toISOString()
        };
      });

      const completedAnalyses = await Promise.all(analysisPromises);
      setAnalyses(completedAnalyses);
      calculateMetrics(completedAnalyses);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(completedAnalyses);
      }

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed with ${selectedModels.length} AI models`,
      });

    } catch (error) {
      console.error('Multi-model analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to complete multi-model analysis",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (analyses: ModelAnalysis[]) => {
    const modelMetrics: Record<string, ComparisonMetrics> = {};

    analyses.forEach((analysis) => {
      const { model, analysis: data, processingTime } = analysis;
      
      // Calculate metrics based on analysis quality and coverage
      const annotationCount = data.visualAnnotations?.length || 0;
      const suggestionCount = data.suggestions?.length || 0;
      const overallScore = data.summary?.overallScore || 0;
      
      // Performance score based on processing time (faster = better)
      const performanceScore = Math.max(0, 100 - (processingTime / 1000) * 2);
      
      // Coverage score based on number of insights provided
      const coverageScore = Math.min(100, (annotationCount * 10) + (suggestionCount * 5));
      
      // Accuracy score based on overall quality assessment
      const accuracyScore = overallScore;
      
      // Consistency score (would need multiple runs to calculate properly)
      const consistencyScore = 85; // Placeholder

      modelMetrics[model] = {
        accuracy: Math.round(accuracyScore),
        consistency: Math.round(consistencyScore),
        performance: Math.round(performanceScore),
        coverage: Math.round(coverageScore)
      };
    });

    setMetrics(modelMetrics);
  };

  const exportComparison = () => {
    const comparisonReport = {
      imageId,
      timestamp: new Date().toISOString(),
      models: selectedModels,
      analyses: analyses.map(a => ({
        model: a.model,
        processingTime: a.processingTime,
        summary: a.analysis.summary,
        annotationCount: a.analysis.visualAnnotations?.length || 0,
        suggestionCount: a.analysis.suggestions?.length || 0
      })),
      metrics,
      recommendations: generateModelRecommendations()
    };

    const blob = new Blob([JSON.stringify(comparisonReport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-comparison-${imageId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateModelRecommendations = () => {
    const recommendations = [];
    
    // Find best performing model for each metric
    let bestAccuracy = { model: '', score: 0 };
    let bestPerformance = { model: '', score: 0 };
    let bestCoverage = { model: '', score: 0 };

    Object.entries(metrics).forEach(([model, metric]) => {
      if (metric.accuracy > bestAccuracy.score) {
        bestAccuracy = { model, score: metric.accuracy };
      }
      if (metric.performance > bestPerformance.score) {
        bestPerformance = { model, score: metric.performance };
      }
      if (metric.coverage > bestCoverage.score) {
        bestCoverage = { model, score: metric.coverage };
      }
    });

    if (bestAccuracy.model) {
      recommendations.push(`Use ${bestAccuracy.model} for highest accuracy (${bestAccuracy.score}%)`);
    }
    if (bestPerformance.model) {
      recommendations.push(`Use ${bestPerformance.model} for fastest analysis (${bestPerformance.score}% performance)`);
    }
    if (bestCoverage.model) {
      recommendations.push(`Use ${bestCoverage.model} for most comprehensive insights (${bestCoverage.score}% coverage)`);
    }

    return recommendations;
  };

  const getModelIcon = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    return model?.icon || '🤖';
  };

  const getModelName = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Multi-Model AI Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Selection */}
          <div>
            <h4 className="text-sm font-medium mb-2">Select AI Models to Compare:</h4>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((model) => (
                <Button
                  key={model.id}
                  variant={selectedModels.includes(model.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedModels(prev => 
                      prev.includes(model.id) 
                        ? prev.filter(m => m !== model.id)
                        : [...prev, model.id]
                    );
                  }}
                  className="flex items-center gap-1"
                >
                  <span>{model.icon}</span>
                  {model.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Run Analysis Button */}
          <div className="flex gap-2">
            <Button 
              onClick={runMultiModelAnalysis}
              disabled={isLoading || selectedModels.length === 0}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isLoading ? 'Analyzing...' : 'Run Multi-Model Analysis'}
            </Button>
            
            {analyses.length > 0 && (
              <Button variant="outline" onClick={exportComparison}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {analyses.length > 0 && (
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comparison">Model Comparison</TabsTrigger>
            <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
            <TabsTrigger value="details">Detailed Results</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analyses.map((analysis) => (
                <Card key={analysis.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>{getModelIcon(analysis.model)}</span>
                      {getModelName(analysis.model)}
                      <Badge variant="secondary" className="ml-auto">
                        {analysis.processingTime}ms
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Score</span>
                        <span className="font-medium">
                          {analysis.analysis.summary?.overallScore || 0}%
                        </span>
                      </div>
                      <Progress 
                        value={analysis.analysis.summary?.overallScore || 0} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {analysis.analysis.visualAnnotations?.length || 0} insights
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(analysis.processingTime / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {Object.entries(metrics).map(([model, metric]) => (
              <Card key={model}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{getModelIcon(model)}</span>
                    {getModelName(model)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accuracy</span>
                        <span className="font-medium">{metric.accuracy}%</span>
                      </div>
                      <Progress value={metric.accuracy} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Performance</span>
                        <span className="font-medium">{metric.performance}%</span>
                      </div>
                      <Progress value={metric.performance} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Coverage</span>
                        <span className="font-medium">{metric.coverage}%</span>
                      </div>
                      <Progress value={metric.coverage} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Consistency</span>
                        <span className="font-medium">{metric.consistency}%</span>
                      </div>
                      <Progress value={metric.consistency} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{getModelIcon(analysis.model)}</span>
                    {getModelName(analysis.model)} - Detailed Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Key Insights:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {analysis.analysis.summary?.keyIssues?.map((issue: string, index: number) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Strengths:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {analysis.analysis.summary?.strengths?.map((strength: string, index: number) => (
                          <li key={index}>• {strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Annotations:</span>
                        <div>{analysis.analysis.visualAnnotations?.length || 0}</div>
                      </div>
                      <div>
                        <span className="font-medium">Suggestions:</span>
                        <div>{analysis.analysis.suggestions?.length || 0}</div>
                      </div>
                      <div>
                        <span className="font-medium">Processing Time:</span>
                        <div>{analysis.processingTime}ms</div>
                      </div>
                      <div>
                        <span className="font-medium">Model:</span>
                        <div>{analysis.model}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Recommendations */}
      {Object.keys(metrics).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Model Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {generateModelRecommendations().map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}