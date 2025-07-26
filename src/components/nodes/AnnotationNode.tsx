import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Lightbulb, CheckCircle, X } from 'lucide-react';
import { AnnotationPoint } from '@/types/ux-analysis';

interface AnnotationNodeProps {
  data: {
    annotation: AnnotationPoint;
    onClose: () => void;
  };
}

export const AnnotationNode: React.FC<AnnotationNodeProps> = memo(({ data }) => {
  const { annotation, onClose } = data;

  const getIcon = () => {
    switch (annotation.type) {
      case 'issue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (annotation.type) {
      case 'issue':
        return 'border-red-200';
      case 'suggestion':
        return 'border-yellow-200';
      case 'success':
        return 'border-green-200';
      default:
        return 'border-blue-200';
    }
  };

  const getSeverityColor = () => {
    switch (annotation.severity) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`bg-card border-2 rounded-lg shadow-lg w-72 ${getBorderColor()}`}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 className="font-medium text-sm">{annotation.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        <p className="text-sm text-muted-foreground">{annotation.description}</p>
        
        <div className="flex items-center justify-between">
          <span 
            className={`px-2 py-1 text-xs rounded-full ${getSeverityColor()}`}
          >
            {annotation.severity} severity
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {annotation.type}
          </span>
        </div>
      </div>

      {/* React Flow Handles */}
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
});