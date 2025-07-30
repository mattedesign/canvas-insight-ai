/**
 * Re-render Detection Hook - Phase 5.1: Re-render Detection
 * Implements useWhyDidYouUpdate and console warnings for unexpected re-renders
 */

import { useEffect, useRef } from 'react';

interface UseWhyDidYouUpdateProps {
  name: string;
  props: Record<string, any>;
  enabled?: boolean;
}

/**
 * Hook to debug why a component re-rendered
 * Logs which props changed between renders
 */
export function useWhyDidYouUpdate({ 
  name, 
  props, 
  enabled = process.env.NODE_ENV === 'development' 
}: UseWhyDidYouUpdateProps) {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (!enabled) return;

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
        console.log('[WhyDidYouUpdate]', name, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Hook to detect excessive re-renders
 * Warns when a component re-renders too frequently
 */
export function useRerenderCounter(
  componentName: string,
  threshold: number = 10,
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const renderCount = useRef(0);
  const lastResetTime = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastReset = now - lastResetTime.current;

    // Reset counter every 5 seconds
    if (timeSinceLastReset > 5000) {
      renderCount.current = 1;
      lastResetTime.current = now;
      return;
    }

    // Warn if threshold exceeded
    if (renderCount.current > threshold) {
      console.warn(
        `[RerenderDetection] ${componentName} has re-rendered ${renderCount.current} times in ${timeSinceLastReset}ms. This may indicate a performance issue.`
      );
      
      // Reset counter after warning
      renderCount.current = 0;
      lastResetTime.current = now;
    }
  });

  return renderCount.current;
}

/**
 * Hook to monitor specific dependencies for changes
 * Helps identify which dependencies are causing re-renders
 */
export function useDependencyMonitor(
  componentName: string,
  dependencies: any[],
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const previousDeps = useRef<any[]>();

  useEffect(() => {
    if (!enabled) return;

    if (previousDeps.current) {
      const changedIndexes: number[] = [];
      
      dependencies.forEach((dep, index) => {
        if (previousDeps.current![index] !== dep) {
          changedIndexes.push(index);
        }
      });

      if (changedIndexes.length > 0) {
        console.log(
          `[DependencyMonitor] ${componentName} dependencies changed:`,
          changedIndexes.map(index => ({
            index,
            from: previousDeps.current![index],
            to: dependencies[index]
          }))
        );
      }
    }

    previousDeps.current = [...dependencies];
  }, dependencies);
}

/**
 * Performance monitoring hook for critical components
 */
export function useComponentPerformanceMonitor(
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const renderStartTime = useRef(Date.now());
  const renderCount = useRef(0);
  const totalRenderTime = useRef(0);

  // Track render start
  renderStartTime.current = Date.now();
  renderCount.current += 1;

  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = Date.now();
    const renderDuration = renderEndTime - renderStartTime.current;
    totalRenderTime.current += renderDuration;

    // Log slow renders
    if (renderDuration > 100) {
      console.warn(
        `[PerformanceMonitor] ${componentName} took ${renderDuration}ms to render (render #${renderCount.current})`
      );
    }

    // Log average render time every 50 renders
    if (renderCount.current % 50 === 0) {
      const avgRenderTime = totalRenderTime.current / renderCount.current;
      console.log(
        `[PerformanceMonitor] ${componentName} average render time: ${avgRenderTime.toFixed(2)}ms over ${renderCount.current} renders`
      );
    }
  });

  return {
    renderCount: renderCount.current,
    avgRenderTime: renderCount.current > 0 ? totalRenderTime.current / renderCount.current : 0
  };
}