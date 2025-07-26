import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { UploadedImage, UXAnalysis } from '@/types/ux-analysis';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ImageNodeData {
  image: UploadedImage;
  analysis?: UXAnalysis;
  showAnnotations?: boolean;
}

interface ImageNodeProps {
  data: ImageNodeData;
}

export const ImageNode: React.FC<ImageNodeProps> = ({ data }) => {
  const { image, analysis, showAnnotations = true } = data;

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'issue':
        return 'bg-destructive border-destructive-foreground';
      case 'suggestion':
        return 'bg-yellow-500 border-yellow-600';
      case 'success':
        return 'bg-green-500 border-green-600';
      default:
        return 'bg-primary border-primary-foreground';
    }
  };
  
  
  return (
    <Card className="max-w-2xl overflow-hidden bg-background border-border shadow-lg">
      <div className="relative">
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-auto object-contain"
          style={{ maxWidth: `${image.dimensions.width}px`, maxHeight: '80vh' }}
        />
        
        {/* Annotation Markers */}
        {analysis && showAnnotations && analysis.visualAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            className={`absolute w-3 h-3 rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 ${getMarkerColor(annotation.type)}`}
            style={{
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
            }}
            title={annotation.title}
          />
        ))}
        
        {analysis && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant={analysis.summary.overallScore >= 80 ? 'default' : 
                     analysis.summary.overallScore >= 60 ? 'secondary' : 'destructive'}
              className="bg-background/90"
            >
              Score: {analysis.summary.overallScore}
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-2 truncate">
          {image.name}
        </h3>
        <div className="text-sm text-muted-foreground mb-3">
          {image.dimensions.width} × {image.dimensions.height}px
        </div>
        
        {analysis && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Issues: {analysis.summary.keyIssues.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Suggestions: {analysis.suggestions.length}
            </div>
          </div>
        )}
      </div>
      
      {analysis && (
        <Handle
          type="source"
          position={Position.Right}
          className="bg-primary border-2 border-background"
        />
      )}
    </Card>
  );
};