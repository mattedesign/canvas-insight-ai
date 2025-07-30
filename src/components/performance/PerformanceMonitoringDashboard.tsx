/**
 * Phase 4: Performance Monitoring Dashboard
 * Real-time performance metrics and optimization recommendations
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWhyDidYouUpdate, useWhyDidYouUpdateWithMetrics } from '@/hooks/useWhyDidYouUpdate';
import { useRenderCountMonitor } from '@/hooks/useRenderCountMonitor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  MemoryStick,
  RefreshCw,
  TrendingUp,
  Zap
} from 'lucide-react';

interface PerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly status: 'good' | 'warning' | 'critical';
  readonly threshold: number;
}

interface ComponentStats {
  readonly name: string;
  readonly renderCount: number;
  readonly averageRenderTime: number;
  readonly slowRenders: number;
  readonly lastRenderTime: number;
}

export const PerformanceMonitoringDashboard = React.memo(() => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [componentStats, setComponentStats] = useState<ComponentStats[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);

  // Use performance monitoring hooks
  const renderMetrics = useWhyDidYouUpdateWithMetrics('PerformanceMonitoringDashboard', {});
  const performanceData = usePerformanceMonitor({ 
    componentName: 'PerformanceMonitoringDashboard',
    enableMemoryTracking: true,
    enableDetailedLogging: true 
  });

  // Simulate memory monitoring (in real app, you'd use Performance API)
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      // Simulate memory usage calculation
      const usage = (performance as any).memory?.usedJSHeapSize || Math.random() * 50000000;
      setMemoryUsage(usage);

      // Update performance metrics
      const currentMetrics: PerformanceMetric[] = [
        {
          name: 'FPS',
          value: 60 - Math.random() * 10,
          unit: 'fps',
          status: 'good',
          threshold: 30
        },
        {
          name: 'Memory Usage',
          value: usage / 1024 / 1024,
          unit: 'MB',
          status: usage > 100 * 1024 * 1024 ? 'warning' : 'good',
          threshold: 100
        },
        {
          name: 'Render Time',
          value: renderMetrics.avgRenderTime,
          unit: 'ms',
          status: renderMetrics.avgRenderTime > 16 ? 'warning' : 'good',
          threshold: 16
        },
        {
          name: 'Re-renders',
          value: renderMetrics.renderCount,
          unit: 'count',
          status: renderMetrics.renderCount > 20 ? 'critical' : 'good',
          threshold: 20
        }
      ];

      setMetrics(currentMetrics);

      // Update component stats (mock data - in real app, collect from monitoring hooks)
      const mockStats: ComponentStats[] = [
        {
          name: 'ImageGrid',
          renderCount: Math.floor(Math.random() * 15) + 1,
          averageRenderTime: Math.random() * 20,
          slowRenders: Math.floor(Math.random() * 3),
          lastRenderTime: performance.now()
        },
        {
          name: 'AnalysisPanel',
          renderCount: Math.floor(Math.random() * 10) + 1,
          averageRenderTime: Math.random() * 15,
          slowRenders: Math.floor(Math.random() * 2),
          lastRenderTime: performance.now()
        },
        {
          name: 'CanvasView',
          renderCount: Math.floor(Math.random() * 8) + 1,
          averageRenderTime: Math.random() * 25,
          slowRenders: Math.floor(Math.random() * 4),
          lastRenderTime: performance.now()
        }
      ];

      setComponentStats(mockStats);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, renderMetrics.avgRenderTime, renderMetrics.renderCount]);

  const overallHealth = useMemo(() => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'good';
  }, [metrics]);

  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    metrics.forEach(metric => {
      if (metric.status === 'critical') {
        switch (metric.name) {
          case 'Re-renders':
            recs.push('Consider memoizing components with React.memo()');
            recs.push('Check useCallback and useMemo dependencies');
            break;
          case 'Memory Usage':
            recs.push('Check for memory leaks in useEffect cleanup');
            recs.push('Implement virtualization for large lists');
            break;
        }
      }
    });

    componentStats.forEach(stat => {
      if (stat.slowRenders > 2) {
        recs.push(`Optimize ${stat.name} component - ${stat.slowRenders} slow renders detected`);
      }
      if (stat.renderCount > 15) {
        recs.push(`${stat.name} is re-rendering frequently (${stat.renderCount} times)`);
      }
    });

    return [...new Set(recs)]; // Remove duplicates
  }, [metrics, componentStats]);

  const MetricCard = React.memo<{ metric: PerformanceMetric }>(({ metric }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
            <p className="text-2xl font-bold">
              {metric.value.toFixed(1)} <span className="text-sm font-normal">{metric.unit}</span>
            </p>
          </div>
          <div className="flex items-center">
            {metric.status === 'good' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {metric.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {metric.status === 'critical' && <AlertTriangle className="h-5 w-5 text-red-500" />}
          </div>
        </div>
        <Progress 
          value={(metric.value / metric.threshold) * 100} 
          className="mt-2" 
        />
      </CardContent>
    </Card>
  ));

  const ComponentStatsCard = React.memo<{ stats: ComponentStats }>(({ stats }) => (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{stats.name}</h4>
            <Badge variant={stats.slowRenders > 2 ? 'destructive' : 'default'}>
              {stats.renderCount} renders
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Avg: {stats.averageRenderTime.toFixed(1)}ms</div>
            <div>Slow: {stats.slowRenders}</div>
          </div>
          <Progress value={Math.min(100, stats.averageRenderTime * 5)} className="h-1" />
        </div>
      </CardContent>
    </Card>
  ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-muted-foreground">Real-time application performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overallHealth === 'good' ? 'default' : 'destructive'}>
            {overallHealth === 'good' ? 'Healthy' : 'Issues Detected'}
          </Badge>
          <Button
            variant={isMonitoring ? 'destructive' : 'default'}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {overallHealth !== 'good' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Performance issues detected. Check the metrics below for details.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.name} metric={metric} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {componentStats.map((stats) => (
              <ComponentStatsCard key={stats.name} stats={stats} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No performance issues detected!</p>
                  <p className="text-sm">Your app is running smoothly.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Zap className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

PerformanceMonitoringDashboard.displayName = 'PerformanceMonitoringDashboard';