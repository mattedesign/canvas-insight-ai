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
import { UXAnalysis, UploadedImage, GeneratedConcept, ImageGroup, GroupAnalysis, GroupPromptSession, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { ImageNode } from './ImageNode';
import { AnalysisCardNode } from './AnalysisCardNode';
import { ConceptImageNode } from './ConceptImageNode';
import { ConceptDetailsNode } from './ConceptDetailsNode';
import { GroupNode } from './GroupNode';
import { GroupContainerNode } from './GroupContainerNode';
import { GroupAnalysisCardNode } from './GroupAnalysisCardNode';
import { GroupPromptCollectionNode } from './GroupPromptCollectionNode';
import { GroupAnalysisResultsNode } from './GroupAnalysisResultsNode';
import { ImageLoadingNode } from './ImageLoadingNode';
import { AnalysisLoadingNode } from './AnalysisLoadingNode';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useMultiSelection } from '@/hooks/useMultiSelection';
import { FloatingToolbar, ToolMode } from '../FloatingToolbar';
import { useToast } from '@/hooks/use-toast';
import { AnnotationOverlayProvider, useAnnotationOverlay } from '../AnnotationOverlay';


import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';

const nodeTypes = {
  image: ImageNode,
  analysisCard: AnalysisCardNode,
  conceptImage: ConceptImageNode,
  conceptDetails: ConceptDetailsNode,
  group: GroupContainerNode,
  groupAnalysisCard: GroupAnalysisCardNode,
  groupPromptCollection: GroupPromptCollectionNode,
  groupAnalysisResults: GroupAnalysisResultsNode,
  imageLoading: ImageLoadingNode,
  analysisLoading: AnalysisLoadingNode,
};

interface CanvasViewProps {
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
  uploadedImages,
  analyses,
  generatedConcepts,
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
  
  // Debug log to check onImageUpload
  console.log('CanvasView onImageUpload:', onImageUpload);
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  
  
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

  // Fork creation handler - directly create fork without modal
  const handleCreateForkClick = useCallback((sessionId: string) => {
    if (onCreateFork) {
      onCreateFork(sessionId);
      toast({
        title: "Fork Created",
        description: "Created new analysis branch - add your prompt to continue",
      });
    }
  }, [onCreateFork, toast]);

  // Handle analysis panel opening
  const handleAnalysisExpansion = useCallback((analysisId: string) => {
    onOpenAnalysisPanel?.(analysisId);
  }, [onOpenAnalysisPanel]);

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
          }
        },
      };
      nodes.push(imageNode);

      let rightmostXPosition = 50 + displayWidth + horizontalSpacing;

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
          const maxDisplayHeight = Math.min(image.dimensions.height, window.innerHeight * 0.3);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 400);
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
          const maxDisplayHeight = Math.min(image.dimensions.height, 200);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 250);
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
          const maxDisplayHeight = Math.min(image.dimensions.height, window.innerHeight * 0.3);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 400);
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
              }
            },
          };
          nodes.push(imageNode);
          
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
          const maxDisplayHeight = Math.min(image.dimensions.height, 200);
          const scaleFactor = maxDisplayHeight / image.dimensions.height;
          const displayWidth = Math.min(image.dimensions.width * scaleFactor, 250);
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
              }
            },
          };
          nodes.push(imageNode);
          
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
            id: `group-results-${latestAnalysis.id}`,
            type: 'groupAnalysisResults',
            position: { x: rightmostXPosition + 840, y: yOffset },
            data: {
              analysis: latestAnalysis,
              groupName: group.name,
                onEditPrompt: onEditGroupPrompt,
                onCreateFork: handleCreateForkClick,
              onViewDetails: (analysisId: string) => {
                toast({
                  title: "Group Analysis Details",
                  description: `Viewing detailed analysis for group "${group.name}"`,
                });
              },
            },
          };
          nodes.push(analysisResultsNode);
          
          // Create edge connecting container to analysis results
          const edge: Edge = {
            id: `edge-group-${group.id}-results`,
            source: `group-container-${group.id}`,
            sourceHandle: 'analysis',
            target: `group-results-${latestAnalysis.id}`,
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
                  toast({
                    title: "Group Analysis Details",
                    description: `Viewing detailed analysis for group "${group.name}"`,
                  });
                },
              },
            };
            nodes.push(branchNode);
            
            // Create edge for branch
            const branchEdge: Edge = {
              id: `edge-group-${group.id}-branch-${analysis.id}`,
              source: `group-results-${latestAnalysis.id}`,
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

    return { nodes, edges };
  }, [uploadedImages, analyses, generatedConcepts, imageGroups, groupAnalyses, groupPromptSessions, groupAnalysesWithPrompts, groupDisplayModes, showAnnotations, showAnalysis, currentTool, isGeneratingConcept, onGroupDisplayModeChange, onSubmitGroupPrompt, onEditGroupPrompt, handleCreateForkClick, handleAnalysisExpansion, groups, handleViewGroup, handleAnalyzeGroup, handleDeleteGroup, stableCallbacks, toast]);

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
        description: "Please select at least 2 images to create a group.",
        variant: "destructive",
      });
      return;
    }
    
    // Directly create group without dialog
    onCreateGroup?.(multiSelection.state.selectedIds);
    multiSelection.clearSelection();
    
    toast({
      title: "Group Created",
      description: `Successfully created group with ${multiSelection.state.selectedIds.length} images`,
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