import React, { useCallback, useState, useMemo } from 'react';
import { useRenderMonitor } from '@/hooks/useRenderMonitor';
import { Handle, Position } from '@xyflow/react';
import { UXAnalysis } from '@/types/ux-analysis';
import { AnalysisValidator } from '@/utils/analysisValidator';
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
  onOpenAnalysisPanel?: (analysisId: string) => void;
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

  // ✅ ENHANCED: Prioritize actual data over fallbacks
  const safeAnalysis = useMemo(() => {
    // Quick validation check first
    if (!AnalysisValidator.isValidAnalysis(analysis)) {
      console.warn('AnalysisCardNode: Invalid analysis detected, applying validation...');
      const validationResult = AnalysisValidator.validateAndNormalize(analysis);
      
      if (validationResult.warnings.length > 0) {
        console.warn('Analysis validation warnings:', validationResult.warnings);
      }
      
      return validationResult.data;
    }
    
    // Minimal safety - preserve actual data without generating fallbacks
    const baseSummary = analysis.summary || {} as any;
    
    return {
      ...analysis,
      id: analysis.id || '',
      summary: {
        ...baseSummary,
        overallScore: typeof baseSummary.overallScore === 'number' ? baseSummary.overallScore : 0,
        categoryScores: baseSummary.categoryScores || {},
        keyIssues: Array.isArray(baseSummary.keyIssues) ? baseSummary.keyIssues : [],
        strengths: Array.isArray(baseSummary.strengths) ? baseSummary.strengths : []
      },
      suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : []
    };
  }, [analysis]);

  // ✅ FIXED: Removed console.log from render function to prevent infinite loops

  const handleViewFullAnalysis = useCallback(() => {
    if (!data.onOpenAnalysisPanel) {
      console.warn('[AnalysisCardNode] onOpenAnalysisPanel callback is missing');
      return;
    }
    data.onOpenAnalysisPanel(safeAnalysis.id);
  }, [data.onOpenAnalysisPanel, safeAnalysis.id]);
  
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

  const handleGenerateConcept = useCallback(async () => {
    if (!onGenerateConcept) {
      console.warn('[AnalysisCardNode] onGenerateConcept callback is missing');
      return;
    }
    if (isGeneratingConcept) return;
    
    try {
      await onGenerateConcept(safeAnalysis.id);
    } catch (error) {
      console.error('Failed to generate concept:', error);
    }
  }, [onGenerateConcept, isGeneratingConcept, safeAnalysis.id]);

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
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getScoreVariant(safeAnalysis.summary?.overallScore || 0)}>
              {safeAnalysis.summary?.overallScore || 'N/A'}/100
            </Badge>
            {safeAnalysis.modelUsed && (
              <Badge variant="outline" className="text-xs">
                {safeAnalysis.modelUsed}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Analysis Metadata */}
        <div className="text-xs text-muted-foreground flex justify-between items-center pt-2">
          <span>
            {safeAnalysis.createdAt ? 
              `Analyzed ${new Date(safeAnalysis.createdAt).toLocaleDateString()}` : 
              'Recent Analysis'
            }
          </span>
          <span>
            {safeAnalysis.visualAnnotations?.length || 0} annotations
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Category Scores */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground text-sm">Category Scores</h4>
          {Object.keys(safeAnalysis.summary.categoryScores).length > 0 ? (
            Object.entries(safeAnalysis.summary.categoryScores).map(([category, score]) => {
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
            })
          ) : (
            <div className="text-sm text-muted-foreground">
              Category scores not available
            </div>
          )}
        </div>
        
        {/* Key Issues - Only show if actual data exists */}
        {(safeAnalysis.summary.keyIssues?.length || 0) > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h4 className="font-medium text-foreground text-sm">Key Issues</h4>
              <Badge variant="outline" className="text-xs">
                {safeAnalysis.summary.keyIssues.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {safeAnalysis.summary.keyIssues.slice(0, 3).map((issue, index) => (
                <div key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-destructive/30">
                  {issue}
                </div>
              ))}
              {safeAnalysis.summary.keyIssues.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{safeAnalysis.summary.keyIssues.length - 3} more issues
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Strengths - Only show if actual data exists */}
        {(safeAnalysis.summary.strengths?.length || 0) > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-foreground text-sm">Strengths</h4>
              <Badge variant="outline" className="text-xs">
                {safeAnalysis.summary.strengths.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {safeAnalysis.summary.strengths.slice(0, 2).map((strength, index) => (
                <div key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-green-600/30">
                  {strength}
                </div>
              ))}
              {safeAnalysis.summary.strengths.length > 2 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{safeAnalysis.summary.strengths.length - 2} more strengths
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggestions Preview */}
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Top Suggestions</span>
            </div>
            <Badge variant="outline">
              {safeAnalysis.suggestions.length}
            </Badge>
          </div>
          
          {safeAnalysis.suggestions.slice(0, 2).map((suggestion, index) => (
            <div key={index} className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border-l-2 border-primary/50">
              <div className="flex items-center gap-1 mb-1">
                {getSuggestionIcon(suggestion.category)}
                <span className="font-medium capitalize">{suggestion.category}</span>
              </div>
              <div>{suggestion.title}</div>
            </div>
          ))}
          
          {safeAnalysis.suggestions.length > 2 && (
            <div className="text-xs text-muted-foreground text-center">
              +{safeAnalysis.suggestions.length - 2} more suggestions
            </div>
          )}
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