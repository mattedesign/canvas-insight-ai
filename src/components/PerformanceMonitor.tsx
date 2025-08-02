/**
 * ✅ PHASE 5.1: ENHANCED PERFORMANCE MONITOR
 * Integrated with RenderOptimizationService for comprehensive performance tracking
 */

import React, { useState, useEffect, memo } from 'react';
import { RenderOptimizationService } from '@/services/RenderOptimizationService';
import { useRenderTracker } from '@/hooks/useRenderTracker';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertTriangle, BarChart3, Eye } from 'lucide-react';

interface PerformanceMonitorProps {
  componentName?: string;
  enabled?: boolean;
  showWarnings?: boolean;
  showDashboardButton?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = memo(({ 
  componentName = 'PerformanceMonitor',
  enabled = process.env.NODE_ENV === 'development',
  showWarnings = true,
  showDashboardButton = true
}) => {
  const renderOptService = RenderOptimizationService.getInstance();
  const [showDashboard, setShowDashboard] = useState(false);
  const [criticalWarnings, setCriticalWarnings] = useState(0);
  const [summary, setSummary] = useState(renderOptService.getPerformanceSummary());

  // Track this component's own performance
  const tracker = useRenderTracker({
    componentName,
    enabled,
    trackProps: true,
    trackState: true
  });

  /**
   * ✅ PHASE 5.1: Listen for critical warnings
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = renderOptService.addWarningListener((warning) => {
      if (warning.severity === 'critical') {
        setCriticalWarnings(prev => prev + 1);
      }
    });

    return unsubscribe;
  }, [enabled, renderOptService]);

  /**
   * ✅ PHASE 5.1: Update summary periodically
   */
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setSummary(renderOptService.getPerformanceSummary());
    }, 2000);

    return () => clearInterval(interval);
  }, [enabled, renderOptService]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Performance Status Bar */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {/* Performance Summary */}
        <div className="flex items-center gap-1 bg-background/90 backdrop-blur border rounded-lg px-3 py-1 text-xs">
          <Activity className="w-3 h-3" />
          <span>{summary.totalComponents} components</span>
          <span>•</span>
          <span>{summary.averageRenderTime.toFixed(1)}ms avg</span>
        </div>

        {/* Critical Warnings Badge */}
        {summary.criticalWarnings > 0 && showWarnings && (
          <Alert className="p-2 bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-xs text-red-600 ml-1">
              {summary.criticalWarnings} critical issues
            </AlertDescription>
          </Alert>
        )}

        {/* Performance Score */}
        <Badge variant={summary.averageRenderTime < 16 ? 'secondary' : 'destructive'}>
          {summary.averageRenderTime < 16 ? '✓ Performant' : '⚠ Slow'}
        </Badge>

        {/* Dashboard Button */}
        {showDashboardButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDashboard(true)}
            className="h-7 px-2"
          >
            <BarChart3 className="w-3 h-3 mr-1" />
            Dashboard
          </Button>
        )}
      </div>

      {/* Performance Dashboard */}
      <PerformanceDashboard
        isVisible={showDashboard}
        onClose={() => setShowDashboard(false)}
      />
    </>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

// ✅ PHASE 5.1: Enhanced hook for monitoring performance in any component
export const useRenderMonitor = (componentName: string, options?: {
  enabled?: boolean;
  trackProps?: boolean;
  trackState?: boolean;
}) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    trackProps = false,
    trackState = false
  } = options || {};

  const tracker = useRenderTracker({
    componentName,
    enabled,
    trackProps,
    trackState,
    autoDetectRenderReason: true
  });

  return {
    renderCount: tracker.renderCount,
    averageRenderTime: tracker.averageRenderTime,
    lastRenderTime: tracker.lastRenderTime,
    isSlowRender: tracker.isSlowRender,
    totalWarnings: tracker.totalWarnings,
    markStateChange: tracker.markStateChange,
    trackPropsChange: tracker.trackPropsChange
  };
};