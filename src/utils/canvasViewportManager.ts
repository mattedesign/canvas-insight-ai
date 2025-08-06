/**
 * Canvas Viewport Management
 * Auto-fit/zoom, bounds calculation, and optimal positioning
 */

import { Node, Edge, Viewport, useReactFlow } from '@xyflow/react';
import { GridPosition } from './professionalGridLayout';
import { DynamicDisplayDimensions } from './dynamicImageSizing';

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  center: { x: number; y: number };
}

export interface ViewportConfig {
  padding: number;
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
  fitViewPadding: number;
}

export const DEFAULT_VIEWPORT_CONFIG: ViewportConfig = {
  padding: 50,
  minZoom: 0.1,
  maxZoom: 2.0,
  defaultZoom: 1.0,
  fitViewPadding: 100
};

/**
 * Calculate content bounds from positions
 */
export function calculateContentBounds(
  positions: Array<GridPosition & { imageId: string }>
): ViewportBounds {
  if (positions.length === 0) {
    return {
      minX: 0,
      maxX: 1200,
      minY: 0,
      maxY: 800,
      width: 1200,
      height: 800,
      center: { x: 600, y: 400 }
    };
  }

  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x + p.width));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y + p.height));

  const width = maxX - minX;
  const height = maxY - minY;
  const center = {
    x: minX + width / 2,
    y: minY + height / 2
  };

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    center
  };
}

/**
 * Calculate optimal viewport to fit all content
 */
export function calculateFitViewport(
  contentBounds: ViewportBounds,
  containerSize: { width: number; height: number },
  config: ViewportConfig = DEFAULT_VIEWPORT_CONFIG
): Viewport {
  const { width: containerWidth, height: containerHeight } = containerSize;
  const { width: contentWidth, height: contentHeight, center } = contentBounds;
  const { fitViewPadding, minZoom, maxZoom } = config;

  // Calculate zoom to fit content with padding
  const availableWidth = containerWidth - (fitViewPadding * 2);
  const availableHeight = containerHeight - (fitViewPadding * 2);
  
  const zoomX = availableWidth / contentWidth;
  const zoomY = availableHeight / contentHeight;
  
  // Use the smaller zoom to ensure all content fits
  const zoom = Math.max(minZoom, Math.min(maxZoom, Math.min(zoomX, zoomY)));

  // Calculate position to center content
  const x = (containerWidth / 2) - (center.x * zoom);
  const y = (containerHeight / 2) - (center.y * zoom);

  return { x, y, zoom };
}

/**
 * Calculate optimal initial positioning for new content
 */
export function calculateOptimalInitialPosition(
  existingBounds: ViewportBounds,
  newContentDimensions: DynamicDisplayDimensions,
  config: ViewportConfig = DEFAULT_VIEWPORT_CONFIG
): { x: number; y: number } {
  const { padding } = config;

  // If no existing content, center in viewport
  if (existingBounds.width === 0 && existingBounds.height === 0) {
    return { x: padding, y: padding };
  }

  // Place new content to the right of existing content
  const x = existingBounds.maxX + padding;
  const y = existingBounds.minY;

  return { x, y };
}

/**
 * Check if viewport needs adjustment
 */
export function shouldAdjustViewport(
  currentViewport: Viewport,
  contentBounds: ViewportBounds,
  containerSize: { width: number; height: number },
  threshold: number = 0.8
): boolean {
  const { x, y, zoom } = currentViewport;
  const { width: containerWidth, height: containerHeight } = containerSize;

  // Calculate visible area
  const visibleWidth = containerWidth / zoom;
  const visibleHeight = containerHeight / zoom;
  const visibleLeft = -x / zoom;
  const visibleTop = -y / zoom;
  const visibleRight = visibleLeft + visibleWidth;
  const visibleBottom = visibleTop + visibleHeight;

  // Calculate how much content is visible
  const visibleContentWidth = Math.max(0, Math.min(contentBounds.maxX, visibleRight) - Math.max(contentBounds.minX, visibleLeft));
  const visibleContentHeight = Math.max(0, Math.min(contentBounds.maxY, visibleBottom) - Math.max(contentBounds.minY, visibleTop));

  const visibleContentRatio = (visibleContentWidth * visibleContentHeight) / (contentBounds.width * contentBounds.height);

  return visibleContentRatio < threshold;
}

/**
 * Smooth viewport transition calculation
 */
export function calculateViewportTransition(
  from: Viewport,
  to: Viewport,
  progress: number
): Viewport {
  const t = easeInOutCubic(progress);
  
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t
  };
}

/**
 * Easing function for smooth transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

/**
 * Canvas viewport manager hook
 */
export function useCanvasViewportManager(config: ViewportConfig = DEFAULT_VIEWPORT_CONFIG) {
  const { fitView, getViewport, setViewport, getNodes } = useReactFlow();

  const fitContentToView = async (
    positions: Array<GridPosition & { imageId: string }>,
    options: { padding?: number; duration?: number } = {}
  ) => {
    const { padding = config.fitViewPadding, duration = 800 } = options;
    
    if (positions.length === 0) return;

    const contentBounds = calculateContentBounds(positions);
    
    // Use React Flow's built-in fitView with nodes
    const nodeIds = positions.map(p => p.imageId);
    await fitView({
      nodes: nodeIds.map(id => ({ id })),
      padding,
      duration
    });
  };

  const centerOnContent = async (
    positions: Array<GridPosition & { imageId: string }>,
    zoom?: number
  ) => {
    if (positions.length === 0) return;

    const contentBounds = calculateContentBounds(positions);
    const currentViewport = getViewport();
    const targetZoom = zoom || currentViewport.zoom;

    const newViewport: Viewport = {
      x: -(contentBounds.center.x * targetZoom) + (window.innerWidth / 2),
      y: -(contentBounds.center.y * targetZoom) + (window.innerHeight / 2),
      zoom: targetZoom
    };

    setViewport(newViewport, { duration: 600 });
  };

  const zoomToContent = async (
    positions: Array<GridPosition & { imageId: string }>,
    zoomLevel: number
  ) => {
    if (positions.length === 0) return;

    const contentBounds = calculateContentBounds(positions);
    const newViewport: Viewport = {
      x: -(contentBounds.center.x * zoomLevel) + (window.innerWidth / 2),
      y: -(contentBounds.center.y * zoomLevel) + (window.innerHeight / 2),
      zoom: Math.max(config.minZoom, Math.min(config.maxZoom, zoomLevel))
    };

    setViewport(newViewport, { duration: 400 });
  };

  const getOptimalViewport = (
    positions: Array<GridPosition & { imageId: string }>
  ): Viewport => {
    if (positions.length === 0) {
      return {
        x: 0,
        y: 0,
        zoom: config.defaultZoom
      };
    }

    const contentBounds = calculateContentBounds(positions);
    const containerSize = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    return calculateFitViewport(contentBounds, containerSize, config);
  };

  const autoFitIfNeeded = async (
    positions: Array<GridPosition & { imageId: string }>
  ) => {
    const currentViewport = getViewport();
    const contentBounds = calculateContentBounds(positions);
    const containerSize = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    if (shouldAdjustViewport(currentViewport, contentBounds, containerSize)) {
      await fitContentToView(positions);
    }
  };

  return {
    fitContentToView,
    centerOnContent,
    zoomToContent,
    getOptimalViewport,
    autoFitIfNeeded,
    calculateContentBounds,
    getCurrentViewport: getViewport,
    setCustomViewport: setViewport
  };
}