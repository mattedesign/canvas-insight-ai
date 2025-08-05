/**
 * Strategic Business Insights Panel - Reusable Component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { StrategicBusinessInsights } from '@/types/ux-analysis';

interface StrategicInsightsPanelProps {
  insights: StrategicBusinessInsights;
  className?: string;
}

export function StrategicInsightsPanel({ insights, className }: StrategicInsightsPanelProps) {
  // Don't render if no strategic insights are available
  if (!insights || (!insights.primaryConcern && !insights.strategicRecommendation)) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Strategic Business Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Primary Business Concern */}
        {insights.primaryConcern && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Primary Business Challenge
            </h4>
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-destructive">
              <p className="text-sm font-medium text-foreground">
                {insights.primaryConcern}
              </p>
            </div>
          </div>
        )}

        {/* Strategic Recommendation */}
        {insights.strategicRecommendation && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Strategic Intervention
            </h4>
            <div className="border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  <h5 className="font-medium">{insights.strategicRecommendation.title}</h5>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Business Justification</span>
                  <p className="text-sm">{insights.strategicRecommendation.businessJustification}</p>
                </div>
                
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    Expected Outcome
                  </span>
                  <div className="bg-primary/5 rounded-md p-3 border-l-2 border-primary">
                    <p className="text-sm font-medium">{insights.strategicRecommendation.expectedOutcome}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}