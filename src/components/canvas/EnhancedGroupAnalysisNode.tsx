import React, { useState, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  GitBranch, 
  Edit3,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Palette,
  Type,
  Activity
} from 'lucide-react';

interface EnhancedGroupAnalysisNodeData {
  analysis: GroupAnalysisWithPrompt;
  groupName: string;
  imageCount: number;
  onEditPrompt?: (analysisId: string) => void;
  onCreateFork?: (analysisId: string) => void;
  onViewDetails?: (analysisId: string) => void;
}

export const EnhancedGroupAnalysisNode: React.FC<NodeProps> = ({ data }) => {
  const { 
    analysis, 
    groupName, 
    imageCount, 
    onEditPrompt, 
    onCreateFork, 
    onViewDetails 
  } = data as unknown as EnhancedGroupAnalysisNodeData;
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const analysisMetrics = useMemo(() => {
    if (!analysis) return null;
    
    // Try enhanced analysis first, fallback to legacy structure
    const analysisData = analysis.analysis || analysis.summary;
    if (!analysisData) return null;
    
    // Type guard to check if we have the enhanced structure
    const hasConsistencyScore = 'consistencyScore' in analysisData;
    const hasConsistency = 'consistency' in analysisData;
    
    return {
      overall: analysisData.overallScore || 0,
      consistency: hasConsistencyScore ? analysisData.consistencyScore : 
                   hasConsistency ? analysisData.consistency : 0,
      thematic: analysisData.thematicCoherence || 0,
      userFlow: analysisData.userFlowContinuity || 0
    };
  }, [analysis]);

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
    switch (category.toLowerCase()) {
      case 'consistency': return <Activity className="h-4 w-4" />;
      case 'thematic': return <Palette className="h-4 w-4" />;
      case 'userflow': return <TrendingUp className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  if (!analysis) {
    return (
      <Card className="w-[480px] bg-background border-border shadow-lg">
        <CardContent className="p-4">
          <div className="text-muted-foreground text-center">Group analysis not available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-[480px] bg-background border-border shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="bg-primary border-2 border-background"
      />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Analysis
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {groupName} • {imageCount} images
            </div>
          </div>
          
          {analysisMetrics && (
            <div className="text-right space-y-1">
              <Badge variant={getScoreVariant(analysisMetrics.overall)}>
                {analysisMetrics.overall}/100
              </Badge>
              <div className="text-xs text-muted-foreground">
                {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : 'Recent'}
              </div>
            </div>
          )}
        </div>
        
        {/* Analysis Prompt Preview */}
        {analysis.prompt && (
          <div className="mt-3 p-2 bg-muted/50 rounded text-sm border-l-2 border-primary/50">
            <div className="font-medium text-xs text-muted-foreground mb-1">ANALYSIS PROMPT</div>
            <div className="text-foreground">
              {analysis.prompt.length > 100 ? 
                `${analysis.prompt.substring(0, 100)}...` : 
                analysis.prompt
              }
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Metric Scores */}
        {analysisMetrics && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Group Metrics
            </h4>
            
            {[
              { key: 'consistency', label: 'Consistency', value: analysisMetrics.consistency },
              { key: 'thematic', label: 'Thematic Coherence', value: analysisMetrics.thematic },
              { key: 'userFlow', label: 'User Flow Continuity', value: analysisMetrics.userFlow }
            ].map(metric => (
              <div key={metric.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(metric.key)}
                    <span className="text-muted-foreground">{metric.label}</span>
                  </div>
                  <span className={getScoreColor(metric.value)}>{metric.value}%</span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
          </div>
        )}
        
        {/* Key Insights */}
        {((analysis.analysis?.keyInsights && analysis.analysis.keyInsights.length > 0) || 
          (analysis.insights && analysis.insights.length > 0)) && (
          <Collapsible 
            open={expandedSections.has('insights')}
            onOpenChange={() => toggleSection('insights')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Key Insights</span>
                  <Badge variant="outline" className="text-xs">
                    {(analysis.analysis?.keyInsights || analysis.insights || []).length}
                  </Badge>
                </div>
                {expandedSections.has('insights') ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {(analysis.analysis?.keyInsights || analysis.insights || []).slice(0, expandedSections.has('insights') ? undefined : 2).map((insight, index) => (
                <div key={index} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded border-l-2 border-primary/50">
                  {insight}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Recommendations */}
        {((analysis.analysis?.recommendations && analysis.analysis.recommendations.length > 0) || 
          (analysis.recommendations && analysis.recommendations.length > 0)) && (
          <Collapsible 
            open={expandedSections.has('recommendations')}
            onOpenChange={() => toggleSection('recommendations')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Recommendations</span>
                  <Badge variant="outline" className="text-xs">
                    {(analysis.analysis?.recommendations || analysis.recommendations || []).length}
                  </Badge>
                </div>
                {expandedSections.has('recommendations') ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {(analysis.analysis?.recommendations || analysis.recommendations || []).slice(0, expandedSections.has('recommendations') ? undefined : 2).map((rec, index) => (
                <div key={index} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded border-l-2 border-green-600/50">
                  {rec}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Common Patterns */}
        {((analysis.analysis?.commonPatterns && analysis.analysis.commonPatterns.length > 0) || 
          (analysis.patterns?.commonElements && analysis.patterns.commonElements.length > 0)) && (
          <Collapsible 
            open={expandedSections.has('patterns')}
            onOpenChange={() => toggleSection('patterns')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Common Patterns</span>
                  <Badge variant="outline" className="text-xs">
                    {(analysis.analysis?.commonPatterns || analysis.patterns?.commonElements || []).length}
                  </Badge>
                </div>
                {expandedSections.has('patterns') ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {(analysis.analysis?.commonPatterns || analysis.patterns?.commonElements || []).slice(0, expandedSections.has('patterns') ? undefined : 2).map((pattern, index) => (
                <div key={index} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded border-l-2 border-blue-600/50">
                  {pattern}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        <Separator />
        
        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {onViewDetails && (
            <Button 
              onClick={() => onViewDetails(analysis.id)}
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              <Eye className="mr-1 h-3 w-3" />
              Details
            </Button>
          )}
          
          {onEditPrompt && (
            <Button 
              onClick={() => onEditPrompt(analysis.id)}
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              <Edit3 className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          
          {onCreateFork && (
            <Button 
              onClick={() => onCreateFork(analysis.id)}
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              <GitBranch className="mr-1 h-3 w-3" />
              Fork
            </Button>
          )}
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