import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnnotationComment } from './AnnotationComment';

interface DrawingOverlayProps {
  imageUrl: string;
  imageDimensions: { width: number; height: number };
  isDrawMode: boolean;
  onDrawingComplete: (drawingData: ImageData, bounds: { x: number; y: number; width: number; height: number }) => void;
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  imageUrl,
  imageDimensions,
  isDrawMode,
  onDrawingComplete,
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
    // Mock AI analysis for drawing region
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('AI Analysis requested for drawing region:', prompt);
        resolve();
      }, 1000);
    });
  }, []);

  const handleGenerateVariation = useCallback(async (prompt: string) => {
    // Mock AI generation for drawing region
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('AI Generation requested for drawing region:', prompt);
        resolve();
      }, 1000);
    });
  }, []);

  if (!isDrawMode && !hasDrawn) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full ${isDrawMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
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