import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Zap,
  Database,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Settings,
  Download
} from 'lucide-react';
import { SecurityService, SecurityAudit } from '@/services/SecurityService';
import { PerformanceOptimizationService, PerformanceMetrics, OptimizationRecommendation } from '@/services/PerformanceOptimizationService';
import { MonitoringService, SystemHealth } from '@/services/MonitoringService';
import { supabase } from '@/integrations/supabase/client';

interface ProductionReadinessScore {
  overall: number;
  security: number;
  performance: number;
  reliability: number;
  scalability: number;
}

interface ReadinessCheck {
  id: string;
  category: 'security' | 'performance' | 'reliability' | 'scalability';
  title: string;
  status: 'passed' | 'warning' | 'failed';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

export const ProductionReadinessDashboard: React.FC = () => {
  const [readinessScore, setReadinessScore] = useState<ProductionReadinessScore>({
    overall: 0,
    security: 0,
    performance: 0,
    reliability: 0,
    scalability: 0
  });
  
  const [securityAudit, setSecurityAudit] = useState<SecurityAudit | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [optimizationRecommendations, setOptimizationRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [readinessChecks, setReadinessChecks] = useState<ReadinessCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAuditTime, setLastAuditTime] = useState<string>('');

  useEffect(() => {
    runProductionReadinessCheck();
  }, []);

  const runProductionReadinessCheck = async () => {
    setIsLoading(true);
    try {
      // Run comprehensive checks in parallel
      const [
        audit,
        metrics,
        health,
        recommendations
      ] = await Promise.all([
        SecurityService.performSecurityAudit(),
        PerformanceOptimizationService.collectPerformanceMetrics(),
        MonitoringService.getSystemHealth(),
        PerformanceOptimizationService.generateOptimizationRecommendations()
      ]);

      setSecurityAudit(audit);
      setPerformanceMetrics(metrics);
      setSystemHealth(health);
      setOptimizationRecommendations(recommendations);
      setLastAuditTime(new Date().toISOString());

      // Generate readiness checks
      const checks = generateReadinessChecks(audit, metrics, health, recommendations);
      setReadinessChecks(checks);

      // Calculate overall readiness score
      const score = calculateReadinessScore(checks);
      setReadinessScore(score);

    } catch (error) {
      console.error('Production readiness check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReadinessChecks = (
    audit: SecurityAudit,
    metrics: PerformanceMetrics,
    health: SystemHealth,
    recommendations: OptimizationRecommendation[]
  ): ReadinessCheck[] => {
    const checks: ReadinessCheck[] = [];

    // Security checks
    checks.push({
      id: 'rls-enabled',
      category: 'security',
      title: 'Row Level Security',
      status: audit.database_security.rls_enabled ? 'passed' : 'failed',
      description: 'Database tables are protected with Row Level Security policies',
      impact: 'critical',
      recommendation: audit.database_security.rls_enabled 
        ? undefined 
        : 'Enable RLS on all tables containing user data'
    });

    checks.push({
      id: 'authentication',
      category: 'security',
      title: 'Authentication Required',
      status: audit.api_security.authentication_required ? 'passed' : 'failed',
      description: 'All API endpoints require proper authentication',
      impact: 'critical',
      recommendation: audit.api_security.authentication_required 
        ? undefined 
        : 'Implement authentication for all protected endpoints'
    });

    checks.push({
      id: 'rate-limiting',
      category: 'security',
      title: 'Rate Limiting',
      status: audit.api_security.rate_limiting ? 'passed' : 'warning',
      description: 'API rate limiting is configured to prevent abuse',
      impact: 'high',
      recommendation: audit.api_security.rate_limiting 
        ? undefined 
        : 'Configure rate limiting for all public endpoints'
    });

    // Performance checks
    checks.push({
      id: 'page-load-time',
      category: 'performance',
      title: 'Page Load Performance',
      status: metrics.pageLoadTime < 3000 ? 'passed' : metrics.pageLoadTime < 5000 ? 'warning' : 'failed',
      description: `Page load time: ${Math.round(metrics.pageLoadTime)}ms`,
      impact: 'high',
      recommendation: metrics.pageLoadTime > 3000 
        ? 'Optimize bundle size and implement code splitting' 
        : undefined
    });

    checks.push({
      id: 'api-response-time',
      category: 'performance',
      title: 'API Response Time',
      status: metrics.apiResponseTime < 1000 ? 'passed' : metrics.apiResponseTime < 2000 ? 'warning' : 'failed',
      description: `Average API response time: ${Math.round(metrics.apiResponseTime)}ms`,
      impact: 'medium',
      recommendation: metrics.apiResponseTime > 1000 
        ? 'Optimize database queries and implement caching' 
        : undefined
    });

    checks.push({
      id: 'memory-usage',
      category: 'performance',
      title: 'Memory Usage',
      status: metrics.memoryUsage < 100 ? 'passed' : metrics.memoryUsage < 200 ? 'warning' : 'failed',
      description: `Memory usage: ${Math.round(metrics.memoryUsage)}MB`,
      impact: 'medium',
      recommendation: metrics.memoryUsage > 100 
        ? 'Implement memory optimization and garbage collection' 
        : undefined
    });

    // Reliability checks
    checks.push({
      id: 'system-health',
      category: 'reliability',
      title: 'System Health',
      status: health.status === 'healthy' ? 'passed' : health.status === 'degraded' ? 'warning' : 'failed',
      description: `System status: ${health.status}`,
      impact: 'critical',
      recommendation: health.status !== 'healthy' 
        ? 'Investigate system health issues and resolve errors' 
        : undefined
    });

    checks.push({
      id: 'error-rate',
      category: 'reliability',
      title: 'Error Rate',
      status: health.errorRate < 1 ? 'passed' : health.errorRate < 5 ? 'warning' : 'failed',
      description: `Error rate: ${health.errorRate}%`,
      impact: 'high',
      recommendation: health.errorRate > 1 
        ? 'Implement error handling and monitoring' 
        : undefined
    });

    // Scalability checks
    checks.push({
      id: 'cache-hit-rate',
      category: 'scalability',
      title: 'Cache Performance',
      status: metrics.cacheHitRate > 0.8 ? 'passed' : metrics.cacheHitRate > 0.6 ? 'warning' : 'failed',
      description: `Cache hit rate: ${Math.round(metrics.cacheHitRate * 100)}%`,
      impact: 'medium',
      recommendation: metrics.cacheHitRate < 0.8 
        ? 'Optimize caching strategy and implement CDN' 
        : undefined
    });

    checks.push({
      id: 'backup-enabled',
      category: 'reliability',
      title: 'Data Backup',
      status: audit.data_protection.backup_enabled ? 'passed' : 'failed',
      description: 'Automated backup system is configured',
      impact: 'critical',
      recommendation: audit.data_protection.backup_enabled 
        ? undefined 
        : 'Configure automated database backups'
    });

    return checks;
  };

  const calculateReadinessScore = (checks: ReadinessCheck[]): ProductionReadinessScore => {
    const calculateCategoryScore = (category: string) => {
      const categoryChecks = checks.filter(check => check.category === category);
      if (categoryChecks.length === 0) return 100;
      
      const totalScore = categoryChecks.reduce((sum, check) => {
        const weights = { critical: 30, high: 20, medium: 10, low: 5 };
        const statusScores = { passed: 1, warning: 0.7, failed: 0 };
        const weight = weights[check.impact];
        const score = statusScores[check.status];
        return sum + (weight * score);
      }, 0);
      
      const maxScore = categoryChecks.reduce((sum, check) => {
        const weights = { critical: 30, high: 20, medium: 10, low: 5 };
        return sum + weights[check.impact];
      }, 0);
      
      return Math.round((totalScore / maxScore) * 100);
    };

    const security = calculateCategoryScore('security');
    const performance = calculateCategoryScore('performance');
    const reliability = calculateCategoryScore('reliability');
    const scalability = calculateCategoryScore('scalability');
    const overall = Math.round((security + performance + reliability + scalability) / 4);

    return { overall, security, performance, reliability, scalability };
  };

  const getStatusIcon = (status: ReadinessCheck['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportReadinessReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      readinessScore,
      checks: readinessChecks,
      securityAudit,
      performanceMetrics,
      systemHealth,
      recommendations: optimizationRecommendations
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-readiness-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Monitor className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <h3 className="text-lg font-medium mt-4">Running Production Readiness Check</h3>
          <p className="text-muted-foreground">Analyzing security, performance, and reliability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Readiness Dashboard</h2>
          <p className="text-muted-foreground">
            Last check: {lastAuditTime ? new Date(lastAuditTime).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReadinessReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={runProductionReadinessCheck}>
            <Monitor className="h-4 w-4 mr-2" />
            Run Check
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Readiness Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(readinessScore.overall)}`}>
              {readinessScore.overall}%
            </div>
            <Progress value={readinessScore.overall} className="w-full mt-4" />
            <p className="text-muted-foreground mt-2">
              {readinessScore.overall >= 90 ? 'Production Ready' :
               readinessScore.overall >= 70 ? 'Needs Improvement' :
               'Not Ready for Production'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(readinessScore.security)}`}>
              {readinessScore.security}%
            </div>
            <Progress value={readinessScore.security} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(readinessScore.performance)}`}>
              {readinessScore.performance}%
            </div>
            <Progress value={readinessScore.performance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Reliability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(readinessScore.reliability)}`}>
              {readinessScore.reliability}%
            </div>
            <Progress value={readinessScore.reliability} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Scalability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(readinessScore.scalability)}`}>
              {readinessScore.scalability}%
            </div>
            <Progress value={readinessScore.scalability} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks">Readiness Checks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          {['security', 'performance', 'reliability', 'scalability'].map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category} Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {readinessChecks
                  .filter(check => check.category === category)
                  .map(check => (
                    <div key={check.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{check.title}</h4>
                          <Badge variant={check.impact === 'critical' ? 'destructive' : 'outline'}>
                            {check.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{check.description}</p>
                        {check.recommendation && (
                          <Alert className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{check.recommendation}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Page Load Time</div>
                    <div className="text-2xl font-bold">{Math.round(performanceMetrics.pageLoadTime)}ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">API Response Time</div>
                    <div className="text-2xl font-bold">{Math.round(performanceMetrics.apiResponseTime)}ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Memory Usage</div>
                    <div className="text-2xl font-bold">{Math.round(performanceMetrics.memoryUsage)}MB</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                    <div className="text-2xl font-bold">{Math.round(performanceMetrics.cacheHitRate * 100)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Image Load Time</div>
                    <div className="text-2xl font-bold">{Math.round(performanceMetrics.imageLoadTime)}ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Analysis Time</div>
                    <div className="text-2xl font-bold">{Math.round(performanceMetrics.analysisTime / 1000)}s</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {securityAudit && (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Database Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>RLS Enabled:</span>
                    <Badge variant={securityAudit.database_security.rls_enabled ? 'default' : 'destructive'}>
                      {securityAudit.database_security.rls_enabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Policies Count:</span>
                    <span>{securityAudit.database_security.policies_count}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Rate Limiting:</span>
                    <Badge variant={securityAudit.api_security.rate_limiting ? 'default' : 'destructive'}>
                      {securityAudit.api_security.rate_limiting ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Authentication Required:</span>
                    <Badge variant={securityAudit.api_security.authentication_required ? 'default' : 'destructive'}>
                      {securityAudit.api_security.authentication_required ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>CORS Configured:</span>
                    <Badge variant={securityAudit.api_security.cors_configured ? 'default' : 'destructive'}>
                      {securityAudit.api_security.cors_configured ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {optimizationRecommendations.map((rec, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant={rec.priority === 'critical' ? 'destructive' : 'outline'}>
                    {rec.priority}
                  </Badge>
                  {rec.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">{rec.description}</p>
                <div className="space-y-2">
                  <div>
                    <strong>Impact:</strong> {rec.impact}
                  </div>
                  <div>
                    <strong>Implementation:</strong> {rec.implementation}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};