import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, BarChart3, Settings, Activity, AlertTriangle } from 'lucide-react';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import { ProductionReadinessDashboard } from '@/components/production/ProductionReadinessDashboard';
import { FallbackAnalyticsPanel } from '@/components/admin/FallbackAnalyticsPanel';
import { Sidebar } from '@/components/Sidebar';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        selectedView="summary"
        onViewChange={(view) => {
          if (view === 'canvas') navigate('/canvas');
          else if (view === 'gallery') navigate('/projects');
        }}
        uploadedImages={[]}
        analyses={[]}
        onClearCanvas={() => {}}
        onAddImages={() => {}}
        onImageSelect={() => {}}
        onToggleAnnotations={() => {}}
        onNavigateToPreviousAnalyses={() => navigate('/projects')}
        selectedImageId={null}
        showAnnotations={false}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                  <p className="text-muted-foreground">System monitoring and production readiness</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics & Monitoring
                </TabsTrigger>
                <TabsTrigger value="fallbacks" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Fallback Analytics
                </TabsTrigger>
                <TabsTrigger value="production" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Production Readiness
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      System Analytics & Monitoring
                    </CardTitle>
                    <CardDescription>
                      Real-time monitoring and analytics for the UX Analysis platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MonitoringDashboard />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fallbacks" className="space-y-6">
                <FallbackAnalyticsPanel />
              </TabsContent>

              <TabsContent value="production" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Production Readiness Assessment
                    </CardTitle>
                    <CardDescription>
                      Comprehensive production deployment analysis and system health checks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductionReadinessDashboard />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;