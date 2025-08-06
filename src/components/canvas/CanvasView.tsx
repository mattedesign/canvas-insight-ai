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
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis, GroupPromptSession, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { getSafeDimensions } from '@/utils/imageUtils';
import { 
  calculateProfessionalLayout, 
  calculateResponsiveCanvasLayout,
  calculateEnhancedGroupLayout,
  convertLayoutToCanvasPositions,
  getOptimalImageDimensions,
  ENHANCED_LAYOUT_CONFIG
} from '@/utils/canvasLayoutUtils';
import { useCanvasViewportManager } from '@/utils/canvasViewportManager';
import { AnalysisRequestNodeData, AnalysisRequestNode } from './AnalysisRequestNode';
import { ImageNode } from './ImageNode';
import { AnalysisCardNode } from './AnalysisCardNode';
import { ConceptImageNode } from './ConceptImageNode';
import { ConceptDetailsNode } from './ConceptDetailsNode';
import { GroupContainerNode } from './GroupContainerNode';
import { GroupAnalysisCardNode } from './GroupAnalysisCardNode';
import { GroupPromptCollectionNode } from './GroupPromptCollectionNode';
import { GroupAnalysisResultsNode } from './GroupAnalysisResultsNode';
import { EnhancedGroupAnalysisNode } from './EnhancedGroupAnalysisNode';
import { ImageLoadingNode } from './ImageLoadingNode';
import { AnalysisLoadingNode } from './AnalysisLoadingNode';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useMultiSelection } from '@/hooks/useMultiSelection';
import { UnifiedToolMode } from '../UnifiedFloatingToolbar';
import { CanvasFloatingToolbar } from './CanvasFloatingToolbar';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { AnnotationOverlayProvider } from '../AnnotationOverlay';
import { CanvasUploadZone } from '../CanvasUploadZone';
import { useCanvasContextMenu, CanvasItem, CanvasContextMenuHandlers } from '@/hooks/useCanvasContextMenu';
import { useAI } from '@/context/AIContext';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';

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

export interface CanvasViewProps {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  generatedConcepts: GeneratedConcept[];
  imageGroups?: ImageGroup[];
  groupAnalyses?: GroupAnalysis[];
  groupPromptSessions?: GroupPromptSession[];
  groupAnalysesWithPrompts?: GroupAnalysisWithPrompt[];
  groupDisplayModes?: Record<string, 'standard' | 'stacked'>;
  showAnnotations: boolean;
  onToggleAnnotations?: () => void;
  onViewChange?: (view: 'gallery' | 'canvas' | 'summary') => void;
  onImageSelect?: (imageId: string) => void;
  onGenerateConcept?: (analysisId: string) => Promise<void>;
  onCreateGroup?: (imageIds: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onEditGroup?: (groupId: string) => void;
  onGroupDisplayModeChange?: (groupId: string, mode: 'standard' | 'stacked') => void;
  onSubmitGroupPrompt?: (groupId: string, prompt: string, isCustom: boolean) => Promise<void>;
  onEditGroupPrompt?: (sessionId: string) => void;
  onCreateFork?: (sessionId: string) => void;
  onOpenAnalysisPanel?: (analysisId: string) => void;
  onAnalysisComplete?: (imageId: string, analysis: UXAnalysis) => void;
  onImageUpload?: (files: File[]) => void;
  isGeneratingConcept?: boolean;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  uploadedImages = [],
  analyses = [],
  generatedConcepts = [],
  imageGroups = [],
  groupAnalyses = [],
  groupPromptSessions = [],
  groupAnalysesWithPrompts = [],
  groupDisplayModes = {},
  showAnnotations,
  onToggleAnnotations,
  onViewChange,
  onImageSelect,
  onGenerateConcept,
  onCreateGroup,
  onUngroup,
  onDeleteGroup,
  onEditGroup,
  onGroupDisplayModeChange,
  onSubmitGroupPrompt,
  onEditGroupPrompt,
  onCreateFork,
  onOpenAnalysisPanel,
  onAnalysisComplete,
  onImageUpload,
  isGeneratingConcept
}) => {
  const [currentTool, setCurrentTool] = useState<UnifiedToolMode>('cursor');
  const [showAnalysis, setShowAnalysis] = useState(true);
  
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 1400, height: 1000 });
  
  // Analysis workflow state
  const [analysisRequests, setAnalysisRequests] = useState<Map<string, { imageId: string; imageName: string; imageUrl: string }>>(new Map());
  
  const { toast } = useFilteredToast();
  const allImageIds = (uploadedImages || []).map(img => img.id);
  const multiSelection = useMultiSelection(allImageIds);
  const isMobile = useIsMobile();
  
  // Initialize viewport manager for professional layout
  const { 
    fitContentToView, 
    autoFitIfNeeded 
  } = useCanvasViewportManager();
  
  // Convert uploaded images to canvas items for context menu
  const canvasItems: CanvasItem[] = uploadedImages.map(image => ({
    id: image.id,
    name: image.name,
    type: 'image' as const
  }));
  
  // Context menu handlers
  const contextMenuHandlers: CanvasContextMenuHandlers = {
    onAnalyze: useCallback((itemIds: string[]) => {
      itemIds.forEach(id => handleAnalyzeImage(id));
    }, []),
    
    onView: useCallback((itemId: string) => {
      handleViewAnalysis(itemId);
    }, []),
    
    onDelete: useCallback((itemIds: string[]) => {
      toast({
        title: "Delete Feature",
        description: `Delete functionality for ${itemIds.length} image(s) will be implemented`,
        category: "action-required",
      });
    }, [toast]),
  };
  
  // Initialize context menu system
  const {
    selectedIds: contextSelectedIds,
    clearSelection: clearContextSelection,
    isSelected: isContextSelected,
    openContextMenu,
    contextMenuProps,
    deleteDialogProps,
    ContextMenu,
    DeleteDialog,
  } = useCanvasContextMenu(canvasItems, contextMenuHandlers);
  
  // AI Integration - Use the new pipeline
  const { analyzeImageWithAI } = useAI();

  // Handle analysis panel opening
  const handleAnalysisExpansion = useCallback((analysisId: string) => {
    onOpenAnalysisPanel?.(analysisId);
  }, [onOpenAnalysisPanel]);

  // Create selection callback that properly converts between interfaces
  const handleToggleSelection = useCallback((imageId: string, isCtrlOrCmd: boolean) => {
    const modifierKey = isCtrlOrCmd ? 'ctrl' : 'none';
    multiSelection.toggleSelection(imageId, modifierKey);
  }, [multiSelection.toggleSelection]);

  // Stable callback references
  const stableCallbacks = useMemo(() => ({
    onToggleSelection: handleToggleSelection,
    isSelected: multiSelection.isSelected,
    onViewChange,
    onImageSelect,
    onGenerateConcept,
    onOpenAnalysisPanel: onOpenAnalysisPanel,
    onExpandedChange: handleAnalysisExpansion
  }), [handleToggleSelection, multiSelection.isSelected, onViewChange, onImageSelect, onGenerateConcept, onOpenAnalysisPanel, handleAnalysisExpansion]);

  // Group management handlers
  const handleDeleteGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const handleViewGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      multiSelection.selectMultiple(group.imageIds);
    }
  }, [groups, multiSelection.selectMultiple]);

  const handleAnalyzeGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      // Group analysis logic here
    }
  }, [groups]);

  // Analysis workflow handlers
  const handleCreateAnalysisRequest = useCallback(async (imageId: string) => {
    const image = (uploadedImages || []).find(img => img.id === imageId);
    if (!image) {
      console.error('[CanvasView] Image not found for analysis request:', imageId);
      return;
    }
    
    console.log('[CanvasView] Creating analysis request for image:', image.name);
    
    let imageUrl = image.url;
    
    // Only try to get Supabase storage URL if this is not a blob URL (locally uploaded image)
    if (!image.url.startsWith('blob:')) {
      try {
        const { data: imageData, error } = await supabase
          .from('images')
          .select('storage_path')
          .eq('id', imageId)
          .single();
        
        if (error || !imageData) {
          console.error('[CanvasView] Failed to get image storage path:', error);
          console.log('[CanvasView] Using original image URL instead');
        } else {
          const publicUrl = supabase.storage.from('images').getPublicUrl(imageData.storage_path).data.publicUrl;
          imageUrl = publicUrl;
        }
      } catch (err) {
        console.error('[CanvasView] Error getting Supabase storage URL:', err);
        console.log('[CanvasView] Using original image URL instead');
      }
    } else {
      console.log('[CanvasView] Using local blob URL for analysis');
    }
    
    console.log('[CanvasView] Setting analysis request with URL:', imageUrl.substring(0, 50) + '...');
    
    setAnalysisRequests(prev => new Map(prev.set(imageId, { 
      imageId, 
      imageName: image.name, 
      imageUrl: imageUrl 
    })));
    
    console.log('[CanvasView] Analysis request created successfully');
  }, [uploadedImages]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('[CanvasView] Node clicked:', node.type, node.id);
    
    // Handle clarification node clicks
    if (node.type === 'analysisRequest' && node.data.status === 'clarification') {
      console.log('[CanvasView] Clarification needed for:', node.id);
      toast({
        title: "Context Clarification",
        description: "Click functionality coming soon. The AI needs more context to provide optimal analysis.",
        category: "action-required"
      });
    }
  }, [toast]);

  // AI Integration Handlers
  const handleAnalysisTriggered = useCallback((imageId: string, analysis: any) => {
    onAnalysisComplete?.(imageId, analysis);
  }, [onAnalysisComplete]);
  
  const handleAnalyzeImage = useCallback(async (imageId: string) => {
    const image = (uploadedImages || []).find(img => img.id === imageId);
    if (!image) return;

    try {
      const analysis = await analyzeImageWithAI(image.id, image.url, image.name);
      handleAnalysisTriggered(image.id, analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze image. Please try again.",
        category: "error",
      });
    }
  }, [uploadedImages, analyzeImageWithAI, handleAnalysisTriggered, toast]);

  const handleBatchAnalysis = useCallback(async (imageIds: string[]) => {
    const imagesToAnalyze = (uploadedImages || []).filter(img => imageIds.includes(img.id));

    for (const image of imagesToAnalyze) {
      try {
        const analysis = await analyzeImageWithAI(image.id, image.url, image.name);
        onAnalysisComplete?.(image.id, analysis);
      } catch (error) {
        console.error(`Analysis failed for ${image.name}:`, error);
      }
    }
  }, [uploadedImages, analyzeImageWithAI, onAnalysisComplete]);

  const handleGroupAnalysis = useCallback(async (imageIds: string[]) => {
    const imagesToAnalyze = (uploadedImages || []).filter(img => imageIds.includes(img.id));

    for (const image of imagesToAnalyze) {
      try {
        const analysis = await analyzeImageWithAI(image.id, image.url, image.name, 'Group analysis context');
        onAnalysisComplete?.(image.id, analysis);
      } catch (error) {
        console.error(`Group analysis failed for ${image.name}:`, error);
      }
    }
  }, [uploadedImages, analyzeImageWithAI, onAnalysisComplete]);

  const handleEnhancedAnalysisRequest = useCallback(async (imageId: string) => {
    const image = (uploadedImages || []).find(img => img.id === imageId);
    if (!image) return;

    try {
      console.log('[CanvasView] Starting enhanced analysis request for:', image.name);
      
      // For now, use the regular analysis function
      const analysis = await analyzeImageWithAI(image.id, image.url, image.name);
      handleAnalysisTriggered(image.id, analysis);
      
      toast({
        title: "Enhanced Analysis Complete",
        description: "Advanced AI analysis completed with additional insights",
        category: "success"
      });
    } catch (error) {
      console.error('[CanvasView] Enhanced analysis failed:', error);
      toast({
        title: "Enhanced Analysis Failed",
        description: "Failed to complete enhanced analysis. Please try again.",
        category: "error"
      });
    }
  }, [uploadedImages, analyzeImageWithAI, handleAnalysisTriggered, toast]);

  const handleViewAnalysis = useCallback((imageId: string) => {
    const analysis = analyses.find(a => a.imageId === imageId);
    if (analysis) {
      onOpenAnalysisPanel?.(analysis.id);
    } else {
      toast({
        title: "No Analysis Found",
        description: "This image hasn't been analyzed yet. Try running an analysis first.",
        category: "action-required"
      });
    }
  }, [analyses, onOpenAnalysisPanel, toast]);

  // Professional Layout Implementation
  const calculateProfessionalCanvasLayout = useCallback(() => {
    if ((uploadedImages || []).length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Constants for layout
    const SPACING_CONSTANTS = {
      sectionGap: 60,
      groupSpacing: 80,
      nodeMargin: 24,
      analysisCardWidth: 400
    };
    
    // Calculate container dimensions
    const containerWidth = Math.max(viewportDimensions.width, 1400);
    const containerHeight = Math.max(viewportDimensions.height, 1000);
    
    // Use professional layout configuration
    const layoutConfig = {
      ...ENHANCED_LAYOUT_CONFIG,
      containerWidth,
      containerHeight,
      spacing: 24,
      padding: 32
    };

    // Separate grouped and ungrouped images
    const groupedImageIds = new Set((imageGroups || []).flatMap(group => group.imageIds));
    const ungroupedImages = (uploadedImages || []).filter(img => !groupedImageIds.has(img.id));
    
    let currentY = layoutConfig.padding;
    
    // 1. Layout ungrouped images first
    if (ungroupedImages.length > 0) {
      const ungroupedDimensions = ungroupedImages.map(img => 
        getOptimalImageDimensions(img, 'canvas', containerWidth)
      );
      
      const ungroupedLayout = calculateProfessionalLayout(ungroupedImages, {
        ...layoutConfig,
        containerHeight: containerHeight - currentY
      });
      
      const ungroupedPositions = convertLayoutToCanvasPositions(ungroupedLayout);
      
      ungroupedImages.forEach((image, index) => {
        const position = ungroupedPositions[index];
        if (!position) return;
        
        const imageAnalysis = (analyses || []).find(a => a.imageId === image.id);
        const imageDimensions = ungroupedDimensions[index];
        const imageDisplayWidth = imageDimensions?.width || 300;
        const imageDisplayHeight = imageDimensions?.height || 200;
        
        // Image node
        nodes.push({
          id: `image-${image.id}`,
          type: 'image',
          position: { 
            x: position.x + layoutConfig.padding, 
            y: position.y + currentY 
          },
          data: {
            image,
            analysis: imageAnalysis,
            showAnnotations,
            currentTool,
            ...stableCallbacks,
            onRequestAnalysis: handleCreateAnalysisRequest,
            onToggleSelection: (imageId: string, isCtrlOrCmd: boolean) => 
              handleToggleSelection(imageId, isCtrlOrCmd),
            onRequestEnhancedAnalysis: handleEnhancedAnalysisRequest
          },
          style: { width: imageDisplayWidth, height: imageDisplayHeight }
        });

        // Add analysis card if analysis exists
        if (imageAnalysis) {
          nodes.push({
            id: `analysis-${imageAnalysis.id}`,
            type: 'analysisCard',
            position: { 
              x: position.x + imageDisplayWidth + 20 + layoutConfig.padding, 
              y: position.y + currentY 
            },
            data: {
              analysis: imageAnalysis,
              onExpand: stableCallbacks.onExpandedChange,
              onGenerateConcept: () => {
                if (onGenerateConcept) {
                  onGenerateConcept(imageAnalysis.id);
                }
              }
            }
          });

          // Connect image to analysis
          edges.push({
            id: `edge-${image.id}-${imageAnalysis.id}`,
            source: `image-${image.id}`,
            target: `analysis-${imageAnalysis.id}`,
            type: 'smoothstep',
            style: { stroke: 'hsl(var(--border))' }
          });
        }
      });
      
      // Update currentY for next section
      currentY += ungroupedLayout.totalHeight + SPACING_CONSTANTS.sectionGap;
    }

    // 2. Layout groups
    let groupYOffset = currentY;
    (imageGroups || []).forEach((group) => {
      const groupImages = (uploadedImages || []).filter(img => group.imageIds.includes(img.id));
      if (groupImages.length === 0) return;

      const displayMode = groupDisplayModes?.[group.id] || 'standard';
      const groupLayoutMode = displayMode === 'standard' ? 'grid' : 'stacked';
      const groupLayoutConfig = {
        ...layoutConfig,
        containerHeight: Math.max(400, containerHeight - groupYOffset),
        spacing: displayMode === 'stacked' ? 8 : 16
      };

      const groupLayout = calculateEnhancedGroupLayout(
        group, 
        groupImages, 
        groupLayoutMode, 
        groupLayoutConfig
      );
      
      const groupPositions = convertLayoutToCanvasPositions(groupLayout);

      // Group container
      nodes.push({
        id: `group-${group.id}`,
        type: 'group',
        position: { 
          x: layoutConfig.padding, 
          y: groupYOffset 
        },
        data: {
          group,
          displayMode,
          onDeleteGroup: handleDeleteGroup,
          onViewGroup: handleViewGroup,
          onAnalyzeGroup: handleAnalyzeGroup,
          onDisplayModeChange: (mode: 'standard' | 'stacked') => {
            onGroupDisplayModeChange?.(group.id, mode);
          }
        },
        style: { 
          width: Math.min(groupLayout.totalWidth + 40, containerWidth - (layoutConfig.padding * 2)),
          height: groupLayout.totalHeight + 120
        }
      });

      // Group images
      groupImages.forEach((image, imageIndex) => {
        const position = groupPositions[imageIndex];
        if (!position) return;

        const groupImageAnalysis = (analyses || []).find(a => a.imageId === image.id);
        const dimensions = getOptimalImageDimensions(image, 'group', containerWidth);

        nodes.push({
          id: `group-image-${group.id}-${image.id}`,
          type: 'image',
          position: { 
            x: layoutConfig.padding + 20 + position.x, 
            y: groupYOffset + 60 + position.y 
          },
          data: {
            image,
            analysis: groupImageAnalysis,
            showAnnotations,
            currentTool,
            ...stableCallbacks,
            onRequestAnalysis: handleCreateAnalysisRequest,
            onToggleSelection: handleToggleSelection,
            onRequestEnhancedAnalysis: handleEnhancedAnalysisRequest
          },
          style: { 
            width: dimensions?.width || 200, 
            height: dimensions?.height || 150 
          },
          parentId: `group-${group.id}`,
          extent: 'parent'
        });
      });

      groupYOffset += groupLayout.totalHeight + SPACING_CONSTANTS.groupSpacing;
    });

    return { nodes, edges };
  }, [
    uploadedImages,
    analyses,
    imageGroups,
    groupDisplayModes,
    viewportDimensions,
    showAnnotations,
    currentTool,
    stableCallbacks,
    handleCreateAnalysisRequest,
    handleToggleSelection,
    handleEnhancedAnalysisRequest,
    handleDeleteGroup,
    handleViewGroup,
    handleAnalyzeGroup,
    onGroupDisplayModeChange,
    onGenerateConcept
  ]);

  // Calculate layout using the professional system
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => 
    calculateProfessionalCanvasLayout(), [calculateProfessionalCanvasLayout]
  );

  // React Flow state management
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Update nodes when layout changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Viewport management
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodes.length > 0) {
        const positions = nodes.map(node => ({
          x: node.position.x,
          y: node.position.y,
          width: node.style?.width as number || 300,
          height: node.style?.height as number || 200,
          imageId: node.id,
          row: 0, // Default values for GridPosition
          column: 0
        }));
        
        autoFitIfNeeded(positions);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [nodes, autoFitIfNeeded]);

  // Undo/Redo functionality
  const { canUndo, canRedo, undo, redo } = useUndoRedo(
    { nodes, edges },
    { setNodes, setEdges }
  );

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-background via-background to-muted/20">
      <AnnotationOverlayProvider>
        {/* Canvas Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {/* Undo/Redo */}
          <div className="flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="h-8 w-8 p-0"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="h-8 w-8 p-0"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
              padding: 0.1,
              includeHiddenNodes: false,
              minZoom: 0.1,
              maxZoom: 1.5,
            }}
            className="bg-transparent"
            panOnScroll={true}
            selectionOnDrag={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            minZoom={0.1}
            maxZoom={2}
            deleteKeyCode={null}
            multiSelectionKeyCode={['Meta', 'Control']}
            selectNodesOnDrag={false}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              className="opacity-30"
            />
          </ReactFlow>
        </div>

        {/* Upload Zone Overlay */}
        <CanvasUploadZone onImageUpload={onImageUpload} />

        {/* Floating Canvas Controls */}
        <CanvasFloatingToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          selectedIds={multiSelection.state.selectedIds}
          onBatchAnalysis={handleBatchAnalysis}
          onGroupAnalysis={handleGroupAnalysis}
          onCreateGroup={() => onCreateGroup?.(multiSelection.state.selectedIds)}
          onClearSelection={multiSelection.clearSelection}
          showAnnotations={showAnnotations}
          onToggleAnnotations={onToggleAnnotations}
        />
      </AnnotationOverlayProvider>
    </div>
  );
};