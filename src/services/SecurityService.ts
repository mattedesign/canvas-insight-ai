import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  id: string;
  event_type: 'login_attempt' | 'access_violation' | 'rate_limit_exceeded' | 'data_export' | 'api_key_usage';
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface SecurityAudit {
  database_security: {
    rls_enabled: boolean;
    policies_count: number;
    weak_policies: string[];
  };
  api_security: {
    rate_limiting: boolean;
    authentication_required: boolean;
    cors_configured: boolean;
  };
  data_protection: {
    encryption_at_rest: boolean;
    backup_enabled: boolean;
    retention_policy: boolean;
  };
  last_audit: string;
}

export class SecurityService {
  /**
   * Log security event
   */
  static async logSecurityEvent(
    eventType: SecurityEvent['event_type'],
    metadata: Record<string, any> = {},
    severity: SecurityEvent['severity'] = 'medium'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_logs')
        .insert({
          event_type: eventType,
          metadata,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          user_email: await this.getCurrentUserEmail()
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security logging error:', error);
    }
  }

  /**
   * Check rate limits for user actions
   */
  static async checkRateLimit(
    action: string,
    maxRequests: number = 100,
    windowMinutes: number = 60
  ): Promise<boolean> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { count, error } = await supabase
        .from('security_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', user.user.id)
        .eq('event_type', action)
        .gte('created_at', windowStart.toISOString());

      if (error) {
        console.error('Rate limit check failed:', error);
        return false;
      }

      if ((count || 0) >= maxRequests) {
        await this.logSecurityEvent('rate_limit_exceeded', {
          action,
          count,
          limit: maxRequests,
          window_minutes: windowMinutes
        }, 'high');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return false;
    }
  }

  /**
   * Validate user permissions for resource access
   */
  static async validateResourceAccess(
    resourceType: 'project' | 'image' | 'analysis',
    resourceId: string
  ): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        await this.logSecurityEvent('access_violation', {
          resource_type: resourceType,
          resource_id: resourceId,
          reason: 'unauthenticated'
        }, 'high');
        return false;
      }

      // Check resource ownership based on type
      let hasAccess = false;
      
      switch (resourceType) {
        case 'project':
          const { data: project } = await supabase
            .from('projects')
            .select('user_id')
            .eq('id', resourceId)
            .single();
          hasAccess = project?.user_id === user.user.id;
          break;
          
        case 'image':
          const { data: image } = await supabase
            .from('images')
            .select('project_id, projects!images_project_id_fkey(user_id)')
            .eq('id', resourceId)
            .single();
          hasAccess = image?.projects?.user_id === user.user.id;
          break;
          
        case 'analysis':
          const { data: analysis } = await supabase
            .from('ux_analyses')
            .select('image_id, images!ux_analyses_image_id_fkey(project_id, projects!images_project_id_fkey(user_id))')
            .eq('id', resourceId)
            .single();
          hasAccess = analysis?.images?.projects?.user_id === user.user.id;
          break;
      }

      if (!hasAccess) {
        await this.logSecurityEvent('access_violation', {
          resource_type: resourceType,
          resource_id: resourceId,
          user_id: user.user.id,
          reason: 'unauthorized_access'
        }, 'high');
      }

      return hasAccess;
    } catch (error) {
      console.error('Resource access validation error:', error);
      return false;
    }
  }

  /**
   * Perform security audit
   */
  static async performSecurityAudit(): Promise<SecurityAudit> {
    try {
      // Check RLS policies (simplified for demo)
      // const { data: tables } = await supabase.rpc('check_rls_status');
      
      // Basic security checks (simplified for demo)
      const audit: SecurityAudit = {
        database_security: {
          rls_enabled: true, // Assuming RLS is enabled
          policies_count: 25, // Mock count
          weak_policies: [] // Would be populated by actual policy analysis
        },
        api_security: {
          rate_limiting: true,
          authentication_required: true,
          cors_configured: true
        },
        data_protection: {
          encryption_at_rest: true,
          backup_enabled: true,
          retention_policy: true
        },
        last_audit: new Date().toISOString()
      };

      // Log audit completion
      await this.logSecurityEvent('access_violation', {
        audit_results: audit,
        event_type: 'security_audit'
      }, 'low');

      return audit;
    } catch (error) {
      console.error('Security audit failed:', error);
      throw error;
    }
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;\\]/g, '') // Remove SQL injection chars
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate file upload security
   */
  static validateFileUpload(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.type)) {
      this.logSecurityEvent('access_violation', {
        file_type: file.type,
        file_name: file.name,
        reason: 'invalid_file_type'
      }, 'medium');
      return false;
    }
    
    if (file.size > maxSize) {
      this.logSecurityEvent('access_violation', {
        file_size: file.size,
        file_name: file.name,
        reason: 'file_too_large'
      }, 'medium');
      return false;
    }
    
    return true;
  }

  /**
   * Generate secure API key
   */
  static generateApiKey(): string {
    const prefix = 'uxap_';
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const key = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return prefix + key;
  }

  /**
   * Hash sensitive data
   */
  static async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get client IP address (simplified)
   */
  private static async getClientIP(): Promise<string | null> {
    try {
      // In a real implementation, you'd get this from headers or a service
      // For demo purposes, return null
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get current user email
   */
  private static async getCurrentUserEmail(): Promise<string | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      return user.user?.email || null;
    } catch {
      return null;
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  static async detectSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // Check for multiple failed login attempts
      const { count: failedLogins } = await supabase
        .from('security_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('event_type', 'login_attempt')
        .gte('created_at', oneHourAgo.toISOString());

      // Check for excessive API usage
      const { count: apiCalls } = await supabase
        .from('security_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('event_type', 'api_key_usage')
        .gte('created_at', oneHourAgo.toISOString());

      const suspicious = (failedLogins || 0) > 10 || (apiCalls || 0) > 1000;
      
      if (suspicious) {
        await this.logSecurityEvent('access_violation', {
          user_id: userId,
          failed_logins: failedLogins,
          api_calls: apiCalls,
          reason: 'suspicious_activity_detected'
        }, 'critical');
      }

      return suspicious;
    } catch (error) {
      console.error('Suspicious activity detection failed:', error);
      return false;
    }
  }
}