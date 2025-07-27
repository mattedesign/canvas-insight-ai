import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Eye,
  Lightbulb,
  Palette,
  Zap
} from 'lucide-react';

interface ComparisonResult {
  model: string;
  result: any;
  duration: number;
  error?: string;
}

interface ModelComparisonPanelProps {
  results: ComparisonResult[];
  isComparing: boolean;
  onStartComparison?: () => void;
  onClearResults?: () => void;
  bestModel?: ComparisonResult | null;
}

const modelIcons: Record<string, React.ReactNode> = {
  'claude-vision': <Eye className="h-4 w-4 text-purple-600" />,
  'google-vision': <Zap className="h-4 w-4 text-blue-600" />,
  'stability-ai': <Palette className="h-4 w-4 text-orange-600" />,
  'openai': <Lightbulb className="h-4 w-4 text-green-600" />
};

const modelNames: Record<string, string> = {
  'claude-vision': 'Claude Vision',
  'google-vision': 'Google Vision',
  'stability-ai': 'Stability AI',
  'openai': 'OpenAI GPT-4o'
};

export function ModelComparisonPanel({ 
  results, 
  isComparing, 
  onStartComparison,
  onClearResults,
  bestModel 
}: ModelComparisonPanelProps) {
  
  const successfulResults = results.filter(r => !r.error);
  const avgDuration = successfulResults.length > 0 
    ? Math.round(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length)
    : 0;

  const getModelScore = (result: ComparisonResult) => {
    if (result.error || !result.result) return 0;
    return result.result.summary?.overallScore || 0;
  };

  const getQualityMetrics = (result: ComparisonResult) => {
    if (result.error || !result.result) return { annotations: 0, suggestions: 0, insights: 0 };
    
    return {
      annotations: result.result.visualAnnotations?.length || 0,
      suggestions: result.result.suggestions?.length || 0,
      insights: result.result.summary?.keyIssues?.length || 0
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Multi-Model Analysis Comparison
            </CardTitle>
            <CardDescription>
              Compare AI model performance and insights
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {results.length > 0 && (
              <Button variant="outline" size="sm" onClick={onClearResults}>
                Clear Results
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={onStartComparison}
              disabled={isComparing}
            >
              {isComparing ? 'Comparing...' : 'Start Comparison'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isComparing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Running multi-model analysis...</p>
          </div>
        )}

        {results.length > 0 && !isComparing && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{successfulResults.length}/{results.length}</div>
                    <p className="text-xs text-muted-foreground">Successful Analyses</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{avgDuration}ms</div>
                    <p className="text-xs text-muted-foreground">Average Duration</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      {bestModel && (
                        <>
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {modelNames[bestModel.model] || bestModel.model}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Best Performer</p>
                  </CardContent>
                </Card>
              </div>

              {bestModel && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Best Performing Model: {modelNames[bestModel.model]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Overall Score</div>
                        <div className="text-lg">{getModelScore(bestModel)}/100</div>
                      </div>
                      <div>
                        <div className="font-medium">Analysis Speed</div>
                        <div className="text-lg">{bestModel.duration}ms</div>
                      </div>
                      <div>
                        <div className="font-medium">Insights Generated</div>
                        <div className="text-lg">
                          {getQualityMetrics(bestModel).suggestions + getQualityMetrics(bestModel).annotations}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="space-y-3">
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {modelIcons[result.model]}
                          <span className="font-medium">{modelNames[result.model]}</span>
                          {result.error ? (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {result.duration}ms
                        </div>
                      </div>

                      {!result.error && result.result && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Overall Score</span>
                            <span>{getModelScore(result)}/100</span>
                          </div>
                          <Progress value={getModelScore(result)} className="h-2" />
                          
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="text-muted-foreground">Annotations</div>
                              <div className="font-medium">{getQualityMetrics(result).annotations}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Suggestions</div>
                              <div className="font-medium">{getQualityMetrics(result).suggestions}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Key Insights</div>
                              <div className="font-medium">{getQualityMetrics(result).insights}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {result.error && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          {result.error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4">
              {successfulResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {modelIcons[result.model]}
                      {modelNames[result.model]} - Detailed Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="summary" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                        <TabsTrigger value="annotations">Annotations</TabsTrigger>
                      </TabsList>

                      <TabsContent value="summary" className="mt-4">
                        {result.result.summary && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="text-center">
                                <div className="text-lg font-bold">{result.result.summary.categoryScores?.usability || 0}</div>
                                <div className="text-xs text-muted-foreground">Usability</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">{result.result.summary.categoryScores?.accessibility || 0}</div>
                                <div className="text-xs text-muted-foreground">Accessibility</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">{result.result.summary.categoryScores?.visual || 0}</div>
                                <div className="text-xs text-muted-foreground">Visual</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">{result.result.summary.categoryScores?.content || 0}</div>
                                <div className="text-xs text-muted-foreground">Content</div>
                              </div>
                            </div>
                            
                            {result.result.summary.keyIssues && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Key Issues</h4>
                                <ul className="text-sm space-y-1">
                                  {result.result.summary.keyIssues.map((issue: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="suggestions" className="mt-4">
                        {result.result.suggestions && (
                          <div className="space-y-3">
                            {result.result.suggestions.slice(0, 3).map((suggestion: any, i: number) => (
                              <div key={i} className="border rounded-lg p-3">
                                <h4 className="font-medium text-sm">{suggestion.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {suggestion.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {suggestion.impact} impact
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="annotations" className="mt-4">
                        {result.result.visualAnnotations && (
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-2">
                              Found {result.result.visualAnnotations.length} visual annotations
                            </p>
                            <div className="space-y-2">
                              {result.result.visualAnnotations.slice(0, 3).map((annotation: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                  <span>{annotation.title || annotation.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        {results.length === 0 && !isComparing && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comparison results yet. Start a multi-model analysis to see detailed performance metrics.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}