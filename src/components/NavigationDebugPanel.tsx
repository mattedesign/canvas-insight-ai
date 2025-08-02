/**
 * ✅ PHASE 4.2: NAVIGATION DEBUG PANEL
 * Real-time navigation state visualization and debugging tools
 */

import React, { useState, useEffect, memo } from 'react';
import { useRouterStateManager } from '@/services/RouterStateManager';
import { useNavigationPerformanceMonitor } from '@/hooks/useNavigationPerformanceMonitor';
import { URLStateSyncService } from '@/services/URLStateSyncService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Navigation, 
  Clock, 
  Shield, 
  Database, 
  Activity,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';

interface NavigationDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showPerformanceMetrics?: boolean;
}

export const NavigationDebugPanel: React.FC<NavigationDebugPanelProps> = memo(({
  isOpen,
  onClose,
  showPerformanceMetrics = true
}) => {
  const { state: routerState, getMetrics: getRouterMetrics } = useRouterStateManager();
  const [urlSyncState, setUrlSyncState] = useState({});
  const [performanceEnabled, setPerformanceEnabled] = useState(showPerformanceMetrics);
  
  const {
    metrics: performanceMetrics,
    stats: performanceStats,
    clearMetrics,
    exportMetrics,
    isMonitoring
  } = useNavigationPerformanceMonitor(performanceEnabled);

  const routerMetrics = getRouterMetrics();

  // Update URL sync state
  useEffect(() => {
    const updateUrlState = () => {
      const urlSync = URLStateSyncService.getInstance();
      setUrlSyncState(urlSync.getState());
    };

    updateUrlState();
    const interval = setInterval(updateUrlState, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const getStatusIcon = (isGood: boolean) => {
    return isGood ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getPerformanceBadge = (value: number, threshold: number) => {
    if (value <= threshold) {
      return <Badge variant="secondary" className="text-green-600">Good</Badge>;
    } else if (value <= threshold * 1.5) {
      return <Badge variant="outline" className="text-yellow-600">Fair</Badge>;
    } else {
      return <Badge variant="destructive">Poor</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Navigation Debug Panel
          </CardTitle>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="state" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="state">State</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="url-sync">URL Sync</TabsTrigger>
            </TabsList>

            {/* Navigation State Tab */}
            <TabsContent value="state" className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Route Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Current Route
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Path:</span>
                      <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
                        {routerState.currentRoute}
                      </code>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Previous:</span>
                      <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
                        {routerState.previousRoute || 'None'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      {getStatusIcon(!routerState.isNavigating)}
                      <span className="text-sm">
                        {routerState.isNavigating ? 'Navigating...' : 'Ready'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Navigations:</span>
                      <Badge variant="outline">{routerMetrics.totalNavigations}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Transition:</span>
                      <Badge variant="outline">
                        {routerMetrics.averageTransitionTime.toFixed(0)}ms
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Failed Navigations:</span>
                      <Badge variant={routerMetrics.failedNavigations > 0 ? "destructive" : "outline"}>
                        {routerMetrics.failedNavigations}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active Guards:</span>
                      <Badge variant="outline">{routerMetrics.activeGuards}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Route Parameters */}
              {Object.keys(routerState.routeParams).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Route Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(routerState.routeParams, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Pending Navigation */}
              {routerState.pendingNavigation && (
                <Card className="border-yellow-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
                      <AlertCircle className="w-4 h-4" />
                      Pending Navigation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Target:</span>
                        <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
                          {routerState.pendingNavigation.target}
                        </code>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Reason:</span>
                        <span className="ml-2 text-sm">{routerState.pendingNavigation.reason}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Navigation History Tab */}
            <TabsContent value="history" className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Navigation History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {routerState.navigationHistory.slice(-20).reverse().map((entry, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <code className="text-sm font-medium">{entry.route}</code>
                            {entry.duration && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({entry.duration}ms)
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={performanceEnabled}
                    onCheckedChange={setPerformanceEnabled}
                  />
                  <span className="text-sm">Enable Performance Monitoring</span>
                  {isMonitoring && <Zap className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={clearMetrics}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportMetrics}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              {performanceEnabled && (
                <>
                  {/* Performance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Avg Load Time</span>
                          {getPerformanceBadge(performanceStats.averageLoadTime, 100)}
                        </div>
                        <div className="text-2xl font-bold">
                          {performanceStats.averageLoadTime.toFixed(0)}ms
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Avg Render Time</span>
                          {getPerformanceBadge(performanceStats.averageRenderTime, 50)}
                        </div>
                        <div className="text-2xl font-bold">
                          {performanceStats.averageRenderTime.toFixed(0)}ms
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Navigations</span>
                          <Badge variant="outline">{performanceStats.totalNavigations}</Badge>
                        </div>
                        <div className="text-2xl font-bold">
                          {performanceStats.totalNavigations}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Performance Issues */}
                  {performanceStats.performanceIssues.length > 0 && (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          Performance Issues ({performanceStats.performanceIssues.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {performanceStats.performanceIssues.map((issue, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <Badge 
                                  variant={
                                    issue.severity === 'high' ? 'destructive' : 
                                    issue.severity === 'medium' ? 'outline' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {issue.severity}
                                </Badge>
                                <div>
                                  <code className="font-medium">{issue.route}</code>
                                  <div className="text-muted-foreground">{issue.issue}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Route Performance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Slowest Routes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {performanceStats.slowestRoutes.slice(0, 5).map((route, index) => (
                            <div key={index} className="flex justify-between">
                              <code className="text-sm">{route.route}</code>
                              <span className="text-sm font-medium">
                                {route.time.toFixed(0)}ms
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Fastest Routes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {performanceStats.fastestRoutes.slice(0, 5).map((route, index) => (
                            <div key={index} className="flex justify-between">
                              <code className="text-sm">{route.route}</code>
                              <span className="text-sm font-medium text-green-600">
                                {route.time.toFixed(0)}ms
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* URL Sync Tab */}
            <TabsContent value="url-sync" className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    URL Synchronized State
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(urlSyncState).length > 0 ? (
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(urlSyncState, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No URL synchronized state
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

NavigationDebugPanel.displayName = 'NavigationDebugPanel';