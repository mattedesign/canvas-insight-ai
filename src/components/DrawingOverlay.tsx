import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnnotationComment } from './AnnotationComment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DrawingOverlayProps {
  imageUrl: string;
  imageDimensions: { width: number; height: number };
  isDrawMode: boolean;
  onDrawingComplete: (drawingData: ImageData, bounds: { x: number; y: number; width: number; height: number }) => void;
  isPanningDisabled?: boolean;
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  imageUrl,
  imageDimensions,
  isDrawMode,
  onDrawingComplete,
  isPanningDisabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [drawingBounds, setDrawingBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to match the container size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Configure drawing context
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // Semi-transparent red
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red fill
    ctx.lineWidth = 3;
  }, [isDrawMode]);

  const getMousePos = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (!isDrawMode) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    // Initialize drawing bounds
    setDrawingBounds({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }, [isDrawMode, getMousePos]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !isDrawMode) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getMousePos(e);
    
    // Draw line
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Update drawing bounds
    setDrawingBounds(prev => ({
      x: Math.min(prev.x, pos.x),
      y: Math.min(prev.y, pos.y),
      width: Math.max(prev.x + prev.width, pos.x) - Math.min(prev.x, pos.x),
      height: Math.max(prev.y + prev.height, pos.y) - Math.min(prev.y, pos.y),
    }));
  }, [isDrawing, isDrawMode, getMousePos]);

  const stopDrawing = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !isDrawMode) return;

    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Get the drawing data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Show comment dialog at the end position
    const pos = getMousePos(e);
    setCommentPosition({ x: pos.x, y: pos.y });
    setShowComment(true);

    // Call completion callback
    onDrawingComplete(imageData, drawingBounds);
  }, [isDrawing, isDrawMode, getMousePos, drawingBounds, onDrawingComplete]);

  const clearDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setShowComment(false);
  }, []);

  const handleCommentClose = useCallback(() => {
    setShowComment(false);
  }, []);

  const handleRequestAnalysis = useCallback(async (prompt: string) => {
    try {
      toast({
        title: "Analyzing region...",
        description: "AI is analyzing the marked region",
      });

      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'REGION_ANALYSIS',
          imageUrl: imageUrl,
          imageName: 'drawing-region',
          prompt: prompt,
          bounds: drawingBounds,
          action: 'analyze'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Analysis complete",
          description: data.data?.analysis?.observation || "Region analysis completed",
        });
        console.log('Analysis result:', data.data);
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze region",
        variant: "destructive",
      });
    }
  }, [imageUrl, drawingBounds, toast]);

  const handleGenerateVariation = useCallback(async (prompt: string) => {
    try {
      toast({
        title: "Generating variation...",
        description: "AI is creating a new design based on your prompt",
      });

      // Convert canvas drawing to mask data
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas not available');
      }

      // Create mask from canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Fill background with black (masked area)
        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw white where user drew (unmasked area)
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.drawImage(canvas, 0, 0);
        
        // Convert to base64
        const maskDataUrl = tempCanvas.toDataURL('image/png');
        const maskData = maskDataUrl.split(',')[1]; // Remove data:image/png;base64, prefix
        
        const { data, error } = await supabase.functions.invoke('inpainting-service', {
          body: {
            imageUrl: imageUrl,
            imageName: 'drawing-region',
            prompt: prompt,
            maskData: maskData,
            bounds: drawingBounds
          }
        });

        if (error) {
          throw error;
        }

        if (data?.success) {
          toast({
            title: "Variation generated",
            description: "New design variation created successfully",
          });
          console.log('Generated variation:', data.data);
          
          // You could emit an event here to show the generated image
          // or update the parent component with the new image
        } else {
          throw new Error(data?.data?.error || 'Generation failed');
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate variation",
        variant: "destructive",
      });
    }
  }, [imageUrl, drawingBounds, toast]);

  if (!isDrawMode && !hasDrawn) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full ${
          isDrawMode && !isPanningDisabled 
            ? 'pointer-events-auto cursor-crosshair' 
            : 'pointer-events-none'
        }`}
        style={{ 
          zIndex: isDrawMode ? 10 : 1,
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* Clear Drawing Button */}
      {hasDrawn && !showComment && (
        <button
          onClick={clearDrawing}
          className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-xs font-medium hover:bg-muted pointer-events-auto"
        >
          Clear Drawing
        </button>
      )}

      {/* Comment Dialog */}
      {showComment && (
        <AnnotationComment
          annotation={{
            id: 'drawing-annotation',
            x: commentPosition.x,
            y: commentPosition.y,
            type: 'issue',
            title: 'Drawing Region',
            description: 'Area marked for feedback or inpainting',
            severity: 'medium'
          }}
          position={{ x: commentPosition.x + 20, y: commentPosition.y - 10 }}
          onClose={handleCommentClose}
          onRequestAnalysis={handleRequestAnalysis}
          onGenerateVariation={handleGenerateVariation}
          relatedSuggestions={[]}
        />
      )}
    </div>
  );
};