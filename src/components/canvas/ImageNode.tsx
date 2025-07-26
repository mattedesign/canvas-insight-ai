import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { UploadedImage, UXAnalysis } from '@/types/ux-analysis';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ImageNodeData {
  image: UploadedImage;
  analysis?: UXAnalysis;
}

interface ImageNodeProps {
  data: ImageNodeData;
}

export const ImageNode: React.FC<ImageNodeProps> = ({ data }) => {
  const { image, analysis } = data;
  
  return (
    <Card className="max-w-2xl overflow-hidden bg-background border-border shadow-lg">
      <div className="relative">
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-auto object-contain"
          style={{ maxWidth: `${image.dimensions.width}px`, maxHeight: '80vh' }}
        />
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