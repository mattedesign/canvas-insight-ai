import React from 'react';
// Add to imports
import { ConversationalInsightsPanel } from './ConversationalInsightsPanel';

// Update the interface
interface AnalysisResults {
  visionResults: any;
  analysisResults: any;
  conversationalInsights?: {
    userFlows: string[];
    painPoints: string[];
    opportunities: string[];
    sources?: Array<{ title: string; url: string }>;
  };
  synthesisResults: any;
}

interface AnalysisResultsPanelProps {
  results: AnalysisResults;
}

export function AnalysisResultsPanel({ results }: AnalysisResultsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Other results panels would go here */}
      
      {/* Add to the render method (after other results panels) */}
      {results.conversationalInsights && (
        <ConversationalInsightsPanel 
          insights={results.conversationalInsights}
          isLoading={false}
        />
      )}
    </div>
  );
}