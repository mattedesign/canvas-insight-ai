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
import { useIsMobile } from '@/hooks/useIsMobile';
import { ImageAnalysisDialog } from '../ImageAnalysisDialog';
import { AnalysisStatusIndicator } from '../AnalysisStatusIndicator';
import { AIContextMenu } from './AIContextMenu';

interface ImageNodeData {
  image: UploadedImage;
  analysis?: UXAnalysis;
  showAnnotations?: boolean;
  currentTool?: 'cursor' | 'draw';
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onImageSelect?: (imageId: string) => void;
  onToggleSelection?: (imageId: string, isCtrlOrCmd: boolean) => void;
  isSelected?: boolean;
  onAnalysisComplete?: (imageId: string, analysis: UXAnalysis) => void;
}

interface ImageNodeProps {
  data: ImageNodeData;
  id?: string;
}

export const ImageNode: React.FC<ImageNodeProps> = ({ data, id }) => {
  const { image, analysis, showAnnotations = true, currentTool = 'cursor', onViewChange, onImageSelect, onToggleSelection, isSelected = false, onAnalysisComplete } = data;
  const { toast } = useToast();
  const { fitView } = useReactFlow();
  const { showAnnotation, hideAnnotation, activeAnnotation } = useAnnotationOverlay();
  const { calculateGlobalPosition } = useGlobalCoordinates();
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  const getMarkerColor = (type: string, isActive: boolean = false) => {
    const baseClasses = isActive ? 'ring-2 ring-primary ring-offset-1 scale-125' : '';
    const baseSize = isActive ? 'w-5 h-5' : 'w-4 h-4';
    
    switch (type) {
      case 'issue':
        return `${baseSize} bg-destructive border-destructive-foreground ${baseClasses}`;
      case 'suggestion':
        return `${baseSize} bg-yellow-500 border-yellow-600 ${baseClasses}`;
      case 'success':
        return `${baseSize} bg-green-500 border-green-600 ${baseClasses}`;
      default:
        return `${baseSize} bg-primary border-primary-foreground ${baseClasses}`;
    }
  };

  const handleRequestAnalysis = useCallback(async (prompt: string) => {
    toast({
      title: "Analysis Available in Drawing Mode",
      description: `Switch to drawing mode to analyze specific regions`,
    });
  }, [toast]);

  const handleGenerateVariation = useCallback(async (prompt: string) => {
    toast({
      title: "Generation Available in Drawing Mode", 
      description: `Switch to drawing mode to create inpainted variations`,
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
      // No longer switching to gallery - stay on canvas with image selected
      onImageSelect(image.id);
      toast({
        title: "Image Selected",
        description: `Now viewing ${image.name} - use "View Full Analysis" for details`,
      });
    } else if (id) {
      fitView({ nodes: [{ id }], duration: 800, maxZoom: 1 });
    }
  }, [id, fitView, onViewChange, onImageSelect, image.id, image.name, toast]);

  const handleViewSingle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent double-click from firing
    if (onViewChange && onImageSelect) {
      // No longer switching to gallery - stay on canvas with image selected
      onImageSelect(image.id);
      toast({
        title: "Image Selected",
        description: `Now viewing ${image.name} - use "View Full Analysis" for details`,
      });
    }
  }, [onViewChange, onImageSelect, image.id, image.name, toast]);

  const handleDrawingComplete = useCallback((drawingData: ImageData, bounds: { x: number; y: number; width: number; height: number }) => {
    toast({
      title: "Drawing Completed",
      description: "Region marked for inpainting feedback",
    });
  }, [toast]);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    if (currentTool === 'cursor' && onToggleSelection) {
      // For mobile devices (768px and under), treat all clicks as multi-select
      // For desktop, use the traditional Ctrl/Cmd/Shift key detection
      const isMultiSelectKey = isMobile || e.ctrlKey || e.metaKey || e.shiftKey;
      onToggleSelection(image.id, isMultiSelectKey);
    }
  }, [currentTool, onToggleSelection, image.id, isMobile]);

  // AI Integration Handlers
  const handleAnalyzeImage = useCallback((imageId: string) => {
    setShowAnalysisDialog(true);
  }, []);

  const handleViewAnalysis = useCallback((imageId: string) => {
    if (analysis) {
      toast({
        title: "Analysis Available",
        description: "View the analysis card connected to this image",
      });
    } else {
      toast({
        title: "No Analysis",
        description: "This image hasn't been analyzed yet. Click 'AI Analysis' to start.",
        variant: "destructive"
      });
    }
  }, [analysis, toast]);

  const handleCompareModels = useCallback((imageId: string) => {
    toast({
      title: "Model Comparison",
      description: "This feature will compare different AI models for analysis",
    });
  }, [toast]);

  const handleEnhancedAnalysis = useCallback((imageId: string) => {
    toast({
      title: "Enhanced Analysis",
      description: "Starting enhanced AI analysis with advanced features",
    });
  }, [toast]);
  
  return (
    <AIContextMenu
      imageId={image.id}
      imageName={image.name}
      imageUrl={image.url}
      isSelected={isSelected}
      onAnalyzeImage={handleAnalyzeImage}
      onViewAnalysis={handleViewAnalysis}
      onCompareModels={handleCompareModels}
      onEnhancedAnalysis={handleEnhancedAnalysis}
    >
    <Card 
      className={`max-w-2xl overflow-hidden bg-background border-border shadow-lg transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`} 
      onDoubleClick={handleDoubleClick}
      onClick={handleNodeClick}
    >
      <div className="relative image-container" ref={imageContainerRef}>
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-auto object-contain"
          style={{ maxWidth: `${image.dimensions.width}px`, maxHeight: '80vh' }}
          onError={(e) => {
            console.error(`[ImageNode] Image load failed:`, {
              imageName: image.name,
              imageId: image.id,
              url: image.url,
              hasFile: !!image.file,
              isBlob: image.url.startsWith('blob:'),
              isSupabase: image.url.includes('supabase'),
              statusCode: e.currentTarget.complete ? 'complete but error' : 'loading failed'
            });
            
            // Show error state instead of hiding
            e.currentTarget.style.display = 'block';
            e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
            e.currentTarget.style.border = '2px dashed hsl(var(--border))';
            e.currentTarget.style.minHeight = '200px';
            e.currentTarget.alt = `Failed to load: ${image.name}`;
          }}
          onLoad={() => {
            console.log(`[ImageNode] Image loaded successfully:`, {
              imageName: image.name,
              imageId: image.id,
              dimensions: image.dimensions,
              url: image.url.substring(0, 100) + '...'
            });
          }}
        />

        {/* Drawing Overlay for Draw Mode */}
        <DrawingOverlay
          imageUrl={image.url}
          imageDimensions={image.dimensions}
          isDrawMode={currentTool === 'draw'}
          onDrawingComplete={handleDrawingComplete}
          isPanningDisabled={!!activeAnnotation}
        />
        
        {/* Annotation Markers */}
        {analysis && showAnnotations && analysis.visualAnnotations.map((annotation) => {
          const isActive = activeAnnotation?.annotation.id === annotation.id;
          return (
            <div
              key={annotation.id}
              className={`absolute rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110 z-10 ${getMarkerColor(annotation.type, isActive)}`}
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
              }}
              data-annotation-id={annotation.id}
              title={annotation.title}
              onClick={(e) => handleAnnotationClick(annotation, e)}
            />
          );
        })}

        
        {/* AI Analysis Results Overlay */}
        {analysis && (
          <div className="absolute top-2 right-2 z-10 space-y-2">
            <Badge 
              variant={analysis.summary.overallScore >= 80 ? 'default' : 
                     analysis.summary.overallScore >= 60 ? 'secondary' : 'destructive'}
              className="bg-background/90 backdrop-blur-sm"
            >
              Score: {analysis.summary.overallScore}
            </Badge>
            
            {/* AI Model Used Indicator */}
            {analysis.modelUsed && (
              <Badge 
                variant="outline" 
                className="bg-background/90 backdrop-blur-sm text-xs"
              >
                {analysis.modelUsed}
              </Badge>
            )}
            
            {/* Quick Insights Count */}
            <div className="flex gap-1">
              {analysis.summary.keyIssues.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="bg-background/90 backdrop-blur-sm text-xs px-1"
                >
                  {analysis.summary.keyIssues.length} issues
                </Badge>
              )}
              {analysis.suggestions.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-background/90 backdrop-blur-sm text-xs px-1"
                >
                  {analysis.suggestions.length} tips
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-2 truncate">
              {image.name}
            </h3>
            <div className="text-sm text-muted-foreground mb-2">
              {image.dimensions.width} × {image.dimensions.height}px
            </div>
            <div className="mb-2">
              <AnalysisStatusIndicator 
                status={analysis?.status || image.status} 
                compact 
              />
            </div>
            
            {/* Enhanced Analysis Preview */}
            {analysis && (
              <div className="mb-3 p-2 bg-muted/50 rounded-md text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium">AI Analysis</span>
                  <span className="text-muted-foreground">
                    {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                {analysis.summary.keyIssues.length > 0 && (
                  <div className="text-destructive">
                    Top Issue: {analysis.summary.keyIssues[0].substring(0, 40)}...
                  </div>
                )}
                {analysis.suggestions.length > 0 && (
                  <div className="text-primary">
                    Main Suggestion: {analysis.suggestions[0].title.substring(0, 40)}...
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 ml-3 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowAnalysisDialog(true);
              }}
              title="Analyze with AI"
            >
              AI Analysis
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleViewSingle}
              title="View in single image mode"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      </div>
      
      {analysis && (
        <Handle
          type="source"
          position={Position.Right}
          className="bg-primary border-2 border-background"
        />
      )}
      
      {showAnalysisDialog && (
        <ImageAnalysisDialog
          imageId={image.id}
          imageName={image.name}
          imageUrl={image.url}
          onClose={() => setShowAnalysisDialog(false)}
          onAnalysisComplete={() => {
            setShowAnalysisDialog(false);
            toast({
              title: "Analysis Complete",
              description: "AI analysis has been generated for this image"
            });
          }}
        />
      )}
    </Card>
    </AIContextMenu>
  );
};