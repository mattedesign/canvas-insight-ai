import React from 'react';
import { CheckSquare, Clock, Zap, Download, ArrowRight } from 'lucide-react';
import { UXAnalysis } from '@/types/ux-analysis';
import { DashboardMetrics } from '@/services/DashboardService';

interface ActionPlanProps {
  analyses: UXAnalysis[];
  metrics?: DashboardMetrics;
}

export const ActionPlan: React.FC<ActionPlanProps> = ({ analyses, metrics }) => {
  // Generate action plan based on all analyses
  const allSuggestions = analyses.flatMap(analysis => analysis.suggestions);
  
  const quickWins = allSuggestions
    .filter(s => s.effort === 'low' && s.impact === 'high')
    .slice(0, 3);

  const mediumTermActions = allSuggestions
    .filter(s => s.effort === 'medium' && (s.impact === 'high' || s.impact === 'medium'))
    .slice(0, 3);

  const longTermProjects = allSuggestions
    .filter(s => s.effort === 'high' && s.impact === 'high')
    .slice(0, 2);

  const estimatedROI = {
    quickWins: 85,
    mediumTerm: 65,
    longTerm: 45
  };

  const phases = [
    {
      title: 'Quick Wins',
      subtitle: '1-2 weeks',
      icon: Zap,
      items: quickWins,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      roi: estimatedROI.quickWins
    },
    {
      title: 'Medium-term Actions',
      subtitle: '1-2 months',
      icon: Clock,
      items: mediumTermActions,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      roi: estimatedROI.mediumTerm
    },
    {
      title: 'Long-term Projects',
      subtitle: '3-6 months',
      icon: CheckSquare,
      items: longTermProjects,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      roi: estimatedROI.longTerm
    }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Recommended Action Plan</h3>
            <p className="text-sm text-muted-foreground">
              Prioritized roadmap based on impact and effort analysis
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export Plan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {phases.map((phase, index) => (
            <div 
              key={index} 
              className={`border rounded-lg p-5 ${phase.borderColor} ${phase.bgColor}`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <phase.icon className={`w-5 h-5 ${phase.color}`} />
                      <h4 className={`font-semibold ${phase.color}`}>{phase.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{phase.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${phase.color}`}>{phase.roi}%</div>
                    <div className="text-xs text-muted-foreground">Est. ROI</div>
                  </div>
                </div>

                {/* Action Items */}
                <div className="space-y-3">
                  {phase.items.length > 0 ? (
                    phase.items.map((suggestion, suggestionIndex) => (
                      <div key={suggestionIndex} className="bg-white/70 rounded-lg p-3 border border-white/50">
                        <h5 className="font-medium text-sm mb-1">{suggestion.title}</h5>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium capitalize">{suggestion.category}</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{suggestion.actionItems.length} tasks</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white/70 rounded-lg p-3 border border-white/50 text-center">
                      <p className="text-sm text-muted-foreground">No items in this category</p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="pt-3 border-t border-white/50">
                  <div className="text-xs text-muted-foreground">
                    {phase.items.length} action item{phase.items.length !== 1 ? 's' : ''} • 
                    Expected {phase.roi}% UX improvement
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-sidebar-accent/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-primary mb-2">Implementation Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Actions:</span>
                  <span className="ml-2 font-medium">{allSuggestions.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">High Priority:</span>
                  <span className="ml-2 font-medium">{allSuggestions.filter(s => s.impact === 'high').length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Est. Timeline:</span>
                  <span className="ml-2 font-medium">6 months</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">+{Math.round((estimatedROI.quickWins + estimatedROI.mediumTerm + estimatedROI.longTerm) / 3)}%</div>
              <div className="text-sm text-muted-foreground">Overall UX improvement</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};