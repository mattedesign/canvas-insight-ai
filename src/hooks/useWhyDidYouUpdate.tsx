/**
 * Why Did You Update Hook - Phase 5: Re-render Detection
 * Helps identify unnecessary re-renders and performance issues
 */

import { useEffect, useRef } from 'react';

type Props = Record<string, any>;

export const useWhyDidYouUpdate = (name: string, props: Props) => {
  // Get a mutable ref object where we can store props for comparison next time this hook runs.
  const previousProps = useRef<Props>({});

  useEffect(() => {
    if (previousProps.current) {
      // Get all keys from previous and current props
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      
      // Use this object to keep track of changed props
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      // Iterate through keys and find which have changed
      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      // If something changed, log it
      if (Object.keys(changedProps).length) {
        console.group(`🔍 [${name}] Props that changed:`);
        console.log(changedProps);
        console.groupEnd();
        
        // Performance warning for excessive re-renders
        const renderCount = useRef(0);
        renderCount.current += 1;
        
        if (renderCount.current > 10) {
          console.warn(`⚠️ [${name}] Potential performance issue: ${renderCount.current} re-renders detected`);
        }
      }
    }

    // Finally update previousProps with current props for next hook call
    previousProps.current = props;
  });
};

// Advanced version with performance metrics
export const useWhyDidYouUpdateWithMetrics = (name: string, props: Props) => {
  const previousProps = useRef<Props>({});
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    renderTimes.current.push(renderTime);
    renderCount.current += 1;

    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;

    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        console.group(`🔍 [${name}] Render #${renderCount.current} (${renderTime.toFixed(2)}ms)`);
        console.log('Changed props:', changedProps);
        console.log(`Average render time: ${avgRenderTime.toFixed(2)}ms`);
        console.groupEnd();
      }

      // Performance warnings
      if (renderCount.current > 20) {
        console.error(`🚨 [${name}] CRITICAL: Excessive re-renders (${renderCount.current})`);
      } else if (renderCount.current > 10) {
        console.warn(`⚠️ [${name}] WARNING: High re-render count (${renderCount.current})`);
      }

      if (renderTime > 16) { // More than one frame (60fps)
        console.warn(`⚠️ [${name}] SLOW RENDER: ${renderTime.toFixed(2)}ms (target: <16ms)`);
      }
    }

    previousProps.current = props;
    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
    avgRenderTime: renderTimes.current.length > 0 
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length 
      : 0,
  };
};

// Hook to track component mount/unmount cycles
export const useComponentLifecycle = (name: string) => {
  const mountTime = useRef(performance.now());
  const isMounted = useRef(true);

  useEffect(() => {
    const mountDuration = performance.now() - mountTime.current;
    console.log(`🚀 [${name}] Component mounted (${mountDuration.toFixed(2)}ms)`);

    return () => {
      const totalLifetime = performance.now() - mountTime.current;
      console.log(`💀 [${name}] Component unmounted (lifetime: ${totalLifetime.toFixed(2)}ms)`);
      isMounted.current = false;
    };
  }, [name]);

  return {
    isMounted: isMounted.current,
    mountTime: mountTime.current,
  };
};
