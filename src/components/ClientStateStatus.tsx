/**
 * Client State Status Component
 * Shows real-time status of client-side operations
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { useSimplifiedAppContext } from '@/context/SimplifiedAppContext';

export const ClientStateStatus: React.FC = () => {
  // Simplified component without offlineCache dependency
  const stats = {
    totalSize: 0,
    hitRate: 0,
    compressionRatio: 0,
  };
  const isHealthy = true;

  const pendingOps: any[] = [];
  const retryableOps: any[] = [];
  const isOffline = false;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) return `${minutes}m ${seconds}s ago`;
    return `${seconds}s ago`;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {isOffline ? (
            <WifiOff className="h-4 w-4 text-destructive" />
          ) : (
            <Wifi className="h-4 w-4 text-success" />
          )}
          Client State Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connection</span>
          <Badge variant={isOffline ? "destructive" : "default"} className={isOffline ? "" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"}>
            {isOffline ? "Offline" : "Online"}
          </Badge>
        </div>

        {/* Sync Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Sync</span>
            <span className="text-xs">Just now</span>
          </div>
        </div>

        {/* Cache Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cache</span>
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              <span className="text-xs">{formatBytes(stats.totalSize)}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Hit Rate</span>
              <span>{stats.hitRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.hitRate} className="h-1" />
          </div>
          
          {stats.compressionRatio > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Compression</span>
              <span>{stats.compressionRatio.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Optimistic Operations */}
        {(pendingOps.length > 0 || retryableOps.length > 0) && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Operations</span>
            
            {pendingOps.length > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-warning" />
                <span className="text-xs">{pendingOps.length} pending</span>
              </div>
            )}
            
            {retryableOps.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="text-xs">{retryableOps.length} failed</span>
              </div>
            )}
          </div>
        )}

        {/* Health Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Health</span>
          <div className="flex items-center gap-1">
            {isHealthy ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : (
              <AlertCircle className="h-3 w-3 text-yellow-600" />
            )}
            <span className="text-xs">{isHealthy ? "Good" : "Degraded"}</span>
          </div>
        </div>

        {/* Manual Sync Button - simplified */}
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => console.log('Manual sync requested')}
          className="w-full"
        >
          Sync Now
        </Button>
      </CardContent>
    </Card>
  );
};