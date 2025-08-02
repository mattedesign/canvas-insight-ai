/**
 * Phase 5: Enhanced Analysis Panel with Error Boundary
 */

import React from 'react';
import { AnalysisPanel } from './AnalysisPanel';
import { AnalysisComponentErrorBoundary } from './AnalysisComponentErrorBoundary';

interface EnhancedAnalysisPanelWithErrorBoundaryProps {
  analysis: any;
  imageUrl?: string;
  userContext?: string;
  onRetry?: () => void;
  onAnalysisUpdate?: (updatedAnalysis: any) => void;
}

export function EnhancedAnalysisPanelWithErrorBoundary({
  analysis,
  imageUrl,
  userContext,
  onRetry,
  onAnalysisUpdate
}: EnhancedAnalysisPanelWithErrorBoundaryProps) {
  
  const handleFallback = (fallbackData: any) => {
    console.log('[EnhancedAnalysisPanelWithErrorBoundary] Using fallback data:', fallbackData);
    if (onAnalysisUpdate) {
      onAnalysisUpdate(fallbackData);
    }
  };

  return (
    <AnalysisComponentErrorBoundary
      analysisId={analysis?.id}
      imageUrl={imageUrl}
      userContext={userContext}
      onRetry={onRetry}
      onFallback={handleFallback}
      enableRecovery={true}
      maxRetries={3}
    >
      <AnalysisPanel 
        analysis={analysis}
        imageUrl={imageUrl}
        isOpen={true}
        onClose={() => {}}
      />
    </AnalysisComponentErrorBoundary>
  );
}