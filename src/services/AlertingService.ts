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

  /**
   * Initialize alerting system
   */
  static initialize() {
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
    const { data, error } = await supabase
      .from('error_logs')
      .select('id')
      .gte('created_at', since.toISOString());

    if (error) return false;
    return (data?.length || 0) > threshold;
  }

  /**
   * Check response time
   */
  private static async checkResponseTime(threshold: number, since: Date): Promise<boolean> {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('value')
      .eq('metric_name', 'api_response_time')
      .gte('created_at', since.toISOString());

    if (error || !data?.length) return false;

    const avgResponseTime = data.reduce((sum, metric) => sum + metric.value, 0) / data.length;
    return avgResponseTime > threshold;
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
    const { data, error } = await supabase
      .from('security_logs')
      .select('id')
      .eq('event_type', 'auth_failure')
      .gte('created_at', since.toISOString());

    if (error) return false;
    return (data?.length || 0) > threshold;
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
    try {
      const { error } = await supabase
        .from('alerts')
        .insert({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          created_at: alert.timestamp.toISOString(),
          acknowledged: alert.acknowledged,
          resolved: alert.resolved,
          metadata: alert.metadata,
          user_id: alert.user_id
        });

      if (error) {
        console.error('Error saving alert:', error);
      }
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
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading active alerts:', error);
        return;
      }

      if (data) {
        data.forEach(alertData => {
          const alert: Alert = {
            id: alertData.id,
            type: alertData.type,
            severity: alertData.severity,
            title: alertData.title,
            message: alertData.message,
            timestamp: new Date(alertData.created_at),
            acknowledged: alertData.acknowledged,
            resolved: alertData.resolved,
            metadata: alertData.metadata || {},
            user_id: alertData.user_id
          };
          this.activeAlerts.set(alert.id, alert);
        });
      }
    } catch (error) {
      console.error('Error loading active alerts:', error);
    }
  }

  /**
   * Start alert monitoring
   */
  private static startAlertMonitoring() {
    // Check for alerts every minute
    setInterval(() => {
      this.checkAlertRules();
    }, 60000);

    // Initial check
    setTimeout(() => {
      this.checkAlertRules();
    }, 5000);
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

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ 
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
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

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ 
          resolved: true,
          resolved_by: userId,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
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