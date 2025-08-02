import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  imageLoadTime: number;
  analysisTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

export interface OptimizationRecommendation {
  category: 'performance' | 'memory' | 'network' | 'storage';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
}

/**
 * ✅ OPTIMIZATION 6: Enhanced Performance Monitoring Service
 * Optimized thresholds and reduced noise
 */
export class OptimizedPerformanceService {
  private static metricsCache = new Map<string, any>();
  private static performanceObserver: PerformanceObserver | null = null;
  private static isInitialized = false;
  private static memoryMonitorInterval: number | null = null;

  // ✅ OPTIMIZATION: Increased thresholds to reduce noise
  private static readonly SLOW_OPERATION_THRESHOLD = 2000; // 2 seconds instead of 1
  private static readonly MEMORY_WARNING_THRESHOLD = 95; // 95% instead of 90%
  private static readonly API_SLOW_THRESHOLD = 2000; // 2 seconds instead of 1
  private static readonly MEMORY_CHECK_INTERVAL = 600000; // 10 minutes instead of 5

  static initialize(): void {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    this.setupOptimizedPerformanceObserver();
    this.setupOptimizedMemoryMonitoring();
    this.setupNetworkMonitoring();
  }

  /**
   * ✅ OPTIMIZATION 7: Optimized Performance Observer
   * Reduced logging noise and smarter filtering
   */
  private static setupOptimizedPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackOptimizedPerformanceEntry(entry);
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure'] // Removed 'mark' to reduce noise
      });
    }
  }

  /**
   * ✅ OPTIMIZATION 8: Smart Performance Entry Tracking
   * Only logs significant performance issues
   */
  private static trackOptimizedPerformanceEntry(entry: PerformanceEntry): void {
    const isSlowOperation = entry.duration > this.SLOW_OPERATION_THRESHOLD;
    const isEmptyQuery = entry.name.includes('image_id=in.%28%29');
    const isSupabaseQuery = entry.name.includes('supabase.co/rest/v1/');
    
    // ✅ FIX: Special handling for empty query detection
    if (isEmptyQuery) {
      console.warn(`🚨 EMPTY QUERY DETECTED: ${entry.name} took ${entry.duration}ms`);
      console.warn('This query should be skipped when no images exist');
      return;
    }
    
    // Only log truly slow operations for Supabase queries
    if (isSupabaseQuery && entry.duration > 1500) {
      console.warn(`Slow Supabase query: ${entry.name} took ${entry.duration}ms`);
    } else if (!isSupabaseQuery && isSlowOperation) {
      console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
    }
    
    // Track for metrics but don't spam console
    if (entry.duration > 500) { // Only track operations > 500ms
      this.recordPerformanceMetric(entry);
    }
  }

  /**
   * ✅ OPTIMIZATION 9: Optimized Memory Monitoring
   * Reduced frequency and smarter thresholds
   */
  private static setupOptimizedMemoryMonitoring(): void {
    // Check memory immediately
    this.checkMemoryUsage();
    
    // Reduced frequency monitoring
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.memoryMonitorInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, this.MEMORY_CHECK_INTERVAL);
  }

  /**
   * ✅ OPTIMIZATION 10: Smart Memory Usage Checking
   */
  private static checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      
      // Only warn at higher threshold
      if (usagePercent > this.MEMORY_WARNING_THRESHOLD) {
        console.warn(`High memory usage detected: ${usagePercent.toFixed(1)}%`);
        this.triggerMemoryCleanup();
      }
    }
  }

  private static triggerMemoryCleanup(): void {
    // Clear old cache entries
    const now = Date.now();
    this.metricsCache.forEach((value, key) => {
      if (now - value.timestamp > 900000) { // 15 minutes instead of 10
        this.metricsCache.delete(key);
      }
    });

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  private static setupNetworkMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      console.info('Network type:', connection.effectiveType);
      
      connection.addEventListener('change', () => {
        console.info('Network changed:', connection.effectiveType);
        this.adaptToNetworkConditions(connection.effectiveType);
      });
    }
  }

  private static adaptToNetworkConditions(effectiveType: string): void {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        console.info('Enabling low bandwidth mode');
        break;
      case '3g':
        console.info('Enabling moderate bandwidth mode');
        break;
      case '4g':
      default:
        console.info('Enabling high bandwidth mode');
        break;
    }
  }

  /**
   * ✅ OPTIMIZATION 11: Record Performance Metrics
   */
  private static recordPerformanceMetric(entry: PerformanceEntry): void {
    const metric = {
      name: entry.name,
      duration: entry.duration,
      timestamp: Date.now(),
      type: entry.entryType
    };
    
    // Store in local cache for analysis
    const key = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.metricsCache.set(key, metric);
  }

  /**
   * ✅ OPTIMIZATION 12: Collect Performance Metrics
   */
  static async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const pageLoadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
    const apiResponseTime = await this.measureAverageApiResponseTime();
    const imageLoadTime = await this.measureAverageImageLoadTime();
    const analysisTime = await this.measureAverageAnalysisTime();
    const memoryUsage = this.getCurrentMemoryUsage();
    const cacheHitRate = 0.75; // Mock value

    return {
      pageLoadTime,
      apiResponseTime,
      imageLoadTime,
      analysisTime,
      memoryUsage,
      cacheHitRate
    };
  }

  private static async measureAverageApiResponseTime(): Promise<number> {
    const resourceEntries = performance.getEntriesByType('resource');
    const apiCalls = resourceEntries.filter(entry => 
      entry.name.includes('/functions/') || entry.name.includes('/rest/')
    ).slice(-10); // Only last 10 calls
    
    if (apiCalls.length === 0) return 0;
    
    const totalTime = apiCalls.reduce((sum, entry) => sum + entry.duration, 0);
    return totalTime / apiCalls.length;
  }

  private static async measureAverageImageLoadTime(): Promise<number> {
    const resourceEntries = performance.getEntriesByType('resource');
    const imageLoads = resourceEntries.filter(entry => 
      entry.name.includes('.jpg') || entry.name.includes('.png') || 
      entry.name.includes('.webp') || entry.name.includes('.gif')
    ).slice(-10); // Only last 10 images
    
    if (imageLoads.length === 0) return 0;
    
    const totalTime = imageLoads.reduce((sum, entry) => sum + entry.duration, 0);
    return totalTime / imageLoads.length;
  }

  private static async measureAverageAnalysisTime(): Promise<number> {
    try {
      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('value')
        .eq('metric_name', 'analysis_time')
        .order('created_at', { ascending: false })
        .limit(5); // Reduced from 10 to 5
      
      if (!metrics || metrics.length === 0) return 0;
      
      const totalTime = metrics.reduce((sum, metric) => sum + metric.value, 0);
      return totalTime / metrics.length;
    } catch {
      return 0;
    }
  }

  private static getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      return memoryInfo.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * ✅ OPTIMIZATION 13: Generate Smart Recommendations
   */
  static async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const metrics = await this.collectPerformanceMetrics();
    const recommendations: OptimizationRecommendation[] = [];

    // Only add recommendations for truly problematic metrics
    if (metrics.apiResponseTime > this.API_SLOW_THRESHOLD) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Optimize Database Queries',
        description: `API response time is ${Math.round(metrics.apiResponseTime)}ms. Empty query patterns detected.`,
        impact: 'Dramatically improved query performance and reduced database load',
        implementation: 'Implement query batching and skip empty array queries'
      });
    }

    if (metrics.memoryUsage > 150) {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: `Memory usage is ${Math.round(metrics.memoryUsage)}MB.`,
        impact: 'Better performance on resource-constrained devices',
        implementation: 'Implement intelligent caching and cleanup strategies'
      });
    }

    return recommendations;
  }

  static cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    this.metricsCache.clear();
    this.isInitialized = false;
  }
}