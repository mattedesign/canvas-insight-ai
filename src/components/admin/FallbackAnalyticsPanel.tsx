import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FallbackLoggingService } from '@/services/FallbackLoggingService';
import { Logger } from '@/utils/logging';
import { AlertTriangle, Activity, TrendingUp, Clock } from 'lucide-react';

interface FallbackEvent {
  id: string;
  service_name: string;
  fallback_type: string;
  original_error?: string;
  context_data: any;
  created_at: string;
  user_id?: string;
}

interface FallbackStats {
  total: number;
  byService: Record<string, number>;
  byType: Record<string, number>;
  last24Hours: number;
}

export const FallbackAnalyticsPanel: React.FC = () => {
  const [events, setEvents] = useState<FallbackEvent[]>([]);
  const [stats, setStats] = useState<FallbackStats>({
    total: 0,
    byService: {},
    byType: {},
    last24Hours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFallbackData();
  }, []);

  const loadFallbackData = async () => {
    try {
      setLoading(true);
      const [eventsData, statsData] = await Promise.all([
        FallbackLoggingService.getFallbackEvents(50),
        FallbackLoggingService.getFallbackStats()
      ]);
      
      setEvents(eventsData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      Logger.error('general', 'Failed to load fallback analytics', err);
      setError('Failed to load fallback analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'intelligent_fallback':
        return 'destructive';
      case 'generic_enhancement':
        return 'secondary';
      case 'cache_fallback':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fallback Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
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
            <AlertTriangle className="h-5 w-5" />
            Fallback Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Fallbacks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-warning/10 rounded-full">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Last 24h</p>
                <p className="text-2xl font-bold">{stats.last24Hours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-full">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Services Affected</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byService).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-accent/10 rounded-full">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Fallback Types</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byType).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fallback Analytics
          </CardTitle>
          <CardDescription>
            Monitor and analyze fallback usage across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="events">Recent Events</TabsTrigger>
              <TabsTrigger value="services">By Service</TabsTrigger>
              <TabsTrigger value="types">By Type</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No fallback events recorded
                  </div>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(event.fallback_type)}>
                            {event.fallback_type}
                          </Badge>
                          <span className="font-medium">{event.service_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(event.created_at)}
                        </span>
                      </div>
                      
                      {event.original_error && (
                        <p className="text-sm text-muted-foreground">
                          Error: {event.original_error}
                        </p>
                      )}
                      
                      {Object.keys(event.context_data).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Context Data
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(event.context_data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <div className="space-y-2">
                {Object.entries(stats.byService).map(([service, count]) => (
                  <div key={service} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">{service}</span>
                    <Badge variant="outline">{count} events</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="types" className="space-y-4">
              <div className="space-y-2">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(type)}>{type}</Badge>
                    </div>
                    <Badge variant="outline">{count} events</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};