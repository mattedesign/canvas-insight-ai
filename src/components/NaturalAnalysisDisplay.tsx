/**
 * Natural Analysis Display Component
 * Renders dynamic insights from the AI meta-analysis pipeline
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Clock,
  Layers,
  TrendingUp,
  Building,
  DollarSign,
  Users
} from 'lucide-react';
import { UXAnalysis } from '@/types/ux-analysis';

interface NaturalAnalysisDisplayProps {
  analysis: UXAnalysis;
  className?: string;
}

export function NaturalAnalysisDisplay({ analysis, className = "" }: NaturalAnalysisDisplayProps) {
  const naturalMetadata = analysis.metadata.naturalAnalysisMetadata;
  
  if (!naturalMetadata) {
    return null; // This isn't a natural analysis
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'usability': return Target;
      case 'accessibility': return CheckCircle;
      case 'visual': return Layers;
      case 'content': return Lightbulb;
      case 'performance': return TrendingUp;
      default: return Brain;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Natural Analysis Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Natural AI Analysis</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {naturalMetadata.sourceModels.length} AI Models
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Dynamic insights generated from {naturalMetadata.sourceModels.join(', ')} analysis
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Processing:</span>
              <span className="font-medium">{naturalMetadata.totalProcessingTime}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Interpretation:</span>
              <span className="font-medium">{naturalMetadata.interpretationTime}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Responses:</span>
              <span className="font-medium">{naturalMetadata.rawResponseCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Overall Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Strengths */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Key Strengths
              </h4>
              <ul className="space-y-2">
                {analysis.summary.strengths.slice(0, 3).map((strength, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical Issues */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Critical Issues
              </h4>
              <ul className="space-y-2">
                {analysis.summary.keyIssues.slice(0, 3).map((issue, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4" />
            AI-Generated Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Actionable recommendations based on natural AI analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.suggestions.map((suggestion) => {
              const IconComponent = getCategoryIcon(suggestion.category);
              
              return (
                <div key={suggestion.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
                      <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getSeverityColor(suggestion.impact)}>
                        {suggestion.impact} impact
                      </Badge>
                      <Badge variant="outline">
                        {suggestion.effort} effort
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {suggestion.description}
                  </p>
                  
                  {Array.isArray(suggestion.actionItems) && suggestion.actionItems.length > 0 && (
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-2">
                        Recommended Actions:
                      </h5>
                      <ul className="space-y-1">
                        {(Array.isArray(suggestion.actionItems) ? suggestion.actionItems.slice(0, 3) : []).map((action, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Business Insights - NEW HYBRID FEATURE */}
      {(analysis as any).strategicSummary && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4 text-primary" />
              Strategic Business Insights
              <Badge variant="default" className="text-xs">Hybrid AI</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Business-focused strategic recommendations from GPT-4o analysis
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Business Impact Assessment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <DollarSign className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-xs font-medium text-muted-foreground">Revenue Risk</div>
                  <div className={`text-sm font-semibold ${
                    (analysis as any).strategicSummary.businessImpact?.revenueRisk === 'high' ? 'text-destructive' :
                    (analysis as any).strategicSummary.businessImpact?.revenueRisk === 'medium' ? 'text-warning' : 'text-green-600'
                  }`}>
                    {(analysis as any).strategicSummary.businessImpact?.revenueRisk || 'Low'}
                  </div>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-xs font-medium text-muted-foreground">Retention Risk</div>
                  <div className={`text-sm font-semibold ${
                    (analysis as any).strategicSummary.businessImpact?.userRetentionRisk === 'high' ? 'text-destructive' :
                    (analysis as any).strategicSummary.businessImpact?.userRetentionRisk === 'medium' ? 'text-warning' : 'text-green-600'
                  }`}>
                    {(analysis as any).strategicSummary.businessImpact?.userRetentionRisk || 'Low'}
                  </div>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-xs font-medium text-muted-foreground">Competitive Risk</div>
                  <div className={`text-sm font-semibold ${
                    (analysis as any).strategicSummary.businessImpact?.competitiveDisadvantage === 'high' ? 'text-destructive' :
                    (analysis as any).strategicSummary.businessImpact?.competitiveDisadvantage === 'medium' ? 'text-warning' : 'text-green-600'
                  }`}>
                    {(analysis as any).strategicSummary.businessImpact?.competitiveDisadvantage || 'Low'}
                  </div>
                </div>
              </div>

              {/* Strategic Recommendations */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Strategic Recommendations
                </h4>
                <div className="space-y-3">
                  {(analysis as any).strategicSummary.strategicRecommendations?.map((rec: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h5 className="font-medium text-sm">{rec.recommendation}</h5>
                        <div className="flex gap-2">
                          <Badge variant={rec.priority === 'critical' ? 'destructive' : 
                                       rec.priority === 'high' ? 'secondary' : 'outline'}>
                            {rec.priority}
                          </Badge>
                          <Badge variant="outline">{rec.category}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Business Justification:</strong> {rec.businessJustification}
                      </p>
                      <p className="text-xs text-primary">
                        <strong>Impact:</strong> {rec.estimatedImpact}
                      </p>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No strategic recommendations available</p>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Strategic Focus Areas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Primary Concern</div>
                    <div className="text-sm">{(analysis as any).strategicSummary.keyMetrics?.primaryConcern || 'None identified'}</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Quick Wins</div>
                    <div className="text-sm space-y-1">
                      {(analysis as any).strategicSummary.keyMetrics?.quickWins?.map((win: string, index: number) => (
                        <div key={index} className="text-xs">• {win}</div>
                      )) || <div className="text-xs text-muted-foreground">None identified</div>}
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Long-term Focus</div>
                    <div className="text-sm">{(analysis as any).strategicSummary.keyMetrics?.longTermFocus || 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain-Specific Findings */}
      {Object.keys(naturalMetadata.domainSpecificFindings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Domain-Specific Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(naturalMetadata.domainSpecificFindings).map(([domain, findings]) => (
                <div key={domain} className="border rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-3 capitalize">{domain} Insights</h4>
                  
                  {findings.specificInsights && (
                    <div className="mb-3">
                      <h5 className="font-medium text-xs text-muted-foreground mb-2">
                        Specific Observations:
                      </h5>
                      <ul className="space-y-1">
                        {findings.specificInsights.slice(0, 3).map((insight: string, index: number) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {findings.bestPractices && (
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-2">
                        Best Practices:
                      </h5>
                      <ul className="space-y-1">
                        {findings.bestPractices.slice(0, 2).map((practice: string, index: number) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                            {practice}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}