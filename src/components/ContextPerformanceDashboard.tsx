/**
 * Phase 6.2: Context Performance Dashboard
 * Real-time monitoring dashboard for context performance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, TrendingUp, Activity } from 'lucide-react';
import { contextOptimizationService, type ContextUpdateMetrics } from '@/services/ContextOptimizationService';
import { contextBatchingService, type BatchStats } from '@/services/ContextBatchingService';

interface ContextPerformanceDashboardProps {
  refreshInterval?: number;
  enableAutoRefresh?: boolean;
  className?: string;
}

export const ContextPerformanceDashboard: React.FC<ContextPerformanceDashboardProps> = ({
  refreshInterval = 2000,
  enableAutoRefresh = true,
  className = '',
}) => {
  const [metrics, setMetrics] = useState<ContextUpdateMetrics[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStats>({
    totalBatches: 0,
    totalUpdates: 0,
    averageBatchSize: 0,
    averageBatchTime: 0,
    conflictsResolved: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const currentMetrics = contextOptimizationService.getAllMetrics();
      const currentBatchStats = contextBatchingService.getStats();
      
      setMetrics(currentMetrics);
      setBatchStats(currentBatchStats);
    } catch (error) {
      console.error('Error refreshing context performance data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    refreshData();
    
    if (enableAutoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshData, enableAutoRefresh, refreshInterval]);

  const getHealthStatus = (metric: ContextUpdateMetrics) => {
    const isHealthy = contextOptimizationService.isContextHealthy(metric.contextName);
    return isHealthy ? 'healthy' : 'warning';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return Number(num).toFixed(decimals);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${formatNumber(ms, 1)}ms`;
    return `${formatNumber(ms / 1000, 2)}s`;
  };

  const selectedMetric = selectedContext ? 
    metrics.find(m => m.contextName === selectedContext) : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Context Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor context providers and optimization metrics
          </p>
        </div>
        <Button
          onClick={refreshData}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contexts">Context Details</TabsTrigger>
          <TabsTrigger value="batching">Batching Stats</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Contexts</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.length}</div>
                <p className="text-xs text-muted-foreground">
                  Currently monitored
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Updates</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.reduce((sum, m) => sum + m.updateCount, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all contexts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Batches Processed</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batchStats.totalBatches}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatNumber(batchStats.averageBatchSize)} updates/batch
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conflicts Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batchStats.conflictsResolved}</div>
                <p className="text-xs text-muted-foreground">
                  Auto-resolved conflicts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Context Health Overview</CardTitle>
              <CardDescription>
                Quick status of all monitored contexts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.map((metric) => {
                  const status = getHealthStatus(metric);
                  return (
                    <div
                      key={metric.contextName}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedContext(metric.contextName)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={getHealthColor(status)}>
                          {getHealthIcon(status)}
                        </div>
                        <div>
                          <span className="font-medium">{metric.contextName}</span>
                          <p className="text-sm text-muted-foreground">
                            {metric.updateCount} updates, {metric.reRenderCount} re-renders
                          </p>
                        </div>
                      </div>
                      <Badge variant={status === 'healthy' ? 'default' : 'destructive'}>
                        {status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Context Details Tab */}
        <TabsContent value="contexts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Context List */}
            <Card>
              <CardHeader>
                <CardTitle>Select Context</CardTitle>
                <CardDescription>
                  Choose a context to view detailed metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.map((metric) => (
                    <Button
                      key={metric.contextName}
                      variant={selectedContext === metric.contextName ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedContext(metric.contextName)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{metric.contextName}</span>
                        <Badge variant="secondary" className="ml-2">
                          {metric.updateCount}
                        </Badge>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Context Details */}
            {selectedMetric && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedMetric.contextName} Details</CardTitle>
                  <CardDescription>
                    Detailed performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Update Count</label>
                      <div className="text-2xl font-bold">{selectedMetric.updateCount}</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Re-render Count</label>
                      <div className="text-2xl font-bold">{selectedMetric.reRenderCount}</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Re-render Ratio</label>
                      <div className="text-lg">
                        {selectedMetric.updateCount > 0 ? 
                          formatNumber(selectedMetric.reRenderCount / selectedMetric.updateCount, 2) : 
                          '0'
                        }
                      </div>
                      <Progress 
                        value={Math.min(100, (selectedMetric.reRenderCount / Math.max(selectedMetric.updateCount, 1)) * 50)} 
                        className="mt-2" 
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Average Update Interval</label>
                      <div className="text-lg">
                        {selectedMetric.averageUpdateInterval > 0 ? 
                          formatDuration(selectedMetric.averageUpdateInterval) : 
                          'N/A'
                        }
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Consumer Count</label>
                      <div className="text-lg">{selectedMetric.consumersCount}</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Last Update</label>
                      <div className="text-sm text-muted-foreground">
                        {selectedMetric.lastUpdateTime > 0 ? 
                          formatDuration(performance.now() - selectedMetric.lastUpdateTime) + ' ago' :
                          'Never'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Batching Stats Tab */}
        <TabsContent value="batching" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Batching Performance</CardTitle>
                <CardDescription>
                  Statistics for update batching system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium">Total Batches</label>
                    <div className="text-2xl font-bold">{batchStats.totalBatches}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Total Updates</label>
                    <div className="text-2xl font-bold">{batchStats.totalUpdates}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Average Batch Size</label>
                    <div className="text-lg">{formatNumber(batchStats.averageBatchSize)}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Average Batch Time</label>
                    <div className="text-lg">{formatDuration(batchStats.averageBatchTime)}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Conflicts Resolved</label>
                    <div className="text-lg">{batchStats.conflictsResolved}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Updates</CardTitle>
                <CardDescription>
                  Current pending updates by context
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contextBatchingService.getPendingContexts().map(contextName => {
                    const info = contextBatchingService.getContextUpdateInfo(contextName);
                    return (
                      <div key={contextName} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{contextName}</span>
                          <Badge variant="outline">{info.pendingCount}</Badge>
                        </div>
                        {info.oldestUpdate && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Oldest: {formatDuration(info.oldestUpdate)} ago
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {contextBatchingService.getPendingContexts().length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No pending updates
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {metrics.map((metric) => {
              const recommendations = contextOptimizationService.getOptimizationRecommendations(metric.contextName);
              const status = getHealthStatus(metric);
              
              if (recommendations.length === 0 && status === 'healthy') return null;

              return (
                <Alert key={metric.contextName} variant={status === 'healthy' ? 'default' : 'destructive'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <strong>{metric.contextName}</strong>
                      {recommendations.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {recommendations.map((rec, index) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm">Context is performing well!</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
            
            {metrics.every(m => contextOptimizationService.getOptimizationRecommendations(m.contextName).length === 0) && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">All Contexts Optimized</h3>
                  <p className="text-muted-foreground">
                    No optimization recommendations at this time
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContextPerformanceDashboard;