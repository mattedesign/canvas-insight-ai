/**
 * Performance Monitoring Hook
 * Tracks component renders, memory usage, and performance metrics
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  memoryUsage?: number;
  componentMountTime: number;
  lastRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enableMemoryTracking?: boolean;
  enableDetailedLogging?: boolean;
  maxSamples?: number;
}

export function usePerformanceMonitor({
  componentName,
  enableMemoryTracking = false,
  enableDetailedLogging = false,
  maxSamples = 100,
}: UsePerformanceMonitorOptions) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    componentMountTime: Date.now(),
    lastRenderTime: 0,
  });
  
  const renderTimes = useRef<number[]>([]);
  const lastRenderStart = useRef<number>(0);
  const mountTime = useRef<number>(Date.now());
  
  // Start render timing
  useEffect(() => {
    lastRenderStart.current = performance.now();
  });
  
  // End render timing and update metrics
  useEffect(() => {
    const renderTime = performance.now() - lastRenderStart.current;
    
    renderTimes.current.push(renderTime);
    
    // Keep only recent samples
    if (renderTimes.current.length > maxSamples) {
      renderTimes.current = renderTimes.current.slice(-maxSamples);
    }
    
    const averageRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
    const maxRenderTime = Math.max(...renderTimes.current);
    
    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      averageRenderTime,
      maxRenderTime,
      lastRenderTime: renderTime,
      memoryUsage: enableMemoryTracking ? getMemoryUsage() : undefined,
    }));
    
    if (enableDetailedLogging && renderTime > 16) { // Warn if render takes longer than 16ms
      console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms`);
    }
  });
  
  const getMemoryUsage = useCallback((): number | undefined => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    return undefined;
  }, []);
  
  const logMetrics = useCallback(() => {
    const uptime = Date.now() - mountTime.current;
    console.group(`[Performance] ${componentName} Metrics`);
    console.log(`Renders: ${metrics.renderCount}`);
    console.log(`Average render time: ${metrics.averageRenderTime.toFixed(2)}ms`);
    console.log(`Max render time: ${metrics.maxRenderTime.toFixed(2)}ms`);
    console.log(`Component uptime: ${uptime}ms`);
    if (metrics.memoryUsage) {
      console.log(`Memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
    }
    console.groupEnd();
  }, [componentName, metrics]);
  
  const resetMetrics = useCallback(() => {
    renderTimes.current = [];
    setMetrics({
      renderCount: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      componentMountTime: Date.now(),
      lastRenderTime: 0,
      memoryUsage: enableMemoryTracking ? getMemoryUsage() : undefined,
    });
  }, [enableMemoryTracking, getMemoryUsage]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (enableDetailedLogging) {
        logMetrics();
      }
    };
  }, [enableDetailedLogging, logMetrics]);
  
  return {
    metrics,
    logMetrics,
    resetMetrics,
    getMemoryUsage,
  };
}

// Hook for monitoring expensive operations
export function useOperationProfiler() {
  const operations = useRef<Map<string, { start: number; samples: number[] }>>(new Map());
  
  const startOperation = useCallback((operationId: string) => {
    operations.current.set(operationId, {
      start: performance.now(),
      samples: operations.current.get(operationId)?.samples || [],
    });
  }, []);
  
  const endOperation = useCallback((operationId: string) => {
    const operation = operations.current.get(operationId);
    if (!operation) return 0;
    
    const duration = performance.now() - operation.start;
    operation.samples.push(duration);
    
    // Keep only recent samples
    if (operation.samples.length > 50) {
      operation.samples = operation.samples.slice(-50);
    }
    
    return duration;
  }, []);
  
  const getOperationStats = useCallback((operationId: string) => {
    const operation = operations.current.get(operationId);
    if (!operation || operation.samples.length === 0) {
      return null;
    }
    
    const samples = operation.samples;
    const average = samples.reduce((a, b) => a + b, 0) / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    
    return {
      sampleCount: samples.length,
      averageTime: average,
      minTime: min,
      maxTime: max,
    };
  }, []);
  
  return {
    startOperation,
    endOperation,
    getOperationStats,
  };
}
