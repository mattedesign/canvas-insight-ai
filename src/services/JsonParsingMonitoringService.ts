import { supabase } from '@/integrations/supabase/client';
import { pipelineConfig } from '@/config/pipelineConfig';

interface JsonParsingMetric {
  model: string;
  stage: 'vision' | 'analysis' | 'synthesis';
  method: 'direct' | 'smart-pattern' | 'content-cleaning' | 'failed';
  success: boolean;
  responseLength: number;
  parseTime: number;
  timestamp: string;
  error?: string;
}

interface JsonParsingStats {
  totalAttempts: number;
  successRate: number;
  methodBreakdown: Record<string, number>;
  modelPerformance: Record<string, { success: number; total: number; rate: number }>;
  averageParseTime: number;
  recentFailures: JsonParsingMetric[];
}

class JsonParsingMonitoringService {
  private metrics: JsonParsingMetric[] = [];
  private readonly MAX_METRICS_MEMORY = 1000;

  // PHASE 4.2: Track JSON parsing success rates by model and stage
  async trackParsingAttempt(
    model: string,
    stage: 'vision' | 'analysis' | 'synthesis',
    method: 'direct' | 'smart-pattern' | 'content-cleaning' | 'failed',
    success: boolean,
    responseLength: number,
    parseTime: number,
    error?: string
  ): Promise<void> {
    const metric: JsonParsingMetric = {
      model,
      stage,
      method,
      success,
      responseLength,
      parseTime,
      timestamp: new Date().toISOString(),
      error
    };

    // Store in memory for immediate access
    this.metrics.push(metric);
    
    // Keep memory usage bounded
    if (this.metrics.length > this.MAX_METRICS_MEMORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_MEMORY);
    }

    // PHASE 4.2: Store in database if monitoring is enabled
    if (pipelineConfig.jsonHandling.monitoring.enablePerformanceMetrics) {
      try {
        await this.persistMetric(metric);
      } catch (error) {
        console.error('Failed to persist JSON parsing metric:', error);
      }
    }

    // Log immediate feedback for debugging
    if (pipelineConfig.jsonHandling.monitoring.logParsingMethods) {
      const emoji = success ? '✅' : '❌';
      console.log(`${emoji} JSON Parse [${model}/${stage}]: ${method} (${parseTime}ms, ${responseLength} chars)`);
    }
  }

  // PHASE 4.2: Get comprehensive parsing statistics
  getParsingStats(timeWindow?: number): JsonParsingStats {
    const cutoff = timeWindow ? Date.now() - (timeWindow * 60 * 1000) : 0;
    const relevantMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    const totalAttempts = relevantMetrics.length;
    const successfulAttempts = relevantMetrics.filter(m => m.success).length;
    const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;

    // Method breakdown
    const methodBreakdown: Record<string, number> = {};
    relevantMetrics.forEach(m => {
      methodBreakdown[m.method] = (methodBreakdown[m.method] || 0) + 1;
    });

    // Model performance breakdown
    const modelPerformance: Record<string, { success: number; total: number; rate: number }> = {};
    relevantMetrics.forEach(m => {
      if (!modelPerformance[m.model]) {
        modelPerformance[m.model] = { success: 0, total: 0, rate: 0 };
      }
      modelPerformance[m.model].total++;
      if (m.success) {
        modelPerformance[m.model].success++;
      }
    });

    // Calculate rates
    Object.keys(modelPerformance).forEach(model => {
      const perf = modelPerformance[model];
      perf.rate = perf.total > 0 ? perf.success / perf.total : 0;
    });

    // Average parse time
    const parseTimes = relevantMetrics.map(m => m.parseTime);
    const averageParseTime = parseTimes.length > 0 
      ? parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length 
      : 0;

    // Recent failures for debugging
    const recentFailures = relevantMetrics
      .filter(m => !m.success)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalAttempts,
      successRate,
      methodBreakdown,
      modelPerformance,
      averageParseTime,
      recentFailures
    };
  }

  // PHASE 4.2: Create alerts for parsing failures
  checkForAlertsAndIssues(): { alerts: string[]; recommendations: string[] } {
    const stats = this.getParsingStats(60); // Last hour
    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Alert: Low overall success rate
    if (stats.successRate < 0.8 && stats.totalAttempts > 10) {
      alerts.push(`JSON parsing success rate is ${(stats.successRate * 100).toFixed(1)}% (last hour)`);
      recommendations.push('Consider switching to smart-parsing-only strategy');
    }

    // Alert: Model-specific issues
    Object.entries(stats.modelPerformance).forEach(([model, perf]) => {
      if (perf.rate < 0.7 && perf.total > 5) {
        alerts.push(`${model} has low JSON parsing success: ${(perf.rate * 100).toFixed(1)}%`);
        recommendations.push(`Review ${model} prompt templates and JSON formatting requirements`);
      }
    });

    // Alert: High dependency on fallback methods
    const smartParsingAttempts = stats.methodBreakdown['smart-pattern'] || 0;
    const directParsingAttempts = stats.methodBreakdown['direct'] || 0;
    const totalSuccessful = smartParsingAttempts + directParsingAttempts;
    
    if (totalSuccessful > 0 && smartParsingAttempts / totalSuccessful > 0.6) {
      alerts.push('High dependency on smart parsing fallback methods');
      recommendations.push('Review prompt templates to ensure proper JSON formatting in responses');
    }

    return { alerts, recommendations };
  }

  // PHASE 4.2: Performance benchmarking
  getBenchmarkReport(): {
    performance: { avgParseTime: number; p95ParseTime: number };
    reliability: { successRate: number; mtbf: number };
    efficiency: { methodDistribution: Record<string, number> };
  } {
    const stats = this.getParsingStats();
    const parseTimes = this.metrics.map(m => m.parseTime).sort((a, b) => a - b);
    
    const p95Index = Math.floor(parseTimes.length * 0.95);
    const p95ParseTime = parseTimes[p95Index] || 0;

    // Calculate MTBF (Mean Time Between Failures)
    const failures = this.metrics.filter(m => !m.success);
    const mtbf = failures.length > 1 
      ? (new Date(failures[failures.length - 1].timestamp).getTime() - 
         new Date(failures[0].timestamp).getTime()) / (failures.length - 1)
      : 0;

    return {
      performance: {
        avgParseTime: stats.averageParseTime,
        p95ParseTime
      },
      reliability: {
        successRate: stats.successRate,
        mtbf: mtbf / (1000 * 60) // Convert to minutes
      },
      efficiency: {
        methodDistribution: stats.methodBreakdown
      }
    };
  }

  private async persistMetric(metric: JsonParsingMetric): Promise<void> {
    try {
      const user = await supabase.auth.getUser();
      await supabase.from('performance_metrics').insert({
        metric_name: 'json_parsing_attempt',
        metric_type: 'success_rate',
        value: metric.success ? 1 : 0,
        session_id: `${metric.model}-${metric.stage}-${Date.now()}`,
        user_id: user.data.user?.id,
        metadata: {
          model: metric.model,
          stage: metric.stage,
          method: metric.method,
          responseLength: metric.responseLength,
          parseTime: metric.parseTime,
          error: metric.error,
          timestamp: metric.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to persist JSON parsing metric to database:', error);
    }
  }

  // Reset metrics (useful for testing)
  reset(): void {
    this.metrics = [];
  }
}

export const jsonParsingMonitor = new JsonParsingMonitoringService();
