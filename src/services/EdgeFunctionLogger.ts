import { supabase } from '@/integrations/supabase/client';

interface EdgeFunctionLogEntry {
  functionName: string;
  requestId: string;
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class EdgeFunctionLogger {
  private activeLogs = new Map<string, EdgeFunctionLogEntry>();

  async logFunctionStart(functionName: string, payload?: any): Promise<string> {
    const requestId = `${functionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const logEntry: EdgeFunctionLogEntry = {
      functionName,
      requestId,
      startTime: Date.now(),
      metadata: {
        payload: payload ? this.sanitizePayload(payload) : undefined,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };

    this.activeLogs.set(requestId, logEntry);
    
    console.log(`🚀 Edge Function [${functionName}] started - Request ID: ${requestId}`);
    
    return requestId;
  }

  async logFunctionEnd(requestId: string, result?: any, error?: Error): Promise<void> {
    const logEntry = this.activeLogs.get(requestId);
    if (!logEntry) {
      console.warn(`No log entry found for request ID: ${requestId}`);
      return;
    }

    logEntry.endTime = Date.now();
    logEntry.success = !error;
    
    if (error) {
      logEntry.error = error.message;
      logEntry.metadata = {
        ...logEntry.metadata,
        errorStack: error.stack,
        errorName: error.name
      };
    }

    if (result) {
      logEntry.metadata = {
        ...logEntry.metadata,
        result: this.sanitizePayload(result)
      };
    }

    const duration = logEntry.endTime - logEntry.startTime;
    const status = logEntry.success ? '✅' : '❌';
    
    console.log(
      `${status} Edge Function [${logEntry.functionName}] completed in ${duration}ms - Request ID: ${requestId}`
    );

    // Store in database for monitoring
    try {
      await this.storeLog(logEntry, duration);
    } catch (dbError) {
      console.error('Failed to store edge function log:', dbError);
    }

    this.activeLogs.delete(requestId);
  }

  private async storeLog(logEntry: EdgeFunctionLogEntry, duration: number): Promise<void> {
    // Store performance metrics instead of API logs table
    try {
      const user = await supabase.auth.getUser();
      await supabase.from('performance_metrics').insert({
        metric_name: 'edge_function_duration',
        metric_type: 'timing',
        value: duration,
        session_id: logEntry.requestId,
        user_id: user.data.user?.id,
        metadata: {
          functionName: logEntry.functionName,
          success: logEntry.success || false,
          timestamp: new Date(logEntry.startTime).toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }

    // Also store detailed logs in error_logs if there was an error
    if (!logEntry.success && logEntry.error) {
      await supabase.from('error_logs').insert({
        error_type: 'edge_function_error',
        error_message: logEntry.error,
        url: window.location.href,
        user_agent: navigator.userAgent,
        session_id: logEntry.requestId,
        metadata: logEntry.metadata
      });
    }
  }

  private sanitizePayload(payload: any): any {
    if (!payload) return undefined;

    // Remove sensitive data and limit size
    const sanitized = JSON.parse(JSON.stringify(payload));
    
    // Remove base64 data to avoid huge logs
    if (typeof sanitized === 'object') {
      this.removeSensitiveData(sanitized);
    }

    // Limit size to 1KB
    const jsonString = JSON.stringify(sanitized);
    if (jsonString.length > 1024) {
      return {
        truncated: true,
        size: jsonString.length,
        preview: jsonString.substring(0, 1024) + '...'
      };
    }

    return sanitized;
  }

  private removeSensitiveData(obj: any): void {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.removeSensitiveData(obj[key]);
      } else if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'string' && obj[key].startsWith('data:image/')) {
        obj[key] = '[BASE64_IMAGE_DATA]';
      }
    }
  }

  // Cleanup old logs to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    for (const [requestId, logEntry] of this.activeLogs.entries()) {
      if (logEntry.startTime < fiveMinutesAgo) {
        console.warn(`Cleaning up stale log entry: ${requestId}`);
        this.activeLogs.delete(requestId);
      }
    }
  }
}

export const edgeFunctionLogger = new EdgeFunctionLogger();

// Cleanup every 5 minutes
setInterval(() => {
  edgeFunctionLogger.cleanup();
}, 5 * 60 * 1000);