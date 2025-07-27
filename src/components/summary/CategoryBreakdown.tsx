import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UXAnalysis } from '@/types/ux-analysis';
import { DashboardMetrics } from '@/services/DashboardService';

interface CategoryBreakdownProps {
  analyses: UXAnalysis[];
  metrics?: DashboardMetrics;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ analyses, metrics }) => {
  // Calculate average scores by category
  const categoryData = [
    {
      name: 'Usability',
      score: Math.round(
        analyses.reduce((sum, analysis) => sum + analysis.summary.categoryScores.usability, 0) / analyses.length
      ),
      issues: analyses.reduce((sum, analysis) => 
        sum + analysis.suggestions.filter(s => s.category === 'usability').length, 0
      )
    },
    {
      name: 'Accessibility',
      score: Math.round(
        analyses.reduce((sum, analysis) => sum + analysis.summary.categoryScores.accessibility, 0) / analyses.length
      ),
      issues: analyses.reduce((sum, analysis) => 
        sum + analysis.suggestions.filter(s => s.category === 'accessibility').length, 0
      )
    },
    {
      name: 'Visual',
      score: Math.round(
        analyses.reduce((sum, analysis) => sum + analysis.summary.categoryScores.visual, 0) / analyses.length
      ),
      issues: analyses.reduce((sum, analysis) => 
        sum + analysis.suggestions.filter(s => s.category === 'visual').length, 0
      )
    },
    {
      name: 'Content',
      score: Math.round(
        analyses.reduce((sum, analysis) => sum + analysis.summary.categoryScores.content, 0) / analyses.length
      ),
      issues: analyses.reduce((sum, analysis) => 
        sum + analysis.suggestions.filter(s => s.category === 'content').length, 0
      )
    }
  ];

  const getBarColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--annotation-success))';
    if (score >= 60) return 'hsl(var(--annotation-secondary))';
    return 'hsl(var(--annotation-primary))';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Category Breakdown</h3>
          <p className="text-sm text-muted-foreground">
            Average scores across all designs
          </p>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm">Score: {data.score}/100</p>
                        <p className="text-sm text-muted-foreground">
                          {data.issues} issue{data.issues !== 1 ? 's' : ''} found
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          {categoryData.map((category, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm font-medium">{category.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{category.score}/100</span>
                <span className="text-xs text-muted-foreground">
                  ({category.issues} issues)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};