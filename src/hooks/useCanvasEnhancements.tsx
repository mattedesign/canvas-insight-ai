import { useCallback, useEffect } from 'react';
import { Node, Edge, useReactFlow } from '@xyflow/react';

interface CanvasEnhancementsConfig {
  enableVisualEnhancements?: boolean;
  enableFocusEffects?: boolean;
  multiSelectedIds?: string[];
}

export const useCanvasEnhancements = (config: CanvasEnhancementsConfig = {}) => {
  const { 
    enableVisualEnhancements = true, 
    enableFocusEffects = true,
    multiSelectedIds = []
  } = config;
  
  const { setNodes, setEdges } = useReactFlow();

  // Apply enhanced styling classes to nodes
  const enhanceNodes = useCallback((nodes: Node[]) => {
    if (!enableVisualEnhancements) return nodes;

    return nodes.map(node => {
      const isMultiSelected = multiSelectedIds.includes(node.id);
      
      return {
        ...node,
        className: [
          node.className || '',
          'canvas-enhanced',
          isMultiSelected ? 'multi-selected' : ''
        ].filter(Boolean).join(' '),
        data: {
          ...node.data,
          enhanced: true
        }
      };
    });
  }, [enableVisualEnhancements, multiSelectedIds]);

  // Apply enhanced styling classes to edges
  const enhanceEdges = useCallback((edges: Edge[]) => {
    if (!enableVisualEnhancements) return edges;

    return edges.map(edge => ({
      ...edge,
      className: [
        edge.className || '',
        'canvas-enhanced'
      ].filter(Boolean).join(' ')
    }));
  }, [enableVisualEnhancements]);

  // Create focus overlay effect
  const createFocusOverlay = useCallback((targetElement: HTMLElement, x: number, y: number) => {
    if (!enableFocusEffects) return;

    const overlay = document.querySelector('.canvas-focus-overlay') as HTMLElement;
    if (overlay) {
      overlay.style.setProperty('--focus-x', `${x}%`);
      overlay.style.setProperty('--focus-y', `${y}%`);
      overlay.classList.add('active');
      
      setTimeout(() => {
        overlay.classList.remove('active');
      }, 2000);
    }
  }, [enableFocusEffects]);

  // Apply artboard highlight effect
  const highlightArtboard = useCallback((nodeId: string) => {
    if (!enableFocusEffects) return;

    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
    if (nodeElement) {
      // Create highlight overlay
      const highlight = document.createElement('div');
      highlight.className = 'canvas-artboard-highlight';
      highlight.style.left = nodeElement.style.left || '0px';
      highlight.style.top = nodeElement.style.top || '0px';
      highlight.style.width = `${nodeElement.offsetWidth + 8}px`;
      highlight.style.height = `${nodeElement.offsetHeight + 8}px`;
      
      const container = nodeElement.closest('.react-flow__renderer');
      if (container) {
        container.appendChild(highlight);
        
        setTimeout(() => {
          highlight.remove();
        }, 3000);
      }
    }
  }, [enableFocusEffects]);

  // Enhanced node click handler
  const handleEnhancedNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (!enableFocusEffects) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    createFocusOverlay(event.currentTarget as HTMLElement, x, y);
    highlightArtboard(node.id);
  }, [createFocusOverlay, highlightArtboard, enableFocusEffects]);

  // Apply enhancements to existing nodes and edges
  const applyEnhancements = useCallback((nodes: Node[], edges: Edge[]) => {
    const enhancedNodes = enhanceNodes(nodes);
    const enhancedEdges = enhanceEdges(edges);
    
    setNodes(enhancedNodes);
    setEdges(enhancedEdges);
  }, [enhanceNodes, enhanceEdges, setNodes, setEdges]);

  return {
    enhanceNodes,
    enhanceEdges,
    createFocusOverlay,
    highlightArtboard,
    handleEnhancedNodeClick,
    applyEnhancements,
  };
};

// Hook for creating the focus overlay DOM element
export const useFocusOverlay = () => {
  useEffect(() => {
    const container = document.querySelector('.enhanced-canvas-container');
    if (!container) return;

    // Check if overlay already exists
    if (container.querySelector('.canvas-focus-overlay')) return;

    // Create focus overlay element
    const overlay = document.createElement('div');
    overlay.className = 'canvas-focus-overlay';
    container.appendChild(overlay);

    return () => {
      overlay.remove();
    };
  }, []);
};