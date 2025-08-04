import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ZoomIn, Info, AlertTriangle, CheckCircle, AlertCircle, Brain, ImageOff } from 'lucide-react';
import { UXAnalysis, UploadedImage, AnnotationPoint } from '@/types/ux-analysis';
import { ImageAnalysisDialog } from '@/components/ImageAnalysisDialog';

interface ImageNodeProps {
  data: {
    image: UploadedImage;
    analysis: UXAnalysis;
    onAnnotationClick: (annotationId: string) => void;
    onAnalysisComplete?: (analysis: UXAnalysis) => void;
  };
}

const AnnotationMarker: React.FC<{
  annotation: AnnotationPoint;
  onClick: () => void;
}> = ({ annotation, onClick }) => {
  const getMarkerStyle = () => {
    switch (annotation.type) {
      case 'issue':
        return 'bg-red-500 border-red-600';
      case 'suggestion':
        return 'bg-yellow-500 border-yellow-600';
      case 'success':
        return 'bg-green-500 border-green-600';
      default:
        return 'bg-blue-500 border-blue-600';
    }
  };

  const getIcon = () => {
    switch (annotation.type) {
      case 'issue':
        return <AlertTriangle className="w-3 h-3" />;
      case 'suggestion':
        return <AlertCircle className="w-3 h-3" />;
      case 'success':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  return (
    <div
      className={`
        absolute w-6 h-6 rounded-full border-2 cursor-pointer
        flex items-center justify-center text-white text-xs
        transition-all hover:scale-110 shadow-annotation
        ${getMarkerStyle()}
      `}
      style={{
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      data-annotation-id={annotation.id}
      onClick={onClick}
      title={annotation.title}
    >
      {getIcon()}
    </div>
  );
};

export const ImageNode: React.FC<ImageNodeProps> = memo(({ data }) => {
  const { image, analysis, onAnnotationClick, onAnalysisComplete } = data;
  const [isHovered, setIsHovered] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  // Calculate responsive node size based on image dimensions
  const calculateNodeSize = () => {
    const { width, height } = image.dimensions;
    
    // Handle zero or invalid dimensions
    if (!width || !height || width <= 0 || height <= 0) {
      return { width: 320, height: 240 };
    }
    
    // Calculate aspect ratio and scale to reasonable sizes
    const aspectRatio = width / height;
    const maxWidth = 400;
    const maxHeight = 300;
    const minWidth = 200;
    const minHeight = 150;
    
    let nodeWidth, nodeHeight;
    
    if (aspectRatio > 1) {
      // Landscape
      nodeWidth = Math.min(Math.max(width * 0.3, minWidth), maxWidth);
      nodeHeight = nodeWidth / aspectRatio;
    } else {
      // Portrait or square
      nodeHeight = Math.min(Math.max(height * 0.3, minHeight), maxHeight);
      nodeWidth = nodeHeight * aspectRatio;
    }
    
    return {
      width: Math.round(nodeWidth),
      height: Math.round(nodeHeight)
    };
  };
  
  const nodeSize = calculateNodeSize();

  return (
    <div 
      className="bg-card border border-border rounded-lg shadow-card overflow-hidden"
      style={{ width: nodeSize.width }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-foreground truncate">
            {image.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnalysisDialog(true)}
              className="p-1 rounded transition-colors hover:bg-accent"
              title="Analyze with AI"
            >
              <Brain className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-1 rounded transition-colors ${
                showAnnotations ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Toggle annotations"
            >
              <Info className="w-4 h-4" />
            </button>
            <div className="text-xs text-muted-foreground">
              {analysis.visualAnnotations.length} annotations
            </div>
          </div>
        </div>
        {/* Dimensions info */}
        <div className="text-xs text-muted-foreground mt-1">
          {image.dimensions.width} × {image.dimensions.height}px
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="relative bg-muted"
        style={{ height: nodeSize.height }}
      >
        {!imageLoadError ? (
          <img
            src={image.url}
            alt={image.name}
            className="w-full h-full object-cover"
            draggable={false}
            onLoad={() => setImageLoadError(false)}
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="w-8 h-8 mb-2" />
            <span className="text-sm">Failed to load image</span>
          </div>
        )}

        {/* Annotations Overlay */}
        {showAnnotations && (
          <div className="absolute inset-0">
            {analysis.visualAnnotations.map((annotation) => (
              <AnnotationMarker
                key={annotation.id}
                annotation={annotation}
                onClick={() => onAnnotationClick(annotation.id)}
              />
            ))}
          </div>
        )}

        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <button className="bg-white/90 hover:bg-white p-2 rounded-full transition-all">
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Score</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                style={{ width: `${analysis.summary?.overallScore || 0}%` }}
              />
            </div>
            <span className="font-medium">{analysis.summary?.overallScore || 'N/A'}/100</span>
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{analysis.suggestions.length} suggestions</span>
          <span>{analysis.summary.keyIssues.length} issues</span>
        </div>
      </div>

      {/* React Flow Handles */}
      <Handle type="source" position={Position.Right} className="opacity-0" />
      
      {/* AI Analysis Dialog */}
      {showAnalysisDialog && (
        <ImageAnalysisDialog
          imageId={image.id}
          imageName={image.name}
          imageUrl={image.url}
          onClose={() => setShowAnalysisDialog(false)}
          onAnalysisComplete={(newAnalysis) => {
            onAnalysisComplete?.(newAnalysis);
            setShowAnalysisDialog(false);
          }}
        />
      )}
    </div>
  );
});