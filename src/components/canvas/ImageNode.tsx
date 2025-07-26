import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { UploadedImage, UXAnalysis, AnnotationPoint } from '@/types/ux-analysis';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { DrawingOverlay } from '../DrawingOverlay';
import { useToast } from '@/hooks/use-toast';
import { useAnnotationOverlay, useGlobalCoordinates } from '../AnnotationOverlay';

interface ImageNodeData {
  image: UploadedImage;
  analysis?: UXAnalysis;
  showAnnotations?: boolean;
  currentTool?: 'hand' | 'cursor' | 'draw';
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onImageSelect?: (imageId: string) => void;
}

interface ImageNodeProps {
  data: ImageNodeData;
  id?: string;
}

export const ImageNode: React.FC<ImageNodeProps> = ({ data, id }) => {
  const { image, analysis, showAnnotations = true, currentTool = 'hand', onViewChange, onImageSelect } = data;
  const { toast } = useToast();
  const { fitView } = useReactFlow();
  const { showAnnotation, hideAnnotation, activeAnnotation } = useAnnotationOverlay();
  const { calculateGlobalPosition } = useGlobalCoordinates();
  const imageContainerRef = useRef<HTMLDivElement>(null);

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

  const handleAnnotationClick = useCallback((annotation: AnnotationPoint, event: React.MouseEvent) => {
    // If this annotation is already active, hide it
    if (activeAnnotation?.annotation.id === annotation.id) {
      hideAnnotation();
      return;
    }

    const markerElement = event.currentTarget as HTMLElement;
    const imageContainer = imageContainerRef.current;
    
    if (imageContainer) {
      const markerRect = markerElement.getBoundingClientRect();
      const globalPosition = calculateGlobalPosition(
        imageContainer,
        markerRect.left - imageContainer.getBoundingClientRect().left,
        markerRect.top - imageContainer.getBoundingClientRect().top
      );

      const relatedSuggestions = analysis?.suggestions.filter(s => 
        s.relatedAnnotations.includes(annotation.id)
      ) || [];

      showAnnotation({
        annotation,
        position: globalPosition,
        relatedSuggestions,
        onRequestAnalysis: handleRequestAnalysis,
        onGenerateVariation: handleGenerateVariation
      });
    }
  }, [activeAnnotation, hideAnnotation, calculateGlobalPosition, analysis, showAnnotation, handleRequestAnalysis, handleGenerateVariation]);

  const handleCloseComment = useCallback(() => {
    hideAnnotation();
  }, [hideAnnotation]);


  const handleDoubleClick = useCallback(() => {
    if (onViewChange && onImageSelect) {
      onViewChange('gallery');
      onImageSelect(image.id);
      toast({
        title: "Switched to Gallery View",
        description: `Now viewing ${image.name} in detail`,
      });
    } else if (id) {
      fitView({ nodes: [{ id }], duration: 800, maxZoom: 1 });
    }
  }, [id, fitView, onViewChange, onImageSelect, image.id, image.name, toast]);

  const handleViewSingle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent double-click from firing
    if (onViewChange && onImageSelect) {
      onViewChange('gallery');
      onImageSelect(image.id);
      toast({
        title: "Switched to Gallery View",
        description: `Now viewing ${image.name} in detail`,
      });
    }
  }, [onViewChange, onImageSelect, image.id, image.name, toast]);

  const handleDrawingComplete = useCallback((drawingData: ImageData, bounds: { x: number; y: number; width: number; height: number }) => {
    toast({
      title: "Drawing Completed",
      description: "Region marked for inpainting feedback",
    });
  }, [toast]);

  
  
  return (
    <Card className="max-w-2xl overflow-hidden bg-background border-border shadow-lg" onDoubleClick={handleDoubleClick}>
      <div className="relative image-container" ref={imageContainerRef}>
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-auto object-contain"
          style={{ maxWidth: `${image.dimensions.width}px`, maxHeight: '80vh' }}
        />

        {/* Drawing Overlay for Draw Mode */}
        <DrawingOverlay
          imageUrl={image.url}
          imageDimensions={image.dimensions}
          isDrawMode={currentTool === 'draw'}
          onDrawingComplete={handleDrawingComplete}
        />
        
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
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-2 truncate">
              {image.name}
            </h3>
            <div className="text-sm text-muted-foreground mb-3">
              {image.dimensions.width} × {image.dimensions.height}px
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewSingle}
            className="ml-3 flex-shrink-0"
            title="View in single image mode"
          >
            <Eye className="h-4 w-4" />
          </Button>
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