/**
 * PHASE 5.1: Re-render Detection and Performance Monitoring
 * Implements useWhyDidYouUpdate hook for debugging and render count tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Enhanced render tracking with performance metrics
interface RenderMetrics {
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  slowRenders: number; // Renders > 16ms
  propsChanges: Array<{
    timestamp: number;
    changedProps: string[];
    renderTime: number;
  }>;
}

interface UseRenderCountMonitorProps {
  componentName: string;
  props?: Record<string, any>;
  slowRenderThreshold?: number; // ms
  maxHistorySize?: number;
}

export const useRenderCountMonitor = ({
  componentName,
  props = {},
  slowRenderThreshold = 16,
  maxHistorySize = 50
}: UseRenderCountMonitorProps) => {
  const renderCountRef = useRef(0);
  const renderStartTime = useRef<number>(0);
  const previousProps = useRef<Record<string, any>>(props);
  const totalRenderTimeRef = useRef(0);
  const slowRendersRef = useRef(0);
  const renderHistoryRef = useRef<RenderMetrics['propsChanges']>([]);
  
  const [metrics, setMetrics] = useState<RenderMetrics>({
    renderCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    slowRenders: 0,
    propsChanges: []
  });

  // Start render timing
  renderStartTime.current = performance.now();
  renderCountRef.current += 1;

  useEffect(() => {
    // Calculate render time
    const renderTime = performance.now() - renderStartTime.current;
    totalRenderTimeRef.current += renderTime;
    
    if (renderTime > slowRenderThreshold) {
      slowRendersRef.current += 1;
    }

    // Detect prop changes
    const changedProps: string[] = [];
    const currentProps = props;
    
    Object.keys(currentProps).forEach(key => {
      if (previousProps.current[key] !== currentProps[key]) {
        changedProps.push(key);
      }
    });

    // Check for new or removed props
    Object.keys(previousProps.current).forEach(key => {
      if (!(key in currentProps)) {
        changedProps.push(`-${key}`); // Removed prop
      }
    });

    // Add to history
    if (changedProps.length > 0 || renderCountRef.current === 1) {
      const historyEntry = {
        timestamp: Date.now(),
        changedProps,
        renderTime
      };
      
      renderHistoryRef.current.push(historyEntry);
      
      // Limit history size
      if (renderHistoryRef.current.length > maxHistorySize) {
        renderHistoryRef.current = renderHistoryRef.current.slice(-maxHistorySize);
      }
    }

    // Update metrics
    const newMetrics: RenderMetrics = {
      renderCount: renderCountRef.current,
      totalRenderTime: totalRenderTimeRef.current,
      averageRenderTime: totalRenderTimeRef.current / renderCountRef.current,
      lastRenderTime: renderTime,
      slowRenders: slowRendersRef.current,
      propsChanges: [...renderHistoryRef.current]
    };

    setMetrics(newMetrics);

    // Log excessive re-renders
    if (renderCountRef.current > 10 && renderCountRef.current % 5 === 0) {
      console.warn(
        `🔄 [${componentName}] Excessive re-renders detected:`,
        {
          count: renderCountRef.current,
          averageTime: newMetrics.averageRenderTime.toFixed(2) + 'ms',
          slowRenders: slowRendersRef.current,
          recentChanges: changedProps
        }
      );
    }

    // Log slow renders
    if (renderTime > slowRenderThreshold) {
      console.warn(
        `🐌 [${componentName}] Slow render detected:`,
        {
          renderTime: renderTime.toFixed(2) + 'ms',
          changedProps,
          renderCount: renderCountRef.current
        }
      );
    }

    // Update previous props
    previousProps.current = { ...currentProps };
  });

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    totalRenderTimeRef.current = 0;
    slowRendersRef.current = 0;
    renderHistoryRef.current = [];
    setMetrics({
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      slowRenders: 0,
      propsChanges: []
    });
  }, []);

  // Get detailed analysis
  const getAnalysis = useCallback(() => {
    const frequentChanges = renderHistoryRef.current
      .flatMap(entry => entry.changedProps)
      .reduce((acc, prop) => {
        acc[prop] = (acc[prop] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      isHealthy: renderCountRef.current < 20 && slowRendersRef.current < 5,
      performanceScore: Math.max(0, 100 - (slowRendersRef.current * 10) - Math.max(0, renderCountRef.current - 10)),
      frequentChanges: Object.entries(frequentChanges)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      recommendations: generateRecommendations(metrics, frequentChanges)
    };
  }, [metrics]);

  return {
    metrics,
    resetMetrics,
    getAnalysis,
    isExcessiveRendering: renderCountRef.current > 20,
    hasSlowRenders: slowRendersRef.current > 0
  };
};

// Generate performance recommendations
function generateRecommendations(
  metrics: RenderMetrics, 
  frequentChanges: Record<string, number>
): string[] {
  const recommendations: string[] = [];

  if (metrics.renderCount > 20) {
    recommendations.push('Consider memoizing this component with React.memo()');
  }

  if (metrics.slowRenders > 5) {
    recommendations.push('Component has slow renders - consider optimization');
  }

  if (metrics.averageRenderTime > 10) {
    recommendations.push('Average render time is high - profile component performance');
  }

  const topChangingProp = Object.entries(frequentChanges)[0];
  if (topChangingProp && topChangingProp[1] > 10) {
    recommendations.push(`Prop "${topChangingProp[0]}" changes frequently - consider optimization`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Component performance looks good!');
  }

  return recommendations;
}

// Hook for tracking specific operations
export const useOperationMonitor = (operationName: string) => {
  const operationsRef = useRef<Array<{ name: string; duration: number; timestamp: number }>>([]);
  
  const startOperation = useCallback(() => {
    return performance.now();
  }, []);

  const endOperation = useCallback((startTime: number) => {
    const duration = performance.now() - startTime;
    const operation = {
      name: operationName,
      duration,
      timestamp: Date.now()
    };
    
    operationsRef.current.push(operation);
    
    // Log slow operations
    if (duration > 100) {
      console.warn(`🐌 Slow operation [${operationName}]:`, duration.toFixed(2) + 'ms');
    }
    
    return operation;
  }, [operationName]);

  const getOperationStats = useCallback(() => {
    const operations = operationsRef.current;
    if (operations.length === 0) return null;

    const durations = operations.map(op => op.duration);
    return {
      count: operations.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      recentOperations: operations.slice(-10)
    };
  }, []);

  return {
    startOperation,
    endOperation,
    getOperationStats
  };
};