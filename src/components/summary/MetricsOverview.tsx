import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Zap, Minus } from 'lucide-react';
import { UXAnalysis } from '@/types/ux-analysis';
import { DashboardMetrics, MetricTrend } from '@/services/DashboardService';

interface MetricsOverviewProps {
  analyses: UXAnalysis[];
  metrics?: DashboardMetrics;
}

// Helper function to format trend value
const formatTrendValue = (trend: MetricTrend): string => {
  if (!trend.hasSufficientData) {
    return 'Insufficient data';
  }
  
  if (trend.trendDirection === 'stable') {
    return 'No change';
  }
  
  const sign = trend.trendDirection === 'up' ? '+' : '';
  return `${sign}${trend.trendPercentage}%`;
};

// Helper function to get trend description
const getTrendDescription = (trend: MetricTrend, metricName: string): string => {
  if (!trend.hasSufficientData) {
    return `Not enough historical data for ${metricName.toLowerCase()} trends`;
  }
  
  const confidence = Math.round(trend.confidenceScore * 100);
  return `Trend based on recent analysis data (${confidence}% confidence)`;
};

// Helper function to render trend icon
const renderTrendIcon = (trend: MetricTrend) => {
  if (!trend.hasSufficientData || trend.trendDirection === 'stable') {
    return <Minus className="w-3 h-3" />;
  }
  
  return trend.trendDirection === 'up' ? (
    <TrendingUp className="w-3 h-3" />
  ) : (
    <TrendingDown className="w-3 h-3" />
  );
};

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ analyses, metrics: dashboardMetrics }) => {
  // Early return with safe defaults if no analyses
  if (!analyses || analyses.length === 0) {
    const metricsData = [
      {
        title: 'Overall UX Score',
        value: 0,
        suffix: '/100',
        icon: Target,
        trend: null,
        trendValue: 'No data',
        description: 'Upload designs to start tracking UX scores'
      },
      {
        title: 'Total Issues Found',
        value: 0,
        icon: AlertTriangle,
        trend: null,
        trendValue: 'No data',
        description: 'Issues will appear after analysis'
      },
      {
        title: 'High Impact Items',
        value: 0,
        icon: Zap,
        trend: null,
        trendValue: 'No data',
        description: 'Critical improvements to prioritize'
      },
      {
        title: 'Accessibility Score',
        value: 0,
        suffix: '/100',
        icon: CheckCircle,
        trend: null,
        trendValue: 'No data',
        description: 'WCAG compliance tracking'
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
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <metric.icon className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{metric.description}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Minus className="w-3 h-3" />
                <span>{metric.trendValue}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Use database metrics if available, otherwise calculate from analyses with safe access
  const totalSuggestions = dashboardMetrics?.totalSuggestions || 
    analyses.reduce((sum, analysis) => sum + (analysis.suggestions?.length || 0), 0);
  
  const avgScore = dashboardMetrics?.averageScore || (
    analyses.length > 0 ? Math.round(
      analyses.reduce((sum, analysis) => sum + (analysis.summary?.overallScore || 0), 0) / analyses.length
    ) : 0
  );
  
  const totalIssues = dashboardMetrics?.totalIssues || 
    analyses.reduce((sum, analysis) => sum + (analysis.summary?.keyIssues?.length || 0), 0);
  
  const accessibilityScore = dashboardMetrics?.categoryScores?.accessibility || (
    analyses.length > 0 ? Math.round(
      analyses.reduce((sum, analysis) => sum + (analysis.summary?.categoryScores?.accessibility || 0), 0) / analyses.length
    ) : 0
  );
  
  const highImpactSuggestions = dashboardMetrics?.issueDistribution?.high || 
    analyses.reduce((sum, analysis) => 
      sum + (analysis.suggestions?.filter(s => s.impact === 'high').length || 0), 0
    );

  // Get trend data
  const trends = dashboardMetrics?.trends;
  const analysisQuality = dashboardMetrics?.analysisQuality;

  const metricsData = [
    {
      title: 'Overall UX Score',
      value: avgScore,
      suffix: '/100',
      icon: Target,
      trend: trends?.averageScore,
      trendValue: trends?.averageScore ? formatTrendValue(trends.averageScore) : 'No trend data',
      description: trends?.averageScore ? getTrendDescription(trends.averageScore, 'UX Score') : 'Average across all analyzed designs'
    },
    {
      title: 'Total Issues Found',
      value: totalIssues,
      icon: AlertTriangle,
      trend: trends?.totalIssues,
      trendValue: trends?.totalIssues ? formatTrendValue(trends.totalIssues) : 'No trend data',
      description: trends?.totalIssues ? getTrendDescription(trends.totalIssues, 'Issues') : 'Identified design and usability issues'
    },
    {
      title: 'High Impact Items',
      value: highImpactSuggestions,
      icon: Zap,
      trend: null, // No specific trend for this metric yet
      trendValue: analysisQuality ? `${Math.round(analysisQuality.successRate)}% success` : 'No data',
      description: analysisQuality ? `Analysis quality: ${Math.round(analysisQuality.averageConfidence * 100)}% avg confidence` : 'Critical improvements to prioritize'
    },
    {
      title: 'Accessibility Score',
      value: accessibilityScore,
      suffix: '/100',
      icon: CheckCircle,
      trend: trends?.accessibility,
      trendValue: trends?.accessibility ? formatTrendValue(trends.accessibility) : 'No trend data',
      description: trends?.accessibility ? getTrendDescription(trends.accessibility, 'Accessibility') : 'WCAG compliance assessment'
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
              metric.trend?.trendDirection === 'up' ? 'bg-success/10 text-success' : 
              metric.trend?.trendDirection === 'down' ? 'bg-destructive/10 text-destructive' : 
              'bg-muted text-muted-foreground'
            }`}>
              <metric.icon className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{metric.description}</span>
            <div className={`flex items-center gap-1 text-xs ${
              metric.trend?.trendDirection === 'up' ? 'text-success' : 
              metric.trend?.trendDirection === 'down' ? 'text-destructive' : 
              'text-muted-foreground'
            }`}>
              {renderTrendIcon(metric.trend || { trendDirection: 'stable', hasSufficientData: false } as MetricTrend)}
              <span>{metric.trendValue}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};