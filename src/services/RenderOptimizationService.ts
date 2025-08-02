/**
 * ✅ PHASE 5.1: RENDER OPTIMIZATION SERVICE
 * Central service for tracking and optimizing component re-renders
 */

interface ComponentMetrics {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  slowRenderCount: number;
  propsChanges: number;
  unnecessaryRenders: number;
  renderReasons: string[];
  lastPropsSnapshot?: any;
  firstRenderTime: number;
  peakRenderTime: number;
}

interface RenderEvent {
  componentName: string;
  timestamp: number;
  duration: number;
  renderReason: string;
  propsChanged: string[];
  stateChanged: boolean;
  isUnnecessary: boolean;
  memoryUsage?: number;
}

interface PerformanceThreshold {
  maxRenderTime: number;      // milliseconds
  maxRenderCount: number;     // per minute
  maxUnnecessaryRenders: number; // percentage
}

interface OptimizationRecommendation {
  componentName: string;
  issue: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  solution: string;
}

interface PerformanceWarning {
  id: string;
  componentName: string;
  type: 'slow-render' | 'excessive-renders' | 'unnecessary-renders' | 'memory-leak';
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

export class RenderOptimizationService {
  private static instance: RenderOptimizationService | null = null;
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private renderHistory: RenderEvent[] = [];
  private warnings: PerformanceWarning[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private listeners: Array<(event: RenderEvent) => void> = [];
  private warningListeners: Array<(warning: PerformanceWarning) => void> = [];
  
  private config = {
    maxHistorySize: 1000,
    maxWarningsSize: 100,
    enableAutoOptimization: true,
    enableMemoryTracking: true,
    thresholds: {
      maxRenderTime: 16,        // 16ms for 60fps
      maxRenderCount: 100,      // per minute
      maxUnnecessaryRenders: 20 // 20% threshold
    } as PerformanceThreshold
  };

  private constructor() {
    this.setupPerformanceObserver();
    console.log('[RenderOptimizationService] Initialized');
  }

  static getInstance(): RenderOptimizationService {
    if (!this.instance) {
      this.instance = new RenderOptimizationService();
    }
    return this.instance;
  }

  /**
   * ✅ PHASE 5.1: Track component render event
   */
  trackRender(
    componentName: string,
    duration: number,
    renderReason: string,
    propsChanged: string[] = [],
    stateChanged: boolean = false,
    currentProps?: any
  ): void {
    const timestamp = Date.now();
    
    // Update component metrics
    this.updateComponentMetrics(componentName, duration, renderReason, propsChanged, currentProps);
    
    // Determine if render was unnecessary
    const metrics = this.componentMetrics.get(componentName)!;
    const isUnnecessary = this.detectUnnecessaryRender(componentName, propsChanged, stateChanged, currentProps);
    
    // Create render event
    const renderEvent: RenderEvent = {
      componentName,
      timestamp,
      duration,
      renderReason,
      propsChanged,
      stateChanged,
      isUnnecessary,
      memoryUsage: this.config.enableMemoryTracking ? this.getMemoryUsage() : undefined
    };
    
    // Add to history
    this.addToHistory(renderEvent);
    
    // Check for performance issues
    this.checkPerformanceThresholds(componentName, renderEvent);
    
    // Generate recommendations
    this.generateRecommendations(componentName);
    
    // Notify listeners
    this.notifyListeners(renderEvent);
    
    console.log(`[RenderOptimization] ${componentName}: ${duration.toFixed(2)}ms (${renderReason})`);
  }

  /**
   * ✅ PHASE 5.1: Get component performance metrics
   */
  getComponentMetrics(componentName?: string): ComponentMetrics | Map<string, ComponentMetrics> {
    if (componentName) {
      return this.componentMetrics.get(componentName) || this.createEmptyMetrics(componentName);
    }
    return new Map(this.componentMetrics);
  }

  /**
   * ✅ PHASE 5.1: Get performance warnings
   */
  getWarnings(severity?: PerformanceWarning['severity']): PerformanceWarning[] {
    if (severity) {
      return this.warnings.filter(w => w.severity === severity);
    }
    return [...this.warnings];
  }

  /**
   * ✅ PHASE 5.1: Get optimization recommendations
   */
  getRecommendations(componentName?: string): OptimizationRecommendation[] {
    if (componentName) {
      return this.recommendations.filter(r => r.componentName === componentName);
    }
    return [...this.recommendations];
  }

  /**
   * ✅ PHASE 5.1: Get render history
   */
  getRenderHistory(componentName?: string, limit?: number): RenderEvent[] {
    let history = componentName 
      ? this.renderHistory.filter(e => e.componentName === componentName)
      : this.renderHistory;
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return [...history];
  }

  /**
   * ✅ PHASE 5.1: Get performance summary
   */
  getPerformanceSummary(): {
    totalComponents: number;
    totalRenders: number;
    averageRenderTime: number;
    slowestComponents: Array<{ name: string; avgTime: number }>;
    mostActiveComponents: Array<{ name: string; renderCount: number }>;
    totalWarnings: number;
    criticalWarnings: number;
    recommendations: number;
  } {
    const metrics = Array.from(this.componentMetrics.values());
    const totalRenders = metrics.reduce((sum, m) => sum + m.renderCount, 0);
    const totalRenderTime = metrics.reduce((sum, m) => sum + m.totalRenderTime, 0);

    const slowestComponents = metrics
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5)
      .map(m => ({ name: m.name, avgTime: m.averageRenderTime }));

    const mostActiveComponents = metrics
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, 5)
      .map(m => ({ name: m.name, renderCount: m.renderCount }));

    return {
      totalComponents: this.componentMetrics.size,
      totalRenders,
      averageRenderTime: totalRenders > 0 ? totalRenderTime / totalRenders : 0,
      slowestComponents,
      mostActiveComponents,
      totalWarnings: this.warnings.length,
      criticalWarnings: this.warnings.filter(w => w.severity === 'critical').length,
      recommendations: this.recommendations.length
    };
  }

  /**
   * ✅ PHASE 5.1: Add render event listener
   */
  addRenderListener(listener: (event: RenderEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * ✅ PHASE 5.1: Add warning listener
   */
  addWarningListener(listener: (warning: PerformanceWarning) => void): () => void {
    this.warningListeners.push(listener);
    return () => {
      this.warningListeners = this.warningListeners.filter(l => l !== listener);
    };
  }

  /**
   * ✅ PHASE 5.1: Update performance thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThreshold>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
    console.log('[RenderOptimizationService] Thresholds updated:', this.config.thresholds);
  }

  /**
   * ✅ PHASE 5.1: Clear performance data
   */
  clearData(): void {
    this.componentMetrics.clear();
    this.renderHistory = [];
    this.warnings = [];
    this.recommendations = [];
    console.log('[RenderOptimizationService] Performance data cleared');
  }

  /**
   * ✅ PHASE 5.1: Export performance data
   */
  exportData(): {
    timestamp: string;
    summary: ReturnType<typeof this.getPerformanceSummary>;
    metrics: Array<ComponentMetrics>;
    warnings: PerformanceWarning[];
    recommendations: OptimizationRecommendation[];
    config: typeof this.config;
  } {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceSummary(),
      metrics: Array.from(this.componentMetrics.values()),
      warnings: this.warnings,
      recommendations: this.recommendations,
      config: this.config
    };
  }

  /**
   * ✅ PHASE 5.1: Update component metrics
   */
  private updateComponentMetrics(
    componentName: string,
    duration: number,
    renderReason: string,
    propsChanged: string[],
    currentProps?: any
  ): void {
    let metrics = this.componentMetrics.get(componentName);
    
    if (!metrics) {
      metrics = this.createEmptyMetrics(componentName);
      this.componentMetrics.set(componentName, metrics);
    }

    // Update basic metrics
    metrics.renderCount++;
    metrics.totalRenderTime += duration;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;
    metrics.lastRenderTime = duration;
    
    // Track peak render time
    if (duration > metrics.peakRenderTime) {
      metrics.peakRenderTime = duration;
    }

    // Track slow renders
    if (duration > this.config.thresholds.maxRenderTime) {
      metrics.slowRenderCount++;
    }

    // Track props changes
    if (propsChanged.length > 0) {
      metrics.propsChanges++;
    }

    // Track render reasons
    if (!metrics.renderReasons.includes(renderReason)) {
      metrics.renderReasons.push(renderReason);
    }

    // Store props snapshot for unnecessary render detection
    metrics.lastPropsSnapshot = currentProps;
  }

  /**
   * ✅ PHASE 5.1: Detect unnecessary renders
   */
  private detectUnnecessaryRender(
    componentName: string,
    propsChanged: string[],
    stateChanged: boolean,
    currentProps?: any
  ): boolean {
    const metrics = this.componentMetrics.get(componentName);
    
    // No previous render to compare against
    if (!metrics || !metrics.lastPropsSnapshot) {
      return false;
    }

    // If no props or state changed, it's likely unnecessary
    if (propsChanged.length === 0 && !stateChanged) {
      metrics.unnecessaryRenders++;
      return true;
    }

    // Deep comparison of props to detect shallow changes
    if (currentProps && this.shallowEqual(currentProps, metrics.lastPropsSnapshot)) {
      metrics.unnecessaryRenders++;
      return true;
    }

    return false;
  }

  /**
   * ✅ PHASE 5.1: Check performance thresholds
   */
  private checkPerformanceThresholds(componentName: string, event: RenderEvent): void {
    const metrics = this.componentMetrics.get(componentName)!;
    const { thresholds } = this.config;

    // Check slow render
    if (event.duration > thresholds.maxRenderTime) {
      this.addWarning({
        componentName,
        type: 'slow-render',
        message: `Slow render detected: ${event.duration.toFixed(2)}ms (threshold: ${thresholds.maxRenderTime}ms)`,
        severity: event.duration > thresholds.maxRenderTime * 2 ? 'critical' : 'high',
        data: { duration: event.duration, threshold: thresholds.maxRenderTime }
      });
    }

    // Check excessive renders (per minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentRenders = this.renderHistory.filter(
      e => e.componentName === componentName && e.timestamp > oneMinuteAgo
    ).length;

    if (recentRenders > thresholds.maxRenderCount) {
      this.addWarning({
        componentName,
        type: 'excessive-renders',
        message: `Excessive renders: ${recentRenders} renders in 1 minute (threshold: ${thresholds.maxRenderCount})`,
        severity: recentRenders > thresholds.maxRenderCount * 1.5 ? 'critical' : 'high',
        data: { renderCount: recentRenders, threshold: thresholds.maxRenderCount }
      });
    }

    // Check unnecessary render percentage
    const unnecessaryPercentage = (metrics.unnecessaryRenders / metrics.renderCount) * 100;
    if (unnecessaryPercentage > thresholds.maxUnnecessaryRenders) {
      this.addWarning({
        componentName,
        type: 'unnecessary-renders',
        message: `High unnecessary renders: ${unnecessaryPercentage.toFixed(1)}% (threshold: ${thresholds.maxUnnecessaryRenders}%)`,
        severity: unnecessaryPercentage > thresholds.maxUnnecessaryRenders * 1.5 ? 'high' : 'medium',
        data: { percentage: unnecessaryPercentage, threshold: thresholds.maxUnnecessaryRenders }
      });
    }
  }

  /**
   * ✅ PHASE 5.1: Generate optimization recommendations
   */
  private generateRecommendations(componentName: string): void {
    const metrics = this.componentMetrics.get(componentName)!;
    const existing = this.recommendations.filter(r => r.componentName === componentName);

    // Avoid duplicate recommendations
    const hasRecommendation = (issue: string) => existing.some(r => r.issue === issue);

    // Slow render recommendation
    if (metrics.averageRenderTime > this.config.thresholds.maxRenderTime && !hasRecommendation('slow-render')) {
      this.recommendations.push({
        componentName,
        issue: 'slow-render',
        recommendation: 'Optimize render performance',
        severity: metrics.averageRenderTime > this.config.thresholds.maxRenderTime * 2 ? 'high' : 'medium',
        impact: `Average render time: ${metrics.averageRenderTime.toFixed(2)}ms`,
        solution: 'Consider using React.memo, useMemo, useCallback, or splitting into smaller components'
      });
    }

    // Excessive renders recommendation
    if (metrics.renderCount > 50 && !hasRecommendation('excessive-renders')) {
      this.recommendations.push({
        componentName,
        issue: 'excessive-renders',
        recommendation: 'Reduce render frequency',
        severity: 'medium',
        impact: `${metrics.renderCount} total renders`,
        solution: 'Check for unnecessary state updates, prop drilling, or missing dependencies in useEffect'
      });
    }

    // Unnecessary renders recommendation
    const unnecessaryPercentage = (metrics.unnecessaryRenders / metrics.renderCount) * 100;
    if (unnecessaryPercentage > 15 && !hasRecommendation('unnecessary-renders')) {
      this.recommendations.push({
        componentName,
        issue: 'unnecessary-renders',
        recommendation: 'Eliminate unnecessary re-renders',
        severity: 'medium',
        impact: `${unnecessaryPercentage.toFixed(1)}% unnecessary renders`,
        solution: 'Use React.memo with custom comparison function or optimize prop passing'
      });
    }
  }

  /**
   * ✅ PHASE 5.1: Add performance warning
   */
  private addWarning(warning: Omit<PerformanceWarning, 'id' | 'timestamp'>): void {
    const fullWarning: PerformanceWarning = {
      id: `${warning.componentName}-${warning.type}-${Date.now()}`,
      timestamp: Date.now(),
      ...warning
    };

    this.warnings.push(fullWarning);
    
    // Limit warnings size
    if (this.warnings.length > this.config.maxWarningsSize) {
      this.warnings = this.warnings.slice(-this.config.maxWarningsSize);
    }

    // Notify warning listeners
    this.warningListeners.forEach(listener => {
      try {
        listener(fullWarning);
      } catch (error) {
        console.error('[RenderOptimizationService] Warning listener error:', error);
      }
    });

    console.warn(`[RenderOptimization] ${warning.severity.toUpperCase()}: ${warning.message}`);
  }

  /**
   * ✅ PHASE 5.1: Add to render history
   */
  private addToHistory(event: RenderEvent): void {
    this.renderHistory.push(event);
    
    // Limit history size
    if (this.renderHistory.length > this.config.maxHistorySize) {
      this.renderHistory = this.renderHistory.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * ✅ PHASE 5.1: Notify render listeners
   */
  private notifyListeners(event: RenderEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[RenderOptimizationService] Listener error:', error);
      }
    });
  }

  /**
   * ✅ PHASE 5.1: Create empty metrics
   */
  private createEmptyMetrics(componentName: string): ComponentMetrics {
    return {
      name: componentName,
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      slowRenderCount: 0,
      propsChanges: 0,
      unnecessaryRenders: 0,
      renderReasons: [],
      firstRenderTime: Date.now(),
      peakRenderTime: 0
    };
  }

  /**
   * ✅ PHASE 5.1: Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * ✅ PHASE 5.1: Shallow equality check
   */
  private shallowEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
      return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) return false;
    }

    return true;
  }

  /**
   * ✅ PHASE 5.1: Setup performance observer
   */
  private setupPerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          // Additional performance monitoring can be added here
        });
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('[RenderOptimizationService] PerformanceObserver not supported:', error);
      }
    }
  }

  /**
   * ✅ PHASE 5.1: Cleanup and destroy
   */
  destroy(): void {
    this.clearData();
    this.listeners = [];
    this.warningListeners = [];
    RenderOptimizationService.instance = null;
    console.log('[RenderOptimizationService] Destroyed');
  }
}