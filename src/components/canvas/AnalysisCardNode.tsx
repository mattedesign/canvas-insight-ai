import React, { useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { UXAnalysis } from '@/types/ux-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  CheckCircle, 
  Lightbulb, 
  Sparkles, 
  Loader2, 
  FileText, 
  ChevronUp, 
  Eye, 
  Palette, 
  Type, 
  Users,
  TrendingUp
} from 'lucide-react';

interface AnalysisCardNodeData {
  analysis: UXAnalysis;
  onGenerateConcept?: (analysisId: string) => Promise<void>;
  isGeneratingConcept?: boolean;
  onExpandedChange?: (analysisId: string, isExpanded: boolean) => void;
}

interface AnalysisCardNodeProps {
  data: AnalysisCardNodeData;
}

export const AnalysisCardNode: React.FC<AnalysisCardNodeProps> = ({ data }) => {
  const { analysis, onGenerateConcept, isGeneratingConcept = false, onExpandedChange } = data;
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpansion = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onExpandedChange?.(analysis.id, newExpandedState);
  };
  
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

  const handleGenerateConcept = async () => {
    if (!onGenerateConcept || isGeneratingConcept) return;
    
    try {
      await onGenerateConcept(analysis.id);
    } catch (error) {
      console.error('Failed to generate concept:', error);
    }
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
    <Card className={`bg-background border-border shadow-lg transition-all duration-300 ${isExpanded ? 'w-[600px] max-h-[600px]' : 'w-96'}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="bg-primary border-2 border-background"
      />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            UX Analysis
          </CardTitle>
          <Badge variant={getScoreVariant(analysis.summary.overallScore)}>
            {analysis.summary.overallScore}/100
          </Badge>
        </div>
      </CardHeader>
      
      <div className={`${isExpanded ? 'max-h-[480px] overflow-y-auto' : ''}`}>
        <CardContent className="space-y-4">
          {/* Category Scores */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground text-sm">Category Scores</h4>
            {Object.entries(analysis.summary.categoryScores).map(([category, score]) => (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {isExpanded && getCategoryIcon(category)}
                    <span className="capitalize text-muted-foreground">{category}</span>
                  </div>
                  <span className={getScoreColor(score)}>{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </div>
          
          {/* Key Issues */}
          {analysis.summary.keyIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <h4 className="font-medium text-foreground text-sm">Key Issues</h4>
                {isExpanded && (
                  <Badge variant="outline" className="ml-auto">
                    {analysis.summary.keyIssues.length}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {(isExpanded ? analysis.summary.keyIssues : analysis.summary.keyIssues.slice(0, 3)).map((issue, index) => (
                  <div key={index} className={`text-sm text-muted-foreground ${isExpanded ? 'p-3 bg-destructive/5 border-l-2 border-destructive/30 rounded-r' : 'pl-2 border-l-2 border-destructive/30'}`}>
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Strengths */}
          {analysis.summary.strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-foreground text-sm">Strengths</h4>
                {isExpanded && (
                  <Badge variant="outline" className="ml-auto">
                    {analysis.summary.strengths.length}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {(isExpanded ? analysis.summary.strengths : analysis.summary.strengths.slice(0, 2)).map((strength, index) => (
                  <div key={index} className={`text-sm text-muted-foreground ${isExpanded ? 'p-3 bg-green-50 dark:bg-green-950/20 border-l-2 border-green-600/30 rounded-r' : 'pl-2 border-l-2 border-green-600/30'}`}>
                    {strength}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions Count - Always Show */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Suggestions</span>
            </div>
            <Badge variant="outline">
              {analysis.suggestions.length}
            </Badge>
          </div>

          {/* Expanded Details - Only Show When Expanded */}
          {isExpanded && (
            <>
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
                
                <div className="max-h-[180px] overflow-y-auto space-y-3 pr-2">
                  {analysis.suggestions.map((suggestion, index) => (
                    <Card key={suggestion.id} className="p-3 bg-muted/30">
                      <div className="space-y-2">
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
                      </div>
                    </Card>
                  ))}
                </div>
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
            </>
          )}
          
          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button 
              onClick={handleToggleExpansion}
              variant="outline"
              className="w-full"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Collapse Analysis
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  View Full Analysis
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleGenerateConcept} 
              disabled={isGeneratingConcept}
              className="w-full"
              variant="default"
            >
              {isGeneratingConcept ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Improved Concept
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="bg-primary border-2 border-background"
      />
    </Card>
  );
};