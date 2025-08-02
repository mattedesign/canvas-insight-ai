/**
 * Performant Canvas View with Error Boundary
 * Wraps PerformantCanvasView with comprehensive error handling
 */

import React from 'react';
import type { CanvasViewProps } from './CanvasView';
import { PerformantCanvasView } from './PerformantCanvasView';
import { RecoveryModeWrapper } from '../RecoveryModeWrapper';

interface PerformantCanvasViewWithErrorBoundaryProps extends CanvasViewProps {
  onRetry?: () => void;
}

export const PerformantCanvasViewWithErrorBoundary: React.FC<PerformantCanvasViewWithErrorBoundaryProps> = (props) => {
  const { onRetry, ...canvasProps } = props;

  const handleFallback = (fallbackData: any) => {
    console.log('[PerformantCanvasErrorBoundary] Canvas error, using fallback data:', fallbackData);
    // Could trigger a state reset or show simplified canvas view
  };

  return (
    <RecoveryModeWrapper
      componentName="PerformantCanvasView"
      context={{
        imageUrl: undefined,
        userContext: `Canvas with ${canvasProps.uploadedImages?.length || 0} images`,
        analysisId: undefined
      }}
      onRetry={onRetry}
      onFallback={handleFallback}
      enableRecovery={true}
      showDegradedModeUI={false}
    >
      <PerformantCanvasView {...canvasProps} />
    </RecoveryModeWrapper>
  );
};