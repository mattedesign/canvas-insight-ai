import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { ImageNode } from './ImageNode';
import { AnalysisCardNode } from './AnalysisCardNode';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { FloatingToolbar, ToolMode } from '../FloatingToolbar';
import { useToast } from '@/hooks/use-toast';
import { AnnotationOverlayProvider } from '../AnnotationOverlay';

import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';

const nodeTypes = {
  image: ImageNode,
  analysisCard: AnalysisCardNode,
};

interface CanvasViewProps {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  showAnnotations: boolean;
  onToggleAnnotations?: () => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  uploadedImages,
  analyses,
  showAnnotations,
  onToggleAnnotations,
}) => {
  const [currentTool, setCurrentTool] = useState<ToolMode>('hand');
  const [showAnalysis, setShowAnalysis] = useState(true);
  const { toast } = useToast();
  // Generate initial nodes and edges
  const initialElements = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let yOffset = 0;
    const horizontalSpacing = 100;
    const minVerticalSpacing = 150;

    uploadedImages.forEach((image, index) => {
      const analysis = analyses.find(a => a.imageId === image.id);
      
      // Calculate image display dimensions (considering max-height: 80vh constraint)
      const maxDisplayHeight = Math.min(image.dimensions.height, window.innerHeight * 0.8);
      const scaleFactor = maxDisplayHeight / image.dimensions.height;
      const displayWidth = Math.min(image.dimensions.width * scaleFactor, 800); // max-width constraint
      const displayHeight = maxDisplayHeight;
      
      // Create image node
      const imageNode: Node = {
        id: `image-${image.id}`,
        type: 'image',
        position: { x: 50, y: yOffset },
        data: { 
          image,
          analysis,
          showAnnotations,
          currentTool
        },
      };
      nodes.push(imageNode);

      // Create analysis card node if analysis exists and showAnalysis is true
      if (analysis && showAnalysis) {
        const cardXPosition = 50 + displayWidth + horizontalSpacing;
        const cardNode: Node = {
          id: `card-${analysis.id}`,
          type: 'analysisCard',
          position: { x: cardXPosition, y: yOffset },
          data: { analysis },
        };
        nodes.push(cardNode);

        // Create edge connecting image to analysis card
        const edge: Edge = {
          id: `edge-${image.id}-${analysis.id}`,
          source: `image-${image.id}`,
          target: `card-${analysis.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'hsl(var(--primary))' },
        };
        edges.push(edge);
      }

      // Calculate spacing for next image based on current image height
      const nextSpacing = Math.max(displayHeight + minVerticalSpacing, 400);
      yOffset += nextSpacing;
    });

    return { nodes, edges };
  }, [uploadedImages, analyses, showAnnotations, showAnalysis, currentTool]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialElements.edges);
  

  const {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    setIsUpdating,
  } = useUndoRedo(initialElements.nodes, initialElements.edges);

  // Save state when nodes or edges change
  useEffect(() => {
    saveState(nodes, edges);
  }, [nodes, edges, saveState]);

  // Update nodes when annotations toggle
  useEffect(() => {
    setNodes(initialElements.nodes);
    setEdges(initialElements.edges);
  }, [initialElements.nodes, initialElements.edges, setNodes, setEdges]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        const previousState = undo();
        if (previousState) {
          setIsUpdating(true);
          setNodes(previousState.nodes);
          setEdges(previousState.edges);
          setTimeout(() => setIsUpdating(false), 0);
        }
      } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        const nextState = redo();
        if (nextState) {
          setIsUpdating(true);
          setNodes(nextState.nodes);
          setEdges(nextState.edges);
          setTimeout(() => setIsUpdating(false), 0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setNodes, setEdges, setIsUpdating]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleToolChange = useCallback((tool: ToolMode) => {
    setCurrentTool(tool);
    const toolMessages = {
      hand: 'Hand/Move tool - Pan around the canvas',
      cursor: 'Cursor tool - Select and move artboards',
      draw: 'Draw tool - Paint regions for inpainting feedback'
    };
    toast({
      description: toolMessages[tool],
    });
  }, [toast]);

  const handleToggleAnnotations = useCallback(() => {
    onToggleAnnotations?.();
    toast({
      description: `Annotations ${showAnnotations ? 'hidden' : 'shown'}`,
    });
  }, [onToggleAnnotations, showAnnotations, toast]);

  const handleToggleAnalysis = useCallback(() => {
    setShowAnalysis(prev => !prev);
    toast({
      description: `Analysis ${showAnalysis ? 'hidden' : 'shown'}`,
    });
  }, [showAnalysis, toast]);

  const handleAddComment = useCallback(() => {
    toast({
      title: "Add Comment Mode",
      description: "Click on an artboard to add a new annotation",
    });
  }, [toast]);


  return (
    <AnnotationOverlayProvider>
      <div className="h-full w-full bg-background relative">
      {/* Undo/Redo Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            const previousState = undo();
            if (previousState) {
              setIsUpdating(true);
              setNodes(previousState.nodes);
              setEdges(previousState.edges);
              setTimeout(() => setIsUpdating(false), 0);
            }
          }}
          disabled={!canUndo}
          className="bg-background/90 backdrop-blur-sm"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            const nextState = redo();
            if (nextState) {
              setIsUpdating(true);
              setNodes(nextState.nodes);
              setEdges(nextState.edges);
              setTimeout(() => setIsUpdating(false), 0);
            }
          }}
          disabled={!canRedo}
          className="bg-background/90 backdrop-blur-sm"
          title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        panOnDrag={currentTool === 'hand'}
        panOnScroll={currentTool === 'hand'}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={currentTool !== 'draw'}
        selectionOnDrag={currentTool === 'cursor'}
        className={`bg-background tool-${currentTool}`}
        proOptions={{ hideAttribution: true }}
      >
        
        <Background color="hsl(var(--muted))" />
        {/* Custom controls are now in FloatingToolbar */}
        
        {/* Floating Toolbar - Must be inside ReactFlow for useReactFlow hook */}
        <FloatingToolbar
          onToolChange={handleToolChange}
          onToggleAnnotations={handleToggleAnnotations}
          onToggleAnalysis={handleToggleAnalysis}
          onAddComment={handleAddComment}
          showAnnotations={showAnnotations}
          showAnalysis={showAnalysis}
          currentTool={currentTool}
        />
      </ReactFlow>
      </div>
    </AnnotationOverlayProvider>
  );
};