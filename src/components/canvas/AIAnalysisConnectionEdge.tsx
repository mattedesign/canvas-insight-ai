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

  const isGroupAnalysis = data?.type === 'group-analysis';

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: isGroupAnalysis ? 'hsl(var(--secondary))' : style.stroke,
          strokeWidth: isGroupAnalysis ? 3 : 2,
          strokeDasharray: isGroupAnalysis ? '8,3' : undefined,
        }}
        className={`react-flow__edge-path ${isGroupAnalysis ? 'animate-pulse' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Edge Label */}
      {isGroupAnalysis && (
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
              variant="secondary" 
              className="bg-background/90 backdrop-blur-sm border shadow-lg"
            >
              <Activity className="h-3 w-3 mr-1" />
              Group Analysis
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};