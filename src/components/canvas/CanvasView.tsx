import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { ImageNode } from './ImageNode';
import { AnalysisCardNode } from './AnalysisCardNode';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';

const nodeTypes = {
  image: ImageNode,
  analysisCard: AnalysisCardNode,
};

interface CanvasViewProps {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  uploadedImages,
  analyses,
}) => {
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
          analysis 
        },
      };
      nodes.push(imageNode);

      // Create analysis card node if analysis exists
      if (analysis) {
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
  }, [uploadedImages, analyses]);

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

  return (
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
        className="bg-background"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted))" />
        <Controls className="bg-background border border-border" />
        <MiniMap 
          className="bg-background border border-border" 
          nodeColor="hsl(var(--primary))"
        />
      </ReactFlow>
    </div>
  );
};