import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  metric_type: 'page_load' | 'api_response' | 'user_action' | 'error' | 'performance';
  metric_name: string;
  value: number;
  metadata: Record<string, any>;
  user_id?: string;
  session_id: string;
}

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  error_type: 'javascript' | 'api' | 'network' | 'validation';
  error_message: string;
  stack_trace?: string;
  user_id?: string;
  session_id: string;
  url: string;
  user_agent: string;
  metadata: Record<string, any>;
}

export interface UserEvent {
  id: string;
  timestamp: Date;
  event_type: 'page_view' | 'click' | 'upload' | 'analysis' | 'export' | 'auth';
  event_name: string;
  properties: Record<string, any>;
  user_id?: string;
  session_id: string;
  url: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'error';
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeUsers: number;
  memoryUsage?: number;
  lastUpdated: Date;
}

export class MonitoringService {
  private static sessionId = this.generateSessionId();
  private static performanceObserver: PerformanceObserver | null = null;
  private static errorBuffer: ErrorEvent[] = [];
  private static eventBuffer: UserEvent[] = [];
  private static metricsBuffer: PerformanceMetric[] = [];

  /**
   * Initialize monitoring for the current session
   */
  static initialize() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceMonitoring();
    this.setupErrorTracking();
    this.setupUnloadHandler();
    
    // Track initial page load
    this.trackPageLoad();
  }

  /**
   * Track a user event
   */
  static trackEvent(
    eventType: UserEvent['event_type'],
    eventName: string,
    properties: Record<string, any> = {}
  ) {
    const event: UserEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      event_type: eventType,
      event_name: eventName,
      properties,
      user_id: this.getCurrentUserId(),
      session_id: this.sessionId,
      url: window.location.href
    };

    this.eventBuffer.push(event);
    
    // Flush if buffer is getting large (increased threshold)
    if (this.eventBuffer.length >= 20) {
      this.flushEvents();
    }
  }

  /**
   * Track a performance metric
   */
  static trackMetric(
    metricType: PerformanceMetric['metric_type'],
    metricName: string,
    value: number,
    metadata: Record<string, any> = {}
  ) {
    const metric: PerformanceMetric = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      metric_type: metricType,
      metric_name: metricName,
      value,
      metadata,
      user_id: this.getCurrentUserId(),
      session_id: this.sessionId
    };

    this.metricsBuffer.push(metric);

    // Flush if buffer is getting large (increased threshold)
    if (this.metricsBuffer.length >= 15) {
      this.flushMetrics();
    }
  }

  /**
   * Track an error
   */
  static trackError(
    errorType: ErrorEvent['error_type'],
    message: string,
    stackTrace?: string,
    metadata: Record<string, any> = {}
  ) {
    const error: ErrorEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      error_type: errorType,
      error_message: message,
      stack_trace: stackTrace,
      user_id: this.getCurrentUserId(),
      session_id: this.sessionId,
      url: window.location.href,
      user_agent: navigator.userAgent,
      metadata
    };

    this.errorBuffer.push(error);

    // Immediately flush errors for real-time alerting
    this.flushErrors();
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    try {
      const startTime = performance.now();
      
      // Test database connectivity
      const { error } = await supabase.from('projects').select('count').limit(1);
      
      const responseTime = performance.now() - startTime;
      
      // For now, return mock data since types aren't regenerated yet
      // TODO: Update to use real monitoring tables once types are available
      const errorRate = Math.floor(Math.random() * 5); // Mock: 0-5 errors
      const uniqueActiveUsers = Math.floor(Math.random() * 20) + 1; // Mock: 1-20 users

      return {
        status: error ? 'error' : responseTime > 1000 ? 'degraded' : 'healthy',
        uptime: performance.now(),
        responseTime,
        errorRate,
        activeUsers: uniqueActiveUsers,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'error',
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        activeUsers: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get analytics data for dashboard
   */
  static async getAnalytics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h') {
    // For now, return mock data since types aren't regenerated yet
    // TODO: Update to use real monitoring tables once types are available
    
    // Generate mock data for demonstration
    const generateMockEvents = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `event_${i}`,
        created_at: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString(),
        event_type: ['page_view', 'click', 'upload', 'analysis'][Math.floor(Math.random() * 4)],
        event_name: `mock_event_${i}`,
        properties: { mock: true },
        user_id: `user_${Math.floor(Math.random() * 5)}`,
        session_id: `session_${Math.floor(Math.random() * 10)}`,
        url: window.location.href
      }));
    };

    const generateMockMetrics = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `metric_${i}`,
        created_at: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString(),
        metric_type: 'api_response',
        metric_name: 'api_response_time',
        value: Math.floor(Math.random() * 1000) + 100,
        metadata: {},
        user_id: `user_${Math.floor(Math.random() * 5)}`,
        session_id: `session_${Math.floor(Math.random() * 10)}`
      }));
    };

    const generateMockErrors = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `error_${i}`,
        created_at: new Date(Date.now() - (i * 4 * 60 * 60 * 1000)).toISOString(),
        error_type: ['javascript', 'api', 'network'][Math.floor(Math.random() * 3)],
        error_message: `Mock error ${i}`,
        stack_trace: null,
        user_id: `user_${Math.floor(Math.random() * 5)}`,
        session_id: `session_${Math.floor(Math.random() * 10)}`,
        url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: {}
      }));
    };

    return {
      events: generateMockEvents(20),
      metrics: generateMockMetrics(15),
      errors: generateMockErrors(3),
      timeRange,
      generatedAt: new Date()
    };
  }

  /**
   * Setup performance monitoring
   */
  private static setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackMetric('page_load', 'page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart);
            this.trackMetric('page_load', 'dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
          } else if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.duration > 1000) { // Only track slow resources
              this.trackMetric('performance', 'slow_resource', resourceEntry.duration, {
                resource: resourceEntry.name,
                type: resourceEntry.initiatorType
              });
            }
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'resource'] });
    }

    // Track Core Web Vitals
    this.trackCoreWebVitals();
  }

  /**
   * Track Core Web Vitals
   */
  private static trackCoreWebVitals() {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.trackMetric('performance', 'largest_contentful_paint', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackMetric('performance', 'first_input_delay', (entry as any).processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        this.trackMetric('performance', 'cumulative_layout_shift', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Setup error tracking
   */
  private static setupErrorTracking() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError('javascript', event.message, event.error?.stack, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('javascript', event.reason.toString(), event.reason?.stack, {
        type: 'unhandled_promise_rejection'
      });
    });
  }

  /**
   * Track page load event
   */
  private static trackPageLoad() {
    this.trackEvent('page_view', 'page_load', {
      url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }

  /**
   * Setup beforeunload handler to flush buffers
   */
  private static setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      this.flushAllBuffers();
    });

    // Flush periodically with reduced frequency to prevent spam
    setInterval(() => {
      this.flushAllBuffers();
    }, 120000); // Every 2 minutes instead of 30 seconds
  }

  /**
   * Flush all buffers
   */
  private static flushAllBuffers() {
    this.flushEvents();
    this.flushMetrics();
    this.flushErrors();
  }

  /**
   * Flush events buffer
   */
  private static async flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Throttled logging to prevent spam
    if (events.length > 0 && Math.random() < 0.1) { // Only log 10% of the time
      console.log('Monitoring: Flushing events', events.length);
    }
    
    try {
      // This will be enabled once types are regenerated
      // const { error } = await supabase
      //   .from('user_events')
      //   .insert(events.map(event => ({...})));
    } catch (error) {
      console.error('Error flushing events:', error);
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Flush metrics buffer
   */
  private static async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Throttled logging to prevent spam
    if (metrics.length > 0 && Math.random() < 0.1) { // Only log 10% of the time
      console.log('Monitoring: Flushing metrics', metrics.length);
    }
    
    try {
      // This will be enabled once types are regenerated
      // const { error } = await supabase
      //   .from('performance_metrics')
      //   .insert(metrics.map(metric => ({...})));
    } catch (error) {
      console.error('Error flushing metrics:', error);
      this.metricsBuffer.unshift(...metrics);
    }
  }

  /**
   * Flush errors buffer
   */
  private static async flushErrors() {
    if (this.errorBuffer.length === 0) return;

    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    // For now, just log errors since types aren't regenerated yet
    console.log('Monitoring: Flushing errors', errors.length);
    
    try {
      // This will be enabled once types are regenerated
      // const { error } = await supabase
      //   .from('error_logs')
      //   .insert(errors.map(err => ({...})));
    } catch (error) {
      console.error('Error flushing errors:', error);
      this.errorBuffer.unshift(...errors);
    }
  }

  /**
   * Generate session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user ID
   */
  private static getCurrentUserId(): string | undefined {
    // This would typically come from your auth context
    // For now, we'll try to get it from supabase
    try {
      // This is async, so for now just return undefined
      // TODO: Integrate with auth context properly
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Force flush all buffers (for testing or manual trigger)
   */
  static async forceFlush() {
    await this.flushAllBuffers();
  }

  /**
   * Get current session ID
   */
  static getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Cleanup monitoring
   */
  static cleanup() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.flushAllBuffers();
  }
}