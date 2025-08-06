import React, { useState, useCallback, useRef, memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { UploadedImage, UXAnalysis, AnnotationPoint } from '@/types/ux-analysis';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnnotationOverlay, useGlobalCoordinates } from '../AnnotationOverlay';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ImageNodeData {
  image: UploadedImage;
  analysis?: UXAnalysis;
  showAnnotations?: boolean;
  currentTool?: 'cursor' | 'draw';
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onImageSelect?: (imageId: string) => void;
  onToggleSelection?: (imageId: string, isCtrlOrCmd: boolean) => void;
  isSelected?: boolean;
}

interface OptimizedImageNodeProps {
  data: ImageNodeData;
  id?: string;
}

/**
 * ✅ PHASE 2 & 3: Optimized image node with enhanced error handling and performance
 */
export const OptimizedImageNode: React.FC<OptimizedImageNodeProps> = memo(({ data, id }) => {
  const { image, analysis, showAnnotations = true, currentTool = 'cursor', onViewChange, onImageSelect, onToggleSelection, isSelected = false } = data;
  const { toast } = useToast();
  const { fitView } = useReactFlow();
  const { showAnnotation, hideAnnotation, activeAnnotation } = useAnnotationOverlay();
  const { calculateGlobalPosition } = useGlobalCoordinates();
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // ✅ PHASE 2: Enhanced image URL validation
  const isValidImageUrl = useCallback((url: string) => {
    return url && (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:'));
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`[OptimizedImageNode] Image failed to load:`, {
      imageName: image.name,
      imageId: image.id,
      url: image.url,
      hasFile: !!image.file,
      isBlob: image.url?.startsWith('blob:'),
      isSupabase: image.url?.includes('supabase'),
      errorEvent: e.currentTarget.src
    });
    
    setImageError(true);
    
    // Enhanced error recovery: Try to regenerate blob URL if we have the file
    if (image.file && !image.url?.startsWith('blob:')) {
      console.log('[OptimizedImageNode] Attempting fallback to blob URL for:', image.name);
      try {
        const fallbackUrl = URL.createObjectURL(image.file);
        e.currentTarget.src = fallbackUrl;
        setImageError(false); // Reset error state for retry
      } catch (blobError) {
        console.error('[OptimizedImageNode] Failed to create blob URL:', blobError);
      }
    }
  }, [image]);

  const handleImageLoad = useCallback(() => {
    console.log(`[OptimizedImageNode] Image loaded successfully:`, {
      imageName: image.name,
      imageId: image.id,
      dimensions: image.dimensions
    });
    setImageLoaded(true);
    setImageError(false);
  }, [image]);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    if (currentTool === 'cursor' && onToggleSelection) {
      const isMultiSelectKey = isMobile || e.ctrlKey || e.metaKey || e.shiftKey;
      onToggleSelection(image.id, isMultiSelectKey);
    }
  }, [currentTool, onToggleSelection, image.id, isMobile]);

  const handleViewImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onImageSelect) {
      onImageSelect(image.id);
      toast({
        title: "Image Selected",
        description: `Now viewing ${image.name}`,
      });
    }
  }, [onImageSelect, image.id, image.name, toast]);

  // ✅ PHASE 2: Render fallback for invalid URLs
  const renderImageContent = () => {
    if (!isValidImageUrl(image.url)) {
      return (
        <div className="w-full h-64 bg-muted/50 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/50">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            Invalid image URL
          </p>
          <p className="text-xs text-muted-foreground/70 text-center mt-1">
            {image.name}
          </p>
        </div>
      );
    }

    if (imageError) {
      return (
        <div className="w-full h-64 bg-muted/50 flex flex-col items-center justify-center border-2 border-dashed border-destructive/50">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-destructive text-center">
            Failed to load image
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {image.name}
          </p>
        </div>
      );
    }

    return (
      <>
        {!imageLoaded && (
          <div className="w-full h-64 bg-muted/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        <img
          src={image.url}
          alt={image.name}
          className={`w-full h-auto object-contain transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
          style={{ maxWidth: `${image.dimensions.width}px`, maxHeight: '80vh' }}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </>
    );
  };

  return (
    <Card 
      className={`max-w-2xl overflow-hidden bg-background border-border shadow-lg transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`} 
      onClick={handleNodeClick}
    >
      <div className="relative image-container" ref={imageContainerRef}>
        {renderImageContent()}
        
        {/* Annotation Markers */}
        {analysis && showAnnotations && imageLoaded && analysis.visualAnnotations.map((annotation) => {
          const isActive = activeAnnotation?.annotation.id === annotation.id;
          return (
            <div
              key={annotation.id}
              className={`absolute rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110 z-10 w-4 h-4 ${
                isActive ? 'ring-2 ring-primary ring-offset-1 scale-125' : ''
              } ${
                annotation.type === 'issue' ? 'bg-destructive border-destructive-foreground' :
                annotation.type === 'suggestion' ? 'bg-yellow-500 border-yellow-600' :
                annotation.type === 'success' ? 'bg-green-500 border-green-600' :
                'bg-primary border-primary-foreground'
              }`}
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
              }}
              title={annotation.title}
            />
          );
        })}

        {/* Analysis Score Badge */}
        {analysis && imageLoaded && (
          <div className="absolute top-2 right-2 z-10">
            <Badge 
              variant={analysis.summary?.overallScore >= 80 ? 'default' : 
                     analysis.summary?.overallScore >= 60 ? 'secondary' : 'destructive'}
              className="bg-background/90"
            >
              Score: {analysis.summary?.overallScore || 'N/A'}
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
            <div className="text-sm text-muted-foreground mb-2">
              {image.dimensions.width} × {image.dimensions.height}px
            </div>
            {/* ✅ PHASE 2: Show loading/error status */}
            <div className="mb-2">
              <Badge variant={imageError ? "destructive" : imageLoaded ? "default" : "secondary"}>
                {imageError ? "Error" : imageLoaded ? "Loaded" : "Loading..."}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2 ml-3 flex-shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={handleViewImage}
              disabled={imageError}
              title="View image"
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
    </Card>
  );
});

OptimizedImageNode.displayName = 'OptimizedImageNode';