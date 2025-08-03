/**
 * Enhanced Analysis Results Display with Context Detection
 */

import React from 'react';
import { AnalysisPanel } from './AnalysisPanel';
import { ScreenTypeDetectionDisplay } from './ScreenTypeDetectionDisplay';
import { AnalysisContextDisplay } from './AnalysisContextDisplay';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { AnalysisContext } from '@/types/contextTypes';

interface AnalysisResultsDisplayProps {
  analysis: UXAnalysis;
  image: UploadedImage;
  isOpen?: boolean;
  onClose?: () => void;
  analysisContext?: AnalysisContext;
}

export function AnalysisResultsDisplay({
  analysis,
  image,
  isOpen = true,
  onClose = () => {},
  analysisContext
}: AnalysisResultsDisplayProps) {
  
  // Only render if we have valid analysis data
  if (!analysis || !image) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Context Detection Results */}
      {analysisContext && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ScreenTypeDetectionDisplay 
            imageContext={analysisContext.image}
            detectionConfidence={analysisContext.confidence}
          />
          <AnalysisContextDisplay context={analysisContext} />
        </div>
      )}
      
      {/* Main Analysis Results */}
      <AnalysisPanel 
        analysis={analysis}
        image={image}
        isOpen={isOpen}
        onClose={onClose}
      />
    </div>
  );
}