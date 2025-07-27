import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Zap } from 'lucide-react';
import { UXAnalysis } from '@/types/ux-analysis';
import { DashboardMetrics } from '@/services/DashboardService';

interface MetricsOverviewProps {
  analyses: UXAnalysis[];
  metrics?: DashboardMetrics;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ analyses, metrics: dashboardMetrics }) => {
  // Use database metrics if available, otherwise calculate from analyses
  const totalSuggestions = dashboardMetrics?.totalSuggestions || analyses.reduce((sum, analysis) => sum + analysis.suggestions.length, 0);
  const avgScore = dashboardMetrics?.averageScore || Math.round(
    analyses.reduce((sum, analysis) => sum + analysis.summary.overallScore, 0) / analyses.length
  );
  const totalIssues = dashboardMetrics?.totalIssues || analyses.reduce((sum, analysis) => sum + analysis.summary.keyIssues.length, 0);
  const accessibilityScore = dashboardMetrics?.categoryScores.accessibility || Math.round(
    analyses.reduce((sum, analysis) => sum + analysis.summary.categoryScores.accessibility, 0) / analyses.length
  );
  const highImpactSuggestions = dashboardMetrics?.issueDistribution.high || analyses.reduce((sum, analysis) => 
    sum + analysis.suggestions.filter(s => s.impact === 'high').length, 0
  );

  const metricsData = [
    {
      title: 'Overall UX Score',
      value: avgScore,
      suffix: '/100',
      icon: Target,
      trend: avgScore >= 70 ? 'up' : 'down',
      trendValue: '+12%',
      description: 'Average across all designs'
    },
    {
      title: 'Total Issues Found',
      value: totalIssues,
      icon: AlertTriangle,
      trend: 'down',
      trendValue: '-23%',
      description: 'Across all uploaded designs'
    },
    {
      title: 'High Impact Items',
      value: highImpactSuggestions,
      icon: Zap,
      trend: 'up',
      trendValue: '+5',
      description: 'Priority suggestions'
    },
    {
      title: 'Accessibility Score',
      value: accessibilityScore,
      suffix: '/100',
      icon: CheckCircle,
      trend: accessibilityScore >= 70 ? 'up' : 'down',
      trendValue: '+8%',
      description: 'WCAG compliance level'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricsData.map((metric, index) => (
        <div key={index} className="bg-card border border-border rounded-lg p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{metric.title}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {metric.value}
                </span>
                {metric.suffix && (
                  <span className="text-lg text-muted-foreground">{metric.suffix}</span>
                )}
              </div>
            </div>
            <div className={`p-2 rounded-lg ${
              metric.trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <metric.icon className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{metric.description}</span>
            <div className={`flex items-center gap-1 text-xs ${
              metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {metric.trend === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{metric.trendValue}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};