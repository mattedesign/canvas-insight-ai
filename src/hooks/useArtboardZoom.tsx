import React, { useCallback, useRef, useEffect } from 'react';
import { useReactFlow, Node } from '@xyflow/react';

interface ArtboardZoomHandlerProps {
  selectedNodes: Node[];
}

export const ArtboardZoomHandler: React.FC<ArtboardZoomHandlerProps> = ({ selectedNodes }) => {
  const { setViewport, getViewport } = useReactFlow();
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);

  const zoomToArtboard = useCallback((node: Node, zoomDelta: number) => {
    const currentViewport = getViewport();
    const nodeElement = document.querySelector(`[data-id="${node.id}"]`) as HTMLElement;
    
    if (!nodeElement) return;

    // Get node bounds
    const nodeRect = nodeElement.getBoundingClientRect();
    const containerRect = nodeElement.closest('.react-flow')?.getBoundingClientRect();
    
    if (!containerRect) return;

    // Calculate the center of the node relative to the viewport
    const nodeCenterX = node.position.x + (nodeRect.width / 2);
    const nodeCenterY = node.position.y + (nodeRect.height / 2);
    
    // Calculate new zoom level
    const zoomFactor = 1.1;
    const newZoom = zoomDelta > 0 
      ? Math.min(currentViewport.zoom * zoomFactor, 2) // max zoom 2x
      : Math.max(currentViewport.zoom / zoomFactor, 0.1); // min zoom 0.1x
    
    // Calculate the center of the viewport
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;
    
    // Calculate new pan to keep the node center in the viewport center
    const newX = viewportCenterX - (nodeCenterX * newZoom);
    const newY = viewportCenterY - (nodeCenterY * newZoom);
    
    setViewport({
      x: newX,
      y: newY,
      zoom: newZoom,
    }, { duration: 200 });
  }, [setViewport, getViewport]);

  const handleWheel = useCallback((event: WheelEvent) => {
    // Only handle wheel events if we have a selected artboard
    if (selectedNodes.length !== 1) return;
    
    const selectedNode = selectedNodes[0];
    
    // Check if the node is an image or analysisCard (artboard types)
    if (!selectedNode.type || !['image', 'analysisCard'].includes(selectedNode.type)) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Determine scroll direction based on OS settings
    // deltaY > 0 typically means scroll down, deltaY < 0 means scroll up
    // On macOS with natural scrolling, this might be inverted
    const zoomDelta = -event.deltaY;
    
    zoomToArtboard(selectedNode, zoomDelta);
  }, [selectedNodes, zoomToArtboard]);

  useEffect(() => {
    const reactFlowElement = document.querySelector('.react-flow');
    if (!reactFlowElement) return;

    // Remove existing wheel handler if any
    if (wheelHandlerRef.current) {
      reactFlowElement.removeEventListener('wheel', wheelHandlerRef.current);
    }

    // Add new wheel handler if we have selected artboards
    if (selectedNodes.length === 1) {
      wheelHandlerRef.current = handleWheel;
      reactFlowElement.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (wheelHandlerRef.current && reactFlowElement) {
        reactFlowElement.removeEventListener('wheel', wheelHandlerRef.current);
      }
    };
  }, [handleWheel, selectedNodes]);

  return null; // This component doesn't render anything
};
