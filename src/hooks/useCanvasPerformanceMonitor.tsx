import { useEffect, useState, useCallback, useRef } from 'react';
import { canvasPerformanceMonitor } from '@/services/CanvasPerformanceMonitor';

interface CanvasPerformanceHookOptions {
  enabled?: boolean;
  monitoringInterval?: number;
  nodeCountThreshold?: number;
  renderTimeThreshold?: number;
}

interface CanvasPerformanceState {
  renderTime: number;
  nodeCount: number;
  memoryUsage: number;
  memoryGrowth: number;
  healthScore: number;
  bottlenecks: string[];
  recommendations: string[];
  isMonitoring: boolean;
}

export const useCanvasPerformanceMonitor = (options: CanvasPerformanceHookOptions = {}) => {
  const {
    enabled = true,
    monitoringInterval = 1000,
    nodeCountThreshold = 500,
    renderTimeThreshold = 16
  } = options;

  const [performanceState, setPerformanceState] = useState<CanvasPerformanceState>({
    renderTime: 0,
    nodeCount: 0,
    memoryUsage: 0,
    memoryGrowth: 0,
    healthScore: 100,
    bottlenecks: [],
    recommendations: [],
    isMonitoring: false
  });

  const intervalRef = useRef<number | null>(null);
  const componentId = useRef(`canvas-perf-${Date.now()}-${Math.random()}`);

  const updatePerformanceState = useCallback(() => {
    const report = canvasPerformanceMonitor.getPerformanceReport();
    const renderMetrics = canvasPerformanceMonitor.getRenderMetrics();
    const memoryMetrics = canvasPerformanceMonitor.getMemoryMetrics();

    setPerformanceState({
      renderTime: renderMetrics.renderTime,
      nodeCount: renderMetrics.nodeCount,
      memoryUsage: memoryMetrics ? memoryMetrics.usedJSHeapSize / 1024 / 1024 : 0,
      memoryGrowth: memoryMetrics ? memoryMetrics.memoryGrowthRate * 100 : 0,
      healthScore: report.healthScore,
      bottlenecks: report.bottlenecks,
      recommendations: report.recommendations,
      isMonitoring: enabled
    });
  }, [enabled]);

  const startMonitoring = useCallback(() => {
    if (!enabled) return;

    canvasPerformanceMonitor.startMonitoring();
    
    // Set up periodic updates
    intervalRef.current = window.setInterval(updatePerformanceState, monitoringInterval);
    
    // Listen to render metrics updates
    canvasPerformanceMonitor.onRenderMetricsUpdate(componentId.current, updatePerformanceState);
    
    updatePerformanceState();
  }, [enabled, monitoringInterval, updatePerformanceState]);

  const stopMonitoring = useCallback(() => {
    canvasPerformanceMonitor.stopMonitoring();
    canvasPerformanceMonitor.offRenderMetricsUpdate(componentId.current);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const measureCanvasOperation = useCallback(<T,>(
    operation: () => T,
    operationName?: string
  ): T => {
    return canvasPerformanceMonitor.measureCanvasRender(operation, operationName);
  }, []);

  const measureAsyncCanvasOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    return canvasPerformanceMonitor.measureAsyncCanvasRender(operation, operationName);
  }, []);

  const updateNodeCount = useCallback((count: number) => {
    canvasPerformanceMonitor.updateNodeCount(count);
    
    // Check for threshold violations
    if (count > nodeCountThreshold) {
      console.warn(`[Canvas Performance] Node count threshold exceeded: ${count} > ${nodeCountThreshold}`);
    }
  }, [nodeCountThreshold]);

  const getPerformanceReport = useCallback(() => {
    return canvasPerformanceMonitor.getPerformanceReport();
  }, []);

  const isPerformanceGood = useCallback(() => {
    return performanceState.healthScore > 70 && 
           performanceState.renderTime < renderTimeThreshold &&
           performanceState.nodeCount < nodeCountThreshold;
  }, [performanceState, renderTimeThreshold, nodeCountThreshold]);

  // Auto-start monitoring when enabled
  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [enabled, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    ...performanceState,
    startMonitoring,
    stopMonitoring,
    measureCanvasOperation,
    measureAsyncCanvasOperation,
    updateNodeCount,
    getPerformanceReport,
    isPerformanceGood
  };
};

// Simplified hook for basic canvas performance tracking
export const useSimpleCanvasPerformance = () => {
  const [renderTime, setRenderTime] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);

  const measureRender = useCallback(<T,>(operation: () => T): T => {
    const start = performance.now();
    const result = operation();
    const end = performance.now();
    setRenderTime(end - start);
    return result;
  }, []);

  const trackNodeCount = useCallback((count: number) => {
    setNodeCount(count);
  }, []);

  return {
    renderTime,
    nodeCount,
    measureRender,
    trackNodeCount,
    isSlowRender: renderTime > 16,
    hasHighNodeCount: nodeCount > 500
  };
};