import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCanvasPerformanceMonitor } from '@/hooks/useCanvasPerformanceMonitor';
import { Activity, AlertTriangle, CheckCircle, Monitor, Zap, HardDrive } from 'lucide-react';

interface CanvasPerformanceDashboardProps {
  enabled?: boolean;
  compact?: boolean;
}

export const CanvasPerformanceDashboard: React.FC<CanvasPerformanceDashboardProps> = ({
  enabled = true,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(!compact);
  const {
    renderTime,
    nodeCount,
    memoryUsage,
    memoryGrowth,
    healthScore,
    bottlenecks,
    recommendations,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getPerformanceReport,
    isPerformanceGood
  } = useCanvasPerformanceMonitor({ enabled });

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <Activity className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const handleExportReport = () => {
    const report = getPerformanceReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Canvas Performance</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getHealthBadgeVariant(healthScore)}>
                {getHealthIcon(healthScore)}
                {healthScore}%
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>{renderTime.toFixed(1)}ms render</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-500" />
                <span>{nodeCount} nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-500" />
                <span>{memoryUsage.toFixed(1)}MB</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span>{memoryGrowth > 0 ? '+' : ''}{memoryGrowth.toFixed(1)}%</span>
              </div>
            </div>
            {bottlenecks.length > 0 && (
              <Alert className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {bottlenecks.length} performance issue{bottlenecks.length > 1 ? 's' : ''} detected
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Canvas Performance Monitor
              </CardTitle>
              <CardDescription>
                Real-time monitoring of canvas rendering and memory usage
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getHealthBadgeVariant(healthScore)}>
                {getHealthIcon(healthScore)}
                Health: {healthScore}%
              </Badge>
              <Button
                variant={isMonitoring ? "destructive" : "default"}
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? 'Stop' : 'Start'} Monitoring
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Render Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderTime.toFixed(1)}ms</div>
            <Progress 
              value={Math.min((renderTime / 32) * 100, 100)} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt;16ms (60fps)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-500" />
              Node Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodeCount.toLocaleString()}</div>
            <Progress 
              value={Math.min((nodeCount / 1000) * 100, 100)} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: &lt;500 nodes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-500" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memoryUsage.toFixed(1)}MB</div>
            <Progress 
              value={Math.min((memoryUsage / 100) * 100, 100)} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Growth: {memoryGrowth > 0 ? '+' : ''}{memoryGrowth.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore}%</div>
            <Progress value={healthScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {isPerformanceGood() ? 'Performing well' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Performance Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bottlenecks.map((bottleneck, index) => (
                <Badge key={index} variant="destructive">
                  {bottleneck.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Optimization Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportReport}>
              Export Report
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reset Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};