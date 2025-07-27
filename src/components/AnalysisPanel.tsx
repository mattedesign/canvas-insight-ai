import React from 'react';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, 
  CheckCircle, 
  Lightbulb, 
  X,
  Eye, 
  Palette, 
  Type, 
  Users,
  TrendingUp
} from 'lucide-react';

interface AnalysisPanelProps {
  analysis: UXAnalysis | null;
  image: UploadedImage | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  analysis, 
  image, 
  isOpen, 
  onClose 
}) => {
  if (!analysis || !image) return null;

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

          {/* Overall Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Overall Score</CardTitle>
                <Badge variant={getScoreVariant(analysis.summary.overallScore)} className="text-lg px-3 py-1">
                  {analysis.summary.overallScore}/100
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Category Scores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(analysis.summary.categoryScores).map(([category, score]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <span className="capitalize font-medium text-foreground">{category}</span>
                    </div>
                    <span className={`font-medium ${getScoreColor(score)}`}>{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Key Issues */}
          {analysis.summary.keyIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <CardTitle>Key Issues</CardTitle>
                  <Badge variant="outline">{analysis.summary.keyIssues.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.summary.keyIssues.map((issue, index) => (
                    <div key={index} className="p-3 bg-destructive/5 border-l-2 border-destructive/30 rounded-r">
                      <p className="text-sm text-foreground">{issue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strengths */}
          {analysis.summary.strengths.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle>Strengths</CardTitle>
                  <Badge variant="outline">{analysis.summary.strengths.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.summary.strengths.map((strength, index) => (
                    <div key={index} className="p-3 bg-green-50 dark:bg-green-950/20 border-l-2 border-green-600/30 rounded-r">
                      <p className="text-sm text-foreground">{strength}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle>Detailed Suggestions</CardTitle>
                <Badge variant="outline">{analysis.suggestions.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.suggestions.map((suggestion) => (
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
                      
                      {suggestion.actionItems.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-foreground">Action Items:</h5>
                          <ul className="space-y-1">
                            {suggestion.actionItems.map((item, itemIndex) => (
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
                  <p className="font-medium">{analysis.metadata.objects.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Text Elements</p>
                  <p className="font-medium">{analysis.metadata.text.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Colors</p>
                  <p className="font-medium">{analysis.metadata.colors.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faces</p>
                  <p className="font-medium">{analysis.metadata.faces}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Analyzed on {new Date(analysis.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};