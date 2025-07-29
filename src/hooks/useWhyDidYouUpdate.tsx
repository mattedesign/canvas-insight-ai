/**
 * FIXED: useWhyDidYouUpdate hook - properly follows Rules of Hooks
 * Moved all hook calls to the top level to prevent "Invalid hook call" errors
 */

import { useEffect, useRef } from 'react';

export function useWhyDidYouUpdate<Props extends Record<string, any>>(
  name: string,
  props: Props
): void {
  // CRITICAL FIX: All hooks MUST be at the top level
  const previousProps = useRef<Props>();
  const renderCount = useRef(0);
  
  // Track render count at top level
  renderCount.current += 1;

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', name, changedProps);
        
        // Performance warning for excessive re-renders
        if (renderCount.current > 10) {
          console.warn(`⚠️ [${name}] Potential performance issue: ${renderCount.current} re-renders detected`);
        }
      }
    }

    // Update previousProps with current props for next hook call
    previousProps.current = props;
  });
}

export function useWhyDidYouUpdateWithMetrics<Props extends Record<string, any>>(
  name: string,
  props: Props
): { renderCount: number; avgRenderTime: number } {
  // FIXED: All hooks at top level
  const previousProps = useRef<Props>();
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const renderStart = useRef<number>(performance.now());
  
  // Track render metrics
  renderCount.current += 1;
  const currentRenderTime = performance.now() - renderStart.current;
  renderTimes.current.push(currentRenderTime);
  
  // Keep only last 10 render times
  if (renderTimes.current.length > 10) {
    renderTimes.current = renderTimes.current.slice(-10);
  }

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        const avgRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;
        
        console.log('[why-did-you-update-metrics]', name, {
          changedProps,
          renderCount: renderCount.current,
          currentRenderTime: currentRenderTime.toFixed(2) + 'ms',
          avgRenderTime: avgRenderTime.toFixed(2) + 'ms'
        });
        
        // Performance warnings
        if (renderCount.current > 10) {
          console.warn(`⚠️ [${name}] Excessive re-renders: ${renderCount.current}`);
        }
        
        if (currentRenderTime > 16) {
          console.warn(`⚠️ [${name}] Slow render: ${currentRenderTime.toFixed(2)}ms`);
        }
      }
    }

    previousProps.current = props;
    renderStart.current = performance.now(); // Reset for next render
  });

  const avgRenderTime = renderTimes.current.length > 0 
    ? renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length 
    : 0;

  return {
    renderCount: renderCount.current,
    avgRenderTime
  };
}

export function useComponentLifecycle(name: string): { isMounted: boolean; mountTime: number } {
  // FIXED: All hooks at top level
  const mountTime = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    console.log(`🚀 [${name}] Component mounted at:`, new Date(mountTime.current).toISOString());
    
    return () => {
      const lifetime = Date.now() - mountTime.current;
      console.log(`💀 [${name}] Component unmounted after ${lifetime}ms`);
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array for mount/unmount only

  return {
    isMounted: isMountedRef.current,
    mountTime: mountTime.current
  };
}
