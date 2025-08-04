/**
 * System Health Dashboard - Monitors all critical system components
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatabaseHealthService } from '@/services/DatabaseHealthService';
import { RobustAnalysisPipeline } from '@/services/RobustAnalysisPipeline';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Wrench } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  database: { healthy: boolean; checks: HealthCheck[] };
  pipeline: { healthy: boolean; circuitBreakers: any; issues: string[] };
  lastChecked: Date;
}

export const SystemHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const [dbHealth, pipelineHealth] = await Promise.all([
        DatabaseHealthService.runHealthCheck(),
        Promise.resolve(RobustAnalysisPipeline.getHealthStatus())
      ]);

      const overall = determineOverallHealth(dbHealth, pipelineHealth);

      setHealth({
        overall,
        database: dbHealth,
        pipeline: pipelineHealth,
        lastChecked: new Date()
      });
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoFixIssues = async () => {
    setAutoFixing(true);
    try {
      const result = await DatabaseHealthService.autoFixIssues();
      
      if (result.fixed.length > 0) {
        // Re-run health check after fixes
        await runHealthCheck();
      }
    } catch (error) {
      console.error('Auto-fix failed:', error);
    } finally {
      setAutoFixing(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const determineOverallHealth = (db: any, pipeline: any): 'healthy' | 'degraded' | 'critical' => {
    const hasCritical = db.checks.some((c: HealthCheck) => c.status === 'fail') || !pipeline.healthy;
    const hasWarnings = db.checks.some((c: HealthCheck) => c.status === 'warn');
    
    if (hasCritical) return 'critical';
    if (hasWarnings) return 'degraded';
    return 'healthy';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warn':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail':
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warn':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'fail':
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!health) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading system health...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(health.overall)}
            System Health Overview
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runHealthCheck}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={autoFixIssues}
              disabled={autoFixing || health.overall === 'healthy'}
            >
              <Wrench className={`h-4 w-4 mr-2 ${autoFixing ? 'animate-pulse' : ''}`} />
              Auto Fix
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(health.overall)}>
              {health.overall.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Last checked: {health.lastChecked.toLocaleTimeString()}
            </span>
          </div>
          
          {health.overall !== 'healthy' && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                System is experiencing issues. Check the detailed tabs below for more information.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Health Information */}
      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="database" className="flex items-center gap-2">
            {getStatusIcon(health.database.healthy ? 'healthy' : 'critical')}
            Database Health
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            {getStatusIcon(health.pipeline.healthy ? 'healthy' : 'critical')}
            Pipeline Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Health Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {health.database.checks.map((check, index) => (
                <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <h4 className="font-medium">{check.name}</h4>
                      <p className="text-sm text-muted-foreground">{check.message}</p>
                      {check.details && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-blue-600">
                            Show details
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-auto">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(check.status)}>
                    {check.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Pipeline Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(health.pipeline.healthy ? 'healthy' : 'critical')}
                  <div>
                    <h4 className="font-medium">Overall Pipeline Status</h4>
                    <p className="text-sm text-muted-foreground">
                      {health.pipeline.healthy ? 'All systems operational' : 'Pipeline issues detected'}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(health.pipeline.healthy ? 'healthy' : 'critical')}>
                  {health.pipeline.healthy ? 'HEALTHY' : 'ISSUES'}
                </Badge>
              </div>

              {health.pipeline.issues.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-red-600">Active Issues:</h5>
                  {health.pipeline.issues.map((issue, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                      {issue}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h5 className="font-medium">Circuit Breaker Status:</h5>
                {Object.keys(health.pipeline.circuitBreakers).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No circuit breakers active</p>
                ) : (
                  Object.entries(health.pipeline.circuitBreakers).map(([operation, breaker]: [string, any]) => (
                    <div key={operation} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{operation}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Failures: {breaker.failures}</span>
                        <Badge className={breaker.isOpen ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {breaker.isOpen ? 'OPEN' : 'CLOSED'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};