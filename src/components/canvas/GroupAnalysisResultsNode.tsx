import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Eye, 
  GitBranch, 
  Edit3,
  Lightbulb,
  Target,
  Users
} from 'lucide-react';

interface GroupAnalysisResultsNodeData {
  analysis: GroupAnalysisWithPrompt;
  groupName: string;
  onEditPrompt?: (sessionId: string) => void;
  onCreateFork?: (sessionId: string) => void;
  onViewDetails?: (analysisId: string) => void;
}

export const GroupAnalysisResultsNode: React.FC<NodeProps> = ({ data }) => {
  const anyData = data as any;
  const analysis = anyData?.analysis ?? anyData?.analysisResults;
  const groupName = anyData?.groupName;
  const { onEditPrompt, onCreateFork, onViewDetails } = anyData;
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="w-96">
      <Card className="border-2 bg-background">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <CardTitle className="text-lg">Analysis Results</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{groupName}</Badge>
            <span>•</span>
            <span>{analysis?.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : 'Recent'}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Prompt Display */}
          <div className="p-3 bg-muted/30 rounded-lg border">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">ANALYSIS PROMPT</h4>
            <p className="text-sm text-foreground leading-relaxed">
              {analysis?.prompt ? (
                analysis.prompt.length > 120 
                  ? `${analysis.prompt.substring(0, 120)}...` 
                  : analysis.prompt
              ) : (
                <span className="text-muted-foreground">Prompt not available</span>
              )}
            </p>
          </div>

          {/* Overall Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Overall Score</span>
            </div>
            <Badge variant={getScoreVariant(analysis.summary?.overallScore || 0)} className="text-lg px-3 py-1">
              {analysis.summary?.overallScore || 'N/A'}%
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Key Metrics</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Consistency</span>
                <span className={getScoreColor(analysis.summary.consistency)}>
                  {analysis.summary.consistency}%
                </span>
              </div>
              <Progress value={analysis.summary.consistency} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Thematic Coherence</span>
                <span className={getScoreColor(analysis.summary.thematicCoherence)}>
                  {analysis.summary.thematicCoherence}%
                </span>
              </div>
              <Progress value={analysis.summary.thematicCoherence} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">User Flow Continuity</span>
                <span className={getScoreColor(analysis.summary.userFlowContinuity)}>
                  {analysis.summary.userFlowContinuity}%
                </span>
              </div>
              <Progress value={analysis.summary.userFlowContinuity} className="h-2" />
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-2">
            {/* Key Insights */}
            <div className="border rounded-lg">
              <button
                onClick={() => toggleSection('insights')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Key Insights</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {analysis.insights.length}
                </Badge>
              </button>
              
              {expandedSection === 'insights' && (
                <div className="p-3 pt-0 border-t bg-muted/10">
                  <ul className="space-y-2">
                    {analysis.insights.slice(0, 3).map((insight, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="border rounded-lg">
              <button
                onClick={() => toggleSection('recommendations')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Recommendations</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {analysis.recommendations.length}
                </Badge>
              </button>
              
              {expandedSection === 'recommendations' && (
                <div className="p-3 pt-0 border-t bg-muted/10">
                  <ul className="space-y-2">
                    {analysis.recommendations.slice(0, 3).map((recommendation, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Common Patterns */}
            <div className="border rounded-lg">
              <button
                onClick={() => toggleSection('patterns')}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Patterns</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {analysis.patterns.commonElements.length}
                </Badge>
              </button>
              
              {expandedSection === 'patterns' && (
                <div className="p-3 pt-0 border-t bg-muted/10 space-y-3">
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Common Elements</h5>
                    <div className="flex flex-wrap gap-1">
                      {analysis.patterns.commonElements.slice(0, 4).map((element, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {element}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {analysis.patterns.designInconsistencies.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Inconsistencies</h5>
                      <div className="flex flex-wrap gap-1">
                        {analysis.patterns.designInconsistencies.slice(0, 3).map((issue, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(analysis.id)}
              className="flex-1"
              disabled={!onViewDetails}
              aria-disabled={!onViewDetails}
              title={!onViewDetails ? 'Details view not available' : undefined}
            >
              <Eye className="w-3 h-3 mr-1" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditPrompt?.(analysis.sessionId)}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateFork?.(analysis.sessionId)}
            >
              <GitBranch className="w-3 h-3 mr-1" />
              Fork
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-primary !border-primary"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-primary !border-primary"
      />
    </div>
  );
};