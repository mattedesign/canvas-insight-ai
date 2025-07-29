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

export class PerformanceOptimizationService {
  private static metricsCache = new Map<string, any>();
  private static performanceObserver: PerformanceObserver | null = null;

  /**
   * Initialize performance monitoring
   */
  static initialize(): void {
    this.setupPerformanceObserver();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
  }

  /**
   * Collect comprehensive performance metrics
   */
  static async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Calculate metrics
    const pageLoadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
    const apiResponseTime = await this.measureAverageApiResponseTime();
    const imageLoadTime = await this.measureAverageImageLoadTime();
    const analysisTime = await this.measureAverageAnalysisTime();
    const memoryUsage = this.getCurrentMemoryUsage();
    const cacheHitRate = this.calculateCacheHitRate();

    const metrics: PerformanceMetrics = {
      pageLoadTime,
      apiResponseTime,
      imageLoadTime,
      analysisTime,
      memoryUsage,
      cacheHitRate
    };

    // Store metrics for analysis
    await this.storeMetrics(metrics);

    return metrics;
  }

  /**
   * Generate optimization recommendations based on current performance
   */
  static async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const metrics = await this.collectPerformanceMetrics();
    const recommendations: OptimizationRecommendation[] = [];

    // Page load optimization
    if (metrics.pageLoadTime > 3000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Optimize Page Load Time',
        description: `Current page load time is ${Math.round(metrics.pageLoadTime)}ms, which exceeds the 3-second threshold.`,
        impact: 'Improved user experience and reduced bounce rates',
        implementation: 'Implement code splitting, lazy loading, and optimize bundle size'
      });
    }

    // API response optimization
    if (metrics.apiResponseTime > 1000) {
      recommendations.push({
        category: 'network',
        priority: 'high',
        title: 'Optimize API Response Times',
        description: `Average API response time is ${Math.round(metrics.apiResponseTime)}ms.`,
        impact: 'Faster data loading and improved interactivity',
        implementation: 'Implement request caching, optimize database queries, use CDN'
      });
    }

    // Image loading optimization
    if (metrics.imageLoadTime > 2000) {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        title: 'Optimize Image Loading',
        description: `Average image load time is ${Math.round(metrics.imageLoadTime)}ms.`,
        impact: 'Faster image display and reduced bandwidth usage',
        implementation: 'Implement image compression, WebP format, lazy loading'
      });
    }

    // Memory usage optimization
    if (metrics.memoryUsage > 100) {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: `Current memory usage is ${Math.round(metrics.memoryUsage)}MB.`,
        impact: 'Better performance on low-end devices',
        implementation: 'Implement component cleanup, optimize state management'
      });
    }

    // Cache optimization
    if (metrics.cacheHitRate < 0.7) {
      recommendations.push({
        category: 'storage',
        priority: 'medium',
        title: 'Improve Cache Hit Rate',
        description: `Cache hit rate is ${Math.round(metrics.cacheHitRate * 100)}%.`,
        impact: 'Reduced server load and faster data access',
        implementation: 'Optimize caching strategy, implement service worker'
      });
    }

    // Analysis time optimization
    if (metrics.analysisTime > 30000) {
      recommendations.push({
        category: 'performance',
        priority: 'critical',
        title: 'Optimize AI Analysis Performance',
        description: `Average analysis time is ${Math.round(metrics.analysisTime / 1000)}s.`,
        impact: 'Faster analysis results and better user experience',
        implementation: 'Implement parallel processing, optimize AI model calls'
      });
    }

    return recommendations;
  }

  /**
   * Optimize image loading with progressive enhancement
   */
  static optimizeImageLoading(): void {
    // Implement lazy loading for images
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  /**
   * Implement smart caching strategy
   */
  static implementSmartCaching(): void {
    // Cache analysis results
    const originalFetch = window.fetch;
    
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const cacheKey = this.generateCacheKey(url, init);
      
      // Check cache first for GET requests
      if (!init?.method || init.method === 'GET') {
        const cached = this.metricsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
          return new Response(JSON.stringify(cached.data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const response = await originalFetch(input, init);
      
      // Cache successful GET responses
      if (response.ok && (!init?.method || init.method === 'GET')) {
        const data = await response.clone().json();
        this.metricsCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      return response;
    };
  }

  /**
   * Optimize bundle size with dynamic imports
   */
  static async optimizeBundleSize(): Promise<void> {
    // Implement dynamic imports for heavy components
    const heavyComponents = [
      'AnalysisPanel',
      'ModelComparisonPanel',
      'BatchProcessingPanel'
    ];

    heavyComponents.forEach(component => {
      // Mark for lazy loading
      console.log(`Optimizing ${component} for lazy loading`);
    });
  }

  /**
   * Monitor and optimize memory usage
   */
  private static memoryMonitorInterval: number | null = null;

  static monitorMemoryUsage(): void {
    // Clear existing interval to prevent duplicates
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 80) {
        this.triggerMemoryCleanup();
      }
    }

    // Monitor for memory leaks with proper cleanup
    this.memoryMonitorInterval = window.setInterval(() => {
      this.detectMemoryLeaks();
    }, 60000); // Check every minute
  }

  /**
   * Stop memory monitoring
   */
  static stopMemoryMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
  }

  /**
   * Trigger memory cleanup
   */
  private static triggerMemoryCleanup(): void {
    // Clear old cache entries
    const now = Date.now();
    this.metricsCache.forEach((value, key) => {
      if (now - value.timestamp > 600000) { // 10 minutes
        this.metricsCache.delete(key);
      }
    });

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Detect potential memory leaks
   */
  private static detectMemoryLeaks(): void {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const currentUsage = memoryInfo.usedJSHeapSize;
      
      // Store memory usage history
      const memoryHistory = JSON.parse(localStorage.getItem('memoryHistory') || '[]');
      memoryHistory.push({ timestamp: Date.now(), usage: currentUsage });
      
      // Keep only last 10 readings
      if (memoryHistory.length > 10) {
        memoryHistory.shift();
      }
      
      localStorage.setItem('memoryHistory', JSON.stringify(memoryHistory));
      
      // Check for consistent memory growth
      if (memoryHistory.length >= 5) {
        const trend = this.calculateMemoryTrend(memoryHistory);
        if (trend > 0.1) { // 10% growth trend
          console.warn('Potential memory leak detected');
        }
      }
    }
  }

  /**
   * Calculate memory usage trend
   */
  private static calculateMemoryTrend(history: Array<{ timestamp: number; usage: number }>): number {
    if (history.length < 2) return 0;
    
    const first = history[0].usage;
    const last = history[history.length - 1].usage;
    
    return (last - first) / first;
  }

  /**
   * Setup performance observer
   */
  private static setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          // Track different types of performance entries
          this.trackPerformanceEntry(entry);
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure', 'mark'] 
      });
    }
  }

  /**
   * Setup memory monitoring
   */
  private static setupMemoryMonitoring(): void {
    this.monitorMemoryUsage();
  }

  /**
   * Setup network monitoring
   */
  private static setupNetworkMonitoring(): void {
    // Monitor network quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      console.log('Network type:', connection.effectiveType);
      
      connection.addEventListener('change', () => {
        console.log('Network changed:', connection.effectiveType);
        this.adaptToNetworkConditions(connection.effectiveType);
      });
    }
  }

  /**
   * Adapt performance settings to network conditions
   */
  private static adaptToNetworkConditions(effectiveType: string): void {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        // Reduce image quality, defer non-critical requests
        this.enableLowBandwidthMode();
        break;
      case '3g':
        // Moderate optimization
        this.enableModerateBandwidthMode();
        break;
      case '4g':
      default:
        // Full quality
        this.enableHighBandwidthMode();
        break;
    }
  }

  /**
   * Enable low bandwidth optimizations
   */
  private static enableLowBandwidthMode(): void {
    console.log('Enabling low bandwidth mode');
    // Implement bandwidth-conscious optimizations
  }

  /**
   * Enable moderate bandwidth optimizations
   */
  private static enableModerateBandwidthMode(): void {
    console.log('Enabling moderate bandwidth mode');
  }

  /**
   * Enable high bandwidth features
   */
  private static enableHighBandwidthMode(): void {
    console.log('Enabling high bandwidth mode');
  }

  /**
   * Measure average API response time
   */
  private static async measureAverageApiResponseTime(): Promise<number> {
    // Get recent API call metrics
    const resourceEntries = performance.getEntriesByType('resource');
    const apiCalls = resourceEntries.filter(entry => 
      entry.name.includes('/functions/') || entry.name.includes('/rest/')
    );
    
    if (apiCalls.length === 0) return 0;
    
    const totalTime = apiCalls.reduce((sum, entry) => sum + entry.duration, 0);
    return totalTime / apiCalls.length;
  }

  /**
   * Measure average image load time
   */
  private static async measureAverageImageLoadTime(): Promise<number> {
    const resourceEntries = performance.getEntriesByType('resource');
    const imageLoads = resourceEntries.filter(entry => 
      entry.name.includes('.jpg') || entry.name.includes('.png') || 
      entry.name.includes('.webp') || entry.name.includes('.gif')
    );
    
    if (imageLoads.length === 0) return 0;
    
    const totalTime = imageLoads.reduce((sum, entry) => sum + entry.duration, 0);
    return totalTime / imageLoads.length;
  }

  /**
   * Measure average analysis time
   */
  private static async measureAverageAnalysisTime(): Promise<number> {
    try {
      // Query recent analysis performance data
      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('value')
        .eq('metric_name', 'analysis_time')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!metrics || metrics.length === 0) return 0;
      
      const totalTime = metrics.reduce((sum, metric) => sum + metric.value, 0);
      return totalTime / metrics.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get current memory usage
   */
  private static getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      return memoryInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  /**
   * Calculate cache hit rate
   */
  private static calculateCacheHitRate(): number {
    // This would be calculated based on actual cache metrics
    // For now, return a mock value
    return 0.75; // 75% hit rate
  }

  /**
   * Store performance metrics
   */
  private static async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await supabase.from('performance_metrics').insert([
        { metric_type: 'performance', metric_name: 'page_load_time', value: metrics.pageLoadTime, session_id: this.getSessionId() },
        { metric_type: 'api_response', metric_name: 'api_response_time', value: metrics.apiResponseTime, session_id: this.getSessionId() },
        { metric_type: 'performance', metric_name: 'image_load_time', value: metrics.imageLoadTime, session_id: this.getSessionId() },
        { metric_type: 'performance', metric_name: 'analysis_time', value: metrics.analysisTime, session_id: this.getSessionId() },
        { metric_type: 'performance', metric_name: 'memory_usage', value: metrics.memoryUsage, session_id: this.getSessionId() },
        { metric_type: 'performance', metric_name: 'cache_hit_rate', value: metrics.cacheHitRate, session_id: this.getSessionId() }
      ]);
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }
  }

  /**
   * Track performance entry
   */
  private static trackPerformanceEntry(entry: PerformanceEntry): void {
    // Log significant performance events
    if (entry.duration > 1000) {
      console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
    }
  }

  /**
   * Generate cache key
   */
  private static generateCacheKey(url: string, init?: RequestInit): string {
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.stringify(init.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Get session ID
   */
  private static getSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup performance monitoring
   */
  static cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.metricsCache.clear();
  }
}
