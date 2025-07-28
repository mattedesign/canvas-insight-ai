import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, RefreshCw, Users } from 'lucide-react';
import { UXAnalysis } from '@/types/ux-analysis';
import { DashboardMetrics } from '@/services/DashboardService';

interface PatternAnalysisProps {
  analyses: UXAnalysis[];
  metrics?: DashboardMetrics;
}

export const PatternAnalysis: React.FC<PatternAnalysisProps> = ({ analyses, metrics }) => {
  // Early return if no analyses
  if (!analyses || analyses.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-card">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Pattern Analysis</h3>
            <p className="text-sm text-muted-foreground">
              No analyses available yet
            </p>
          </div>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Upload and analyze images to see pattern insights
          </div>
        </div>
      </div>
    );
  }

  // Analyze common issues across designs with safe access
  const issueFrequency: Record<string, number> = {};
  
  analyses.forEach(analysis => {
    const keyIssues = analysis.summary?.keyIssues || [];
    keyIssues.forEach(issue => {
      issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
    });
  });

  const commonIssues = Object.entries(issueFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([issue, count]) => ({
      issue,
      count,
      percentage: Math.round((count / analyses.length) * 100)
    }));

  // Category distribution with safe access
  const categoryDistribution = analyses.reduce((acc, analysis) => {
    const suggestions = analysis.suggestions || [];
    suggestions.forEach(suggestion => {
      acc[suggestion.category] = (acc[suggestion.category] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryDistribution).map(([category, count]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: count,
    percentage: Math.round((count / Object.values(categoryDistribution).reduce((sum, val) => sum + val, 0)) * 100)
  }));

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--sidebar-accent))',
    'hsl(var(--annotation-secondary))',
    'hsl(var(--annotation-success))',
    'hsl(var(--annotation-primary))'
  ];

  const insights = [
    {
      icon: TrendingUp,
      title: 'Recurring Pattern',
      description: `${commonIssues[0]?.issue || 'No common issues'} appears in ${commonIssues[0]?.percentage || 0}% of designs`,
      status: 'warning'
    },
    {
      icon: RefreshCw,
      title: 'Consistency Opportunity',
      description: 'Design system improvements could resolve 40% of visual issues',
      status: 'info'
    },
    {
      icon: Users,
      title: 'Accessibility Focus',
      description: `${analyses.filter(a => a.summary?.categoryScores?.accessibility && a.summary.categoryScores.accessibility < 70).length} designs need accessibility improvements`,
      status: 'critical'
    }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Pattern Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Cross-design insights and recurring themes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Common Issues */}
          <div className="space-y-4">
            <h4 className="font-medium">Most Common Issues</h4>
            <div className="space-y-3">
              {commonIssues.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.issue}</p>
                    <p className="text-xs text-muted-foreground">
                      Found in {item.count} of {analyses.length} designs
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="space-y-4">
            <h4 className="font-medium">Issue Categories</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm">{data.value} issues ({data.percentage}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="space-y-3">
          <h4 className="font-medium">Key Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getStatusStyle(insight.status)}`}>
                <div className="flex items-start gap-3">
                  <insight.icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium text-sm mb-1">{insight.title}</h5>
                    <p className="text-xs opacity-80">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};