import React from 'react';
import { AlertTriangle, Clock, Zap, ArrowRight } from 'lucide-react';
import { UXAnalysis, Suggestion } from '@/types/ux-analysis';

interface PriorityIssuesProps {
  analyses: UXAnalysis[];
}

export const PriorityIssues: React.FC<PriorityIssuesProps> = ({ analyses }) => {
  // Aggregate all suggestions and prioritize them
  const allSuggestions: (Suggestion & { designName: string })[] = [];
  
  analyses.forEach(analysis => {
    analysis.suggestions.forEach(suggestion => {
      allSuggestions.push({
        ...suggestion,
        designName: analysis.imageName
      });
    });
  });

  // Sort by impact (high first) and then by frequency across designs
  const prioritizedSuggestions = allSuggestions
    .sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    })
    .slice(0, 8); // Top 8 priority items

  const getImpactStyle = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'high':
        return <Clock className="w-4 h-4" />;
      case 'medium':
        return <Zap className="w-4 h-4" />;
      case 'low':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <ArrowRight className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Priority Issues</h3>
            <p className="text-sm text-muted-foreground">
              Top {prioritizedSuggestions.length} issues ranked by impact
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span>{allSuggestions.filter(s => s.impact === 'high').length} high priority</span>
          </div>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {prioritizedSuggestions.map((suggestion, index) => (
            <div 
              key={`${suggestion.id}-${index}`} 
              className="border border-suggestion-border rounded-lg p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Found in: {suggestion.designName}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {suggestion.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-3">
                  <span className={`px-2 py-1 text-xs rounded-full border ${getImpactStyle(suggestion.impact)}`}>
                    {suggestion.impact} impact
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {getEffortIcon(suggestion.effort)}
                    <span>{suggestion.effort} effort</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground capitalize">
                  {suggestion.category}
                </span>
                <span className="text-xs text-primary">
                  {suggestion.actionItems.length} action item{suggestion.actionItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {allSuggestions.length > prioritizedSuggestions.length && (
          <div className="pt-3 border-t border-border text-center">
            <button className="text-sm text-primary hover:text-primary/80 transition-colors">
              View all {allSuggestions.length} suggestions →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};