import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, BarChart3, AlertTriangle, Settings } from 'lucide-react';
import { SystemHealthWidget } from './SystemHealthWidget';
import { AlertsPanel } from './AlertsPanel';
import { AnalyticsChart } from './AnalyticsChart';
import { MonitoringService } from '@/services/MonitoringService';
import { AlertingService } from '@/services/AlertingService';

export const MonitoringDashboard: React.FC = () => {
  
  useEffect(() => {
    // Services are already initialized in main.tsx
    // Just track dashboard visit
    MonitoringService.trackEvent('page_view', 'monitoring_dashboard', {
      timestamp: new Date().toISOString()
    });

    // Request notification permission for alerts
    AlertingService.requestNotificationPermission();

    // Cleanup on unmount
    return () => {
      MonitoringService.cleanup();
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for the UX Analysis platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Quick Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SystemHealthWidget />
        </div>
        <div>
          <AlertsPanel />
        </div>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alert Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsChart />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Detailed performance monitoring and optimization insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Page Load Time</div>
                  <div className="text-2xl font-bold mt-1">1.2s</div>
                  <div className="text-xs text-green-600 mt-1">15% improvement from last week</div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">API Response Time</div>
                  <div className="text-2xl font-bold mt-1">450ms</div>
                  <div className="text-xs text-green-600 mt-1">8% improvement from last week</div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Error Rate</div>
                  <div className="text-2xl font-bold mt-1">0.12%</div>
                  <div className="text-xs text-green-600 mt-1">45% improvement from last week</div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Uptime</div>
                  <div className="text-2xl font-bold mt-1">99.8%</div>
                  <div className="text-xs text-green-600 mt-1">0.1% improvement from last week</div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">Largest Contentful Paint</div>
                    <div className="text-xl font-bold mt-1 text-green-600">1.8s</div>
                    <div className="text-xs text-muted-foreground mt-1">Good (under 2.5s)</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">First Input Delay</div>
                    <div className="text-xl font-bold mt-1 text-green-600">45ms</div>
                    <div className="text-xs text-muted-foreground mt-1">Good (under 100ms)</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">Cumulative Layout Shift</div>
                    <div className="text-xl font-bold mt-1 text-green-600">0.08</div>
                    <div className="text-xs text-muted-foreground mt-1">Good (under 0.1)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alert Rules Configuration
              </CardTitle>
              <CardDescription>
                Configure monitoring thresholds and alert conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {AlertingService.getAlertRules().map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Threshold: {rule.threshold} | Window: {rule.timeWindow}m | Cooldown: {rule.cooldown}m
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        rule.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {rule.severity}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};