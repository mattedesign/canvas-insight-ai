import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup } from '@/types/ux-analysis';
import { getSafeDimensions } from '@/utils/imageUtils';
import { 
  calculateProfessionalLayout, 
  calculateResponsiveCanvasLayout,
  convertLayoutToCanvasPositions,
  getOptimalImageDimensions,
  ENHANCED_LAYOUT_CONFIG
} from '@/utils/canvasLayoutUtils';

// Import canvas node components directly
import { ImageNode } from './ImageNode';
import { AnalysisCardNode } from './AnalysisCardNode';
import { AnalysisRequestNode } from './AnalysisRequestNode';
import { ConceptImageNode } from './ConceptImageNode';
import { ConceptDetailsNode } from './ConceptDetailsNode';
import { GroupContainerNode } from './GroupContainerNode';
import { GroupAnalysisCardNode } from './GroupAnalysisCardNode';
import { GroupPromptCollectionNode } from './GroupPromptCollectionNode';
import { GroupAnalysisResultsNode } from './GroupAnalysisResultsNode';
import { EnhancedGroupAnalysisNode } from './EnhancedGroupAnalysisNode';
import { ImageLoadingNode } from './ImageLoadingNode';
import { AnalysisLoadingNode } from './AnalysisLoadingNode';
import { AnnotationNode } from './AnnotationNode';

const nodeTypes = {
  image: ImageNode,
  analysisCard: AnalysisCardNode,
  analysisRequest: AnalysisRequestNode,
  conceptImage: ConceptImageNode,
  conceptDetails: ConceptDetailsNode,
  group: GroupContainerNode,
  groupAnalysisCard: GroupAnalysisCardNode,
  groupPromptCollection: GroupPromptCollectionNode,
  groupAnalysisResults: GroupAnalysisResultsNode,
  enhancedGroupAnalysis: EnhancedGroupAnalysisNode,
  imageLoading: ImageLoadingNode,
  analysisLoading: AnalysisLoadingNode,
  annotation: AnnotationNode,
};

export interface DirectCanvasViewProps {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  generatedConcepts: GeneratedConcept[];
  imageGroups?: ImageGroup[];
  showAnnotations: boolean;
  onToggleAnnotations?: () => void;
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onImageSelect?: (imageId: string) => void;
  onGenerateConcept?: (analysisId: string) => Promise<void>;
  onOpenAnalysisPanel?: (analysisId: string) => void;
  onAnalysisComplete?: (imageId: string, analysis: UXAnalysis) => void;
  onImageUpload?: (files: File[]) => void;
  isGeneratingConcept?: boolean;
}

export const DirectCanvasView: React.FC<DirectCanvasViewProps> = ({
  uploadedImages = [],
  analyses = [],
  generatedConcepts = [],
  imageGroups = [],
  showAnnotations,
  onToggleAnnotations,
  onViewChange,
  onImageSelect,
  onGenerateConcept,
  onOpenAnalysisPanel,
  onAnalysisComplete,
  onImageUpload,
  isGeneratingConcept
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 1400, height: 1000 });
  
  const isMobile = useIsMobile();

  // Calculate simple layout for uploaded images
  const calculateSimpleLayout = useCallback(() => {
    if (uploadedImages.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const spacing = 50;
    const imageWidth = 300;
    const imageHeight = 200;
    const imagesPerRow = Math.floor(viewportDimensions.width / (imageWidth + spacing));
    
    uploadedImages.forEach((image, index) => {
      const row = Math.floor(index / imagesPerRow);
      const col = index % imagesPerRow;
      
      const x = col * (imageWidth + spacing) + 50;
      const y = row * (imageHeight + spacing) + 50;
      
      const imageAnalysis = analyses.find(a => a.imageId === image.id);
      
      // Image node
      nodes.push({
        id: `image-${image.id}`,
        type: 'image',
        position: { x, y },
        data: {
          image,
          analysis: imageAnalysis,
          showAnnotations,
          onViewChange,
          onImageSelect,
          onAnalysisComplete,
        },
        style: { width: imageWidth, height: imageHeight }
      });

      // Add analysis card if analysis exists
      if (imageAnalysis) {
        nodes.push({
          id: `analysis-${imageAnalysis.id}`,
          type: 'analysisCard',
          position: { x: x + imageWidth + 20, y },
          data: {
            analysis: imageAnalysis,
            onExpand: (analysisId: string) => onOpenAnalysisPanel?.(analysisId),
            onGenerateConcept: () => onGenerateConcept?.(imageAnalysis.id)
          }
        });

        // Connect image to analysis
        edges.push({
          id: `edge-${image.id}-${imageAnalysis.id}`,
          source: `image-${image.id}`,
          target: `analysis-${imageAnalysis.id}`,
          type: 'default',
          style: { stroke: '#e2e8f0' }
        });
      }
    });

    return { nodes, edges };
  }, [uploadedImages, analyses, viewportDimensions, showAnnotations, onViewChange, onImageSelect, onAnalysisComplete, onOpenAnalysisPanel, onGenerateConcept]);

  // Update layout when data changes
  useEffect(() => {
    const layout = calculateSimpleLayout();
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [calculateSimpleLayout]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="top-right"
        style={{ backgroundColor: "#F7F9FB" }}
      >
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
};