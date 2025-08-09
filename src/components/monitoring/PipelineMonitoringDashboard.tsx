// PHASE 4: Monitoring & Debugging

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';
import { ProgressPersistenceService } from '@/services/ProgressPersistenceService';
import { ModelSelectionOptimizer } from '@/services/ModelSelectionOptimizer';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PipelineMetrics {
  activeRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  timeoutRate: number;
}

export const PipelineMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PipelineMetrics>({
    activeRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    timeoutRate: 0
  });
  
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [modelPerformance, setModelPerformance] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const progressService = ProgressPersistenceService.getInstance();
  const modelOptimizer = ModelSelectionOptimizer.getInstance();

  useEffect(() => {
    const updateMetrics = () => {
      // Get active requests
      const active = progressService.getActiveRequests();
      setActiveRequests(active);
      
      // Get model performance data
      const models = ['gpt-4o', 'claude-opus-4-20250514', 'gemini-2.5-pro'];
      const performance = models.map(model => {
        const metrics = modelOptimizer.getModelMetrics(model);
        return {
          model,
          ...metrics,
          status: metrics ? 'active' : 'unused'
        };
      }).filter(Boolean);
      setModelPerformance(performance);
      
      // Calculate metrics
      const totalRequests = performance.reduce((sum, p) => sum + (p.usageCount || 0), 0);
      const avgResponseTime = performance.length > 0
        ? performance.reduce((sum, p) => sum + (p.averageResponseTime || 0), 0) / performance.length
        : 0;
      
      setMetrics({
        activeRequests: active.length,
        completedRequests: totalRequests,
        failedRequests: performance.reduce((sum, p) => sum + Math.round((1 - (p.successRate || 0)) * (p.usageCount || 0)), 0),
        averageResponseTime: avgResponseTime,
        timeoutRate: performance.length > 0 
          ? (performance.reduce((sum, p) => sum + (1 - (p.successRate || 0)), 0) / performance.length) * 100
          : 0
      });
      
      // Generate warnings
      const newWarnings = [];
      if (active.length > 5) {
        newWarnings.push('High number of concurrent requests detected');
      }
      if (avgResponseTime > 60000) {
        newWarnings.push('Average response time exceeding 60 seconds');
      }
      performance.forEach(p => {
        if (p.successRate < 0.7) {
          newWarnings.push(`Low success rate for ${p.model}: ${(p.successRate * 100).toFixed(1)}%`);
        }
      });
      setWarnings(newWarnings);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'loading': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Pipeline Monitoring Dashboard</h2>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index}>• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failedRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(metrics.averageResponseTime)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Timeout Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.timeoutRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRequests.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No active requests
            </div>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor('loading')} animate-pulse`} />
                    <div>
                      <div className="font-medium">Request {request.requestId.slice(-8)}</div>
                      <div className="text-sm text-muted-foreground">
                        Stage: {request.stage} • {formatDuration(Date.now() - request.timestamp)} elapsed
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Progress value={request.progress} className="w-20 h-2" />
                    <div className="text-xs text-muted-foreground mt-1">{request.progress}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Model Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modelPerformance.map((model, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.model}</span>
                    <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                      {model.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {model.usageCount || 0} requests
                  </div>
                </div>
                
                {model.status === 'active' && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Success Rate</div>
                      <div className="font-medium flex items-center gap-2">
                        {((model.successRate || 0) * 100).toFixed(1)}%
                        {model.successRate > 0.9 ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : model.successRate < 0.7 ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground">Avg Response</div>
                      <div className="font-medium">{formatDuration(model.averageResponseTime || 0)}</div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground">Quality Score</div>
                      <div className="font-medium">{((model.qualityScore || 0) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};