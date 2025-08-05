/**
 * Strategic Business Insights Panel - Reusable Component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Target, 
  Zap, 
  Clock,
  DollarSign,
  Shield,
  Award
} from 'lucide-react';

interface BusinessImpactAssessment {
  revenueRisk: string;
  retentionRisk: string;
  competitiveRisk: string;
}

interface StrategicRecommendation {
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  estimatedImpact: string;
}

interface StrategicMetrics {
  primaryConcern: string;
  quickWins: string[];
  longTermFocus: string;
}

interface StrategicInsights {
  businessImpactAssessment?: BusinessImpactAssessment;
  strategicRecommendations?: StrategicRecommendation[];
  keyMetrics?: StrategicMetrics;
}

interface StrategicInsightsPanelProps {
  insights: StrategicInsights;
  className?: string;
}

const getRiskIcon = (risk: string) => {
  const riskLevel = risk.toLowerCase();
  if (riskLevel.includes('high') || riskLevel.includes('critical')) {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }
  if (riskLevel.includes('medium') || riskLevel.includes('moderate')) {
    return <Shield className="h-4 w-4 text-warning" />;
  }
  return <Award className="h-4 w-4 text-success" />;
};

const getRiskColor = (risk: string) => {
  const riskLevel = risk.toLowerCase();
  if (riskLevel.includes('high') || riskLevel.includes('critical')) {
    return 'destructive';
  }
  if (riskLevel.includes('medium') || riskLevel.includes('moderate')) {
    return 'secondary';
  }
  return 'default';
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    case 'medium':
      return <Target className="h-4 w-4" />;
    case 'low':
      return <Clock className="h-4 w-4" />;
    default:
      return <Target className="h-4 w-4" />;
  }
};

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'secondary';
  }
};

export function StrategicInsightsPanel({ insights, className }: StrategicInsightsPanelProps) {
  const { businessImpactAssessment, strategicRecommendations, keyMetrics } = insights;

  // Don't render if no strategic insights are available
  if (!businessImpactAssessment && !strategicRecommendations && !keyMetrics) {
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
        
        {/* Business Impact Assessment */}
        {businessImpactAssessment && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Business Impact Assessment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getRiskIcon(businessImpactAssessment.revenueRisk)}
                  <span className="text-sm font-medium">Revenue Risk</span>
                </div>
                <Badge variant={getRiskColor(businessImpactAssessment.revenueRisk) as any}>
                  {businessImpactAssessment.revenueRisk}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getRiskIcon(businessImpactAssessment.retentionRisk)}
                  <span className="text-sm font-medium">Retention Risk</span>
                </div>
                <Badge variant={getRiskColor(businessImpactAssessment.retentionRisk) as any}>
                  {businessImpactAssessment.retentionRisk}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getRiskIcon(businessImpactAssessment.competitiveRisk)}
                  <span className="text-sm font-medium">Competitive Risk</span>
                </div>
                <Badge variant={getRiskColor(businessImpactAssessment.competitiveRisk) as any}>
                  {businessImpactAssessment.competitiveRisk}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Recommendations */}
        {strategicRecommendations && strategicRecommendations.length > 0 && (
          <>
            {businessImpactAssessment && <Separator />}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Strategic Recommendations
              </h4>
              <div className="space-y-3">
                {strategicRecommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-medium flex items-center gap-2">
                        {getPriorityIcon(rec.priority)}
                        {rec.title}
                      </h5>
                      <div className="flex gap-2">
                        <Badge variant={getPriorityVariant(rec.priority) as any}>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">{rec.category}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    {rec.estimatedImpact && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-medium">Impact:</span>
                        <span>{rec.estimatedImpact}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Key Strategic Metrics */}
        {keyMetrics && (
          <>
            {(businessImpactAssessment || strategicRecommendations) && <Separator />}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Strategic Focus Areas
              </h4>
              <div className="space-y-3">
                {keyMetrics.primaryConcern && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      Primary Concern
                    </span>
                    <p className="text-sm text-muted-foreground pl-5">
                      {keyMetrics.primaryConcern}
                    </p>
                  </div>
                )}
                
                {keyMetrics.quickWins && keyMetrics.quickWins.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      Quick Wins
                    </span>
                    <ul className="text-sm text-muted-foreground pl-5 space-y-1">
                      {keyMetrics.quickWins.map((win, index) => (
                        <li key={index}>• {win}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {keyMetrics.longTermFocus && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Long-term Focus
                    </span>
                    <p className="text-sm text-muted-foreground pl-5">
                      {keyMetrics.longTermFocus}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}