/**
 * Phase 5: Enhanced Analysis Display with Recovery Mode Support
 * Handles both normal and degraded mode analysis display
 */

import React from 'react';
import { AnalysisPanel } from './AnalysisPanel';
import { DegradedModeAnalysis } from './DegradedModeAnalysis';
import { AnalysisComponentErrorBoundary } from './AnalysisComponentErrorBoundary';

interface EnhancedAnalysisDisplayProps {
  analysis: any;
  imageUrl?: string;
  userContext?: string;
  onRetry?: () => void;
  onAnalysisUpdate?: (updatedAnalysis: any) => void;
  onContactSupport?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function EnhancedAnalysisDisplay({
  analysis,
  imageUrl,
  userContext,
  onRetry,
  onAnalysisUpdate,
  onContactSupport,
  isOpen = true,
  onClose = () => {}
}: EnhancedAnalysisDisplayProps) {
  
  const handleFallback = (fallbackData: any) => {
    console.log('[EnhancedAnalysisDisplay] Using fallback data:', fallbackData);
    if (onAnalysisUpdate) {
      onAnalysisUpdate(fallbackData);
    }
  };

  // Check if analysis is in degraded mode
  const isDegradedMode = analysis?.mode === 'degraded' || analysis?.metadata?.recoveryMode === 'degraded';
  const isPartialMode = analysis?.mode === 'partial' || analysis?.metadata?.recoveryMode === 'partial';

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
      {isDegradedMode ? (
        // Show degraded mode UI
        <div className="p-6">
          <DegradedModeAnalysis 
            analysis={analysis}
            onRetry={onRetry}
            onContactSupport={onContactSupport}
          />
        </div>
      ) : (
        // Show normal analysis panel
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
      )}
      
      {/* Show partial mode indicator if needed */}
      {isPartialMode && !isDegradedMode && (
        <div className="px-6 pb-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Partial Analysis:</strong> This analysis was recovered from available data. 
              Some features may be limited. Available stages: {analysis?.metadata?.availableStages?.join(', ') || 'Unknown'}
            </p>
          </div>
        </div>
      )}
    </AnalysisComponentErrorBoundary>
  );
}