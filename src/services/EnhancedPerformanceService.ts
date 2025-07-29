import { SmartCacheService } from './SmartCacheService';

interface CanvasMetrics {
  nodeRenderTime: number;
  layoutCalculationTime: number;
  dataLoadTime: number;
  memoryUsage: number;
  virtualizedItems: number;
  totalElements: number;
  cacheHitRate: number;
}

export class EnhancedPerformanceService {
  private static canvasMetrics: CanvasMetrics = {
    nodeRenderTime: 0,
    layoutCalculationTime: 0,
    dataLoadTime: 0,
    memoryUsage: 0,
    virtualizedItems: 0,
    totalElements: 0,
    cacheHitRate: 0
  };
  
  private static performanceObserver: PerformanceObserver | null = null;
  private static memoryMonitorInterval: number | null = null;
  
  static startCanvasPerformanceTracking(): void {
    console.log('[Performance] Starting canvas performance tracking');
    
    // Track canvas-specific metrics
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('canvas-render')) {
            this.canvasMetrics.nodeRenderTime = entry.duration;
          } else if (entry.name.includes('layout-calculation')) {
            this.canvasMetrics.layoutCalculationTime = entry.duration;
          } else if (entry.name.includes('data-load')) {
            this.canvasMetrics.dataLoadTime = entry.duration;
          }
          
          // Log performance entries for debugging
          if (entry.duration > 100) {
            console.warn(`[Performance] Slow operation: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
    
    // Monitor memory usage specific to canvas
    this.memoryMonitorInterval = window.setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.canvasMetrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        // Update cache hit rate
        const cacheStats = SmartCacheService.getStats();
        this.canvasMetrics.cacheHitRate = cacheStats.size > 0 ? 
          Math.min(100, (cacheStats.size / 100) * 100) : 0;
        
        // Alert if memory usage is too high
        if (this.canvasMetrics.memoryUsage > 200) {
          console.warn(`[Performance] High memory usage: ${this.canvasMetrics.memoryUsage.toFixed(1)}MB`);
          this.triggerMemoryCleanup();
        }
      }
    }, 10000);
  }
  
  static stopCanvasPerformanceTracking(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    if (this.memoryMonitorInterval) {
      window.clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
  }
  
  static async measureCanvasOperation<T>(
    operationName: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    performance.mark(`${operationName}-start`);
    
    try {
      const result = await operation();
      
      performance.mark(`${operationName}-end`);
      performance.measure(operationName, `${operationName}-start`, `${operationName}-end`);
      
      const duration = performance.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`[Performance] Slow canvas operation: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`[Performance] Failed canvas operation: ${operationName}`, error);
      throw error;
    }
  }
  
  static updateVirtualizationMetrics(virtualizedItems: number, totalElements: number): void {
    this.canvasMetrics.virtualizedItems = virtualizedItems;
    this.canvasMetrics.totalElements = totalElements;
  }
  
  private static triggerMemoryCleanup(): void {
    SmartCacheService.clear();
    if ('gc' in window) {
      (window as any).gc();
    }
  }
  
  static getCanvasMetrics(): CanvasMetrics {
    return { ...this.canvasMetrics };
  }
  
  static async collectPerformanceMetrics(): Promise<{
    pageLoadTime: number;
    apiResponseTime: number;
    memoryUsage: number;
    renderTime: number;
  }> {
    const loadTime = performance.timing ? 
      performance.timing.loadEventEnd - performance.timing.navigationStart : 0;
    
    // Get recent navigation entries for API timing
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const apiTime = navEntries.length > 0 ? navEntries[0].responseEnd - navEntries[0].requestStart : 0;
    
    const memoryUsage = 'memory' in performance ? 
      (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0;
    
    return {
      pageLoadTime: loadTime,
      apiResponseTime: apiTime,
      memoryUsage,
      renderTime: this.canvasMetrics.nodeRenderTime
    };
  }

  static getPerformanceReport(): {
    metrics: CanvasMetrics;
    recommendations: string[];
    status: 'optimal' | 'warning' | 'critical';
  } {
    const metrics = this.getCanvasMetrics();
    const recommendations: string[] = [];
    let status: 'optimal' | 'warning' | 'critical' = 'optimal';
    
    if (metrics.memoryUsage > 150) {
      recommendations.push('High memory usage - consider virtualization');
      status = 'warning';
    }
    
    if (metrics.nodeRenderTime > 500) {
      recommendations.push('Slow rendering - optimize components');
      status = 'warning';
    }
    
    if (metrics.totalElements > 50 && metrics.virtualizedItems === 0) {
      recommendations.push('Large dataset - enable virtualization');
      status = 'warning';
    }
    
    return { metrics, recommendations, status };
  }
}