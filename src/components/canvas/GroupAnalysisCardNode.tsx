import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GroupAnalysis } from '@/types/ux-analysis';

interface GroupAnalysisCardNodeData {
  analysis: GroupAnalysis;
  groupName: string;
  onViewDetails?: (analysisId: string) => void;
}

export const GroupAnalysisCardNode: React.FC<NodeProps> = ({ 
  data 
}) => {
  const { analysis, groupName, onViewDetails } = data as unknown as GroupAnalysisCardNodeData;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="group-analysis-card">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="group-analysis-handle"
      />
      
      <Card className="w-80 bg-background border-dashed border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Group Analysis: {groupName}
            <Badge variant="secondary" className="ml-2">
              {Math.round(analysis.summary.overallScore)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Score Metrics */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span>Consistency</span>
              <span>{analysis.summary.consistency}%</span>
            </div>
            <Progress value={analysis.summary.consistency} className="h-1" />
            
            <div className="flex justify-between items-center text-xs">
              <span>Thematic Coherence</span>
              <span>{analysis.summary.thematicCoherence}%</span>
            </div>
            <Progress value={analysis.summary.thematicCoherence} className="h-1" />
            
            <div className="flex justify-between items-center text-xs">
              <span>User Flow Continuity</span>
              <span>{analysis.summary.userFlowContinuity}%</span>
            </div>
            <Progress value={analysis.summary.userFlowContinuity} className="h-1" />
          </div>

          {/* Key Insights */}
          <div>
            <h4 className="text-xs font-medium mb-2">Key Insights</h4>
            <div className="space-y-1">
              {analysis.insights.slice(0, 2).map((insight, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  • {insight}
                </p>
              ))}
            </div>
          </div>

          {/* Common Elements */}
          <div>
            <h4 className="text-xs font-medium mb-2">Common Elements</h4>
            <div className="flex flex-wrap gap-1">
              {analysis.patterns.commonElements.slice(0, 3).map((element, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {element}
                </Badge>
              ))}
            </div>
          </div>

          {/* View Details Button */}
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(analysis.id)}
              className="w-full text-xs py-2 px-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              View Detailed Analysis
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};