/**
 * Phase 5: Enhanced Analysis Display - Real Analysis Only
 * Handles normal analysis display without fallback/degraded modes
 */

import React from 'react';
import { AnalysisPanel } from './AnalysisPanel';
import { AnalysisComponentErrorBoundary } from './AnalysisComponentErrorBoundary';

interface EnhancedAnalysisDisplayProps {
  analysis: any;
  imageUrl?: string;
  userContext?: string;
  onRetry?: () => void;
  onAnalysisUpdate?: (updatedAnalysis: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function EnhancedAnalysisDisplay({
  analysis,
  imageUrl,
  userContext,
  onRetry,
  onAnalysisUpdate,
  isOpen = true,
  onClose = () => {}
}: EnhancedAnalysisDisplayProps) {
  
  const handleErrorRecovery = () => {
    console.log('[EnhancedAnalysisDisplay] Error recovery triggered');
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <AnalysisComponentErrorBoundary
      analysisId={analysis?.id}
      imageUrl={imageUrl}
      userContext={userContext}
      onRetry={handleErrorRecovery}
      enableRecovery={true}
      maxRetries={3}
    >
      <AnalysisPanel 
        analysis={analysis}
        image={imageUrl ? { 
          id: 'temp', 
          url: imageUrl, 
          name: 'Analysis Image',
          file: new File([], 'temp'),
          dimensions: { width: 1920, height: 1080 }
        } : null}
        isOpen={isOpen}
        onClose={onClose}
      />
    </AnalysisComponentErrorBoundary>
  );
}