import React, { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { UXAnalysis } from '@/types/ux-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Lightbulb, Sparkles, Loader2 } from 'lucide-react';

interface AnalysisCardNodeData {
  analysis: UXAnalysis;
  onGenerateConcept?: (analysisId: string) => Promise<void>;
  isGeneratingConcept?: boolean;
}

interface AnalysisCardNodeProps {
  data: AnalysisCardNodeData;
}

export const AnalysisCardNode: React.FC<AnalysisCardNodeProps> = ({ data }) => {
  const { analysis, onGenerateConcept, isGeneratingConcept = false } = data;
  
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

  return (
    <Card className="w-96 bg-background border-border shadow-lg">
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
      
      <CardContent className="space-y-4">
        {/* Category Scores */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground text-sm">Category Scores</h4>
          {Object.entries(analysis.summary.categoryScores).map(([category, score]) => (
            <div key={category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize text-muted-foreground">{category}</span>
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
            </div>
            <div className="space-y-1">
              {analysis.summary.keyIssues.slice(0, 3).map((issue, index) => (
                <div key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-destructive/30">
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
            </div>
            <div className="space-y-1">
              {analysis.summary.strengths.slice(0, 2).map((strength, index) => (
                <div key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-green-600/30">
                  {strength}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Suggestions Count */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Suggestions</span>
          </div>
          <Badge variant="outline">
            {analysis.suggestions.length}
          </Badge>
        </div>
        
        {/* Generate Concept Button */}
        <div className="pt-2">
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
      
      <Handle
        type="source"
        position={Position.Right}
        className="bg-primary border-2 border-background"
      />
    </Card>
  );
};