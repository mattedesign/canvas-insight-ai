import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/utils/logging';

export interface FallbackEvent {
  service_name: string;
  fallback_type: string;
  original_error?: string;
  context_data?: Record<string, any>;
}

export class FallbackLoggingService {
  /**
   * Log a fallback event to the database
   */
  static async logFallbackUsage(event: FallbackEvent): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('fallback_events')
        .insert({
          user_id: user?.id || null,
          service_name: event.service_name,
          fallback_type: event.fallback_type,
          original_error: event.original_error,
          context_data: event.context_data || {}
        });

      if (error) {
        Logger.error('general', 'Failed to log fallback event', error);
      } else {
        Logger.debug('general', `Logged fallback: ${event.service_name} - ${event.fallback_type}`);
      }
    } catch (error) {
      Logger.error('general', 'Error logging fallback event', error);
    }
  }

  /**
   * Get fallback events for admin dashboard
   */
  static async getFallbackEvents(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('fallback_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        Logger.error('general', 'Failed to fetch fallback events', error);
        return [];
      }

      return data || [];
    } catch (error) {
      Logger.error('general', 'Error fetching fallback events', error);
      return [];
    }
  }

  /**
   * Get fallback statistics for dashboard
   */
  static async getFallbackStats() {
    try {
      const { data, error } = await supabase
        .from('fallback_events')
        .select('service_name, fallback_type, created_at');

      if (error) {
        Logger.error('general', 'Failed to fetch fallback stats', error);
        return {
          total: 0,
          byService: {},
          byType: {},
          last24Hours: 0
        };
      }

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = {
        total: data?.length || 0,
        byService: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        last24Hours: 0
      };

      data?.forEach(event => {
        // Count by service
        stats.byService[event.service_name] = (stats.byService[event.service_name] || 0) + 1;
        
        // Count by type
        stats.byType[event.fallback_type] = (stats.byType[event.fallback_type] || 0) + 1;
        
        // Count last 24 hours
        if (new Date(event.created_at) > yesterday) {
          stats.last24Hours++;
        }
      });

      return stats;
    } catch (error) {
      Logger.error('general', 'Error calculating fallback stats', error);
      return {
        total: 0,
        byService: {},
        byType: {},
        last24Hours: 0
      };
    }
  }
}