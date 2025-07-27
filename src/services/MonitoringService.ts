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
    
    // Flush if buffer is getting large
    if (this.eventBuffer.length >= 10) {
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

    // Flush if buffer is getting large
    if (this.metricsBuffer.length >= 5) {
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
      
      // Get error rate from recent errors (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: errors } = await supabase
        .from('error_logs')
        .select('count')
        .gte('created_at', oneHourAgo.toISOString());

      const errorRate = errors ? errors.length : 0;

      // Get active users (last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const { data: activeUsers } = await supabase
        .from('user_events')
        .select('user_id')
        .gte('created_at', thirtyMinutesAgo.toISOString());

      const uniqueActiveUsers = activeUsers ? new Set(activeUsers.map(u => u.user_id)).size : 0;

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
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const startTime = new Date(now.getTime() - timeRangeMs[timeRange]);

    try {
      // Get user events
      const { data: events } = await supabase
        .from('user_events')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false });

      // Get performance metrics
      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false });

      // Get error logs
      const { data: errors } = await supabase
        .from('error_logs')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false });

      return {
        events: events || [],
        metrics: metrics || [],
        errors: errors || [],
        timeRange,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
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

    // Also flush periodically
    setInterval(() => {
      this.flushAllBuffers();
    }, 30000); // Every 30 seconds
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

    try {
      const { error } = await supabase
        .from('user_events')
        .insert(events.map(event => ({
          id: event.id,
          created_at: event.timestamp.toISOString(),
          event_type: event.event_type,
          event_name: event.event_name,
          properties: event.properties,
          user_id: event.user_id,
          session_id: event.session_id,
          url: event.url
        })));

      if (error) {
        console.error('Error flushing events:', error);
        // Re-add to buffer for retry
        this.eventBuffer.unshift(...events);
      }
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

    try {
      const { error } = await supabase
        .from('performance_metrics')
        .insert(metrics.map(metric => ({
          id: metric.id,
          created_at: metric.timestamp.toISOString(),
          metric_type: metric.metric_type,
          metric_name: metric.metric_name,
          value: metric.value,
          metadata: metric.metadata,
          user_id: metric.user_id,
          session_id: metric.session_id
        })));

      if (error) {
        console.error('Error flushing metrics:', error);
        this.metricsBuffer.unshift(...metrics);
      }
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

    try {
      const { error } = await supabase
        .from('error_logs')
        .insert(errors.map(err => ({
          id: err.id,
          created_at: err.timestamp.toISOString(),
          error_type: err.error_type,
          error_message: err.error_message,
          stack_trace: err.stack_trace,
          user_id: err.user_id,
          session_id: err.session_id,
          url: err.url,
          user_agent: err.user_agent,
          metadata: err.metadata
        })));

      if (error) {
        console.error('Error flushing errors:', error);
        this.errorBuffer.unshift(...errors);
      }
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
      const { data: { user } } = supabase.auth.getUser();
      return user?.id;
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