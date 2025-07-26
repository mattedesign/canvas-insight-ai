import React, { memo, useState, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { UXAnalysis, AnnotationPoint } from '@/types/ux-analysis';
import { AnnotationComment } from './AnnotationComment';
import { GalleryFloatingToolbar } from './GalleryFloatingToolbar';
import { useToast } from '@/hooks/use-toast';

interface ImageViewerProps {
  analysis: UXAnalysis;
  selectedAnnotations: string[];
  onAnnotationClick: (annotationId: string) => void;
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onDeleteImage?: () => void;
  showAnnotations?: boolean;
  onToggleAnnotations?: () => void;
  onToolChange?: (tool: 'hand' | 'cursor' | 'draw') => void;
  onAddComment?: () => void;
  currentTool?: 'hand' | 'cursor' | 'draw';
}

const AnnotationMarker: React.FC<{
  annotation: AnnotationPoint;
  isSelected: boolean;
  onClick: (annotation: AnnotationPoint, event: React.MouseEvent) => void;
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
    <button
      className={`absolute w-4 h-4 rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 z-20 ${getMarkerColor()}`}
      style={{
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(annotation, e);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      title={annotation.title}
      type="button"
    />
  );
};

export const ImageViewer: React.FC<ImageViewerProps> = memo(({
  analysis,
  selectedAnnotations,
  onAnnotationClick,
  onViewChange,
  onDeleteImage,
  showAnnotations = true,
  onToggleAnnotations,
  onToolChange,
  onAddComment,
  currentTool = 'hand',
}) => {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const { toast } = useToast();

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
    onAnnotationClick(annotation.id);
  }, [activeCommentId, onAnnotationClick]);

  const handleCloseComment = useCallback(() => {
    setActiveCommentId(null);
  }, []);

  const handleRequestAnalysis = useCallback(async (prompt: string) => {
    // Simulate AI analysis request
    toast({
      title: "Analysis Requested",
      description: "AI is analyzing your request and will provide insights shortly.",
    });
    // Here you would integrate with your AI analysis service
  }, [toast]);

  const handleGenerateVariation = useCallback(async (prompt: string) => {
    // Simulate variation generation
    toast({
      title: "Generating Variation",
      description: "Creating a new design variation based on your request.",
    });
    // Here you would integrate with your design generation service
  }, [toast]);

  // Handle escape key to close active annotation comment
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeCommentId) {
        setActiveCommentId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeCommentId]);

  const activeAnnotation = analysis.visualAnnotations.find(a => a.id === activeCommentId);
  const relatedSuggestions = analysis.suggestions.filter(s => 
    s.relatedAnnotations.includes(activeCommentId || '')
  );

  const handleZoomChange = useCallback((ref: any) => {
    if (ref?.state?.scale) {
      setZoomLevel(Math.round(ref.state.scale * 100));
    }
  }, []);

  const handleDelete = useCallback(() => {
    if (onDeleteImage) {
      onDeleteImage();
    }
  }, [onDeleteImage]);

  const handleToggleAnnotations = useCallback(() => {
    if (onToggleAnnotations) {
      onToggleAnnotations();
    }
  }, [onToggleAnnotations]);

  const handleImageDoubleClick = useCallback(() => {
    if (onViewChange) {
      onViewChange('canvas');
    }
  }, [onViewChange]);

  return (
    <div className="w-full h-full bg-muted/20 relative overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit
        onTransformed={handleZoomChange}
        disabled={currentTool === 'draw'}
        doubleClick={{
          disabled: false,
          mode: "reset"
        }}
        panning={{
          disabled: currentTool === 'cursor',
          velocityDisabled: true
        }}
        wheel={{
          disabled: currentTool === 'cursor'
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>

            <TransformComponent
              wrapperClass="w-full h-full"
              contentClass="w-full h-full flex items-center justify-center"
            >
              <div 
                className="relative max-w-full max-h-full image-container"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleImageDoubleClick();
                }}
              >
                <img
                  src={analysis.imageUrl}
                  alt={analysis.imageName}
                  className="max-w-full max-h-full object-contain cursor-pointer select-none"
                  style={{ maxWidth: '100%', height: 'auto' }}
                  title="Double-click to switch to canvas view"
                  draggable={false}
                />
                
                {/* Annotation Markers */}
                {showAnnotations && analysis.visualAnnotations.map((annotation) => (
                  <AnnotationMarker
                    key={annotation.id}
                    annotation={annotation}
                    isSelected={selectedAnnotations.includes(annotation.id)}
                    onClick={handleAnnotationClick}
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
              </div>
            </TransformComponent>

            {/* Gallery Floating Toolbar */}
            <GalleryFloatingToolbar
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={resetTransform}
              onDelete={handleDelete}
              onToggleAnnotations={handleToggleAnnotations}
              onToolChange={onToolChange}
              onAddComment={onAddComment}
              showAnnotations={showAnnotations}
              zoomLevel={zoomLevel}
              currentTool={currentTool}
            />
          </>
        )}
      </TransformWrapper>
    </div>
  );
});

ImageViewer.displayName = 'ImageViewer';