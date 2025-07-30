import { supabase } from '@/integrations/supabase/client';
import { MonitoringService, SystemHealth } from './MonitoringService';

export interface Alert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  metadata: Record<string, any>;
  user_id?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  condition: string; // SQL-like condition
  threshold: number;
  timeWindow: number; // in minutes
  severity: Alert['severity'];
  enabled: boolean;
  cooldown: number; // in minutes
  lastTriggered?: Date;
}

export class AlertingService {
  private static alertRules: AlertRule[] = [
    {
      id: 'high_error_rate',
      name: 'High Error Rate',
      type: 'error',
      condition: 'error_count > threshold',
      threshold: 10,
      timeWindow: 5,
      severity: 'high',
      enabled: true,
      cooldown: 15
    },
    {
      id: 'slow_response_time',
      name: 'Slow Response Time',
      type: 'performance',
      condition: 'avg_response_time > threshold',
      threshold: 2000,
      timeWindow: 10,
      severity: 'medium',
      enabled: true,
      cooldown: 10
    },
    {
      id: 'system_health_degraded',
      name: 'System Health Degraded',
      type: 'system',
      condition: 'health_status != healthy',
      threshold: 1,
      timeWindow: 1,
      severity: 'high',
      enabled: true,
      cooldown: 5
    },
    {
      id: 'failed_auth_attempts',
      name: 'Failed Authentication Attempts',
      type: 'security',
      condition: 'failed_auth_count > threshold',
      threshold: 5,
      timeWindow: 15,
      severity: 'medium',
      enabled: true,
      cooldown: 30
    }
  ];

  private static activeAlerts: Map<string, Alert> = new Map();
  private static monitoringInterval: number | null = null;
  private static isInitialized = false;

  /**
   * Initialize alerting system
   */
  static initialize() {
    if (this.isInitialized) {
      return; // Prevent duplicate initialization
    }
    
    this.isInitialized = true;
    // Start monitoring for alerts
    this.startAlertMonitoring();
    
    // Load existing alerts from database
    this.loadActiveAlerts();
  }

  /**
   * Check all alert rules and trigger alerts if necessary
   */
  static async checkAlertRules() {
    const now = new Date();
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldown * 60 * 1000);
        if (now < cooldownEnd) continue;
      }

      const shouldTrigger = await this.evaluateRule(rule);
      
      if (shouldTrigger) {
        await this.triggerAlert(rule);
        rule.lastTriggered = now;
      }
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private static async evaluateRule(rule: AlertRule): Promise<boolean> {
    const timeWindowStart = new Date(Date.now() - rule.timeWindow * 60 * 1000);

    try {
      switch (rule.id) {
        case 'high_error_rate':
          return await this.checkErrorRate(rule.threshold, timeWindowStart);
        
        case 'slow_response_time':
          return await this.checkResponseTime(rule.threshold, timeWindowStart);
        
        case 'system_health_degraded':
          return await this.checkSystemHealth();
        
        case 'failed_auth_attempts':
          return await this.checkFailedAuth(rule.threshold, timeWindowStart);
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      return false;
    }
  }

  /**
   * Check error rate
   */
  private static async checkErrorRate(threshold: number, since: Date): Promise<boolean> {
    // For now, return mock data since types aren't regenerated yet
    // TODO: Update to use real monitoring tables once types are available
    const mockErrorCount = Math.floor(Math.random() * 3); // 0-2 errors
    return mockErrorCount > threshold;
  }

  /**
   * Check response time
   */
  private static async checkResponseTime(threshold: number, since: Date): Promise<boolean> {
    // For now, return mock data since types aren't regenerated yet
    // TODO: Update to use real monitoring tables once types are available
    const mockAvgResponseTime = Math.floor(Math.random() * 1500) + 200; // 200-1700ms
    return mockAvgResponseTime > threshold;
  }

  /**
   * Check system health
   */
  private static async checkSystemHealth(): Promise<boolean> {
    const health = await MonitoringService.getSystemHealth();
    return health.status !== 'healthy';
  }

  /**
   * Check failed authentication attempts
   */
  private static async checkFailedAuth(threshold: number, since: Date): Promise<boolean> {
    // Use existing security_logs table
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('id')
        .eq('event_type', 'auth_failure')
        .gte('created_at', since.toISOString());

      if (error) return false;
      return (data?.length || 0) > threshold;
    } catch {
      return false;
    }
  }

  /**
   * Trigger an alert
   */
  private static async triggerAlert(rule: AlertRule) {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule),
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      metadata: { ruleId: rule.id, rule },
      user_id: undefined // System-generated alert
    };

    // Store in active alerts
    this.activeAlerts.set(alert.id, alert);

    // Save to database
    await this.saveAlert(alert);

    // Send notifications
    await this.sendNotifications(alert);

    console.warn(`Alert triggered: ${alert.title}`, alert);
  }

  /**
   * Generate alert message
   */
  private static generateAlertMessage(rule: AlertRule): string {
    switch (rule.id) {
      case 'high_error_rate':
        return `Error rate exceeded ${rule.threshold} errors in the last ${rule.timeWindow} minutes.`;
      
      case 'slow_response_time':
        return `Average response time exceeded ${rule.threshold}ms in the last ${rule.timeWindow} minutes.`;
      
      case 'system_health_degraded':
        return 'System health status is degraded or in error state.';
      
      case 'failed_auth_attempts':
        return `More than ${rule.threshold} failed authentication attempts in the last ${rule.timeWindow} minutes.`;
      
      default:
        return `Alert condition met for rule: ${rule.name}`;
    }
  }

  /**
   * Save alert to database
   */
  private static async saveAlert(alert: Alert) {
    // For now, just log alerts since types aren't regenerated yet
    // TODO: Update to use real alerts table once types are available
    console.log('Alert saved:', alert.title, alert.severity);
    
    try {
      // This will be enabled once types are regenerated
      // const { error } = await supabase
      //   .from('alerts')
      //   .insert({...});
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  }

  /**
   * Send notifications for alert
   */
  private static async sendNotifications(alert: Alert) {
    // In a real implementation, this would:
    // - Send email notifications
    // - Send Slack/Discord webhooks
    // - Trigger push notifications
    // - Log to external monitoring services

    // For now, we'll just create a browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id
      });
    }
  }

  /**
   * Load active alerts from database
   */
  private static async loadActiveAlerts() {
    // For now, generate some mock alerts for demonstration
    // TODO: Update to use real alerts table once types are available
    
    const mockAlerts: Alert[] = [
      {
        id: 'alert-1',
        type: 'performance',
        severity: 'medium',
        title: 'Slow Response Time Detected',
        message: 'Average response time exceeded 2000ms in the last 10 minutes.',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        acknowledged: false,
        resolved: false,
        metadata: { ruleId: 'slow_response_time' }
      }
    ];

    mockAlerts.forEach(alert => {
      this.activeAlerts.set(alert.id, alert);
    });
  }

  /**
   * Start alert monitoring
   */
  private static startAlertMonitoring() {
    // Clear existing interval to prevent duplicates
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Check for alerts every 5 minutes instead of every minute
    this.monitoringInterval = window.setInterval(() => {
      this.checkAlertRules();
    }, 300000); // 5 minutes

    // Initial check after 10 seconds
    setTimeout(() => {
      this.checkAlertRules();
    }, 10000);
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.user_id = userId;

    // For now, just update in memory
    // TODO: Update to use real alerts table once types are available
    console.log('Alert acknowledged:', alertId, userId);
    return true;
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.user_id = userId;
    this.activeAlerts.delete(alertId);

    // For now, just update in memory
    // TODO: Update to use real alerts table once types are available
    console.log('Alert resolved:', alertId, userId);
    return true;
  }

  /**
   * Get alert rules
   */
  static getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Update alert rule
   */
  static updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return false;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Request notification permission
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}