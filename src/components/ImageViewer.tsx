import React, { memo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { UXAnalysis, AnnotationPoint } from '@/types/ux-analysis';

interface ImageViewerProps {
  analysis: UXAnalysis;
  selectedAnnotations: string[];
  onAnnotationClick: (annotationId: string) => void;
}

const AnnotationMarker: React.FC<{
  annotation: AnnotationPoint;
  isSelected: boolean;
  onClick: () => void;
}> = ({ annotation, isSelected, onClick }) => {
  const getMarkerColor = () => {
    switch (annotation.type) {
      case 'issue':
        return isSelected ? 'bg-destructive border-destructive-foreground' : 'bg-destructive/80 border-destructive';
      case 'suggestion':
        return isSelected ? 'bg-warning border-warning-foreground' : 'bg-warning/80 border-warning';
      case 'success':
        return isSelected ? 'bg-success border-success-foreground' : 'bg-success/80 border-success';
      default:
        return isSelected ? 'bg-primary border-primary-foreground' : 'bg-primary/80 border-primary';
    }
  };

  return (
    <div
      className={`absolute w-4 h-4 rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 ${getMarkerColor()}`}
      style={{
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
      }}
      onClick={onClick}
      title={annotation.title}
    />
  );
};

export const ImageViewer: React.FC<ImageViewerProps> = memo(({
  analysis,
  selectedAnnotations,
  onAnnotationClick,
}) => {
  return (
    <div className="w-full h-full bg-muted/20 relative overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => zoomIn()}
                className="bg-background/90 backdrop-blur-sm"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => zoomOut()}
                className="bg-background/90 backdrop-blur-sm"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => resetTransform()}
                className="bg-background/90 backdrop-blur-sm"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <TransformComponent
              wrapperClass="w-full h-full"
              contentClass="w-full h-full flex items-center justify-center"
            >
              <div className="relative max-w-full max-h-full">
                <img
                  src={analysis.imageUrl}
                  alt={analysis.imageName}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                
                {/* Annotation Markers */}
                {analysis.visualAnnotations.map((annotation) => (
                  <AnnotationMarker
                    key={annotation.id}
                    annotation={annotation}
                    isSelected={selectedAnnotations.includes(annotation.id)}
                    onClick={() => onAnnotationClick(annotation.id)}
                  />
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
});

ImageViewer.displayName = 'ImageViewer';