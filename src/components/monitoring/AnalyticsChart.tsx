import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Users, AlertTriangle, Zap } from 'lucide-react';
import { MonitoringService } from '@/services/MonitoringService';

interface AnalyticsData {
  events: any[];
  metrics: any[];
  errors: any[];
  timeRange: string;
  generatedAt: Date;
}

export const AnalyticsChart: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async (range: '1h' | '24h' | '7d' | '30d' = timeRange) => {
    try {
      setLoading(true);
      setError(null);
      const analyticsData = await MonitoringService.getAnalytics(range);
      if (analyticsData) {
        setData(analyticsData);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleTimeRangeChange = (range: '1h' | '24h' | '7d' | '30d') => {
    setTimeRange(range);
    loadAnalytics(range);
  };

  // Process data for charts
  const processEventData = () => {
    if (!data?.events) return [];
    
    const eventsByHour = data.events.reduce((acc, event) => {
      const hour = new Date(event.created_at).toISOString().slice(0, 13);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(eventsByHour).map(([hour, count]) => ({
      time: new Date(hour + ':00:00').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      events: count
    })).slice(-24); // Last 24 hours
  };

  const processPerformanceData = () => {
    if (!data?.metrics) return [];
    
    const performanceByTime = data.metrics
      .filter(metric => metric.metric_name === 'api_response_time')
      .reduce((acc, metric) => {
        const time = new Date(metric.created_at).toISOString().slice(0, 13);
        if (!acc[time]) acc[time] = { total: 0, count: 0 };
        acc[time].total += metric.value;
        acc[time].count += 1;
        return acc;
      }, {});

    return Object.entries(performanceByTime).map(([time, data]: [string, any]) => ({
      time: new Date(time + ':00:00').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      responseTime: Math.round(data.total / data.count)
    })).slice(-24);
  };

  const processErrorData = () => {
    if (!data?.errors) return [];
    
    const errorsByType = data.errors.reduce((acc, error) => {
      acc[error.error_type] = (acc[error.error_type] || 0) + 1;
      return acc;
    }, {});

    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
    
    return Object.entries(errorsByType).map(([type, count], index) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      fill: colors[index % colors.length]
    }));
  };

  const processEventTypeData = () => {
    if (!data?.events) return [];
    
    const eventsByType = data.events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(eventsByType).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      count
    }));
  };

  const getMetricsSummary = () => {
    if (!data) return { totalEvents: 0, totalErrors: 0, avgResponseTime: 0, uniqueUsers: 0 };
    
    const totalEvents = data.events.length;
    const totalErrors = data.errors.length;
    const avgResponseTime = data.metrics
      .filter(m => m.metric_name === 'api_response_time')
      .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0);
    const uniqueUsers = new Set(data.events.map(e => e.user_id).filter(Boolean)).size;
    
    return { totalEvents, totalErrors, avgResponseTime: Math.round(avgResponseTime), uniqueUsers };
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadAnalytics()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const eventData = processEventData();
  const performanceData = processPerformanceData();
  const errorData = processErrorData();
  const eventTypeData = processEventTypeData();
  const summary = getMetricsSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Analytics Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              {['1h', '24h', '7d', '30d'].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeRangeChange(range as any)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
          <CardDescription>
            System usage and performance metrics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div className="text-sm font-medium">Total Events</div>
            </div>
            <div className="text-2xl font-bold mt-1">{summary.totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div className="text-sm font-medium">Active Users</div>
            </div>
            <div className="text-2xl font-bold mt-1">{summary.uniqueUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div className="text-sm font-medium">Avg Response</div>
            </div>
            <div className="text-2xl font-bold mt-1">{summary.avgResponseTime}ms</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div className="text-sm font-medium">Total Errors</div>
            </div>
            <div className="text-2xl font-bold mt-1">{summary.totalErrors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">User Events</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Events Over Time</CardTitle>
              <CardDescription>Event frequency in the selected time range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eventData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="events" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Time</CardTitle>
              <CardDescription>API response times over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}ms`, 'Response Time']} />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Error Distribution</CardTitle>
              <CardDescription>Breakdown of errors by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={errorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {errorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Types</CardTitle>
              <CardDescription>Events by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};