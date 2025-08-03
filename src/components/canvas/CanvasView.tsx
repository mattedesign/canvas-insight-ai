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
import { BoundaryPushingPipeline } from '@/services/BoundaryPushingPipeline';
import '@xyflow/react/dist/style.css';
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis, GroupPromptSession, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { getSafeDimensions } from '@/utils/imageUtils';
import { AnalysisRequestNodeData, AnalysisRequestNode } from './AnalysisRequestNode';
import { ImageNode } from './ImageNode';
import { AnalysisCardNode } from './AnalysisCardNode';
import { VirtualizedCanvasContainer } from './VirtualizedCanvasView';
import { ConceptImageNode } from './ConceptImageNode';
import { ConceptDetailsNode } from './ConceptDetailsNode';
import { GroupNode } from './GroupNode';
import { GroupContainerNode } from './GroupContainerNode';
import { GroupAnalysisCardNode } from './GroupAnalysisCardNode';
import { GroupPromptCollectionNode } from './GroupPromptCollectionNode';
import { GroupAnalysisResultsNode } from './GroupAnalysisResultsNode';
import { EnhancedGroupAnalysisNode } from './EnhancedGroupAnalysisNode';
import { ImageLoadingNode } from './ImageLoadingNode';
import { AnalysisLoadingNode } from './AnalysisLoadingNode';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useMultiSelection } from '@/hooks/useMultiSelection';
import { FloatingToolbar, ToolMode } from '../FloatingToolbar';
import { useFilteredToast } from '@/hooks/use-filtered-toast';
import { AnnotationOverlayProvider, useAnnotationOverlay } from '../AnnotationOverlay';
import { CanvasUploadZone } from '../CanvasUploadZone';
import { AICanvasToolbar } from './AICanvasToolbar';
import { AIContextMenu } from './AIContextMenu';
import { useAI } from '@/context/AIContext';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAnalysis } from '@/hooks/useEnhancedAnalysis';
import { useOptimizedPipeline } from '@/hooks/useOptimizedPipeline';


import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';

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
  const [currentTool, setCurrentTool] = useState<ToolMode>('cursor');
  const [showAnalysis, setShowAnalysis] = useState(true);
  
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  
  // Analysis workflow state
  const [analysisRequests, setAnalysisRequests] = useState<Map<string, { imageId: string; imageName: string; imageUrl: string }>>(new Map());
  
  const { toast } = useFilteredToast();
  const multiSelection = useMultiSelection();
  const isMobile = useIsMobile();
  
  // Show helpful hint on first load for images without analysis
  useEffect(() => {
    // Only show notifications when in Lovable app context
    if (!window.location.hostname.includes('lovable') && !window.location.hostname.includes('localhost')) {
      return;
    }

    const imagesWithoutAnalysis = (uploadedImages || []).filter(img => 
      !(analyses || []).some(analysis => analysis.imageId === img.id)
    );
    
    if (imagesWithoutAnalysis.length > 0 && (uploadedImages?.length || 0) > 0) {
      // COMMENTED OUT: Repetitive "ready for analysis" toast
      // const timer = setTimeout(() => {
      //   toast({
      //     title: "AI Analysis Available",
      //     description: `Click the "AI Analysis" button on any image to get instant UX insights. ${imagesWithoutAnalysis.length} image(s) ready for analysis.`,
      //     category: "action-required"
      //   });
      // }, 2000);
      // 
      // return () => clearTimeout(timer);
    }
  }, [uploadedImages.length, analyses.length]);
  
  // AI Integration - Use the new pipeline
  const { analyzeImageWithAI } = useAI();
  const { performEnhancedAnalysis, isAnalyzing, progress, stage, error } = useEnhancedAnalysis();
  const pipeline = useOptimizedPipeline();

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
    // COMMENTED OUT: Repetitive group deletion toast
    // toast({
    //   description: "Group deleted successfully",
    //   category: "success",
    // });
  }, [toast]);

  const handleViewGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      multiSelection.selectMultiple(group.imageIds);
      // Remove informational group view toast
    }
  }, [groups, multiSelection.selectMultiple, toast]);

  const handleAnalyzeGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      // COMMENTED OUT: Repetitive group analysis start toast
      // toast({
      //   title: "Group Analysis",
      //   description: `Analyzing patterns across ${group.imageIds.length} images in "${group.name}"`,
      //   category: "success",
      // });
    }
  }, [groups, toast]);

  // Fork creation handler - directly create fork without modal
  const handleCreateForkClick = useCallback((sessionId: string) => {
    if (onCreateFork) {
      onCreateFork(sessionId);
      toast({
        title: "Fork Created",
        description: "Created new analysis branch - add your prompt to continue",
        category: "action-required",
      });
    }
  }, [onCreateFork, toast]);

  // Handle analysis panel opening
  const handleAnalysisExpansion = useCallback((analysisId: string) => {
    onOpenAnalysisPanel?.(analysisId);
  }, [onOpenAnalysisPanel]);

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


  // Helper to store partial context for clarification
  const storePartialContext = useCallback((nodeId: string, context: any, token: any) => {
    // Store in a ref or state management for later use
    // This will be used when user clicks on the clarification node
    console.log('[CanvasView] Storing partial context for node:', nodeId);
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('[CanvasView] Node clicked:', node.type, node.id);
    
    // Handle clarification node clicks
    if (node.type === 'analysisRequest' && node.data.status === 'clarification') {
      console.log('[CanvasView] Clarification needed for:', node.id);
      // TODO: Implement clarification dialog
      toast({
        title: "Context Clarification",
        description: "Click functionality coming soon. The AI needs more context to provide optimal analysis.",
        category: "action-required"
      });
    }
    
    // ... rest of existing click handlers
  }, [toast]);

  const handleClarificationClick = useCallback((node: Node) => {
    // This would open a dialog to answer clarification questions
    // For now, log it
    console.log('[CanvasView] Clarification needed for:', node.id);
    
    // TODO: Implement clarification dialog
    // This should:
    // 1. Show the questions in a dialog
    // 2. Collect answers
    // 3. Resume analysis with pipeline.resumeWithClarification()
  }, []);

  const handleCancelAnalysisRequest = useCallback((imageId: string) => {
    setAnalysisRequests(prev => {
      const newMap = new Map(prev);
      newMap.delete(imageId);
      return newMap;
    });
  }, []);

  // AI Integration Handlers
  const handleAnalysisTriggered = useCallback((imageId: string, analysis: any) => {
    onAnalysisComplete?.(imageId, analysis);
    // COMMENTED OUT: Repetitive analysis completion toast
    // toast({
    //   title: "Analysis Complete",
    //   description: "AI analysis completed successfully",
    //   category: "success",
    // });
  }, [onAnalysisComplete, toast]);
  
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
    
    // COMMENTED OUT: Repetitive batch analysis start toast
    // toast({
    //   title: "Batch Analysis Started",
    //   description: `Analyzing ${imagesToAnalyze.length} images...`,
    //   category: "success",
    // });

    for (const image of imagesToAnalyze) {
      try {
        const analysis = await analyzeImageWithAI(image.id, image.url, image.name);
        onAnalysisComplete?.(image.id, analysis);
      } catch (error) {
        console.error(`Analysis failed for ${image.name}:`, error);
      }
    }

    // COMMENTED OUT: Repetitive batch analysis completion toast
    // toast({
    //   title: "Batch Analysis Complete",
    //   description: `Completed analysis for ${imagesToAnalyze.length} images`,
    //   category: "success",
    // });
  }, [uploadedImages, analyzeImageWithAI, onAnalysisComplete, toast]);

  const handleGroupAnalysis = useCallback(async (imageIds: string[]) => {
    const imagesToAnalyze = (uploadedImages || []).filter(img => imageIds.includes(img.id));
    
    // COMMENTED OUT: Repetitive group analysis start toast
    // toast({
    //   title: "Group Analysis Started",
    //   description: `Analyzing patterns across ${imagesToAnalyze.length} images...`,
    //   category: "success",
    // });

    // For now, this does individual analysis. In the future, this could call a group-specific analysis endpoint
    for (const image of imagesToAnalyze) {
      try {
        const analysis = await analyzeImageWithAI(image.id, image.url, image.name, 'Group analysis context');
        onAnalysisComplete?.(image.id, analysis);
      } catch (error) {
        console.error(`Group analysis failed for ${image.name}:`, error);
      }
    }

    // COMMENTED OUT: Repetitive group analysis completion toast
    // toast({
    //   title: "Group Analysis Complete",
    //   description: `Completed group analysis for ${imagesToAnalyze.length} images`,
    //   category: "success",
    // });
  }, [uploadedImages, analyzeImageWithAI, onAnalysisComplete, toast]);

  const handleEnhancedAnalysisRequest = useCallback(async (imageId: string) => {
    const image = (uploadedImages || []).find(img => img.id === imageId);
    if (!image) return;

    try {
      const result = await performEnhancedAnalysis(image.url, image.name, image.id);
      if (result.success && result.data) {
        onAnalysisComplete?.(image.id, result.data);
        // COMMENTED OUT: Repetitive enhanced analysis completion toast
        // toast({
        //   title: "Enhanced Analysis Complete",
        //   description: `Enhanced AI analysis completed for ${image.name}`,
        //   category: "success",
        // });
      } else {
        throw new Error(result.error || 'Enhanced analysis failed');
      }
    } catch (error) {
      console.error('Enhanced analysis failed:', error);
      toast({
        title: "Enhanced Analysis Failed",
        description: "Failed to perform enhanced analysis. Please try again.",
        category: "error",
      });
    }
  }, [uploadedImages, performEnhancedAnalysis, onAnalysisComplete, toast]);

  const handleViewAnalysis = useCallback((imageId: string) => {
    const analysis = (analyses || []).find(a => a.imageId === imageId);
    if (analysis) {
      onOpenAnalysisPanel?.(analysis.id);
    } else {
      toast({
        title: "No Analysis Found",
        description: "This image hasn't been analyzed yet.",
        category: "error",
      });
    }
  }, [analyses, onOpenAnalysisPanel, toast]);

  const handleCompareModels = useCallback((imageId: string) => {
    toast({
      title: "Model Comparison",
      description: "Use the AI toolbar to compare different AI models for this image.",
      category: "action-required",
    });
  }, [toast]);

  // Memoize the node generation to prevent unnecessary recalculations
  const initialElements = useMemo(() => {
  console.log('[CanvasView] === CANVAS RENDERING START ===');
  console.log('[CanvasView] Input data summary:', {
    uploadedImages: (uploadedImages || []).length,
    analyses: (analyses || []).length,
    imageGroups: (imageGroups || []).length,
    showAnalysis,
    currentTool,
    analysisRequestsCount: analysisRequests.size
  });
    
    if ((uploadedImages || []).length === 0) {
      console.warn('[CanvasView] No uploaded images provided - canvas will be empty');
      return { nodes: [], edges: [] };
    }
    
    console.log('[CanvasView] Image details:', (uploadedImages || []).map(img => ({
      id: img.id,
      name: img.name,
      url: img.url ? `${img.url.substring(0, 50)}...` : 'NO_URL',
      dimensions: img.dimensions,
      status: img.status
    })));
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let yOffset = 0;
    const horizontalSpacing = 100;
    const minVerticalSpacing = 150;
    const groupedImageIds = new Set((imageGroups || []).flatMap(group => group.imageIds || []));

    // Process ungrouped images first
    const ungroupedImages = (uploadedImages || []).filter(image => !groupedImageIds.has(image.id));
    console.log('[CanvasView] Processing ungrouped images:', ungroupedImages.length);
    
    ungroupedImages.forEach((image, index) => {
      const analysis = analyses.find(a => a.imageId === image.id);
      
      // Calculate image display dimensions with safe dimension access
      const safeDimensions = getSafeDimensions(image);
      const maxDisplayHeight = Math.min(safeDimensions.height, window.innerHeight * 0.8);
      const scaleFactor = maxDisplayHeight / safeDimensions.height;
      const displayWidth = Math.min(safeDimensions.width * scaleFactor, 800); // max-width constraint
      const displayHeight = maxDisplayHeight;
      
      // Check if image is still loading or processing
      const isImageLoading = image.status && ['uploading', 'processing', 'analyzing'].includes(image.status);
      
      // Create image node or loading node based on status
      const imageNode: Node = {
        id: `image-${image.id}`,
        type: isImageLoading ? 'imageLoading' : 'image',
        position: { x: 50, y: yOffset },
        data: isImageLoading ? {
          id: image.id,
          name: image.name,
          status: image.status!,
          error: image.status === 'error' ? 'Upload failed' : undefined
        } : { 
          image,
          analysis,
          showAnnotations,
          currentTool,
          onViewChange: stableCallbacks.onViewChange,
          onImageSelect: stableCallbacks.onImageSelect,
          onToggleSelection: stableCallbacks.onToggleSelection,
          isSelected: stableCallbacks.isSelected(image.id),
          onAnnotationClick: () => {},
          onAnalysisComplete: (newAnalysis: UXAnalysis) => {
            onAnalysisComplete?.(image.id, newAnalysis);
          },
          onCreateAnalysisRequest: handleCreateAnalysisRequest
        },
      };
      nodes.push(imageNode);

      let rightmostXPosition = 50 + displayWidth + horizontalSpacing;

      // Check for analysis request node
      const analysisRequest = analysisRequests.get(image.id);
      if (analysisRequest && !isImageLoading) {
        const requestNode: Node = {
          id: `analysis-request-${image.id}`,
          type: 'analysisRequest',
          position: { x: rightmostXPosition, y: yOffset },
          data: {
            imageId: image.id,
            imageName: image.name,
            imageUrl: image.url,
            userContext: '',
            onAnalysisComplete: (result: any) => {
              // Handle successful analysis completion
              console.log('[CanvasView] Analysis completed:', result);
              
              // Remove the analysis request
              setAnalysisRequests(prev => {
                const newMap = new Map(prev);
                newMap.delete(image.id);
                return newMap;
              });
              
              // Call the parent analysis complete handler
              if (onAnalysisComplete && result.data) {
                onAnalysisComplete(image.id, result.data);
              }
            },
            onError: (error: string) => {
              console.error('[CanvasView] Analysis failed:', error);
              
              // Remove the analysis request
              setAnalysisRequests(prev => {
                const newMap = new Map(prev);
                newMap.delete(image.id);
                return newMap;
              });
              
              // Show error toast
              toast({
                title: "Analysis Failed",
                description: error,
                variant: "destructive",
                category: "error"
              });
            }
          }
        };
        nodes.push(requestNode);

        // Create edge connecting image to analysis request
        const requestEdge: Edge = {
          id: `edge-${image.id}-request`,
          source: `image-${image.id}`,
          target: `analysis-request-${image.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
        };
        edges.push(requestEdge);

        rightmostXPosition += 400 + horizontalSpacing; // Update position for next node
      }


        // Create analysis card node if analysis exists and showAnalysis is true
        if (analysis && showAnalysis && !isImageLoading) {
          const cardXPosition = rightmostXPosition;
          const analysisCardWidth = 400; // Standard width
          
          // Check if analysis is still loading
          const isAnalysisLoading = analysis.status && ['processing', 'analyzing'].includes(analysis.status);
          
          const cardNode: Node = {
            id: `card-${analysis.id}`,
            type: isAnalysisLoading ? 'analysisLoading' : 'analysisCard',
            position: { x: cardXPosition, y: yOffset },
            data: isAnalysisLoading ? {
              imageId: analysis.imageId,
              imageName: analysis.imageName,
              status: analysis.status!,
              error: analysis.status === 'error' ? 'Analysis failed' : undefined
            } : { 
              analysis,
              onGenerateConcept: stableCallbacks.onGenerateConcept,
              onOpenAnalysisPanel: onOpenAnalysisPanel,
              isGeneratingConcept,
              onExpandedChange: handleAnalysisExpansion
            },
          };
        nodes.push(cardNode);

        // Create edge connecting image to analysis card (only if both exist and not loading)
        if (!isImageLoading) {
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

        rightmostXPosition += analysisCardWidth + horizontalSpacing; // Card width + spacing

        // Add concept nodes for this analysis
        const conceptsForAnalysis = generatedConcepts.filter(c => c.analysisId === analysis.id);
        let currentConceptXPosition = rightmostXPosition;
        
        conceptsForAnalysis.forEach((concept, conceptIndex) => {
          // Create concept image node (artboard) - use same dimensions as original image
          const conceptImageNode: Node = {
            id: `concept-image-${concept.id}`,
            type: 'conceptImage',
            position: { x: currentConceptXPosition, y: yOffset },
            data: { 
              concept,
              originalImage: image,
              displayWidth,
              displayHeight
            },
          };
          nodes.push(conceptImageNode);

          // Create concept details node (positioned to the right of concept image)
          const conceptDetailsXPosition = currentConceptXPosition + displayWidth + horizontalSpacing;
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

          // Update position for next concept (if any) - use original image width + spacing + details width
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
      const padding = 32; // Consistent 32px padding on all sides
      const headerHeight = 60; // Space for group title
      const imageSpacing = 20;
      const analysisSpacing = 100;
      
      if (displayMode === 'standard') {
        // Vertical stacking: each image+analysis pair stacked vertically
        let maxWidth = 0;
        let totalHeight = headerHeight + padding; // Header space + top padding
        
        groupImages.forEach((image, imageIndex) => {
          const analysis = analyses.find(a => a.imageId === image.id);
          const safeDimensions = getSafeDimensions(image);
          const maxDisplayHeight = Math.min(safeDimensions.height, window.innerHeight * 0.3);
          const scaleFactor = maxDisplayHeight / safeDimensions.height;
          const displayWidth = Math.min(safeDimensions.width * scaleFactor, 400);
          const displayHeight = maxDisplayHeight;
          
          // Width needed for this pair: image + spacing + analysis card (expanded or collapsed)
          const horizontalSpacing = Math.max(displayWidth * 1.2, 300); // At least 300px or 120% image width
          const analysisCardWidth = 400; // Standard width
          let pairWidth = displayWidth + horizontalSpacing + analysisCardWidth; // generous spacing + analysis card
          
          // Add width for concept nodes if they exist for this analysis
          if (analysis) {
            const conceptsForAnalysis = generatedConcepts.filter(c => c.analysisId === analysis.id);
            if (conceptsForAnalysis.length > 0) {
              // Each concept adds: concept image (original width) + spacing + concept details (400px) + spacing
              const conceptWidth = conceptsForAnalysis.length * (displayWidth + 100 + 400 + 100);
              pairWidth += conceptWidth;
            }
          }
          
          maxWidth = Math.max(maxWidth, pairWidth);
          
          // Use triple the scaled image height as the minimum vertical space to over-correct
          const minVerticalSpace = Math.max(displayHeight * 3, 500); // At least 500px or triple image height
          totalHeight += minVerticalSpace;
        });
        
        containerWidth = Math.max(maxWidth + padding * 2, 600); // Left + right padding
        containerHeight = totalHeight + padding; // Bottom padding
      } else {
        // Alternative stacked layout
        let maxWidth = 0;
        let totalHeight = headerHeight + padding; // Header space + top padding
        
        groupImages.forEach((image, imageIndex) => {
          const analysis = analyses.find(a => a.imageId === image.id);
          const safeDimensions = getSafeDimensions(image);
          const maxDisplayHeight = Math.min(safeDimensions.height, 200);
          const scaleFactor = maxDisplayHeight / safeDimensions.height;
          const displayWidth = Math.min(safeDimensions.width * scaleFactor, 250);
          const displayHeight = maxDisplayHeight;
          
          const analysisCardWidth = 400; // Standard width
          let pairWidth = displayWidth + Math.max(displayWidth * 1.0, 250) + analysisCardWidth; // Include generous spacing
          
          // Add width for concept nodes if they exist for this analysis
          if (analysis) {
            const conceptsForAnalysis = generatedConcepts.filter(c => c.analysisId === analysis.id);
            if (conceptsForAnalysis.length > 0) {
              // Each concept adds: concept image (original width) + spacing + concept details (400px) + spacing
              const conceptWidth = conceptsForAnalysis.length * (displayWidth + 100 + 400 + 100);
              pairWidth += conceptWidth;
            }
          }
          
          maxWidth = Math.max(maxWidth, pairWidth);
          
          // Use triple the scaled image height as the minimum vertical space for stacked mode
          const minVerticalSpace = Math.max(displayHeight * 3, 400); // At least 400px or triple image height
          totalHeight += minVerticalSpace;
        });
        
        containerWidth = Math.max(maxWidth + padding * 2, 600); // Left + right padding
        containerHeight = totalHeight + padding; // Bottom padding
      }
      
      // Create group container node using React Flow's built-in group type
      const containerNode: Node = {
        id: `group-container-${group.id}`,
        type: 'group',
        position: { x: 50, y: yOffset },
        style: { 
          width: containerWidth,
          height: containerHeight,
          borderColor: group.color,
        },
        data: {
          group,
          displayMode,
          onUngroup,
          onDeleteGroup,
          onEdit: onEditGroup,
          onDisplayModeChange: onGroupDisplayModeChange,
        },
      };
      nodes.push(containerNode);
      
      // Position images and their individual analysis cards inside the container
      if (displayMode === 'standard') {
        // Vertical stacking of horizontal pairs (like ungrouped layout but stacked)
        let currentY = headerHeight + padding; // Start below header with 32px top padding
        groupImages.forEach((image, imageIndex) => {
          const analysis = analyses.find(a => a.imageId === image.id);
          const safeDimensions = getSafeDimensions(image);
          const maxDisplayHeight = Math.min(safeDimensions.height, window.innerHeight * 0.3);
          const scaleFactor = maxDisplayHeight / safeDimensions.height;
          const displayWidth = Math.min(safeDimensions.width * scaleFactor, 400);
          const displayHeight = maxDisplayHeight;
          
          // Check if image is still loading or processing
          const isImageLoading = image.status && ['uploading', 'processing', 'analyzing'].includes(image.status);
          
          // Image node - positioned relative to group container origin
          const imageNode: Node = {
            id: `image-${image.id}`,
            type: isImageLoading ? 'imageLoading' : 'image',
            position: { x: padding, y: currentY },
            parentId: `group-container-${group.id}`,
            extent: 'parent',
            data: isImageLoading ? {
              id: image.id,
              name: image.name,
              status: image.status!,
              error: image.status === 'error' ? 'Upload failed' : undefined
            } : { 
              image,
              analysis,
              showAnnotations,
              currentTool,
              onViewChange: stableCallbacks.onViewChange,
              onImageSelect: stableCallbacks.onImageSelect,
              onToggleSelection: stableCallbacks.onToggleSelection,
              isSelected: stableCallbacks.isSelected(image.id),
              onAnnotationClick: () => {},
              onAnalysisComplete: (newAnalysis: UXAnalysis) => {
                onAnalysisComplete?.(image.id, newAnalysis);
              },
              onCreateAnalysisRequest: handleCreateAnalysisRequest
            },
          };
          nodes.push(imageNode);

          let rightmostXPosition = padding + displayWidth + 50; // Start after image with some spacing
          
          // Check for analysis request node for grouped images
          const analysisRequest = analysisRequests.get(image.id);
          if (analysisRequest && !isImageLoading) {
            const requestNode: Node = {
              id: `group-analysis-request-${image.id}`,
              type: 'analysisRequest',
              position: { x: rightmostXPosition, y: currentY },
              parentId: `group-container-${group.id}`,
              extent: 'parent',
              data: {
                imageId: image.id,
                imageName: image.name,
                imageUrl: image.url,
                userContext: '',
                onAnalysisComplete: (result: any) => {
                  console.log('[CanvasView] Group analysis completed:', result);
                  setAnalysisRequests(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(image.id);
                    return newMap;
                  });
                  if (onAnalysisComplete && result.data) {
                    onAnalysisComplete(image.id, result.data);
                  }
                },
                onError: (error: string) => {
                  console.error('[CanvasView] Group analysis failed:', error);
                  setAnalysisRequests(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(image.id);
                    return newMap;
                  });
                  toast({
                    title: "Analysis Failed",
                    description: error,
                    variant: "destructive",
                    category: "error"
                  });
                }
              }
            };
            nodes.push(requestNode);

            // Create edge connecting image to analysis request
            const requestEdge: Edge = {
              id: `edge-group-${image.id}-request`,
              source: `image-${image.id}`,
              target: `group-analysis-request-${image.id}`,
              type: 'smoothstep',
              animated: true,
              style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
            };
            edges.push(requestEdge);

            rightmostXPosition += 400 + 50; // Update position for next node
          }

          
          // Individual analysis card for this image - with generous spacing
          if (analysis && showAnalysis && !isImageLoading) {
            const horizontalSpacing = Math.max(displayWidth * 1.2, 300); // At least 300px or 120% image width
            
            // Check if analysis is still loading
            const isAnalysisLoading = analysis.status && ['processing', 'analyzing'].includes(analysis.status);
            
            const analysisNode: Node = {
              id: `group-image-analysis-${image.id}`,
              type: isAnalysisLoading ? 'analysisLoading' : 'analysisCard',
              position: { x: padding + displayWidth + horizontalSpacing, y: currentY }, // generous spacing
              parentId: `group-container-${group.id}`,
              extent: 'parent',
              data: isAnalysisLoading ? {
                imageId: analysis.imageId,
                imageName: analysis.imageName,
                status: analysis.status!,
                error: analysis.status === 'error' ? 'Analysis failed' : undefined
              } : { 
                analysis,
                onGenerateConcept: stableCallbacks.onGenerateConcept,
                onOpenAnalysisPanel: onOpenAnalysisPanel,
                isGeneratingConcept,
                onExpandedChange: handleAnalysisExpansion
              },
            };
            nodes.push(analysisNode);
            
            // Create edge connecting image to its analysis (only if image not loading)
            if (!isImageLoading) {
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
            
            // Add concept nodes for this analysis (same as ungrouped)
            const conceptsForAnalysis = generatedConcepts.filter(c => c.analysisId === analysis.id);
            const analysisCardWidth = 400; // Standard width
            let currentConceptXPosition = padding + displayWidth + horizontalSpacing + analysisCardWidth + 100; // After analysis card
            
            conceptsForAnalysis.forEach((concept, conceptIndex) => {
              // Create concept image node (artboard) - use same dimensions as original image
              const conceptImageNode: Node = {
                id: `concept-image-${concept.id}`,
                type: 'conceptImage',
                position: { x: currentConceptXPosition, y: currentY },
                parentId: `group-container-${group.id}`,
                extent: 'parent',
                data: { 
                  concept,
                  originalImage: image,
                  displayWidth,
                  displayHeight
                },
              };
              nodes.push(conceptImageNode);

              // Create concept details node (positioned to the right of concept image)
              const conceptDetailsXPosition = currentConceptXPosition + displayWidth + 100;
              const conceptDetailsNode: Node = {
                id: `concept-details-${concept.id}`,
                type: 'conceptDetails',
                position: { x: conceptDetailsXPosition, y: currentY },
                parentId: `group-container-${group.id}`,
                extent: 'parent',
                data: { concept },
              };
              nodes.push(conceptDetailsNode);

              // Create edge connecting analysis card to concept image
              const conceptImageEdge: Edge = {
                id: `edge-group-${analysis.id}-${concept.id}-image`,
                source: `group-image-analysis-${image.id}`,
                target: `concept-image-${concept.id}`,
                type: 'smoothstep',
                animated: true,
                style: { stroke: 'hsl(var(--primary))' },
              };
              edges.push(conceptImageEdge);

              // Create edge connecting concept image to concept details
              const conceptDetailsEdge: Edge = {
                id: `edge-group-${concept.id}-image-details`,
                source: `concept-image-${concept.id}`,
                target: `concept-details-${concept.id}`,
                type: 'smoothstep',
                animated: true,
                style: { stroke: 'hsl(var(--primary))' },
              };
              edges.push(conceptDetailsEdge);

              // Update position for next concept (if any) - use original image width + spacing + details width
              currentConceptXPosition = conceptDetailsXPosition + 400 + 100;
            });
          }
          
          // Move to next vertical position using triple the image height to over-correct
          const minVerticalSpace = Math.max(displayHeight * 3, 500); // At least 500px or triple image height
          currentY += minVerticalSpace;
        });
      } else {
        // Alternative stacked layout
        let currentY = headerHeight + padding; // Start below header with 32px top padding
        groupImages.forEach((image, imageIndex) => {
          const analysis = analyses.find(a => a.imageId === image.id);
          const safeDimensions = getSafeDimensions(image);
          const maxDisplayHeight = Math.min(safeDimensions.height, 200);
          const scaleFactor = maxDisplayHeight / safeDimensions.height;
          const displayWidth = Math.min(safeDimensions.width * scaleFactor, 250);
          const displayHeight = maxDisplayHeight;
          
          // Image node - positioned relative to group container origin
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
              isSelected: stableCallbacks.isSelected(image.id),
              onAnnotationClick: () => {},
              onAnalysisComplete: (newAnalysis: UXAnalysis) => {
                onAnalysisComplete?.(image.id, newAnalysis);
              },
              onCreateAnalysisRequest: handleCreateAnalysisRequest
            },
          };
          nodes.push(imageNode);

          let rightmostXPosition = padding + displayWidth + 50; // Start after image with some spacing
          
          // Check for analysis request node for grouped images (stacked mode)
          const analysisRequest = analysisRequests.get(image.id);
          if (analysisRequest) {
            const requestNode: Node = {
              id: `group-analysis-request-${image.id}`,
              type: 'analysisRequest',
              position: { x: rightmostXPosition, y: currentY },
              parentId: `group-container-${group.id}`,
              extent: 'parent',
              data: {
                imageId: image.id,
                imageName: image.name,
                imageUrl: image.url,
                userContext: '',
                onAnalysisComplete: (result: any) => {
                  console.log('[CanvasView] Stacked group analysis completed:', result);
                  setAnalysisRequests(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(image.id);
                    return newMap;
                  });
                  if (onAnalysisComplete && result.data) {
                    onAnalysisComplete(image.id, result.data);
                  }
                },
                onError: (error: string) => {
                  console.error('[CanvasView] Stacked group analysis failed:', error);
                  setAnalysisRequests(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(image.id);
                    return newMap;
                  });
                  toast({
                    title: "Analysis Failed",
                    description: error,
                    variant: "destructive",
                    category: "error"
                  });
                }
              }
            };
            nodes.push(requestNode);

            // Create edge connecting image to analysis request
            const requestEdge: Edge = {
              id: `edge-group-${image.id}-request`,
              source: `image-${image.id}`,
              target: `group-analysis-request-${image.id}`,
              type: 'smoothstep',
              animated: true,
              style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
            };
            edges.push(requestEdge);

            rightmostXPosition += 400 + 50; // Update position for next node
          }

          
          // Individual analysis card for this image - with generous spacing for stacked mode
          if (analysis && showAnalysis) {
            const horizontalSpacing = Math.max(displayWidth * 1.0, 250); // At least 250px or full image width
            const analysisNode: Node = {
              id: `group-image-analysis-${image.id}`,
              type: 'analysisCard',
              position: { x: padding + displayWidth + horizontalSpacing, y: currentY },
              parentId: `group-container-${group.id}`,
              extent: 'parent',
              data: { 
                analysis,
                onGenerateConcept: stableCallbacks.onGenerateConcept,
                onOpenAnalysisPanel: onOpenAnalysisPanel,
                isGeneratingConcept,
                onExpandedChange: handleAnalysisExpansion
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
            
            // Add concept nodes for this analysis (same as ungrouped)
            const conceptsForAnalysis = generatedConcepts.filter(c => c.analysisId === analysis.id);
            const analysisCardWidth = 400; // Standard width
            let currentConceptXPosition = padding + displayWidth + horizontalSpacing + analysisCardWidth + 100; // After analysis card
            
            conceptsForAnalysis.forEach((concept, conceptIndex) => {
              // Create concept image node (artboard) - use same dimensions as original image
              const conceptImageNode: Node = {
                id: `concept-image-${concept.id}`,
                type: 'conceptImage',
                position: { x: currentConceptXPosition, y: currentY },
                parentId: `group-container-${group.id}`,
                extent: 'parent',
                data: { 
                  concept,
                  originalImage: image,
                  displayWidth,
                  displayHeight
                },
              };
              nodes.push(conceptImageNode);

              // Create concept details node (positioned to the right of concept image)
              const conceptDetailsXPosition = currentConceptXPosition + displayWidth + 100;
              const conceptDetailsNode: Node = {
                id: `concept-details-${concept.id}`,
                type: 'conceptDetails',
                position: { x: conceptDetailsXPosition, y: currentY },
                parentId: `group-container-${group.id}`,
                extent: 'parent',
                data: { concept },
              };
              nodes.push(conceptDetailsNode);

              // Create edge connecting analysis card to concept image
              const conceptImageEdge: Edge = {
                id: `edge-group-${analysis.id}-${concept.id}-image`,
                source: `group-image-analysis-${image.id}`,
                target: `concept-image-${concept.id}`,
                type: 'smoothstep',
                animated: true,
                style: { stroke: 'hsl(var(--primary))' },
              };
              edges.push(conceptImageEdge);

              // Create edge connecting concept image to concept details
              const conceptDetailsEdge: Edge = {
                id: `edge-group-${concept.id}-image-details`,
                source: `concept-image-${concept.id}`,
                target: `concept-details-${concept.id}`,
                type: 'smoothstep',
                animated: true,
                style: { stroke: 'hsl(var(--primary))' },
              };
              edges.push(conceptDetailsEdge);

              // Update position for next concept (if any) - use original image width + spacing + details width
              currentConceptXPosition = conceptDetailsXPosition + 400 + 100;
            });
          }
          
          // Move to next vertical position using triple the image height for stacked mode
          const minVerticalSpace = Math.max(displayHeight * 3, 400); // At least 400px or triple image height
          currentY += minVerticalSpace;
        });
      }
      
      // Group analysis workflow: Check for prompt sessions and analysis results
      const groupSessions = groupPromptSessions.filter(session => session.groupId === group.id);
      const groupAnalysesForGroup = groupAnalysesWithPrompts.filter(analysis => analysis.groupId === group.id);
      
      let rightmostXPosition = 50 + containerWidth + 100;
      
      if (groupSessions.length === 0) {
        // No sessions yet - show prompt collection node
        const promptCollectionNode: Node = {
          id: `group-prompt-${group.id}`,
          type: 'groupPromptCollection',
          position: { x: rightmostXPosition, y: yOffset },
          data: {
            group,
            onSubmitPrompt: onSubmitGroupPrompt,
            isLoading: false,
          },
        };
        nodes.push(promptCollectionNode);
        
        // Create edge connecting container to prompt collection
        const edge: Edge = {
          id: `edge-group-${group.id}-prompt`,
          source: `group-container-${group.id}`,
          sourceHandle: 'analysis',
          target: `group-prompt-${group.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
        };
        edges.push(edge);
      } else {
        // Handle different session states
        const pendingSessions = groupSessions.filter(s => s.status === 'pending');
        const processingSessions = groupSessions.filter(s => s.status === 'processing');
        const completedAnalyses = groupAnalysesForGroup.filter(analysis => {
          const session = groupSessions.find(s => s.id === analysis.sessionId);
          return session?.status === 'completed';
        });
        
        // Show prompt collection nodes for pending sessions (including forks)
        pendingSessions.forEach((session, index) => {
          const promptCollectionNode: Node = {
            id: `group-prompt-${session.id}`,
            type: 'groupPromptCollection',
            position: { x: rightmostXPosition, y: yOffset + (index * 120) },
            data: {
              group,
              onSubmitPrompt: onSubmitGroupPrompt,
              isLoading: false,
            },
          };
          nodes.push(promptCollectionNode);
          
          // Create edge connecting container to prompt collection
          const edge: Edge = {
            id: `edge-group-${group.id}-prompt-${session.id}`,
            source: `group-container-${group.id}`,
            sourceHandle: 'analysis',
            target: `group-prompt-${session.id}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
          };
          edges.push(edge);
        });
        
        // Show processing sessions
        processingSessions.forEach((session, index) => {
          const promptCollectionNode: Node = {
            id: `group-prompt-processing-${session.id}`,
            type: 'groupPromptCollection',
            position: { x: rightmostXPosition + 420, y: yOffset + (index * 120) },
            data: {
              group,
              onSubmitPrompt: onSubmitGroupPrompt,
              isLoading: true,
            },
          };
          nodes.push(promptCollectionNode);
        });
        
        // Show completed analysis results
        if (completedAnalyses.length > 0) {
          // Show most recent completed analysis
          const latestAnalysis = completedAnalyses.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          
          const analysisResultsNode: Node = {
            id: `group-enhanced-${latestAnalysis.id}`,
            type: 'enhancedGroupAnalysis',
            position: { x: rightmostXPosition + 840, y: yOffset },
            data: {
              analysis: latestAnalysis,
              groupName: group.name,
              imageCount: group.imageIds.length,
              onEditPrompt: onEditGroupPrompt,
              onCreateFork: handleCreateForkClick,
              onViewDetails: (analysisId: string) => {
                // Remove informational group analysis view toast
              },
            },
          };
          nodes.push(analysisResultsNode);
          
          // Create edge connecting container to analysis results
          const edge: Edge = {
            id: `edge-group-${group.id}-results`,
            source: `group-container-${group.id}`,
            sourceHandle: 'analysis',
            target: `group-enhanced-${latestAnalysis.id}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeDasharray: '5,5' },
          };
          edges.push(edge);
          
          // Show additional analysis branches if any
          const otherAnalyses = completedAnalyses.filter(analysis => analysis.id !== latestAnalysis.id);
          otherAnalyses.forEach((analysis, index) => {
            const branchNode: Node = {
              id: `group-branch-${analysis.id}`,
              type: 'groupAnalysisResults',
              position: { x: rightmostXPosition + 840, y: yOffset + (index + 1) * 150 },
              data: {
                analysis,
                groupName: group.name,
                onEditPrompt: onEditGroupPrompt,
                onCreateFork: handleCreateForkClick,
                onViewDetails: (analysisId: string) => {
                  // Remove informational group analysis view toast
                },
              },
            };
            nodes.push(branchNode);
            
            // Create edge for branch
            const branchEdge: Edge = {
              id: `edge-group-${group.id}-branch-${analysis.id}`,
              source: `group-enhanced-${latestAnalysis.id}`,
              target: `group-branch-${analysis.id}`,
              type: 'smoothstep',
              animated: false,
              style: { stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3,3' },
            };
            edges.push(branchEdge);
          });
        }
      }
      
      yOffset += containerHeight + 100; // Space between groups
    });

    // Add analysis workflow nodes (requests and progress)
    analysisRequests.forEach(({ imageId, imageName, imageUrl }) => {
      const imageNode = nodes.find(n => n.id === `image-${imageId}`);
      const imagePosition = imageNode?.position || { x: 50, y: yOffset };
      
      const analysisRequestNode: Node = {
        id: `analysis-request-${imageId}`,
        type: 'analysisRequest',
        position: { 
          x: imagePosition.x + 450, // Position to the right of the image
          y: imagePosition.y
        },
        data: {
          imageId,
          imageName,
          imageUrl: imageUrl || '',
          userContext: '',
          onAnalysisComplete: (result: any) => {
            console.log('[CanvasView] Gallery analysis completed:', result);
            setAnalysisRequests(prev => {
              const newMap = new Map(prev);
              newMap.delete(imageId);
              return newMap;
            });
            if (onAnalysisComplete && result.data) {
              onAnalysisComplete(imageId, result.data);
            }
          },
          onError: (error: string) => {
            console.error('[CanvasView] Gallery analysis failed:', error);
            setAnalysisRequests(prev => {
              const newMap = new Map(prev);
              newMap.delete(imageId);
              return newMap;
            });
            toast({
              title: "Analysis Failed",
              description: error,
              variant: "destructive",
              category: "error"
            });
          }
        }
      };
      nodes.push(analysisRequestNode);
      
      // Create edge from image to request node
      const requestEdge: Edge = {
        id: `edge-image-${imageId}-to-request`,
        source: `image-${imageId}`,
        target: `analysis-request-${imageId}`,
        type: 'smoothstep',
        animated: true
      };
      edges.push(requestEdge);
    });


    return { nodes, edges };
  }, [
    uploadedImages, 
    analyses, 
    generatedConcepts, 
    imageGroups, 
    groupAnalysesWithPrompts, 
    groupDisplayModes, 
    showAnnotations, 
    showAnalysis, 
    currentTool, 
    isGeneratingConcept,
    analysisRequests
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Helper function to update analysis node
  const updateAnalysisNode = useCallback((nodeId: string, updates: Partial<any>) => {
    setNodes(nodes => nodes.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  }, []);

  const onStartAnalysis = useCallback(async (imageId: string, imageName: string, context?: string) => {
    console.log('[CanvasView] Starting analysis for image:', imageId, 'with context:', context);
    
    // Find the image node
    const imageNode = nodes.find(n => n.id === `image-${imageId}` && n.type === 'image');
    if (!imageNode) {
      console.error('[CanvasView] Image node not found:', imageId);
      return;
    }

    // Create analysis request node ID
    const analysisNodeId = `analysis-request-${imageId}`;
    
    // Check if analysis node already exists
    const existingNode = nodes.find(n => n.id === analysisNodeId);
    if (existingNode) {
      console.log('[CanvasView] Analysis already in progress for:', imageId);
      return;
    }

    // Create the analysis node
    const analysisNode: Node = {
      id: analysisNodeId,
      type: 'analysisRequest',
      position: {
        x: imageNode.position.x + 350,
        y: imageNode.position.y
      },
      data: {
        imageId,
        imageName,
        status: 'loading',
        progress: 0,
        stage: 'Initializing...'
      }
    };

    // Create edge
    const edge: Edge = {
      id: `edge-${imageId}-${analysisNodeId}`,
      source: `image-${imageId}`,
      target: analysisNodeId,
      type: 'smoothstep'
    };

    // Add to canvas
    setNodes(currentNodes => [...currentNodes, analysisNode]);
    setEdges(currentEdges => [...currentEdges, edge]);

    // Get image data
    const image = uploadedImages.find(img => img.id === imageId);
    if (!image) {
      console.error('[CanvasView] Image not found in uploadedImages:', imageId);
      updateAnalysisNode(analysisNodeId, { status: 'error', error: 'Image not found' });
      return;
    }

    try {
      console.log('[CanvasView] Executing AI analysis for image:', image.url);
      
      // Update node to show progress
      updateAnalysisNode(analysisNodeId, {
        progress: 10,
        stage: 'Starting analysis...',
        status: 'loading'
      });
      
      // Use AIContext which handles blob URL conversion
      const result = await analyzeImageWithAI(
        image.id,
        image.url,
        image.name,
        context || 'General UX analysis'
      );
      
      console.log('[CanvasView] AI analysis result:', result);
      
      // Handle results - AIContext returns data directly
      if (result?.requiresClarification) {
        updateAnalysisNode(analysisNodeId, {
          status: 'clarification',
          clarificationQuestions: result.questions || ['Please provide more context for analysis']
        });
      } else if (result) {
        // Success - create analysis card with the direct result
        onAnalysisComplete?.(imageId, result);
        
        // Remove request node
        setNodes(currentNodes => currentNodes.filter(n => n.id !== analysisNodeId));
        setEdges(currentEdges => currentEdges.filter(e => e.target !== analysisNodeId));
      } else {
        throw new Error('No data returned from AI analysis');
      }
      
    } catch (error) {
      console.error('[CanvasView] Pipeline execution failed:', error);
      updateAnalysisNode(analysisNodeId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
    }
  }, [nodes, uploadedImages, onAnalysisComplete, updateAnalysisNode]);

  const handleStartAnalysis = onStartAnalysis;
  
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
  }, [initialElements.nodes, initialElements.edges, setNodes, setEdges, setIsUpdating]);

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
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
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
    // Remove tool change toast - this is routine UI feedback
  }, [toast, isMobile]);

  const handleToggleAnnotations = useCallback(() => {
    onToggleAnnotations?.();
    // Remove annotation toggle toast - this is routine UI feedback
  }, [onToggleAnnotations, showAnnotations, toast]);

  const handleToggleAnalysis = useCallback(() => {
    setShowAnalysis(prev => !prev);
    // Remove analysis toggle toast - this is routine UI feedback
  }, [showAnalysis, toast]);

  const handleAddComment = useCallback(() => {
    toast({
      title: "Add Comment Mode",
      description: "Click on an artboard to add a new annotation",
      category: "action-required",
    });
  }, [toast]);

  const handleCreateGroup = useCallback(() => {
    if (multiSelection.state.selectedIds.length < 2) {
      toast({
        title: "Select Multiple Images",
        description: "Please select at least 2 images to create a group.",
        category: "error",
      });
      return;
    }
    
    // Directly create group without dialog
    onCreateGroup?.(multiSelection.state.selectedIds);
    multiSelection.clearSelection();
    
    // COMMENTED OUT: Repetitive group creation toast
    // toast({
    //   title: "Group Created",
    //   description: `Successfully created group with ${multiSelection.state.selectedIds.length} images`,
    //   category: "success",
    // });
  }, [onCreateGroup, multiSelection, toast]);




  return (
    <AnnotationOverlayProvider>
      <CanvasContent 
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
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
        uploadedImages={uploadedImages}
        onImageUpload={onImageUpload}
      />
    </AnnotationOverlayProvider>
  );
};

// Separate component to access useAnnotationOverlay hook
interface CanvasContentProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  currentTool: ToolMode;
  showAnnotations: boolean;
  showAnalysis: boolean;
  isMobile: boolean;
  handleToolChange: (tool: ToolMode) => void;
  handleToggleAnnotations: () => void;
  handleToggleAnalysis: () => void;
  handleAddComment: () => void;
  handleCreateGroup: () => void;
  multiSelection: any;
  undo: () => any;
  redo: () => any;
  canUndo: boolean;
  canRedo: boolean;
  setNodes: any;
  setEdges: any;
  setIsUpdating: any;
  uploadedImages: UploadedImage[];
  onImageUpload?: (files: File[]) => void;
}

const CanvasContent: React.FC<CanvasContentProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
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
  uploadedImages,
  onImageUpload,
}) => {
  const { activeAnnotation } = useAnnotationOverlay();
  const isPanningDisabled = !!activeAnnotation;
  
  // Disable node dragging on mobile/tablet screens (768px and under)
  const isNodeDraggingEnabled = currentTool === 'cursor' && !isPanningDisabled && !isMobile;

  // Get selected images for AI toolbar
  const selectedImages = uploadedImages.filter(img => 
    multiSelection.state.selectedIds.includes(img.id)
  );

  return (
    <div className="h-full w-full bg-background relative" style={{ height: '100vh', width: '100%' }}>
      {/* Upload Zone - Show only when no images exist */}
      {onImageUpload && uploadedImages.length === 0 && (
        <CanvasUploadZone 
          onImageUpload={onImageUpload}
          isUploading={false}
          hasImages={uploadedImages.length > 0}
        />
      )}

      {/* AI Canvas Toolbar - Will be added in next phase */}
      

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
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView={uploadedImages.length > 0} // Fit view when images are loaded to center content
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 2
        }}
        style={{ width: '100%', height: '100%' }}
        panOnDrag={!isPanningDisabled}
        panOnScroll={!isPanningDisabled}
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
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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
          onImageUpload={onImageUpload}
          showAnnotations={showAnnotations}
          showAnalysis={showAnalysis}
          currentTool={currentTool}
          hasMultiSelection={multiSelection.state.isMultiSelectMode}
        />
      </ReactFlow>
    </div>
  );
};