import React, { memo, useState, useEffect } from 'react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnalysisVersionManager } from './AnalysisVersionManager';
import { StrategicInsightsPanel } from './StrategicInsightsPanel';
import { analysisService } from '@/services/TypeSafeAnalysisService';
import { toast } from '@/hooks/use-toast';
import { 
  AlertCircle, 
  CheckCircle, 
  Lightbulb, 
  X,
  Eye, 
  Palette, 
  Type, 
  Users,
  TrendingUp,
  RotateCcw,
  History
} from 'lucide-react';

interface AnalysisPanelProps {
  analysis: UXAnalysis | null;
  image: UploadedImage | null;
  isOpen: boolean;
  onClose: () => void;
  onAnalysisUpdated?: (analysis: UXAnalysis) => void;
}

// ✅ PHASE 4.2: MEMOIZED COMPONENT FOR PERFORMANCE
export const AnalysisPanel: React.FC<AnalysisPanelProps> = memo(({ 
  analysis, 
  image, 
  isOpen, 
  onClose,
  onAnalysisUpdated
}) => {
  const [currentAnalysis, setCurrentAnalysis] = useState<UXAnalysis | null>(analysis);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);

  // Update current analysis when prop changes
  useEffect(() => {
    setCurrentAnalysis(analysis);
  }, [analysis]);

  if (!currentAnalysis || !image) return null;

  // Extract strategic insights from analysis metadata
  const strategicInsights = currentAnalysis.metadata?.strategic_summary || 
                           currentAnalysis.metadata?.strategicInsights || 
                           currentAnalysis.metadata?.naturalAnalysisMetadata?.domainSpecificFindings?.strategic;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'usability': return <Users className="h-4 w-4" />;
      case 'accessibility': return <Eye className="h-4 w-4" />;
      case 'visual': return <Palette className="h-4 w-4" />;
      case 'content': return <Type className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getSuggestionIcon = (category: string) => {
    switch (category) {
      case 'usability': return <Users className="h-3 w-3" />;
      case 'accessibility': return <Eye className="h-3 w-3" />;
      case 'visual': return <Palette className="h-3 w-3" />;
      case 'content': return <Type className="h-3 w-3" />;
      case 'performance': return <TrendingUp className="h-3 w-3" />;
      default: return <Lightbulb className="h-3 w-3" />;
    }
  };

  // Handle version selection
  const handleAnalysisSelected = async (analysisId: string) => {
    // Here you would load the selected analysis from the database
    // For now, we'll just show a toast
    toast({
      title: "Analysis Selected",
      description: `Loading analysis version ${analysisId}`,
    });
  };

  // Handle new analysis request
  const handleNewAnalysis = async () => {
    if (!image.id) return;
    
    setIsReAnalyzing(true);
    try {
      const response = await analysisService.forceNewAnalysis({
        imageId: image.id,
        imageUrl: image.url,
        userContext: '',
        priority: 'high'
      });

      if (response.success && response.analysis) {
        setCurrentAnalysis(response.analysis);
        onAnalysisUpdated?.(response.analysis);
        toast({
          title: "New Analysis Complete",
          description: "A new analysis version has been created successfully.",
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: response.error || "Failed to create new analysis",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Re-analysis failed:', error);
      toast({
        title: "Analysis Error",
        description: "An error occurred while creating new analysis",
        variant: "destructive"
      });
    } finally {
      setIsReAnalyzing(false);
    }
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '480px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">UX Analysis Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="p-4 space-y-6">
          {/* Image Thumbnail */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <img 
                  src={image.url} 
                  alt={image.name}
                  className="w-16 h-16 object-cover rounded border"
                />
                <div>
                  <h3 className="font-medium text-foreground">{image.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {image.dimensions.width} × {image.dimensions.height}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Version Manager - Hidden per user request */}

          {/* Overall Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Overall Score</CardTitle>
                <Badge variant={getScoreVariant(currentAnalysis.summary?.overallScore || 0)} className="text-lg px-3 py-1">
                  {currentAnalysis.summary?.overallScore || 'N/A'}/100
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Strategic Business Insights - Priority Display */}
          {strategicInsights && (
            <StrategicInsightsPanel insights={strategicInsights} />
          )}

          {/* Category Scores with Business Context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Business Impact Assessment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Performance metrics indicating potential business impact areas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(currentAnalysis.summary?.categoryScores || {}).map(([category, score]) => {
                const safeScore = typeof score === 'number' ? score : 0;
                const getBusinessContext = (cat: string, score: number) => {
                  if (score < 60) {
                    switch (cat) {
                      case 'usability': return 'May impact user satisfaction and retention';
                      case 'accessibility': return 'Could limit market reach and compliance';
                      case 'visual': return 'May affect brand perception and engagement';
                      case 'content': return 'Could reduce conversion and clarity';
                      default: return 'Requires strategic attention';
                    }
                  }
                  return '';
                };
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="capitalize font-medium text-foreground">{category}</span>
                      </div>
                      <span className={`font-medium ${getScoreColor(safeScore)}`}>{safeScore}%</span>
                    </div>
                    <Progress value={safeScore} className="h-2" />
                    {getBusinessContext(category, safeScore) && (
                      <p className="text-xs text-muted-foreground italic pl-6">
                        {getBusinessContext(category, safeScore)}
                      </p>
                    )}
                  </div>
                );
              })}
              {(!currentAnalysis.summary?.categoryScores || Object.keys(currentAnalysis.summary.categoryScores).length === 0) && (
                <div className="text-sm text-muted-foreground">
                  Category scores not available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legacy Data - Reduced Prominence */}
          {((currentAnalysis.summary?.keyIssues?.length || 0) > 0 || (currentAnalysis.summary?.strengths?.length || 0) > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Technical Observations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed technical findings for implementation reference
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Issues - Reduced prominence */}
                {(currentAnalysis.summary?.keyIssues?.length || 0) > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <h4 className="font-medium text-foreground text-sm">Technical Issues</h4>
                      <Badge variant="outline" className="text-xs">{currentAnalysis.summary?.keyIssues?.length || 0}</Badge>
                    </div>
                    <div className="grid gap-2">
                      {(currentAnalysis.summary?.keyIssues || []).map((issue, index) => (
                        <div key={index} className="p-2 bg-destructive/5 border-l-2 border-destructive/20 rounded-r text-sm">
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths - Reduced prominence */}
                {(currentAnalysis.summary?.strengths?.length || 0) > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-foreground text-sm">Technical Strengths</h4>
                      <Badge variant="outline" className="text-xs">{currentAnalysis.summary?.strengths?.length || 0}</Badge>
                    </div>
                    <div className="grid gap-2">
                      {(currentAnalysis.summary?.strengths || []).map((strength, index) => (
                        <div key={index} className="p-2 bg-green-50 dark:bg-green-950/20 border-l-2 border-green-600/20 rounded-r text-sm">
                          {strength}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Implementation Details - Reframed Suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle>Implementation Roadmap</CardTitle>
                <Badge variant="outline">{currentAnalysis.suggestions.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Prioritized action items to achieve strategic improvements
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentAnalysis.suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="p-4 bg-muted/30">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getSuggestionIcon(suggestion.category)}
                          <h4 className="font-medium">{suggestion.title}</h4>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                          <Badge 
                            variant={suggestion.impact === 'high' ? 'destructive' : suggestion.impact === 'medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {suggestion.impact} impact
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      
                      {Array.isArray(suggestion.actionItems) && suggestion.actionItems.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-foreground">Action Items:</h5>
                          <ul className="space-y-1">
                            {(Array.isArray(suggestion.actionItems) ? suggestion.actionItems : []).map((item, itemIndex) => (
                              <li key={itemIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Analysis Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Objects Detected</p>
                  <p className="font-medium">{currentAnalysis.metadata?.objects?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Text Elements</p>
                  <p className="font-medium">{currentAnalysis.metadata?.text?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Colors</p>
                  <p className="font-medium">{currentAnalysis.metadata?.colors?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faces</p>
                  <p className="font-medium">{currentAnalysis.metadata?.faces || 0}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Analyzed on {new Date(currentAnalysis.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}); // ✅ PHASE 4.2: MEMOIZED COMPONENT CLOSING

// ✅ PHASE 4.2: SET DISPLAY NAME FOR DEBUGGING
AnalysisPanel.displayName = 'AnalysisPanel';