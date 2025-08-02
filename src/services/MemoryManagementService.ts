/**
 * ✅ PHASE 5.2: MEMORY MANAGEMENT SERVICE
 * Memory leak detection, monitoring, and automatic cleanup orchestration
 */

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  componentCount: number;
  eventListenerCount: number;
  intervalCount: number;
  timeoutCount: number;
}

interface ComponentMemoryInfo {
  name: string;
  mountTime: number;
  initialMemory: number;
  currentMemory: number;
  peakMemory: number;
  memoryGrowth: number;
  cleanupRegistered: boolean;
  leakSuspected: boolean;
  resourcesTracked: {
    eventListeners: number;
    intervals: number;
    timeouts: number;
    subscriptions: number;
  };
}

interface MemoryLeak {
  id: string;
  componentName: string;
  type: 'memory-growth' | 'resource-leak' | 'event-listener-leak' | 'interval-leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  memoryGrowth: number;
  description: string;
  recommendation: string;
}

interface MemoryAlert {
  id: string;
  type: 'memory-threshold' | 'leak-detected' | 'cleanup-required' | 'gc-recommended';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  componentName?: string;
  data?: any;
}

export class MemoryManagementService {
  private static instance: MemoryManagementService | null = null;
  private memorySnapshots: MemorySnapshot[] = [];
  private componentMemory: Map<string, ComponentMemoryInfo> = new Map();
  private detectedLeaks: MemoryLeak[] = [];
  private memoryAlerts: MemoryAlert[] = [];
  private cleanupCallbacks: Map<string, Array<() => void | Promise<void>>> = new Map();
  
  private monitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertListeners: Array<(alert: MemoryAlert) => void> = [];
  private leakListeners: Array<(leak: MemoryLeak) => void> = [];

  private config = {
    snapshotInterval: 5000,     // 5 seconds
    maxSnapshots: 200,          // Keep last 200 snapshots
    maxAlerts: 50,              // Keep last 50 alerts
    memoryThresholds: {
      warningMB: 100,           // 100MB warning
      criticalMB: 200,          // 200MB critical
      growthRate: 0.1           // 10% growth rate threshold
    },
    leakDetection: {
      minGrowthMB: 5,           // 5MB minimum growth to consider
      timeWindowMs: 30000,      // 30 second window
      componentTimeoutMs: 300000 // 5 minutes component timeout
    }
  };

  private constructor() {
    this.startMonitoring();
    console.log('[MemoryManagementService] Initialized');
  }

  static getInstance(): MemoryManagementService {
    if (!this.instance) {
      this.instance = new MemoryManagementService();
    }
    return this.instance;
  }

  /**
   * ✅ PHASE 5.2: Register component for memory tracking
   */
  registerComponent(componentName: string): string {
    const componentId = `${componentName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const memoryInfo: ComponentMemoryInfo = {
      name: componentName,
      mountTime: Date.now(),
      initialMemory: this.getCurrentMemoryUsage(),
      currentMemory: this.getCurrentMemoryUsage(),
      peakMemory: this.getCurrentMemoryUsage(),
      memoryGrowth: 0,
      cleanupRegistered: false,
      leakSuspected: false,
      resourcesTracked: {
        eventListeners: 0,
        intervals: 0,
        timeouts: 0,
        subscriptions: 0
      }
    };

    this.componentMemory.set(componentId, memoryInfo);
    console.log(`[MemoryManagement] Registered component: ${componentName} (${componentId})`);
    
    return componentId;
  }

  /**
   * ✅ PHASE 5.2: Unregister component and run cleanup
   */
  async unregisterComponent(componentId: string): Promise<void> {
    const memoryInfo = this.componentMemory.get(componentId);
    if (!memoryInfo) return;

    // Run cleanup callbacks
    await this.runCleanupForComponent(componentId);

    // Check for potential leaks before unregistering
    this.checkForLeaks(componentId);

    // Remove from tracking
    this.componentMemory.delete(componentId);
    this.cleanupCallbacks.delete(componentId);

    console.log(`[MemoryManagement] Unregistered component: ${memoryInfo.name} (${componentId})`);
  }

  /**
   * ✅ PHASE 5.2: Register cleanup callback for component
   */
  registerCleanup(componentId: string, cleanup: () => void | Promise<void>): void {
    if (!this.cleanupCallbacks.has(componentId)) {
      this.cleanupCallbacks.set(componentId, []);
    }
    
    this.cleanupCallbacks.get(componentId)!.push(cleanup);
    
    // Mark cleanup as registered
    const memoryInfo = this.componentMemory.get(componentId);
    if (memoryInfo) {
      memoryInfo.cleanupRegistered = true;
    }
  }

  /**
   * ✅ PHASE 5.2: Track resource usage for component
   */
  trackResource(componentId: string, resourceType: keyof ComponentMemoryInfo['resourcesTracked'], delta: number = 1): void {
    const memoryInfo = this.componentMemory.get(componentId);
    if (!memoryInfo) return;

    memoryInfo.resourcesTracked[resourceType] += delta;
    
    // Update current memory
    const currentMemory = this.getCurrentMemoryUsage();
    memoryInfo.currentMemory = currentMemory;
    
    if (currentMemory > memoryInfo.peakMemory) {
      memoryInfo.peakMemory = currentMemory;
    }
    
    memoryInfo.memoryGrowth = currentMemory - memoryInfo.initialMemory;
  }

  /**
   * ✅ PHASE 5.2: Get memory statistics
   */
  getMemoryStats(): {
    current: MemorySnapshot;
    components: number;
    totalLeaks: number;
    totalAlerts: number;
    memoryGrowthTrend: number;
    topMemoryConsumers: Array<{ name: string; memoryUsage: number; growth: number }>;
    suspectedLeaks: Array<{ name: string; growth: number; risk: string }>;
  } {
    const currentSnapshot = this.takeMemorySnapshot();
    const components = Array.from(this.componentMemory.values());
    
    // Calculate memory growth trend (last 10 snapshots)
    const recentSnapshots = this.memorySnapshots.slice(-10);
    const memoryGrowthTrend = recentSnapshots.length > 1 
      ? recentSnapshots[recentSnapshots.length - 1].usedJSHeapSize - recentSnapshots[0].usedJSHeapSize
      : 0;

    // Find top memory consumers
    const topMemoryConsumers = components
      .sort((a, b) => b.memoryGrowth - a.memoryGrowth)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        memoryUsage: c.currentMemory,
        growth: c.memoryGrowth
      }));

    // Find suspected leaks
    const suspectedLeaks = components
      .filter(c => c.leakSuspected || c.memoryGrowth > this.config.leakDetection.minGrowthMB * 1024 * 1024)
      .map(c => ({
        name: c.name,
        growth: c.memoryGrowth / (1024 * 1024), // Convert to MB
        risk: c.memoryGrowth > 20 * 1024 * 1024 ? 'high' : c.memoryGrowth > 10 * 1024 * 1024 ? 'medium' : 'low'
      }));

    return {
      current: currentSnapshot,
      components: this.componentMemory.size,
      totalLeaks: this.detectedLeaks.length,
      totalAlerts: this.memoryAlerts.length,
      memoryGrowthTrend: memoryGrowthTrend / (1024 * 1024), // Convert to MB
      topMemoryConsumers,
      suspectedLeaks
    };
  }

  /**
   * ✅ PHASE 5.2: Force garbage collection (if available)
   */
  async forceGarbageCollection(): Promise<boolean> {
    try {
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
        
        this.addAlert({
          type: 'gc-recommended',
          severity: 'info',
          message: 'Garbage collection manually triggered',
        });
        
        return true;
      }
      
      // Alternative: trigger GC indirectly
      const beforeMemory = this.getCurrentMemoryUsage();
      
      // Create and release large array to trigger GC
      let largeArray = new Array(1000000).fill(0);
      largeArray = null;
      
      // Wait a bit for potential GC
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterMemory = this.getCurrentMemoryUsage();
      const memoryFreed = beforeMemory - afterMemory;
      
      if (memoryFreed > 0) {
        this.addAlert({
          type: 'gc-recommended',
          severity: 'info',
          message: `Indirect GC triggered, freed ${(memoryFreed / (1024 * 1024)).toFixed(2)}MB`,
        });
      }
      
      return memoryFreed > 0;
    } catch (error) {
      console.warn('[MemoryManagement] GC trigger failed:', error);
      return false;
    }
  }

  /**
   * ✅ PHASE 5.2: Add alert listener
   */
  addAlertListener(listener: (alert: MemoryAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter(l => l !== listener);
    };
  }

  /**
   * ✅ PHASE 5.2: Add leak listener
   */
  addLeakListener(listener: (leak: MemoryLeak) => void): () => void {
    this.leakListeners.push(listener);
    return () => {
      this.leakListeners = this.leakListeners.filter(l => l !== listener);
    };
  }

  /**
   * ✅ PHASE 5.2: Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.takeMemorySnapshot();
      this.checkMemoryThresholds();
      this.detectMemoryLeaks();
      this.cleanupOldData();
    }, this.config.snapshotInterval);
    
    console.log('[MemoryManagement] Monitoring started');
  }

  /**
   * ✅ PHASE 5.2: Take memory snapshot
   */
  private takeMemorySnapshot(): MemorySnapshot {
    const memory = (performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      componentCount: this.componentMemory.size,
      eventListenerCount: this.getTotalResourceCount('eventListeners'),
      intervalCount: this.getTotalResourceCount('intervals'),
      timeoutCount: this.getTotalResourceCount('timeouts')
    };
    
    this.memorySnapshots.push(snapshot);
    
    // Limit snapshots
    if (this.memorySnapshots.length > this.config.maxSnapshots) {
      this.memorySnapshots = this.memorySnapshots.slice(-this.config.maxSnapshots);
    }
    
    return snapshot;
  }

  /**
   * ✅ PHASE 5.2: Check memory thresholds
   */
  private checkMemoryThresholds(): void {
    const currentMemory = this.getCurrentMemoryUsage();
    const memoryMB = currentMemory / (1024 * 1024);
    
    if (memoryMB > this.config.memoryThresholds.criticalMB) {
      this.addAlert({
        type: 'memory-threshold',
        severity: 'critical',
        message: `Critical memory usage: ${memoryMB.toFixed(1)}MB`,
        data: { memoryMB, threshold: this.config.memoryThresholds.criticalMB }
      });
    } else if (memoryMB > this.config.memoryThresholds.warningMB) {
      this.addAlert({
        type: 'memory-threshold',
        severity: 'warning',
        message: `High memory usage: ${memoryMB.toFixed(1)}MB`,
        data: { memoryMB, threshold: this.config.memoryThresholds.warningMB }
      });
    }
  }

  /**
   * ✅ PHASE 5.2: Detect memory leaks
   */
  private detectMemoryLeaks(): void {
    const now = Date.now();
    
    this.componentMemory.forEach((memoryInfo, componentId) => {
      const ageMs = now - memoryInfo.mountTime;
      const memoryGrowthMB = memoryInfo.memoryGrowth / (1024 * 1024);
      
      // Check for memory growth leaks
      if (memoryGrowthMB > this.config.leakDetection.minGrowthMB && ageMs > this.config.leakDetection.timeWindowMs) {
        if (!memoryInfo.leakSuspected) {
          memoryInfo.leakSuspected = true;
          this.reportMemoryLeak(componentId, 'memory-growth', memoryGrowthMB);
        }
      }
      
      // Check for resource leaks
      const { resourcesTracked } = memoryInfo;
      if (resourcesTracked.eventListeners > 10 || resourcesTracked.intervals > 5 || resourcesTracked.timeouts > 20) {
        this.reportMemoryLeak(componentId, 'resource-leak', memoryGrowthMB);
      }
      
      // Check for long-running components without cleanup
      if (ageMs > this.config.leakDetection.componentTimeoutMs && !memoryInfo.cleanupRegistered) {
        this.reportMemoryLeak(componentId, 'event-listener-leak', memoryGrowthMB);
      }
    });
  }

  /**
   * ✅ PHASE 5.2: Report memory leak
   */
  private reportMemoryLeak(componentId: string, type: MemoryLeak['type'], memoryGrowthMB: number): void {
    const memoryInfo = this.componentMemory.get(componentId);
    if (!memoryInfo) return;
    
    const severity: MemoryLeak['severity'] = 
      memoryGrowthMB > 50 ? 'critical' :
      memoryGrowthMB > 20 ? 'high' :
      memoryGrowthMB > 10 ? 'medium' : 'low';
    
    const leak: MemoryLeak = {
      id: `leak-${componentId}-${Date.now()}`,
      componentName: memoryInfo.name,
      type,
      severity,
      detectedAt: Date.now(),
      memoryGrowth: memoryGrowthMB,
      description: this.getLeakDescription(type, memoryGrowthMB),
      recommendation: this.getLeakRecommendation(type)
    };
    
    this.detectedLeaks.push(leak);
    
    // Notify listeners
    this.leakListeners.forEach(listener => {
      try {
        listener(leak);
      } catch (error) {
        console.error('[MemoryManagement] Leak listener error:', error);
      }
    });
    
    console.warn(`[MemoryManagement] Memory leak detected in ${memoryInfo.name}:`, leak);
  }

  /**
   * ✅ PHASE 5.2: Run cleanup for component
   */
  private async runCleanupForComponent(componentId: string): Promise<void> {
    const cleanupCallbacks = this.cleanupCallbacks.get(componentId);
    if (!cleanupCallbacks) return;
    
    const cleanupPromises = cleanupCallbacks.map(async (cleanup) => {
      try {
        await cleanup();
      } catch (error) {
        console.error(`[MemoryManagement] Cleanup error for ${componentId}:`, error);
      }
    });
    
    await Promise.allSettled(cleanupPromises);
  }

  /**
   * ✅ PHASE 5.2: Check for leaks before component cleanup
   */
  private checkForLeaks(componentId: string): void {
    const memoryInfo = this.componentMemory.get(componentId);
    if (!memoryInfo) return;
    
    const memoryGrowthMB = memoryInfo.memoryGrowth / (1024 * 1024);
    
    if (memoryGrowthMB > this.config.leakDetection.minGrowthMB) {
      this.addAlert({
        type: 'cleanup-required',
        severity: 'warning',
        message: `Component ${memoryInfo.name} grew by ${memoryGrowthMB.toFixed(1)}MB during lifecycle`,
        componentName: memoryInfo.name,
        data: { memoryGrowth: memoryGrowthMB }
      });
    }
  }

  /**
   * ✅ PHASE 5.2: Helper methods
   */
  private getCurrentMemoryUsage(): number {
    const memory = (performance as any).memory;
    return memory?.usedJSHeapSize || 0;
  }

  private getTotalResourceCount(resourceType: keyof ComponentMemoryInfo['resourcesTracked']): number {
    return Array.from(this.componentMemory.values())
      .reduce((total, info) => total + info.resourcesTracked[resourceType], 0);
  }

  private addAlert(alert: Omit<MemoryAlert, 'id' | 'timestamp'>): void {
    const fullAlert: MemoryAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alert
    };
    
    this.memoryAlerts.push(fullAlert);
    
    // Limit alerts
    if (this.memoryAlerts.length > this.config.maxAlerts) {
      this.memoryAlerts = this.memoryAlerts.slice(-this.config.maxAlerts);
    }
    
    // Notify listeners
    this.alertListeners.forEach(listener => {
      try {
        listener(fullAlert);
      } catch (error) {
        console.error('[MemoryManagement] Alert listener error:', error);
      }
    });
  }

  private getLeakDescription(type: MemoryLeak['type'], memoryGrowthMB: number): string {
    switch (type) {
      case 'memory-growth':
        return `Component memory grew by ${memoryGrowthMB.toFixed(1)}MB without cleanup`;
      case 'resource-leak':
        return 'Component has excessive tracked resources (event listeners, intervals, etc.)';
      case 'event-listener-leak':
        return 'Component running for extended time without registered cleanup';
      case 'interval-leak':
        return 'Component has intervals that may not be cleared on unmount';
      default:
        return 'Memory leak detected';
    }
  }

  private getLeakRecommendation(type: MemoryLeak['type']): string {
    switch (type) {
      case 'memory-growth':
        return 'Check for large objects, closures, or data structures not being released';
      case 'resource-leak':
        return 'Ensure all event listeners, intervals, and subscriptions are properly cleaned up';
      case 'event-listener-leak':
        return 'Add cleanup callbacks using useCleanupManager hook';
      case 'interval-leak':
        return 'Clear all intervals and timeouts in component cleanup';
      default:
        return 'Review component lifecycle and ensure proper cleanup';
    }
  }

  private cleanupOldData(): void {
    // Remove old alerts
    const oneHourAgo = Date.now() - 3600000;
    this.memoryAlerts = this.memoryAlerts.filter(alert => alert.timestamp > oneHourAgo);
    
    // Remove old leaks
    this.detectedLeaks = this.detectedLeaks.filter(leak => leak.detectedAt > oneHourAgo);
  }

  /**
   * ✅ PHASE 5.2: Stop monitoring and cleanup
   */
  destroy(): void {
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.memorySnapshots = [];
    this.componentMemory.clear();
    this.detectedLeaks = [];
    this.memoryAlerts = [];
    this.cleanupCallbacks.clear();
    this.alertListeners = [];
    this.leakListeners = [];
    
    MemoryManagementService.instance = null;
    console.log('[MemoryManagementService] Destroyed');
  }
}