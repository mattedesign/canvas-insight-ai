import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Bot, Activity } from 'lucide-react';

export const AIAnalysisConnectionEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isAIConnection = data?.type === 'ai-analysis';
  const isGroupAnalysis = data?.type === 'group-analysis';

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: isAIConnection ? 'hsl(var(--primary))' : 
                  isGroupAnalysis ? 'hsl(var(--secondary))' : 
                  style.stroke,
          strokeWidth: isAIConnection || isGroupAnalysis ? 3 : 2,
          strokeDasharray: isAIConnection ? '5,5' : 
                          isGroupAnalysis ? '8,3' : 
                          undefined,
        }}
        className={`react-flow__edge-path ${isAIConnection || isGroupAnalysis ? 'animate-pulse' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Edge Label */}
      {(isAIConnection || isGroupAnalysis) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Badge 
              variant={isAIConnection ? "default" : "secondary"} 
              className="bg-background/90 backdrop-blur-sm border shadow-lg"
            >
              {isAIConnection && <Bot className="h-3 w-3 mr-1" />}
              {isGroupAnalysis && <Activity className="h-3 w-3 mr-1" />}
              {isAIConnection ? 'AI Analysis' : 'Group Analysis'}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};