import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { UploadedImage, UXAnalysis, AnnotationPoint } from '@/types/ux-analysis';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AnnotationComment } from '@/components/AnnotationComment';
import { useToast } from '@/hooks/use-toast';

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
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const { toast } = useToast();
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

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

  const handleAnnotationClick = useCallback((annotation: AnnotationPoint, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const imageRect = event.currentTarget.closest('.image-container')?.getBoundingClientRect();
    
    if (imageRect) {
      setCommentPosition({
        x: rect.left - imageRect.left,
        y: rect.top - imageRect.top
      });
    }
    
    setActiveCommentId(annotation.id === activeCommentId ? null : annotation.id);
  }, [activeCommentId]);

  const handleCloseComment = useCallback(() => {
    setActiveCommentId(null);
  }, []);

  const handleRequestAnalysis = useCallback(async (prompt: string) => {
    toast({
      title: "Analysis Requested",
      description: "AI is analyzing your request and will provide insights shortly.",
    });
  }, [toast]);

  const handleGenerateVariation = useCallback(async (prompt: string) => {
    toast({
      title: "Generating Variation", 
      description: "Creating a new design variation based on your request.",
    });
  }, [toast]);

  const activeAnnotation = analysis?.visualAnnotations.find(a => a.id === activeCommentId);
  const relatedSuggestions = analysis?.suggestions.filter(s => 
    s.relatedAnnotations.includes(activeCommentId || '')
  ) || [];
  
  
  return (
    <Card className="max-w-2xl overflow-hidden bg-background border-border shadow-lg">
      <div className="relative image-container">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.5}
          maxScale={3}
          centerOnInit={true}
          doubleClick={{
            disabled: false,
            mode: 'reset'
          }}
        >
          <TransformComponent>
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-auto object-contain"
              style={{ maxWidth: `${image.dimensions.width}px`, maxHeight: '80vh' }}
            />
          </TransformComponent>
        </TransformWrapper>
        
        {/* Annotation Markers */}
        {analysis && showAnnotations && analysis.visualAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            className={`absolute w-4 h-4 rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 ${getMarkerColor(annotation.type)}`}
            style={{
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
            }}
            title={annotation.title}
            onClick={(e) => handleAnnotationClick(annotation, e)}
          />
        ))}

        {/* Active Comment */}
        {activeAnnotation && (
          <AnnotationComment
            annotation={activeAnnotation}
            position={commentPosition}
            onClose={handleCloseComment}
            onRequestAnalysis={handleRequestAnalysis}
            onGenerateVariation={handleGenerateVariation}
            relatedSuggestions={relatedSuggestions}
          />
        )}
        
        {analysis && (
          <div className="absolute top-2 right-2 z-10">
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