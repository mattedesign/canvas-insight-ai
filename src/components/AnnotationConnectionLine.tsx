import React, { useEffect, useRef, useState, useCallback } from 'react';

interface AnnotationConnectionLineProps {
  markerPosition: { x: number; y: number };
  dialogPosition: { x: number; y: number };
  dialogSize: { width: number; height: number };
  isVisible: boolean;
  annotationId: string; // Add ID to track the specific marker
}

export const AnnotationConnectionLine: React.FC<AnnotationConnectionLineProps> = ({
  markerPosition,
  dialogPosition,
  dialogSize,
  isVisible,
  annotationId
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewportSize, setViewportSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  const [actualMarkerPosition, setActualMarkerPosition] = useState(markerPosition);

  // Find the actual annotation marker element and track its position
  const updateMarkerPosition = useCallback(() => {
    const markerElements = document.querySelectorAll(`[data-annotation-id="${annotationId}"]`);
    if (markerElements.length > 0) {
      const markerElement = markerElements[0] as HTMLElement;
      const rect = markerElement.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      setActualMarkerPosition({
        x: rect.left + rect.width / 2 + scrollX,
        y: rect.top + rect.height / 2 + scrollY
      });
    }
  }, [annotationId]);

  // Update viewport size and marker position on resize and scroll
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
      updateMarkerPosition();
    };

    const handleScroll = () => {
      updateMarkerPosition();
    };

    // Initial position update
    updateMarkerPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
    
    // Use animation frame for smooth updates
    const animationId = requestAnimationFrame(updateMarkerPosition);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      cancelAnimationFrame(animationId);
    };
  }, [updateMarkerPosition]);

  if (!isVisible) return null;

  // Calculate the optimal connection points using actual marker position
  const calculateConnectionPoints = () => {
    const markerX = actualMarkerPosition.x;
    const markerY = actualMarkerPosition.y;
    
    // Dialog bounds
    const dialogLeft = dialogPosition.x;
    const dialogTop = dialogPosition.y;
    const dialogRight = dialogLeft + dialogSize.width;
    const dialogBottom = dialogTop + dialogSize.height;
    const dialogCenterX = dialogLeft + dialogSize.width / 2;
    const dialogCenterY = dialogTop + dialogSize.height / 2;

    // Find the closest edge point on the dialog
    let dialogX, dialogY;

    // Determine which edge of the dialog is closest to the marker
    const distanceToLeft = Math.abs(markerX - dialogLeft);
    const distanceToRight = Math.abs(markerX - dialogRight);
    const distanceToTop = Math.abs(markerY - dialogTop);
    const distanceToBottom = Math.abs(markerY - dialogBottom);

    const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);

    if (minDistance === distanceToLeft) {
      // Connect to left edge
      dialogX = dialogLeft;
      dialogY = Math.max(dialogTop + 20, Math.min(dialogBottom - 20, markerY));
    } else if (minDistance === distanceToRight) {
      // Connect to right edge
      dialogX = dialogRight;
      dialogY = Math.max(dialogTop + 20, Math.min(dialogBottom - 20, markerY));
    } else if (minDistance === distanceToTop) {
      // Connect to top edge
      dialogX = Math.max(dialogLeft + 20, Math.min(dialogRight - 20, markerX));
      dialogY = dialogTop;
    } else {
      // Connect to bottom edge
      dialogX = Math.max(dialogLeft + 20, Math.min(dialogRight - 20, markerX));
      dialogY = dialogBottom;
    }

    return {
      start: { x: markerX, y: markerY },
      end: { x: dialogX, y: dialogY }
    };
  };

  const { start, end } = calculateConnectionPoints();

  // Create a smooth curved path
  const createPath = () => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Control point for smooth curve
    const controlOffset = Math.min(distance * 0.3, 50);
    const controlX = start.x + deltaX * 0.5;
    const controlY = start.y + deltaY * 0.5 - controlOffset;

    return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
  };

  const pathData = createPath();

  return (
    <svg
      ref={svgRef}
      className="fixed top-0 left-0 pointer-events-none z-[55]"
      style={{
        width: viewportSize.width,
        height: viewportSize.height
      }}
    >
      <defs>
        {/* Gradient for the line */}
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
        </linearGradient>
        
        {/* Animated dash pattern */}
        <pattern id="dashPattern" x="0" y="0" width="10" height="1" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="5" height="1" fill="url(#connectionGradient)">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0;10,0;0,0"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        </pattern>
      </defs>

      {/* Drop shadow */}
      <path
        d={pathData}
        stroke="hsl(var(--primary) / 0.2)"
        strokeWidth="4"
        fill="none"
        strokeDasharray="8 4"
        transform="translate(2, 2)"
      />
      
      {/* Main connection line */}
      <path
        d={pathData}
        stroke="url(#connectionGradient)"
        strokeWidth="2"
        fill="none"
        strokeDasharray="8 4"
        className="animate-pulse"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="12;0;12"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Start point indicator */}
      <circle
        cx={start.x}
        cy={start.y}
        r="3"
        fill="hsl(var(--primary))"
        className="animate-pulse"
      />

      {/* End point indicator */}
      <circle
        cx={end.x}
        cy={end.y}
        r="2"
        fill="hsl(var(--primary) / 0.6)"
      />
    </svg>
  );
};