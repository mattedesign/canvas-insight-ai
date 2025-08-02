/**
 * ✅ PHASE 4.2: NAVIGATION PERFORMANCE MONITOR
 * Track navigation timing metrics and detect bottlenecks
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useRouterStateManager } from '@/services/RouterStateManager';

interface NavigationMetric {
  route: string;
  timestamp: number;
  loadTime: number;
  renderTime: number;
  totalTime: number;
  componentCount: number;
  memoryUsage?: number;
  userAgent?: string;
}

interface PerformanceThresholds {
  loadTime: number;     // milliseconds
  renderTime: number;   // milliseconds
  totalTime: number;    // milliseconds
  memoryIncrease: number; // MB
}

interface PerformanceStats {
  averageLoadTime: number;
  averageRenderTime: number;
  averageTotalTime: number;
  slowestRoutes: Array<{ route: string; time: number }>;
  fastestRoutes: Array<{ route: string; time: number }>;
  totalNavigations: number;
  performanceIssues: Array<{
    route: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
  }>;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  loadTime: 100,     // 100ms
  renderTime: 50,    // 50ms
  totalTime: 200,    // 200ms
  memoryIncrease: 5  // 5MB
};

export function useNavigationPerformanceMonitor(
  enabled: boolean = true,
  thresholds: Partial<PerformanceThresholds> = {}
) {
  const location = useLocation();
  const { state: routerState } = useRouterStateManager();
  const [metrics, setMetrics] = useState<NavigationMetric[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    averageLoadTime: 0,
    averageRenderTime: 0,
    averageTotalTime: 0,
    slowestRoutes: [],
    fastestRoutes: [],
    totalNavigations: 0,
    performanceIssues: []
  });

  const performanceRef = useRef({
    navigationStart: 0,
    loadStart: 0,
    renderStart: 0,
    componentCount: 0,
    initialMemory: 0,
    isMonitoring: false
  });

  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  /**
   * ✅ PHASE 4.2: Start monitoring navigation performance
   */
  const startMonitoring = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    performanceRef.current = {
      navigationStart: now,
      loadStart: now,
      renderStart: 0,
      componentCount: 0,
      initialMemory: (performance as any).memory?.usedJSHeapSize || 0,
      isMonitoring: true
    };

    console.log(`[NavigationMonitor] Started monitoring: ${location.pathname}`);
  }, [enabled, location.pathname]);

  /**
   * ✅ PHASE 4.2: Mark render start
   */
  const markRenderStart = useCallback(() => {
    if (!performanceRef.current.isMonitoring) return;
    
    performanceRef.current.renderStart = performance.now();
    console.log('[NavigationMonitor] Render started');
  }, []);

  /**
   * ✅ PHASE 4.2: Increment component count
   */
  const incrementComponentCount = useCallback(() => {
    if (!performanceRef.current.isMonitoring) return;
    
    performanceRef.current.componentCount++;
  }, []);

  /**
   * ✅ PHASE 4.2: Complete monitoring and record metrics
   */
  const completeMonitoring = useCallback(() => {
    if (!performanceRef.current.isMonitoring) return;

    const now = performance.now();
    const { navigationStart, loadStart, renderStart, componentCount, initialMemory } = performanceRef.current;

    const loadTime = renderStart || now - loadStart;
    const renderTime = renderStart ? now - renderStart : 0;
    const totalTime = now - navigationStart;
    const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = (currentMemory - initialMemory) / (1024 * 1024); // Convert to MB

    const metric: NavigationMetric = {
      route: location.pathname,
      timestamp: Date.now(),
      loadTime,
      renderTime,
      totalTime,
      componentCount,
      memoryUsage: memoryIncrease,
      userAgent: navigator.userAgent
    };

    // Check for performance issues
    const issues: PerformanceStats['performanceIssues'] = [];
    
    if (loadTime > mergedThresholds.loadTime) {
      issues.push({
        route: location.pathname,
        issue: `Slow load time: ${loadTime.toFixed(2)}ms (threshold: ${mergedThresholds.loadTime}ms)`,
        severity: loadTime > mergedThresholds.loadTime * 2 ? 'high' : 'medium',
        timestamp: Date.now()
      });
    }

    if (renderTime > mergedThresholds.renderTime) {
      issues.push({
        route: location.pathname,
        issue: `Slow render time: ${renderTime.toFixed(2)}ms (threshold: ${mergedThresholds.renderTime}ms)`,
        severity: renderTime > mergedThresholds.renderTime * 2 ? 'high' : 'medium',
        timestamp: Date.now()
      });
    }

    if (totalTime > mergedThresholds.totalTime) {
      issues.push({
        route: location.pathname,
        issue: `Slow total time: ${totalTime.toFixed(2)}ms (threshold: ${mergedThresholds.totalTime}ms)`,
        severity: totalTime > mergedThresholds.totalTime * 2 ? 'high' : 'medium',
        timestamp: Date.now()
      });
    }

    if (memoryIncrease > mergedThresholds.memoryIncrease) {
      issues.push({
        route: location.pathname,
        issue: `High memory increase: ${memoryIncrease.toFixed(2)}MB (threshold: ${mergedThresholds.memoryIncrease}MB)`,
        severity: memoryIncrease > mergedThresholds.memoryIncrease * 2 ? 'high' : 'medium',
        timestamp: Date.now()
      });
    }

    setMetrics(prev => {
      const newMetrics = [...prev, metric];
      // Keep only last 100 metrics
      return newMetrics.slice(-100);
    });

    if (issues.length > 0) {
      console.warn(`[NavigationMonitor] Performance issues detected for ${location.pathname}:`, issues);
    }

    performanceRef.current.isMonitoring = false;
    console.log(`[NavigationMonitor] Completed monitoring: ${location.pathname}`, metric);
  }, [location.pathname, mergedThresholds]);

  /**
   * ✅ PHASE 4.2: Calculate performance statistics
   */
  useEffect(() => {
    if (metrics.length === 0) return;

    const loadTimes = metrics.map(m => m.loadTime);
    const renderTimes = metrics.map(m => m.renderTime);
    const totalTimes = metrics.map(m => m.totalTime);

    const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const averageTotalTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;

    // Group metrics by route for route-specific stats
    const routeMetrics = metrics.reduce((acc, metric) => {
      if (!acc[metric.route]) {
        acc[metric.route] = [];
      }
      acc[metric.route].push(metric);
      return acc;
    }, {} as Record<string, NavigationMetric[]>);

    // Calculate route averages
    const routeAverages = Object.entries(routeMetrics).map(([route, routeMetrics]) => ({
      route,
      time: routeMetrics.reduce((sum, m) => sum + m.totalTime, 0) / routeMetrics.length
    }));

    const slowestRoutes = routeAverages
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    const fastestRoutes = routeAverages
      .sort((a, b) => a.time - b.time)
      .slice(0, 5);

    // Collect all performance issues from recent metrics
    const recentIssues: PerformanceStats['performanceIssues'] = [];
    metrics.slice(-20).forEach(metric => {
      if (metric.loadTime > mergedThresholds.loadTime) {
        recentIssues.push({
          route: metric.route,
          issue: `Slow load time: ${metric.loadTime.toFixed(2)}ms`,
          severity: metric.loadTime > mergedThresholds.loadTime * 2 ? 'high' : 'medium',
          timestamp: metric.timestamp
        });
      }
    });

    setStats({
      averageLoadTime,
      averageRenderTime,
      averageTotalTime,
      slowestRoutes,
      fastestRoutes,
      totalNavigations: metrics.length,
      performanceIssues: recentIssues.slice(-10) // Keep last 10 issues
    });
  }, [metrics, mergedThresholds]);

  /**
   * ✅ PHASE 4.2: Monitor route changes
   */
  useEffect(() => {
    if (enabled) {
      startMonitoring();
    }
  }, [location.pathname, enabled, startMonitoring]);

  /**
   * ✅ PHASE 4.2: Auto-complete monitoring when router navigation ends
   */
  useEffect(() => {
    if (!routerState.isNavigating && performanceRef.current.isMonitoring) {
      // Give a small delay for components to render
      const timer = setTimeout(completeMonitoring, 50);
      return () => clearTimeout(timer);
    }
  }, [routerState.isNavigating, completeMonitoring]);

  /**
   * ✅ PHASE 4.2: Clear all metrics
   */
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    setStats({
      averageLoadTime: 0,
      averageRenderTime: 0,
      averageTotalTime: 0,
      slowestRoutes: [],
      fastestRoutes: [],
      totalNavigations: 0,
      performanceIssues: []
    });
    console.log('[NavigationMonitor] Metrics cleared');
  }, []);

  /**
   * ✅ PHASE 4.2: Export metrics data
   */
  const exportMetrics = useCallback(() => {
    const data = {
      metrics,
      stats,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      thresholds: mergedThresholds
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `navigation-metrics-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [metrics, stats, mergedThresholds]);

  return {
    // Metrics data
    metrics,
    stats,
    
    // Performance tracking methods
    markRenderStart,
    incrementComponentCount,
    completeMonitoring,
    
    // Utility methods
    clearMetrics,
    exportMetrics,
    
    // Status
    isMonitoring: performanceRef.current.isMonitoring,
    enabled
  };
}
