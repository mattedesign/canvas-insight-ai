import React, { useState, useEffect } from 'react';
import { EnhancedPerformanceService } from '@/services/EnhancedPerformanceService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  renderTime: number;
  canvas: {
    memoryUsage: number;
    nodeRenderTime: number;
    layoutCalculationTime: number;
    dataLoadTime: number;
    cacheHitRate: number;
    virtualizedItems: number;
    totalElements: number;
  };
}

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isVisible, onClose }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const updateMetrics = async () => {
      try {
        const performanceMetrics = await EnhancedPerformanceService.collectPerformanceMetrics();
        const canvasMetrics = EnhancedPerformanceService.getCanvasMetrics();
        
        setMetrics({
          ...performanceMetrics,
          canvas: canvasMetrics
        });
      } catch (error) {
        console.error('Failed to collect performance metrics:', error);
      }
    };
    
    // Initial load
    updateMetrics();
    
    // Update every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    
    return () => clearInterval(interval);
  }, [isVisible]);
  
  if (!isVisible || !metrics) return null;
  
  const getMemoryColor = (usage: number) => {
    if (usage > 200) return 'bg-destructive';
    if (usage > 100) return 'bg-warning';
    return 'bg-primary';
  };
  
  return (
    <Card className="fixed bottom-4 right-4 p-4 shadow-lg border z-50 min-w-[280px]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Performance Monitor</h3>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Page Load:</span>
          <span className="font-mono">{Math.round(metrics.pageLoadTime)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">API Response:</span>
          <span className="font-mono">{Math.round(metrics.apiResponseTime)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Memory:</span>
          <span className="font-mono">{Math.round(metrics.canvas.memoryUsage)}MB</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Canvas Render:</span>
          <span className="font-mono">{Math.round(metrics.canvas.nodeRenderTime)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cache Hit Rate:</span>
          <span className="font-mono">{Math.round(metrics.canvas.cacheHitRate)}%</span>
        </div>
        
        {/* Memory usage indicator */}
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Memory Usage</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getMemoryColor(metrics.canvas.memoryUsage)}`}
              style={{ 
                width: `${Math.min(100, (metrics.canvas.memoryUsage / 300) * 100)}%` 
              }}
            />
          </div>
        </div>
        
        {/* Virtualization info */}
        {metrics.canvas.totalElements > 0 && (
          <div className="flex justify-between text-xs pt-1">
            <span className="text-muted-foreground">Elements:</span>
            <span className="font-mono">
              {metrics.canvas.virtualizedItems}/{metrics.canvas.totalElements}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};