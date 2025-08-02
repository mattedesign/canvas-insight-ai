/**
 * ✅ PHASE 5.1: RENDER TRACKER HOOK
 * Hook for tracking component render performance and integration with RenderOptimizationService
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { RenderOptimizationService } from '@/services/RenderOptimizationService';

interface UseRenderTrackerOptions {
  componentName: string;
  enabled?: boolean;
  trackProps?: boolean;
  trackState?: boolean;
  autoDetectRenderReason?: boolean;
  onSlowRender?: (duration: number) => void;
  onUnnecessaryRender?: () => void;
}

interface RenderTrackerResult {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  isSlowRender: boolean;
  totalWarnings: number;
  startRenderTracking: () => void;
  endRenderTracking: (reason?: string) => void;
  markStateChange: () => void;
  trackPropsChange: (changedProps: string[]) => void;
}

export function useRenderTracker({
  componentName,
  enabled = true,
  trackProps = true,
  trackState = true,
  autoDetectRenderReason = true,
  onSlowRender,
  onUnnecessaryRender
}: UseRenderTrackerOptions): RenderTrackerResult {
  const renderOptService = RenderOptimizationService.getInstance();
  
  // Refs for tracking render data
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const propsRef = useRef<any>(null);
  const stateChangedRef = useRef<boolean>(false);
  const propsChangedRef = useRef<string[]>([]);
  const mountTimeRef = useRef<number>(Date.now());
  
  // State for component metrics
  const [metrics, setMetrics] = useState(() => {
    const componentMetrics = renderOptService.getComponentMetrics(componentName);
    return componentMetrics instanceof Map ? null : componentMetrics;
  });

  /**
   * ✅ PHASE 5.1: Start tracking a render
   */
  const startRenderTracking = useCallback(() => {
    if (!enabled) return;
    
    renderStartTime.current = performance.now();
    renderCount.current++;
    stateChangedRef.current = false;
    propsChangedRef.current = [];
  }, [enabled]);

  /**
   * ✅ PHASE 5.1: End tracking and report render
   */
  const endRenderTracking = useCallback((customReason?: string) => {
    if (!enabled || renderStartTime.current === 0) return;
    
    const endTime = performance.now();
    const duration = endTime - renderStartTime.current;
    
    // Determine render reason
    let renderReason = customReason;
    if (!renderReason && autoDetectRenderReason) {
      renderReason = detectRenderReason();
    }
    renderReason = renderReason || 'unknown';
    
    // Track the render
    renderOptService.trackRender(
      componentName,
      duration,
      renderReason,
      propsChangedRef.current,
      stateChangedRef.current,
      propsRef.current
    );
    
    // Get updated metrics
    const updatedMetrics = renderOptService.getComponentMetrics(componentName);
    if (!(updatedMetrics instanceof Map)) {
      setMetrics(updatedMetrics);
    }
    
    // Trigger callbacks
    const slowRenderThreshold = 16; // 16ms for 60fps
    if (duration > slowRenderThreshold && onSlowRender) {
      onSlowRender(duration);
    }
    
    // Check if render was unnecessary
    if (propsChangedRef.current.length === 0 && !stateChangedRef.current && onUnnecessaryRender) {
      onUnnecessaryRender();
    }
    
    // Reset for next render
    renderStartTime.current = 0;
  }, [enabled, autoDetectRenderReason, componentName, renderOptService, onSlowRender, onUnnecessaryRender]);

  /**
   * ✅ PHASE 5.1: Mark that state has changed
   */
  const markStateChange = useCallback(() => {
    if (!enabled) return;
    stateChangedRef.current = true;
  }, [enabled]);

  /**
   * ✅ PHASE 5.1: Track which props have changed
   */
  const trackPropsChange = useCallback((changedProps: string[]) => {
    if (!enabled || !trackProps) return;
    propsChangedRef.current = [...propsChangedRef.current, ...changedProps];
  }, [enabled, trackProps]);

  /**
   * ✅ PHASE 5.1: Detect render reason automatically
   */
  const detectRenderReason = useCallback((): string => {
    const timeSinceMount = Date.now() - mountTimeRef.current;
    
    // Initial mount
    if (renderCount.current === 1) {
      return 'initial-mount';
    }
    
    // State change
    if (stateChangedRef.current) {
      return 'state-change';
    }
    
    // Props change
    if (propsChangedRef.current.length > 0) {
      return `props-change: ${propsChangedRef.current.join(', ')}`;
    }
    
    // Parent re-render (if no props or state changed)
    if (propsChangedRef.current.length === 0 && !stateChangedRef.current) {
      return 'parent-rerender';
    }
    
    // Early render (within 100ms of mount)
    if (timeSinceMount < 100) {
      return 'early-render';
    }
    
    return 'unknown';
  }, []);

  /**
   * ✅ PHASE 5.1: Auto-track component lifecycle
   */
  useEffect(() => {
    if (!enabled) return;
    
    // Start tracking on every render
    startRenderTracking();
    
    // End tracking after render completes
    const timeoutId = setTimeout(() => {
      endRenderTracking();
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
    };
  });

  /**
   * ✅ PHASE 5.1: Auto-detect props changes
   */
  useEffect(() => {
    if (!enabled || !trackProps) return;
    
    // This effect runs when props change
    // We can't automatically detect which specific props changed without 
    // the component passing them to us, but we can detect that props changed
    if (renderCount.current > 1) {
      propsChangedRef.current = ['auto-detected'];
    }
  });

  /**
   * ✅ PHASE 5.1: Track component unmount
   */
  useEffect(() => {
    return () => {
      if (enabled) {
        // Track unmount event
        renderOptService.trackRender(
          componentName,
          0,
          'component-unmount',
          [],
          false
        );
      }
    };
  }, [enabled, componentName, renderOptService]);

  /**
   * ✅ PHASE 5.1: Get current warnings count
   */
  const totalWarnings = metrics 
    ? renderOptService.getWarnings().filter(w => w.componentName === componentName).length
    : 0;

  return {
    renderCount: metrics?.renderCount || 0,
    averageRenderTime: metrics?.averageRenderTime || 0,
    lastRenderTime: metrics?.lastRenderTime || 0,
    isSlowRender: (metrics?.lastRenderTime || 0) > 16,
    totalWarnings,
    startRenderTracking,
    endRenderTracking,
    markStateChange,
    trackPropsChange
  };
}

/**
 * ✅ PHASE 5.1: Enhanced render tracker with automatic props detection
 */
export function useRenderTrackerWithProps<T extends Record<string, any>>(
  componentName: string,
  props: T,
  options: Omit<UseRenderTrackerOptions, 'componentName'> = {}
): RenderTrackerResult & {
  propsChanged: string[];
  previousProps: T | null;
} {
  const previousProps = useRef<T | null>(null);
  const [propsChanged, setPropsChanged] = useState<string[]>([]);

  // Detect props changes
  useEffect(() => {
    if (previousProps.current === null) {
      previousProps.current = props;
      return;
    }

    const changed: string[] = [];
    const prevProps = previousProps.current;

    // Compare each prop
    Object.keys(props).forEach(key => {
      if (props[key] !== prevProps[key]) {
        changed.push(key);
      }
    });

    // Check for removed props
    Object.keys(prevProps).forEach(key => {
      if (!(key in props)) {
        changed.push(`-${key}`);
      }
    });

    setPropsChanged(changed);
    previousProps.current = props;
  }, [props]);

  const tracker = useRenderTracker({
    componentName,
    ...options
  });

  // Auto-track props changes
  useEffect(() => {
    if (propsChanged.length > 0) {
      tracker.trackPropsChange(propsChanged);
    }
  }, [propsChanged, tracker]);

  return {
    ...tracker,
    propsChanged,
    previousProps: previousProps.current
  };
}

/**
 * ✅ PHASE 5.1: Simple render tracker for quick integration
 */
export function useSimpleRenderTracker(componentName: string): {
  renderCount: number;
  averageRenderTime: number;
  isPerformant: boolean;
} {
  const tracker = useRenderTracker({
    componentName,
    enabled: process.env.NODE_ENV === 'development',
    trackProps: false,
    trackState: false,
    autoDetectRenderReason: true
  });

  return {
    renderCount: tracker.renderCount,
    averageRenderTime: tracker.averageRenderTime,
    isPerformant: tracker.averageRenderTime < 16 && tracker.totalWarnings === 0
  };
}

/**
 * ✅ PHASE 5.1: Render tracker for debugging specific components
 */
export function useDebugRenderTracker(
  componentName: string,
  debugLevel: 'basic' | 'detailed' | 'verbose' = 'basic'
): RenderTrackerResult & {
  debugInfo: {
    totalRenders: number;
    slowRenders: number;
    unnecessaryRenders: number;
    averageRenderTime: number;
    peakRenderTime: number;
    warnings: Array<{ type: string; message: string; severity: string }>;
    recommendations: Array<{ issue: string; solution: string }>;
  };
} {
  const renderOptService = RenderOptimizationService.getInstance();
  
  const tracker = useRenderTracker({
    componentName,
    enabled: true,
    trackProps: true,
    trackState: true,
    autoDetectRenderReason: true,
    onSlowRender: (duration) => {
      if (debugLevel === 'verbose') {
        console.warn(`[DebugRenderTracker] ${componentName} slow render: ${duration.toFixed(2)}ms`);
      }
    },
    onUnnecessaryRender: () => {
      if (debugLevel === 'detailed' || debugLevel === 'verbose') {
        console.warn(`[DebugRenderTracker] ${componentName} unnecessary render detected`);
      }
    }
  });

  const metrics = renderOptService.getComponentMetrics(componentName);
  const componentMetrics = metrics instanceof Map ? null : metrics;
  const warnings = renderOptService.getWarnings().filter(w => w.componentName === componentName);
  const recommendations = renderOptService.getRecommendations(componentName);

  const debugInfo = {
    totalRenders: componentMetrics?.renderCount || 0,
    slowRenders: componentMetrics?.slowRenderCount || 0,
    unnecessaryRenders: componentMetrics?.unnecessaryRenders || 0,
    averageRenderTime: componentMetrics?.averageRenderTime || 0,
    peakRenderTime: componentMetrics?.peakRenderTime || 0,
    warnings: warnings.map(w => ({
      type: w.type,
      message: w.message,
      severity: w.severity
    })),
    recommendations: recommendations.map(r => ({
      issue: r.issue,
      solution: r.solution
    }))
  };

  // Log debug info periodically
  useEffect(() => {
    if (debugLevel === 'verbose' && componentMetrics?.renderCount && componentMetrics.renderCount % 10 === 0) {
      console.log(`[DebugRenderTracker] ${componentName} debug info:`, debugInfo);
    }
  }, [debugLevel, componentName, componentMetrics?.renderCount, debugInfo]);

  return {
    ...tracker,
    debugInfo
  };
}