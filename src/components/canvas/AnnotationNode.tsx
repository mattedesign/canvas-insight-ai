import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Lightbulb, CheckCircle, Info } from 'lucide-react';
import { AnnotationPoint } from '@/types/ux-analysis';

interface AnnotationNodeData {
  annotation: AnnotationPoint;
  onClose: (annotationId: string) => void;
  onRequestAnalysis?: (prompt: string) => void;
  onGenerateVariation?: (prompt: string) => void;
}

interface AnnotationNodeProps {
  data: AnnotationNodeData;
}

export const AnnotationNode: React.FC<AnnotationNodeProps> = memo(({ data }) => {
  const { annotation, onClose, onRequestAnalysis, onGenerateVariation } = data;

  const getIcon = () => {
    switch (annotation.type) {
      case 'issue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getBorderColor = () => {
    switch (annotation.type) {
      case 'issue':
        return 'border-destructive';
      case 'suggestion':
        return 'border-yellow-500';
      case 'success':
        return 'border-green-500';
      default:
        return 'border-primary';
    }
  };

  const getSeverityColor = () => {
    switch (annotation.severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className={`w-80 bg-background/95 backdrop-blur-sm border-2 ${getBorderColor()} shadow-lg`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h4 className="font-semibold text-sm">{annotation.title}</h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onClose(annotation.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        {annotation.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {annotation.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={getSeverityColor()} className="text-xs">
            {annotation.severity || 'medium'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {annotation.type}
          </Badge>
        </div>

        {(onRequestAnalysis || onGenerateVariation) && (
          <div className="flex gap-2">
            {onRequestAnalysis && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestAnalysis('Analyze this annotation')}
                className="text-xs"
              >
                Ask AI
              </Button>
            )}
            {onGenerateVariation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGenerateVariation('Generate improvement for this area')}
                className="text-xs"
              >
                Generate
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Handles for connecting to other nodes */}
      <Handle type="target" position={Position.Left} className="bg-muted-foreground" />
      <Handle type="source" position={Position.Right} className="bg-muted-foreground" />
    </Card>
  );
});

AnnotationNode.displayName = 'AnnotationNode';