import React from 'react';
import { UXAnalysis } from '@/types/ux-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb, 
  Eye, 
  Palette, 
  Type, 
  Users,
  TrendingUp
} from 'lucide-react';

interface ExpandableAnalysisPanelProps {
  analysis: UXAnalysis;
  isOpen: boolean;
  onClose: () => void;
}

export const ExpandableAnalysisPanel: React.FC<ExpandableAnalysisPanelProps> = ({
  analysis,
  isOpen,
  onClose
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-background border-l border-border shadow-xl z-50 animate-in slide-in-from-right duration-300">
      <Card className="h-full border-0 rounded-none">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              Full Analysis Details
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getScoreVariant(analysis.summary.overallScore)}>
                {analysis.summary.overallScore}/100
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{analysis.imageName}</p>
        </CardHeader>
        
        <ScrollArea className="flex-1">
          <CardContent className="space-y-6 p-6">
            {/* Overall Score */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overall Score
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall UX Quality</span>
                  <span className={getScoreColor(analysis.summary.overallScore)}>
                    {analysis.summary.overallScore}/100
                  </span>
                </div>
                <Progress value={analysis.summary.overallScore} className="h-3" />
              </div>
            </div>

            <Separator />
            
            {/* Detailed Category Scores */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Category Breakdown</h4>
              {Object.entries(analysis.summary.categoryScores).map(([category, score]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <span className="capitalize text-sm font-medium">{category}</span>
                    </div>
                    <span className={getScoreColor(score)}>{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>

            <Separator />
            
            {/* Key Issues */}
            {analysis.summary.keyIssues.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h4 className="font-medium text-foreground">Key Issues</h4>
                  <Badge variant="outline" className="ml-auto">
                    {analysis.summary.keyIssues.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {analysis.summary.keyIssues.map((issue, index) => (
                    <div key={index} className="text-sm text-muted-foreground p-3 bg-destructive/5 border-l-2 border-destructive/30 rounded-r">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Strengths */}
            {analysis.summary.strengths.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-foreground">Strengths</h4>
                  <Badge variant="outline" className="ml-auto">
                    {analysis.summary.strengths.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {analysis.summary.strengths.map((strength, index) => (
                    <div key={index} className="text-sm text-muted-foreground p-3 bg-green-50 dark:bg-green-950/20 border-l-2 border-green-600/30 rounded-r">
                      {strength}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />
            
            {/* Detailed Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-foreground">Detailed Suggestions</h4>
                <Badge variant="outline" className="ml-auto">
                  {analysis.suggestions.length}
                </Badge>
              </div>
              
              {analysis.suggestions.map((suggestion, index) => (
                <Card key={suggestion.id} className="p-4 bg-muted/30">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion.category)}
                        <h5 className="font-medium text-sm">{suggestion.title}</h5>
                      </div>
                      <div className="flex gap-1">
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
                      <div className="space-y-1">
                        <h6 className="text-xs font-medium text-foreground">Action Items:</h6>
                        <ul className="space-y-1">
                          {suggestion.actionItems.map((item, itemIndex) => (
                            <li key={itemIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Effort: {suggestion.effort}</span>
                      {suggestion.relatedAnnotations.length > 0 && (
                        <span>{suggestion.relatedAnnotations.length} related annotations</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Separator />
            
            {/* Metadata */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Analysis Metadata</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Objects Detected</span>
                  <p className="font-medium">{analysis.metadata.objects.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Text Elements</span>
                  <p className="font-medium">{analysis.metadata.text.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Colors</span>
                  <p className="font-medium">{analysis.metadata.colors.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Faces</span>
                  <p className="font-medium">{analysis.metadata.faces}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Analyzed on {analysis.createdAt.toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
};