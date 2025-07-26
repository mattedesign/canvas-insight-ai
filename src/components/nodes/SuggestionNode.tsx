import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Lightbulb, 
  Eye, 
  Type, 
  Zap,
  CheckSquare
} from 'lucide-react';
import { UXAnalysis, Suggestion } from '@/types/ux-analysis';

interface SuggestionNodeProps {
  data: {
    analysis: UXAnalysis;
    onSuggestionSelect: (suggestionId: string) => void;
  };
}

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  switch (category) {
    case 'usability':
      return <Eye className="w-4 h-4" />;
    case 'accessibility':
      return <AlertTriangle className="w-4 h-4" />;
    case 'visual':
      return <Type className="w-4 h-4" />;
    case 'content':
      return <Lightbulb className="w-4 h-4" />;
    case 'performance':
      return <Zap className="w-4 h-4" />;
    default:
      return <Lightbulb className="w-4 h-4" />;
  }
};

const ImpactBadge: React.FC<{ impact: string }> = ({ impact }) => {
  const getStyle = () => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${getStyle()}`}>
      {impact} impact
    </span>
  );
};

const SuggestionCard: React.FC<{
  suggestion: Suggestion;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}> = ({ suggestion, isExpanded, onToggle, onSelect }) => {
  return (
    <div className="border border-suggestion-border rounded-lg overflow-hidden bg-suggestion-bg">
      <div 
        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">
              <CategoryIcon category={suggestion.category} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {suggestion.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <ImpactBadge impact={suggestion.impact} />
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50">
          <div className="text-sm text-foreground">
            {suggestion.description}
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Action Items
            </h5>
            <div className="space-y-1">
              {suggestion.actionItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  <CheckSquare className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Effort: {suggestion.effort}</span>
              <span>•</span>
              <span>Category: {suggestion.category}</span>
            </div>
            <button
              onClick={onSelect}
              className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SuggestionNode: React.FC<SuggestionNodeProps> = memo(({ data }) => {
  const { analysis, onSuggestionSelect } = data;
  const [expandedSuggestions, setExpandedSuggestions] = useState<string[]>([]);

  const toggleSuggestion = (suggestionId: string) => {
    setExpandedSuggestions(prev => 
      prev.includes(suggestionId)
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const categoryStats = analysis.suggestions.reduce((acc, suggestion) => {
    acc[suggestion.category] = (acc[suggestion.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden w-80">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary to-sidebar-accent">
        <div className="text-primary-foreground">
          <h3 className="font-semibold text-lg">UX Analysis</h3>
          <p className="text-primary-foreground/80 text-sm">
            {analysis.suggestions.length} suggestions • Score: {analysis.summary.overallScore}/100
          </p>
        </div>
      </div>

      {/* Category Overview */}
      <div className="p-4 border-b border-border bg-muted/30">
        <h4 className="font-medium text-sm mb-3">Categories</h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(analysis.summary.categoryScores).map(([category, score]) => (
            <div key={category} className="text-center">
              <div className="text-lg font-semibold">{score}</div>
              <div className="text-xs text-muted-foreground capitalize">{category}</div>
              {categoryStats[category] && (
                <div className="text-xs text-primary">{categoryStats[category]} items</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Suggestions</h4>
          <span className="text-xs text-muted-foreground">
            {analysis.suggestions.length} total
          </span>
        </div>
        
        {analysis.suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            isExpanded={expandedSuggestions.includes(suggestion.id)}
            onToggle={() => toggleSuggestion(suggestion.id)}
            onSelect={() => onSuggestionSelect(suggestion.id)}
          />
        ))}
      </div>

      {/* Footer Summary */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Key Issues:</div>
          <div className="space-y-1">
            {analysis.summary.keyIssues.slice(0, 2).map((issue, index) => (
              <div key={index} className="text-xs flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* React Flow Handles */}
      <Handle type="target" position={Position.Left} className="opacity-0" />
    </div>
  );
});