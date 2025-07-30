import React, { useCallback, useState } from 'react';
import { useRenderMonitor } from '@/hooks/useRenderMonitor';
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
  // ✅ MONITOR: Track renders to ensure no infinite loops
  useRenderMonitor('AnalysisCardNode');
  
  // ✅ FIXED: Removed console.log from render function to prevent infinite loops

  // Add null/undefined checks to prevent React state errors
  if (!data || !data.analysis) {
    console.warn('AnalysisCardNode: Missing data or analysis');
    return (
      <Card className="bg-background border-border shadow-lg w-96">
        <CardContent className="p-4 text-center">
          <div className="text-muted-foreground">Analysis data not available</div>
        </CardContent>
      </Card>
    );
  }

  const { analysis, onGenerateConcept, isGeneratingConcept = false, onExpandedChange } = data;
  const [isExpanded, setIsExpanded] = useState(false);

  // Ensure analysis has all required properties with fallbacks
  // First ensure we have the basic structure with proper typing
  const baseSummary = analysis.summary || {} as any;
  const baseCategoryScores = (baseSummary.categoryScores || {}) as Record<string, number>;
  
  // Create a safe categoryScores object with all required properties
  const safeCategoryScores = {
    usability: typeof baseCategoryScores.usability === 'number' ? baseCategoryScores.usability : 0,
    accessibility: typeof baseCategoryScores.accessibility === 'number' ? baseCategoryScores.accessibility : 0,
    visual: typeof baseCategoryScores.visual === 'number' ? baseCategoryScores.visual : 0,
    content: typeof baseCategoryScores.content === 'number' ? baseCategoryScores.content : 0,
    ...baseCategoryScores // Include any additional category scores
  };

  const safeAnalysis = {
    ...analysis, // Spread first to get all original properties
    id: analysis.id || '',
    summary: {
      ...baseSummary, // Safely spread summary
      overallScore: typeof baseSummary.overallScore === 'number' ? baseSummary.overallScore : 0,
      categoryScores: safeCategoryScores,
      keyIssues: Array.isArray(baseSummary.keyIssues) ? baseSummary.keyIssues : [],
      strengths: Array.isArray(baseSummary.strengths) ? baseSummary.strengths : []
    },
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : []
  };

  // ✅ FIXED: Removed console.log from render function to prevent infinite loops

  const handleViewFullAnalysis = () => {
    onExpandedChange?.(safeAnalysis.id, true);
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
      await onGenerateConcept(safeAnalysis.id);
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
    <Card className="bg-background border-border shadow-lg w-96">
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
          <Badge variant={getScoreVariant(safeAnalysis.summary.overallScore)}>
            {safeAnalysis.summary.overallScore}/100
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Category Scores */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground text-sm">Category Scores</h4>
          {Object.entries(safeAnalysis.summary.categoryScores).map(([category, score]) => {
            const numScore = typeof score === 'number' ? score : 0;
            return (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-muted-foreground">{category}</span>
                  </div>
                  <span className={getScoreColor(numScore)}>{numScore}%</span>
                </div>
                <Progress value={numScore} className="h-2" />
              </div>
            );
          })}
        </div>
        
        {/* Key Issues */}
        {safeAnalysis.summary.keyIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h4 className="font-medium text-foreground text-sm">Key Issues</h4>
            </div>
            <div className="space-y-1">
              {safeAnalysis.summary.keyIssues.slice(0, 3).map((issue, index) => (
                <div key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-destructive/30">
                  {issue}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Strengths */}
        {safeAnalysis.summary.strengths.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-foreground text-sm">Strengths</h4>
            </div>
            <div className="space-y-1">
              {safeAnalysis.summary.strengths.slice(0, 2).map((strength, index) => (
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
            {safeAnalysis.suggestions.length}
          </Badge>
        </div>
        
        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <Button 
            onClick={handleViewFullAnalysis}
            variant="outline"
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            View Full Analysis
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
      
      <Handle
        type="source"
        position={Position.Right}
        className="bg-primary border-2 border-background"
      />
    </Card>
  );
};