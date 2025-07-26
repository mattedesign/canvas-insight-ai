import React from 'react';
import { UXAnalysis } from '@/types/ux-analysis';
import { MetricsOverview } from './MetricsOverview';
import { CategoryBreakdown } from './CategoryBreakdown';
import { PriorityIssues } from './PriorityIssues';
import { PatternAnalysis } from './PatternAnalysis';
import { ActionPlan } from './ActionPlan';

interface SummaryDashboardProps {
  analyses: UXAnalysis[];
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ analyses }) => {
  if (analyses.length === 0) {
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

  return (
    <div className="h-full overflow-auto bg-canvas-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            UX Analysis Summary
          </h1>
          <p className="text-muted-foreground">
            Insights from {analyses.length} design{analyses.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>

        {/* Metrics Overview */}
        <MetricsOverview analyses={analyses} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdown analyses={analyses} />
          <PriorityIssues analyses={analyses} />
        </div>

        {/* Pattern Analysis */}
        <PatternAnalysis analyses={analyses} />

        {/* Action Plan */}
        <ActionPlan analyses={analyses} />
      </div>
    </div>
  );
};