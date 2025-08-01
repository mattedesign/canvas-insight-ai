import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { UXAnalysis, AnnotationPoint } from '@/types/ux-analysis';
import { AnnotationComment } from './AnnotationComment';
import { DrawingOverlay } from './DrawingOverlay';
import { GalleryFloatingToolbar } from './GalleryFloatingToolbar';
import { ImageAnalysisDialog } from './ImageAnalysisDialog';
import OptimizedAnalysisDialog from './OptimizedAnalysisDialog';
import { Button } from './ui/button';
import { Brain, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface ImageViewerProps {
  analysis: UXAnalysis;
  selectedAnnotations: string[];
  onAnnotationClick: (annotationId: string) => void;
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onDeleteImage?: () => void;
  showAnnotations?: boolean;
  onToggleAnnotations?: () => void;
  onToolChange?: (tool: 'cursor' | 'draw') => void;
  onAddComment?: () => void;
  currentTool?: 'cursor' | 'draw';
  imageDimensions?: { width: number; height: number };
  onAnalysisComplete?: (analysis: UXAnalysis) => void;
}


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
  currentTool = 'cursor',
  imageDimensions = { width: 800, height: 600 },
  onAnalysisComplete,
}) => {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [showOptimizedDialog, setShowOptimizedDialog] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  // Remove useImageTransform hook that was interfering with TransformWrapper
  const transformRef = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // AnnotationMarker component moved inside to access activeCommentId
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
        data-annotation-id={annotation.id}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick(annotation, e);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          // Only prevent default if this annotation is not the active one
          if (annotation.id !== activeCommentId) {
            e.preventDefault();
          }
        }}
        onMouseUp={(e) => e.stopPropagation()}
        title={annotation.title}
        type="button"
      />
    );
  };

  const handleAnnotationClick = useCallback((annotation: AnnotationPoint, event: React.MouseEvent) => {
    const markerRect = event.currentTarget.getBoundingClientRect();
    const imageContainer = imageContainerRef.current;
    
    if (imageContainer) {
      const containerRect = imageContainer.getBoundingClientRect();
      // Calculate position relative to the image container
      setCommentPosition({
        x: markerRect.left - containerRect.left + markerRect.width / 2,
        y: markerRect.top - containerRect.top + markerRect.height / 2
      });
    }
    
    console.log('Setting activeCommentId:', annotation.id === activeCommentId ? null : annotation.id);
    setActiveCommentId(annotation.id === activeCommentId ? null : annotation.id);
    onAnnotationClick(annotation.id);
  }, [activeCommentId, onAnnotationClick]);

  const handleCloseComment = useCallback(() => {
    setActiveCommentId(null);
  }, []);

  const handleRequestAnalysis = useCallback(async (prompt: string) => {
    // This would be handled by the DrawingOverlay component
    // when the user draws on the image and requests analysis
    toast({
      title: "Analysis Requested",
      description: `Use drawing mode to mark regions for analysis`,
    });
  }, [toast]);

  const handleGenerateVariation = useCallback(async (prompt: string) => {
    // This would be handled by the DrawingOverlay component
    // when the user draws on the image and requests generation
    toast({
      title: "Generation Requested", 
      description: `Use drawing mode to mark regions for inpainting`,
    });
  }, [toast]);

  const handleDrawingComplete = useCallback((drawingData: ImageData, bounds: { x: number; y: number; width: number; height: number }) => {
    toast({
      title: "Drawing Complete",
      description: "Your drawing has been captured and is ready for analysis.",
    });
    console.log('Drawing completed with bounds:', bounds);
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

  // This will be handled by the useImageTransform hook now

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

  // Image content component that's shared between different wrappers
  const ImageContent = useCallback(({ zoomIn, zoomOut, resetTransform }: any) => (
    <>
      <div 
        ref={imageContainerRef}
        className="relative max-w-full max-h-full image-container w-full h-full flex items-center justify-center"
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleImageDoubleClick();
        }}
      >
        <div className="relative">
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

          {/* Drawing Overlay */}
          <DrawingOverlay
            imageUrl={analysis.imageUrl}
            imageDimensions={imageDimensions}
            isDrawMode={currentTool === 'draw'}
            onDrawingComplete={handleDrawingComplete}
            isPanningDisabled={!!activeCommentId}
          />

          {/* Active Comment */}
          {activeAnnotation && (
            <AnnotationComment
              annotation={activeAnnotation}
              position={commentPosition}
              onClose={handleCloseComment}
              onRequestAnalysis={handleRequestAnalysis}
              onGenerateVariation={handleGenerateVariation}
              relatedSuggestions={relatedSuggestions}
              imageContainerRef={imageContainerRef}
            />
          )}
        </div>
      </div>

      {/* AI Analysis Buttons */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <Button
          onClick={() => setShowAnalysisDialog(true)}
          className="bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg"
          size="sm"
        >
          <Brain className="h-4 w-4 mr-2" />
          Standard Analysis
        </Button>
        <Button
          onClick={() => setShowOptimizedDialog(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
          size="sm"
        >
          <Zap className="h-4 w-4 mr-2" />
          Optimized Pipeline
        </Button>
      </div>

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
      
      {/* Visual feedback when panning is disabled */}
      {activeCommentId && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-muted/90 backdrop-blur-sm text-muted-foreground text-xs px-3 py-1 rounded-md border">
          Pan disabled - Close annotation to enable
        </div>
      )}
      
      {/* AI Analysis Dialogs */}
      {showAnalysisDialog && (
        <ImageAnalysisDialog
          imageId={analysis.imageId}
          imageName={analysis.imageName}
          imageUrl={analysis.imageUrl}
          onClose={() => setShowAnalysisDialog(false)}
          onAnalysisComplete={(newAnalysis) => {
            setShowAnalysisDialog(false);
            if (onAnalysisComplete) {
              onAnalysisComplete(newAnalysis);
            }
          }}
        />
      )}
      
      {showOptimizedDialog && (
        <OptimizedAnalysisDialog
          isOpen={showOptimizedDialog}
          onClose={() => setShowOptimizedDialog(false)}
          imageUrl={analysis.imageUrl}
          imageName={analysis.imageName}
          imageId={analysis.imageId}
          onAnalysisComplete={(newAnalysis) => {
            setShowOptimizedDialog(false);
            if (onAnalysisComplete) {
              onAnalysisComplete(newAnalysis);
            }
          }}
        />
      )}
    </>
  ), [
    analysis,
    showAnnotations,
    selectedAnnotations,
    activeAnnotation,
    commentPosition,
    showAnalysisDialog,
    handleAnnotationClick,
    handleCloseComment,
    handleDrawingComplete,
    handleRequestAnalysis,
    handleGenerateVariation,
    handleDelete,
    handleToggleAnnotations,
    onToolChange,
    onAddComment,
    zoomLevel,
    currentTool,
    handleImageDoubleClick,
    onAnalysisComplete
  ]);

  // Unified zoom/pan for both cursor and draw modes
  return (
    <div className="w-full h-full bg-muted/20 relative overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit
        limitToBounds={false}
        wheel={{
          step: 0.1,
          smoothStep: 0.002,
        }}
        panning={{
          velocityDisabled: false,
          disabled: !!activeCommentId, // Disable panning when annotation dialog is open
        }}
        onInit={(ref) => {
          transformRef.current = ref;
          console.log('TransformWrapper initialized');
        }}
        onTransformed={(ref, state) => {
          console.log('Transform changed:', { scale: state.scale, activeCommentId });
          setZoomLevel(Math.round(state.scale * 100));
        }}
        doubleClick={{
          disabled: false,
          mode: "zoomIn",
          step: 0.7
        }}
        velocityAnimation={{
          sensitivity: 1,
          animationTime: 200,
          animationType: "easeOut"
        }}
      >
        {({ zoomIn: wrapperZoomIn, zoomOut: wrapperZoomOut, resetTransform: wrapperResetTransform }) => (
          <TransformComponent
            wrapperClass="w-full h-full"
            contentClass="w-full h-full flex items-center justify-center"
          >
            <ImageContent 
              zoomIn={wrapperZoomIn}
              zoomOut={wrapperZoomOut}
              resetTransform={wrapperResetTransform}
            />
          </TransformComponent>
        )}
      </TransformWrapper>
    </div>
  );
});

ImageViewer.displayName = 'ImageViewer';