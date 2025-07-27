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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis } from '@/types/ux-analysis';
import { ImageNode } from './ImageNode';
import { AnalysisCardNode } from './AnalysisCardNode';
import { ConceptImageNode } from './ConceptImageNode';
import { ConceptDetailsNode } from './ConceptDetailsNode';
import { GroupNode } from './GroupNode';
import { GroupContainerNode } from './GroupContainerNode';
import { GroupAnalysisCardNode } from './GroupAnalysisCardNode';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useMultiSelection } from '@/hooks/useMultiSelection';
import { FloatingToolbar, ToolMode } from '../FloatingToolbar';
import { useToast } from '@/hooks/use-toast';
import { AnnotationOverlayProvider, useAnnotationOverlay } from '../AnnotationOverlay';
import { GroupCreationDialog } from '../GroupCreationDialog';

import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';

const nodeTypes = {
  image: ImageNode,
  analysisCard: AnalysisCardNode,
  conceptImage: ConceptImageNode,
  conceptDetails: ConceptDetailsNode,
  group: GroupNode,
  groupContainer: GroupContainerNode,
  groupAnalysisCard: GroupAnalysisCardNode,
};

interface CanvasViewProps {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  generatedConcepts: GeneratedConcept[];
  imageGroups?: ImageGroup[];
  groupAnalyses?: GroupAnalysis[];
  groupDisplayModes?: Record<string, 'standard' | 'stacked'>;
  showAnnotations: boolean;
  onToggleAnnotations?: () => void;
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onImageSelect?: (imageId: string) => void;
  onGenerateConcept?: (analysisId: string) => Promise<void>;
  onCreateGroup?: (name: string, description: string, color: string, imageIds: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onGroupDisplayModeChange?: (groupId: string, mode: 'standard' | 'stacked') => void;
  isGeneratingConcept?: boolean;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  uploadedImages,
  analyses,
  generatedConcepts,
  imageGroups = [],
  groupAnalyses = [],
  groupDisplayModes = {},
  showAnnotations,
  onToggleAnnotations,
  onViewChange,
  onImageSelect,
  onGenerateConcept,
  onCreateGroup,
  onUngroup,
  onDeleteGroup,
  onGroupDisplayModeChange,
  isGeneratingConcept
}) => {
  const [currentTool, setCurrentTool] = useState<ToolMode>('cursor');
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const { toast } = useToast();
  const multiSelection = useMultiSelection();
  const isMobile = useIsMobile();

  // Stable callback references
  const stableCallbacks = useMemo(() => ({
    onToggleSelection: multiSelection.toggleSelection,
    isSelected: multiSelection.isSelected,
    onViewChange,
    onImageSelect,
    onGenerateConcept
  }), [multiSelection.toggleSelection, multiSelection.isSelected, onViewChange, onImageSelect, onGenerateConcept]);

  // Group management handlers
  const handleDeleteGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    toast({
      description: "Group deleted successfully",
    });
  }, [toast]);

  const handleViewGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      multiSelection.selectMultiple(group.imageIds);
      toast({
        description: `Viewing group "${group.name}"`,
      });
    }
  }, [groups, multiSelection.selectMultiple, toast]);

  const handleAnalyzeGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      toast({
        title: "Group Analysis",
        description: `Analyzing patterns across ${group.imageIds.length} images in "${group.name}"`,
      });
    }
  }, [groups, toast]);

  // Generate initial nodes and edges
  const initialElements = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let yOffset = 0;
    const horizontalSpacing = 100;
    const minVerticalSpacing = 150;
    const groupedImageIds = new Set(imageGroups.flatMap(group => group.imageIds));

    // Process ungrouped images first
    const ungroupedImages = uploadedImages.filter(image => !groupedImageIds.has(image.id));
    
    ungroupedImages.forEach((image, index) => {
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
          currentTool,
          onViewChange: stableCallbacks.onViewChange,
          onImageSelect: stableCallbacks.onImageSelect,
          onToggleSelection: stableCallbacks.onToggleSelection,
          isSelected: stableCallbacks.isSelected(image.id)
        },
      };
      nodes.push(imageNode);

      let rightmostXPosition = 50 + displayWidth + horizontalSpacing;

      // Create analysis card node if analysis exists and showAnalysis is true
      if (analysis && showAnalysis) {
        const cardXPosition = rightmostXPosition;
        const cardNode: Node = {
          id: `card-${analysis.id}`,
          type: 'analysisCard',
          position: { x: cardXPosition, y: yOffset },
          data: { 
            analysis,
            onGenerateConcept: stableCallbacks.onGenerateConcept,
            isGeneratingConcept
          },
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

        rightmostXPosition += 400 + horizontalSpacing; // Card width + spacing

        // Add concept nodes for this analysis
        const conceptsForAnalysis = generatedConcepts.filter(c => c.analysisId === analysis.id);
        let currentConceptXPosition = rightmostXPosition;
        
        conceptsForAnalysis.forEach((concept, conceptIndex) => {
          // Create concept image node (artboard)
          const conceptImageNode: Node = {
            id: `concept-image-${concept.id}`,
            type: 'conceptImage',
            position: { x: currentConceptXPosition, y: yOffset },
            data: { concept },
          };
          nodes.push(conceptImageNode);

          // Create concept details node (positioned to the right of image)
          const conceptDetailsXPosition = currentConceptXPosition + 400 + horizontalSpacing;
          const conceptDetailsNode: Node = {
            id: `concept-details-${concept.id}`,
            type: 'conceptDetails',
            position: { x: conceptDetailsXPosition, y: yOffset },
            data: { concept },
          };
          nodes.push(conceptDetailsNode);

          // Create edge connecting analysis card to concept image
          const conceptImageEdge: Edge = {
            id: `edge-${analysis.id}-${concept.id}-image`,
            source: `card-${analysis.id}`,
            target: `concept-image-${concept.id}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))' },
          };
          edges.push(conceptImageEdge);

          // Create edge connecting concept image to concept details
          const conceptDetailsEdge: Edge = {
            id: `edge-${concept.id}-image-details`,
            source: `concept-image-${concept.id}`,
            target: `concept-details-${concept.id}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))' },
          };
          edges.push(conceptDetailsEdge);

          // Update position for next concept (if any)
          currentConceptXPosition = conceptDetailsXPosition + 400 + horizontalSpacing;
        });
      }

      // Calculate spacing for next image based on current image height
      const nextSpacing = Math.max(displayHeight + minVerticalSpacing, 400);
      yOffset += nextSpacing;
    });

    // Process image groups with containers and individual analysis cards
    imageGroups.forEach((group, groupIndex) => {
      const groupImages = uploadedImages.filter(img => group.imageIds.includes(img.id));
      const displayMode = groupDisplayModes[group.id] || 'standard';
      
      // Calculate container dimensions based on display mode
      let containerWidth = 0;
      let containerHeight = 0;
      const padding = 32;
      const imageSpacing = 20;
      const analysisSpacing = 100;
      
      if (displayMode === 'standard') {
        // Horizontal layout: images side by side with their analysis cards to the right
        let currentX = padding;
        let maxHeight = 0;
        
        groupImages.forEach((image, imageIndex) => {
          const maxDisplayHeight = Math.min(image.dimensions.height, 250);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 300);
          const displayHeight = maxDisplayHeight;
          
          maxHeight = Math.max(maxHeight, displayHeight);
          currentX += displayWidth + 320 + imageSpacing; // Include analysis card width
        });
        
        containerWidth = Math.max(currentX + padding - imageSpacing, 400);
        containerHeight = maxHeight + padding * 2 + 60;
      } else {
        // Stacked layout: images vertically with analysis cards to the right
        let maxWidth = 0;
        let totalHeight = padding + 60; // Header space
        
        groupImages.forEach((image, imageIndex) => {
          const maxDisplayHeight = Math.min(image.dimensions.height, 200);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 250);
          const displayHeight = maxDisplayHeight;
          
          maxWidth = Math.max(maxWidth, displayWidth + 320 + imageSpacing); // Include analysis card
          totalHeight += displayHeight + imageSpacing;
        });
        
        containerWidth = Math.max(maxWidth + padding * 2, 400);
        containerHeight = totalHeight + padding;
      }
      
      // Create group container node
      const containerNode: Node = {
        id: `group-container-${group.id}`,
        type: 'groupContainer',
        position: { x: 50, y: yOffset },
        draggable: true,
        style: { 
          width: containerWidth,
          height: containerHeight,
        },
        data: {
          group,
          displayMode,
          onUngroup,
          onDeleteGroup,
          onDisplayModeChange: onGroupDisplayModeChange,
        },
      };
      nodes.push(containerNode);
      
      // Position images and their individual analysis cards inside the container
      if (displayMode === 'standard') {
        let currentX = padding;
        groupImages.forEach((image, imageIndex) => {
          const analysis = analyses.find(a => a.imageId === image.id);
          const maxDisplayHeight = Math.min(image.dimensions.height, 250);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 300);
          
          // Image node
          const imageNode: Node = {
            id: `image-${image.id}`,
            type: 'image',
            position: { x: currentX, y: padding + 60 },
            parentId: `group-container-${group.id}`,
            extent: 'parent',
            data: { 
              image,
              analysis,
              showAnnotations,
              currentTool,
              onViewChange: stableCallbacks.onViewChange,
              onImageSelect: stableCallbacks.onImageSelect,
              onToggleSelection: stableCallbacks.onToggleSelection,
              isSelected: stableCallbacks.isSelected(image.id)
            },
          };
          nodes.push(imageNode);
          
          // Individual analysis card for this image
          if (analysis && showAnalysis) {
            const analysisNode: Node = {
              id: `group-image-analysis-${image.id}`,
              type: 'analysisCard',
              position: { x: currentX + displayWidth + 20, y: padding + 60 },
              parentId: `group-container-${group.id}`,
              extent: 'parent',
              data: { 
                analysis,
                onGenerateConcept: stableCallbacks.onGenerateConcept,
                isGeneratingConcept
              },
            };
            nodes.push(analysisNode);
            
            // Create edge connecting image to its analysis
            const edge: Edge = {
              id: `edge-group-image-${image.id}-analysis`,
              source: `image-${image.id}`,
              target: `group-image-analysis-${image.id}`,
              type: 'smoothstep',
              animated: true,
              style: { stroke: 'hsl(var(--primary))' },
            };
            edges.push(edge);
          }
          
          currentX += displayWidth + 320 + imageSpacing;
        });
      } else {
        // Stacked layout
        let currentY = padding + 60;
        groupImages.forEach((image, imageIndex) => {
          const analysis = analyses.find(a => a.imageId === image.id);
          const maxDisplayHeight = Math.min(image.dimensions.height, 200);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 250);
          const displayHeight = maxDisplayHeight;
          
          // Image node
          const imageNode: Node = {
            id: `image-${image.id}`,
            type: 'image',
            position: { x: padding, y: currentY },
            parentId: `group-container-${group.id}`,
            extent: 'parent',
            data: { 
              image,
              analysis,
              showAnnotations,
              currentTool,
              onViewChange: stableCallbacks.onViewChange,
              onImageSelect: stableCallbacks.onImageSelect,
              onToggleSelection: stableCallbacks.onToggleSelection,
              isSelected: stableCallbacks.isSelected(image.id)
            },
          };
          nodes.push(imageNode);
          
          // Individual analysis card for this image
          if (analysis && showAnalysis) {
            const analysisNode: Node = {
              id: `group-image-analysis-${image.id}`,
              type: 'analysisCard',
              position: { x: padding + displayWidth + 20, y: currentY },
              parentId: `group-container-${group.id}`,
              extent: 'parent',
              data: { 
                analysis,
                onGenerateConcept: stableCallbacks.onGenerateConcept,
                isGeneratingConcept
              },
            };
            nodes.push(analysisNode);
            
            // Create edge connecting image to its analysis
            const edge: Edge = {
              id: `edge-group-image-${image.id}-analysis`,
              source: `image-${image.id}`,
              target: `group-image-analysis-${image.id}`,
              type: 'smoothstep',
              animated: true,
              style: { stroke: 'hsl(var(--primary))' },
            };
            edges.push(edge);
          }
          
          currentY += displayHeight + imageSpacing;
        });
      }
      
      // Create group-level analysis card (positioned outside the container)
      const groupAnalysis = groupAnalyses.find(ga => ga.groupId === group.id);
      if (groupAnalysis) {
        const analysisCardNode: Node = {
          id: `group-analysis-${group.id}`,
          type: 'groupAnalysisCard',
          position: { x: 50 + containerWidth + 100, y: yOffset },
          data: {
            analysis: groupAnalysis,
            groupName: group.name,
            onViewDetails: (analysisId: string) => {
              toast({
                title: "Group Analysis Details",
                description: `Viewing detailed analysis for group "${group.name}"`,
              });
            },
          },
        };
        nodes.push(analysisCardNode);
        
        // Create edge connecting container to group analysis card
        const edge: Edge = {
          id: `edge-group-${group.id}-analysis`,
          source: `group-container-${group.id}`,
          sourceHandle: 'analysis',
          target: `group-analysis-${group.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
        };
        edges.push(edge);
      }
      
      yOffset += containerHeight + 100; // Space between groups
    });

    return { nodes, edges };
  }, [uploadedImages, analyses, generatedConcepts, imageGroups, groupAnalyses, groupDisplayModes, showAnnotations, showAnalysis, currentTool, isGeneratingConcept, onGroupDisplayModeChange, groups, handleViewGroup, handleAnalyzeGroup, handleDeleteGroup, stableCallbacks, toast]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    setIsUpdating,
  } = useUndoRedo([], []);

  // Single consolidated effect to manage all node state updates
  useEffect(() => {
    setIsUpdating(true);
    
    // Update nodes and edges based on latest computed elements
    setNodes(initialElements.nodes);
    setEdges(initialElements.edges);
    
    // Save to history
    saveState(initialElements.nodes, initialElements.edges);
    
    // Clean up updating flag
    const cleanup = () => setIsUpdating(false);
    const timeoutId = setTimeout(cleanup, 0);
    
    return () => clearTimeout(timeoutId);
  }, [initialElements.nodes, initialElements.edges, setNodes, setEdges, saveState, setIsUpdating]);

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
      cursor: isMobile ? 'Cursor tool - Select artboards (dragging disabled on mobile)' : 'Cursor tool - Select and move artboards',
      draw: 'Draw tool - Paint regions for inpainting feedback'
    };
    toast({
      description: toolMessages[tool],
    });
  }, [toast, isMobile]);

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

  const handleCreateGroup = useCallback(() => {
    if (multiSelection.state.selectedIds.length < 2) {
      toast({
        title: "Select Multiple Images",
        description: "Please select at least 2 images to create a group",
        variant: "destructive"
      });
      return;
    }
    setIsGroupDialogOpen(true);
  }, [multiSelection.state.selectedIds.length, toast]);

  const handleGroupCreation = useCallback((name: string, description: string, color: string) => {
    onCreateGroup?.(name, description, color, multiSelection.state.selectedIds);
    multiSelection.clearSelection();
    setIsGroupDialogOpen(false);
    
    toast({
      title: "Group Created",
      description: `Successfully created group "${name}" with ${multiSelection.state.selectedIds.length} images`,
    });
  }, [onCreateGroup, multiSelection, toast]);



  return (
    <AnnotationOverlayProvider>
      <CanvasContent 
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        currentTool={currentTool}
        showAnnotations={showAnnotations}
        showAnalysis={showAnalysis}
        isMobile={isMobile}
        handleToolChange={handleToolChange}
        handleToggleAnnotations={handleToggleAnnotations}
        handleToggleAnalysis={handleToggleAnalysis}
        handleAddComment={handleAddComment}
        handleCreateGroup={handleCreateGroup}
        multiSelection={multiSelection}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        setNodes={setNodes}
        setEdges={setEdges}
        setIsUpdating={setIsUpdating}
        isGroupDialogOpen={isGroupDialogOpen}
        setIsGroupDialogOpen={setIsGroupDialogOpen}
        handleGroupCreation={handleGroupCreation}
        uploadedImages={uploadedImages}
      />
    </AnnotationOverlayProvider>
  );
};

// Separate component to access useAnnotationOverlay hook
const CanvasContent: React.FC<any> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  currentTool,
  showAnnotations,
  showAnalysis,
  isMobile,
  handleToolChange,
  handleToggleAnnotations,
  handleToggleAnalysis,
  handleAddComment,
  handleCreateGroup,
  multiSelection,
  undo,
  redo,
  canUndo,
  canRedo,
  setNodes,
  setEdges,
  setIsUpdating,
  isGroupDialogOpen,
  setIsGroupDialogOpen,
  handleGroupCreation,
  uploadedImages,
}) => {
  const { activeAnnotation } = useAnnotationOverlay();
  const isPanningDisabled = !!activeAnnotation;
  
  // Disable node dragging on mobile/tablet screens (768px and under)
  const isNodeDraggingEnabled = currentTool === 'cursor' && !isPanningDisabled && !isMobile;

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

      {/* Visual feedback when panning is disabled */}
      {isPanningDisabled && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-muted/90 backdrop-blur-sm text-muted-foreground text-xs px-3 py-1 rounded-md border">
          Pan disabled - Close annotation to enable
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        panOnDrag={!isPanningDisabled} // Disable panning when annotation is active
        panOnScroll={!isPanningDisabled} // Also disable pan on scroll
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={currentTool !== 'draw'}
        selectionOnDrag={isNodeDraggingEnabled}
        nodesDraggable={isNodeDraggingEnabled}
        nodesConnectable={currentTool === 'cursor'}
        elementsSelectable={currentTool === 'cursor'}
        className={`bg-background tool-${currentTool} ${isPanningDisabled ? 'annotation-active' : ''} ${isMobile ? 'mobile-view' : ''}`}
        proOptions={{ hideAttribution: true }}
        zoomActivationKeyCode={['Meta', 'Control']}
      >
        
        <Background color="hsl(var(--muted))" />
        {/* Custom controls are now in FloatingToolbar */}
        
        {/* Floating Toolbar - Must be inside ReactFlow for useReactFlow hook */}
        <FloatingToolbar
          onToolChange={handleToolChange}
          onToggleAnnotations={handleToggleAnnotations}
          onToggleAnalysis={handleToggleAnalysis}
          onAddComment={handleAddComment}
          onCreateGroup={handleCreateGroup}
          showAnnotations={showAnnotations}
          showAnalysis={showAnalysis}
          currentTool={currentTool}
          hasMultiSelection={multiSelection.state.isMultiSelectMode}
        />
      </ReactFlow>
      
      {/* Group Creation Dialog */}
      <GroupCreationDialog
        isOpen={isGroupDialogOpen}
        onClose={() => setIsGroupDialogOpen(false)}
        onCreateGroup={handleGroupCreation}
        selectedImages={uploadedImages.filter(img => multiSelection.state.selectedIds.includes(img.id))}
      />
    </div>
  );
};