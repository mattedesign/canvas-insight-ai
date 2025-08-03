/**
 * Canvas Performance Monitor
 * Specialized monitoring for canvas operations, rendering performance, and bottleneck detection
 */

interface CanvasRenderMetrics {
  nodeCount: number;
  renderTime: number;
  layoutTime: number;
  paintTime: number;
  lastRenderFrame: number;
}

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryGrowthRate: number;
}

interface CanvasPerformanceReport {
  renderMetrics: CanvasRenderMetrics;
  memoryMetrics: MemoryMetrics;
  bottlenecks: string[];
  recommendations: string[];
  healthScore: number;
}

export class CanvasPerformanceMonitor {
  private static instance: CanvasPerformanceMonitor;
  private renderMetrics: CanvasRenderMetrics = {
    nodeCount: 0,
    renderTime: 0,
    layoutTime: 0,
    paintTime: 0,
    lastRenderFrame: 0
  };
  private memoryBaseline: number = 0;
  private performanceObserver: PerformanceObserver | null = null;
  private memoryCheckInterval: number | null = null;
  private renderCallbacks: Map<string, (metrics: CanvasRenderMetrics) => void> = new Map();

  static getInstance(): CanvasPerformanceMonitor {
    if (!CanvasPerformanceMonitor.instance) {
      CanvasPerformanceMonitor.instance = new CanvasPerformanceMonitor();
    }
    return CanvasPerformanceMonitor.instance;
  }

  startMonitoring(): void {
    this.startRenderMonitoring();
    this.startMemoryMonitoring();
    this.recordMemoryBaseline();
  }

  stopMonitoring(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  private startRenderMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.startsWith('canvas-')) {
            this.updateRenderMetrics(entry);
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'paint', 'layout-shift'] 
      });
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, 5000); // Check every 5 seconds
  }

  private recordMemoryBaseline(): void {
    const memory = this.getMemoryInfo();
    if (memory) {
      this.memoryBaseline = memory.usedJSHeapSize;
    }
  }

  private updateRenderMetrics(entry: PerformanceEntry): void {
    if (entry.name === 'canvas-render') {
      this.renderMetrics.renderTime = entry.duration;
      this.renderMetrics.lastRenderFrame = performance.now();
    } else if (entry.name === 'canvas-layout') {
      this.renderMetrics.layoutTime = entry.duration;
    }

    // Notify callbacks
    this.renderCallbacks.forEach(callback => callback(this.renderMetrics));
  }

  measureCanvasRender<T>(operation: () => T, operationName: string = 'canvas-render'): T {
    const startMark = `${operationName}-start`;
    const endMark = `${operationName}-end`;
    
    performance.mark(startMark);
    const result = operation();
    performance.mark(endMark);
    performance.measure(operationName, startMark, endMark);
    
    return result;
  }

  async measureAsyncCanvasRender<T>(
    operation: () => Promise<T>, 
    operationName: string = 'canvas-render'
  ): Promise<T> {
    const startMark = `${operationName}-start`;
    const endMark = `${operationName}-end`;
    
    performance.mark(startMark);
    const result = await operation();
    performance.mark(endMark);
    performance.measure(operationName, startMark, endMark);
    
    return result;
  }

  updateNodeCount(count: number): void {
    this.renderMetrics.nodeCount = count;
  }

  private checkMemoryUsage(): void {
    const memory = this.getMemoryInfo();
    if (memory && this.memoryBaseline > 0) {
      const growthRate = (memory.usedJSHeapSize - this.memoryBaseline) / this.memoryBaseline;
      
      if (growthRate > 0.5) { // 50% growth threshold
        console.warn('[Canvas Performance] High memory growth detected:', {
          growth: `${(growthRate * 100).toFixed(1)}%`,
          current: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
          baseline: `${(this.memoryBaseline / 1024 / 1024).toFixed(1)}MB`
        });
      }
    }
  }

  private getMemoryInfo(): MemoryMetrics | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryGrowthRate: this.memoryBaseline > 0 
          ? (memory.usedJSHeapSize - this.memoryBaseline) / this.memoryBaseline 
          : 0
      };
    }
    return null;
  }

  getPerformanceReport(): CanvasPerformanceReport {
    const memoryMetrics = this.getMemoryInfo() || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryGrowthRate: 0
    };

    const bottlenecks = this.detectBottlenecks();
    const recommendations = this.generateRecommendations(bottlenecks);
    const healthScore = this.calculateHealthScore();

    return {
      renderMetrics: { ...this.renderMetrics },
      memoryMetrics,
      bottlenecks,
      recommendations,
      healthScore
    };
  }

  private detectBottlenecks(): string[] {
    const bottlenecks: string[] = [];

    // Check render performance
    if (this.renderMetrics.renderTime > 16) { // 60fps threshold
      bottlenecks.push('slow-rendering');
    }

    // Check node count
    if (this.renderMetrics.nodeCount > 1000) {
      bottlenecks.push('high-node-count');
    }

    // Check memory growth
    const memory = this.getMemoryInfo();
    if (memory && memory.memoryGrowthRate > 0.3) {
      bottlenecks.push('memory-leak');
    }

    // Check layout thrashing
    if (this.renderMetrics.layoutTime > 10) {
      bottlenecks.push('layout-thrashing');
    }

    return bottlenecks;
  }

  private generateRecommendations(bottlenecks: string[]): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.includes('slow-rendering')) {
      recommendations.push('Consider reducing visual complexity or implementing virtualization');
    }

    if (bottlenecks.includes('high-node-count')) {
      recommendations.push('Implement canvas virtualization to reduce DOM nodes');
    }

    if (bottlenecks.includes('memory-leak')) {
      recommendations.push('Check for memory leaks in event listeners and component cleanup');
    }

    if (bottlenecks.includes('layout-thrashing')) {
      recommendations.push('Batch DOM updates and avoid frequent style recalculations');
    }

    return recommendations;
  }

  private calculateHealthScore(): number {
    let score = 100;

    // Deduct points for performance issues
    if (this.renderMetrics.renderTime > 16) score -= 20;
    if (this.renderMetrics.nodeCount > 1000) score -= 15;
    
    const memory = this.getMemoryInfo();
    if (memory && memory.memoryGrowthRate > 0.3) score -= 25;
    if (this.renderMetrics.layoutTime > 10) score -= 15;

    return Math.max(0, score);
  }

  onRenderMetricsUpdate(id: string, callback: (metrics: CanvasRenderMetrics) => void): void {
    this.renderCallbacks.set(id, callback);
  }

  offRenderMetricsUpdate(id: string): void {
    this.renderCallbacks.delete(id);
  }

  getRenderMetrics(): CanvasRenderMetrics {
    return { ...this.renderMetrics };
  }

  getMemoryMetrics(): MemoryMetrics | null {
    return this.getMemoryInfo();
  }
}

export const canvasPerformanceMonitor = CanvasPerformanceMonitor.getInstance();