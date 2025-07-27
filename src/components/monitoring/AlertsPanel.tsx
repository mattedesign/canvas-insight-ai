import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Bell, 
  BellOff, 
  Settings,
  Shield,
  Activity,
  Zap,
  Server
} from 'lucide-react';
import { AlertingService, Alert as AlertType } from '@/services/AlertingService';
import { useAuth } from '@/context/AuthContext';

export const AlertsPanel: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAlerts = () => {
    const activeAlerts = AlertingService.getActiveAlerts();
    setAlerts(activeAlerts);
  };

  useEffect(() => {
    loadAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    if (!user) return;
    
    setLoading(true);
    const success = await AlertingService.acknowledgeAlert(alertId, user.id);
    if (success) {
      loadAlerts();
    }
    setLoading(false);
  };

  const handleResolve = async (alertId: string) => {
    if (!user) return;
    
    setLoading(true);
    const success = await AlertingService.resolveAlert(alertId, user.id);
    if (success) {
      loadAlerts();
    }
    setLoading(false);
  };

  const getAlertIcon = (type: AlertType['type']) => {
    switch (type) {
      case 'performance':
        return <Zap className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'system':
        return <Server className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: AlertType['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white border-red-500';
      case 'high':
        return 'bg-orange-500 text-white border-orange-500';
      case 'medium':
        return 'bg-yellow-500 text-black border-yellow-500';
      case 'low':
        return 'bg-blue-500 text-white border-blue-500';
      default:
        return 'bg-gray-500 text-white border-gray-500';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Active Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
        <CardDescription>
          System alerts and notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-sm text-muted-foreground">
              No active alerts
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              All systems operating normally
            </div>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={alert.id}>
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-sm truncate">
                          {alert.title}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getSeverityColor(alert.severity)}`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        {alert.message}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(alert.timestamp)}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={loading}
                              className="h-6 px-2 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Ack
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                            disabled={loading}
                            className="h-6 px-2 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                      
                      {alert.acknowledged && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            ✓ Acknowledged
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < alerts.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};