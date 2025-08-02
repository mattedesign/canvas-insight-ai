/**
 * Phase 1: Validation Monitoring Component
 * Real-time monitoring of validation performance and issues
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle, BarChart, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ValidationService } from '@/services/ValidationService';

interface ValidationMonitorProps {
  enabled?: boolean;
  className?: string;
}

export function ValidationMonitor({ enabled = false, className }: ValidationMonitorProps) {
  const [validationService] = useState(() => ValidationService.getInstance());
  const [stats, setStats] = useState({
    totalValidations: 0,
    successRate: 0,
    avgValidationTime: 0,
    commonErrors: [] as { code: string; count: number }[]
  });
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const updateStats = () => {
      const newStats = validationService.getValidationStats();
      setStats(newStats);

      const history = validationService.getValidationHistory();
      const recentFailures = history
        .filter(result => !result.isValid)
        .slice(-5)
        .reverse();
      setRecentErrors(recentFailures);
    };

    // Initial load
    updateStats();

    // Set up interval for live updates
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [enabled, validationService, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleClearHistory = () => {
    validationService.clearHistory();
    setRefreshKey(prev => prev + 1);
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 0.9) return 'text-green-600';
    if (rate >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 0.9) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (rate >= 0.7) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="flex items-center gap-2"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Validation Monitor
          {stats.totalValidations > 0 && (
            <Badge variant={stats.successRate >= 0.9 ? "default" : "destructive"}>
              {(stats.successRate * 100).toFixed(0)}%
            </Badge>
          )}
        </Button>
        
        {isVisible && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="flex items-center gap-1"
            >
              Clear History
            </Button>
          </div>
        )}
      </div>

      {isVisible && (
        <div className="space-y-4">
          {/* Validation Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Validation Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Validations</div>
                  <div className="font-semibold">{stats.totalValidations}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Success Rate</div>
                  <div className={`font-semibold flex items-center gap-1 ${getStatusColor(stats.successRate)}`}>
                    {getStatusIcon(stats.successRate)}
                    {(stats.successRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Time</div>
                  <div className="font-semibold">{stats.avgValidationTime.toFixed(1)}ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Debug Mode</div>
                  <div className="font-semibold">
                    {process.env.NODE_ENV === 'development' ? 'On' : 'Off'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Errors */}
          {stats.commonErrors.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Common Validation Errors</CardTitle>
                <CardDescription>Most frequent validation issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.commonErrors.slice(0, 5).map((error, index) => (
                    <div key={error.code} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {error.code}
                      </span>
                      <Badge variant="secondary">
                        {error.count} occurrences
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Errors */}
          {recentErrors.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent Validation Failures</CardTitle>
                <CardDescription>Latest validation errors encountered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentErrors.map((result, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">
                          {result.errors[0]?.message || 'Validation failed'}
                        </div>
                        {result.errors[0]?.code && (
                          <div className="text-xs font-mono bg-background px-2 py-1 rounded">
                            {result.errors[0].code}
                          </div>
                        )}
                        {result.errors[0]?.path && (
                          <div className="text-xs text-muted-foreground">
                            Path: {result.errors[0].path}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* No Issues Message */}
          {stats.totalValidations === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-muted-foreground">
                  No validation data available yet.
                  <br />
                  Run an analysis to see validation metrics.
                </div>
              </CardContent>
            </Card>
          )}

          {stats.totalValidations > 0 && stats.successRate >= 0.95 && recentErrors.length === 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">All validations passing successfully!</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}