import { useCallback, useRef } from 'react';

export interface LongPressOptions {
  duration?: number;
  threshold?: number;
  onStart?: () => void;
  onCancel?: () => void;
  onLongPress: () => void;
  hapticFeedback?: boolean;
  preventContextMenu?: boolean;
}

export const useLongPress = ({
  duration = 500,
  threshold = 10,
  onStart,
  onCancel,
  onLongPress,
  hapticFeedback = true,
  preventContextMenu = true,
}: LongPressOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const triggerHapticFeedback = useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }
  }, [hapticFeedback]);

  const startLongPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset state
    isLongPressTriggeredRef.current = false;

    // Store starting position
    let clientX: number;
    let clientY: number;
    
    if ('touches' in event) {
      clientX = event.touches[0]?.clientX || 0;
      clientY = event.touches[0]?.clientY || 0;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    startPositionRef.current = { x: clientX, y: clientY };

    // Trigger start callback
    onStart?.();

    // Start long press timer
    timeoutRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      triggerHapticFeedback();
      onLongPress();
    }, duration);
  }, [duration, onStart, onLongPress, triggerHapticFeedback]);

  const handleMove = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!startPositionRef.current || isLongPressTriggeredRef.current) return;

    let clientX: number;
    let clientY: number;
    
    if ('touches' in event) {
      clientX = event.touches[0]?.clientX || 0;
      clientY = event.touches[0]?.clientY || 0;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const deltaX = Math.abs(clientX - startPositionRef.current.x);
    const deltaY = Math.abs(clientY - startPositionRef.current.y);

    // Cancel if moved too far
    if (deltaX > threshold || deltaY > threshold) {
      cancelLongPress();
    }
  }, [threshold]);

  const cancelLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isLongPressTriggeredRef.current) {
      onCancel?.();
    }

    startPositionRef.current = null;
    isLongPressTriggeredRef.current = false;
  }, [onCancel]);

  const handleEnd = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    // If long press was triggered, prevent default click behavior
    if (isLongPressTriggeredRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
    cancelLongPress();
  }, [cancelLongPress]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (preventContextMenu) {
      event.preventDefault();
    }
  }, [preventContextMenu]);

  // Return event handlers with proper React types
  return {
    onTouchStart: startLongPress as React.TouchEventHandler,
    onTouchMove: handleMove as React.TouchEventHandler,
    onTouchEnd: handleEnd as React.TouchEventHandler,
    onMouseDown: startLongPress as React.MouseEventHandler,
    onMouseMove: handleMove as React.MouseEventHandler,
    onMouseUp: handleEnd as React.MouseEventHandler,
    onMouseLeave: cancelLongPress,
    onContextMenu: handleContextMenu,
  };
};