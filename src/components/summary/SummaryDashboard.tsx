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
  aggregatedMetrics?: any | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ 
  analyses, 
  metrics, 
  aggregatedMetrics,
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
  if (!aggregatedMetrics || aggregatedMetrics.totalAnalyses === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold">No Analysis Data</h3>
          <p className="text-muted-foreground">Upload some designs to see aggregated insights across your projects</p>
        </div>
      </div>
    );
  }

  const displayMetrics = aggregatedMetrics || {
    totalAnalyses: 0,
    totalImages: 0,
    totalProjects: 0,
    activeProjects: 0,
    averageScore: 0,
    totalIssues: 0,
    totalSuggestions: 0,
    categoryScores: { usability: 0, accessibility: 0, visual: 0, content: 0 },
    issueDistribution: { high: 0, medium: 0, low: 0 },
    recentActivity: [],
    topIssues: [],
    patterns: { commonIssues: [], improvementAreas: [], strengths: [] },
    trends: {
      averageScore: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
      totalIssues: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
      analysisSuccessRate: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
      accessibility: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false }
    },
    analysisQuality: {
      successRate: 100,
      averageConfidence: 0,
      failureReasons: []
    }
  };

  return (
    <div className="h-full overflow-auto bg-canvas-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Portfolio Analytics
            </h1>
            <p className="text-muted-foreground">
              Aggregated insights from {displayMetrics.totalAnalyses} analysis{displayMetrics.totalAnalyses !== 1 ? 'es' : ''} 
              across {displayMetrics.totalProjects} project{displayMetrics.totalProjects !== 1 ? 's' : ''}
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