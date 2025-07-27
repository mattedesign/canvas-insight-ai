import React from 'react';
import { UXAnalysis } from '@/types/ux-analysis';
import { DashboardMetrics } from '@/services/DashboardService';
import { MetricsOverview } from './MetricsOverview';
import { CategoryBreakdown } from './CategoryBreakdown';
import { PriorityIssues } from './PriorityIssues';
import { PatternAnalysis } from './PatternAnalysis';
import { ActionPlan } from './ActionPlan';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface SummaryDashboardProps {
  analyses: UXAnalysis[];
  metrics?: DashboardMetrics | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ 
  analyses, 
  metrics, 
  loading, 
  error, 
  onRefresh 
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary" />
          <h3 className="text-lg font-semibold">Loading Dashboard</h3>
          <p className="text-muted-foreground">Analyzing your project data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Failed to Load Dashboard</h3>
          <p className="text-muted-foreground">{error}</p>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // No data state
  if (!metrics || (metrics.totalAnalyses === 0 && analyses.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold">No Analysis Data</h3>
          <p className="text-muted-foreground">Upload some designs to see aggregated insights</p>
        </div>
      </div>
    );
  }

  const displayMetrics = metrics || {
    totalAnalyses: analyses.length,
    totalImages: analyses.length,
    averageScore: 0,
    totalIssues: 0,
    totalSuggestions: 0,
    categoryScores: { usability: 0, accessibility: 0, visual: 0, content: 0 },
    issueDistribution: { high: 0, medium: 0, low: 0 },
    recentActivity: [],
    topIssues: [],
    patterns: { commonIssues: [], improvementAreas: [], strengths: [] }
  };

  return (
    <div className="h-full overflow-auto bg-canvas-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              UX Analysis Summary
            </h1>
            <p className="text-muted-foreground">
              Insights from {displayMetrics.totalAnalyses} analysis{displayMetrics.totalAnalyses !== 1 ? 'es' : ''} 
              across {displayMetrics.totalImages} design{displayMetrics.totalImages !== 1 ? 's' : ''}
            </p>
          </div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        {/* Metrics Overview */}
        <MetricsOverview analyses={analyses} metrics={displayMetrics} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdown analyses={analyses} metrics={displayMetrics} />
          <PriorityIssues analyses={analyses} metrics={displayMetrics} />
        </div>

        {/* Pattern Analysis */}
        <PatternAnalysis analyses={analyses} metrics={displayMetrics} />

        {/* Action Plan */}
        <ActionPlan analyses={analyses} metrics={displayMetrics} />
      </div>
    </div>
  );
};