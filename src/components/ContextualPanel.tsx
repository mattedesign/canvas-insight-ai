import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { UXAnalysis, AnnotationPoint, Suggestion } from '@/types/ux-analysis';
import { AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';

interface ContextualPanelProps {
  analysis: UXAnalysis | null;
  selectedAnnotations: string[];
}

const AnnotationCard: React.FC<{ annotation: AnnotationPoint }> = ({ annotation }) => {
  const getIcon = () => {
    switch (annotation.type) {
      case 'issue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-warning" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const getSeverityColor = () => {
    switch (annotation.severity) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <CardTitle className="text-sm">{annotation.title}</CardTitle>
          <Badge className={`text-xs ${getSeverityColor()}`}>
            {annotation.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{annotation.description}</p>
      </CardContent>
    </Card>
  );
};

const SuggestionCard: React.FC<{ suggestion: Suggestion }> = ({ suggestion }) => {
  const getImpactColor = () => {
    switch (suggestion.impact) {
      case 'high':
        return 'bg-success text-success-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getEffortColor = () => {
    switch (suggestion.effort) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{suggestion.title}</CardTitle>
          <div className="flex gap-1">
            <Badge className={`text-xs ${getImpactColor()}`}>
              {suggestion.impact} impact
            </Badge>
            <Badge className={`text-xs ${getEffortColor()}`}>
              {suggestion.effort} effort
            </Badge>
          </div>
        </div>
        <Badge variant="outline" className="w-fit text-xs">
          {suggestion.category}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
        {suggestion.actionItems.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold mb-1">Action Items:</h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              {suggestion.actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ContextualPanel: React.FC<ContextualPanelProps> = memo(({
  analysis,
  selectedAnnotations,
}) => {
  if (!analysis) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select an image to view contextual feedback</p>
        </div>
      </div>
    );
  }

  const selectedAnnotationObjects = analysis.visualAnnotations.filter(
    annotation => selectedAnnotations.includes(annotation.id)
  );

  const relatedSuggestions = analysis.suggestions.filter(
    suggestion => suggestion.relatedAnnotations.some(
      id => selectedAnnotations.includes(id)
    )
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">{analysis.imageName}</h3>
        <p className="text-sm text-muted-foreground">
          Overall Score: {Math.round(analysis.summary?.overallScore || 0)}/100
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {selectedAnnotations.length > 0 ? (
          <div className="space-y-4">
            {selectedAnnotationObjects.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-3">Selected Annotations</h4>
                {selectedAnnotationObjects.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            )}

            {relatedSuggestions.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-3">Related Suggestions</h4>
                  {relatedSuggestions.map(suggestion => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-3">All Annotations</h4>
              {analysis.visualAnnotations.map(annotation => (
                <AnnotationCard key={annotation.id} annotation={annotation} />
              ))}
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-sm mb-3">All Suggestions</h4>
              {analysis.suggestions.map(suggestion => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
});

ContextualPanel.displayName = 'ContextualPanel';