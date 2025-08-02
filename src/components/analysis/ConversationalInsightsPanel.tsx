import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Lightbulb, AlertCircle } from 'lucide-react';

interface ConversationalInsights {
  userFlows?: string[];
  painPoints?: string[];
  opportunities?: string[];
  naturalLanguagePatterns?: string[];
  sources?: Array<{ title: string; url: string }>;
}

interface ConversationalInsightsPanelProps {
  insights?: ConversationalInsights;
  isLoading?: boolean;
}

export function ConversationalInsightsPanel({ 
  insights, 
  isLoading 
}: ConversationalInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversational UX Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversational UX Analysis
          <Badge variant="secondary" className="ml-auto">
            Powered by Perplexity
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {insights.userFlows && insights.userFlows.length > 0 && (
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              User Interaction Flows
            </h4>
            <ul className="space-y-2">
              {insights.userFlows.map((flow, index) => (
                <li key={index} className="text-sm text-gray-600 pl-4 border-l-2 border-blue-200">
                  {flow}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.painPoints && insights.painPoints.length > 0 && (
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Common Pain Points
            </h4>
            <ul className="space-y-2">
              {insights.painPoints.map((point, index) => (
                <li key={index} className="text-sm text-gray-600 pl-4 border-l-2 border-amber-200">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.opportunities && insights.opportunities.length > 0 && (
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-green-500" />
              Conversational Opportunities
            </h4>
            <ul className="space-y-2">
              {insights.opportunities.map((opportunity, index) => (
                <li key={index} className="text-sm text-gray-600 pl-4 border-l-2 border-green-200">
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.sources && insights.sources.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Sources</h4>
            <ul className="space-y-1">
              {insights.sources.map((source, index) => (
                <li key={index}>
                  <a 
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}