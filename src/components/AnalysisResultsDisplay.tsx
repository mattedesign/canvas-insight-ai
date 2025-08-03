/**
 * Simple Analysis Results Display - Shows real analysis results only
 */

import React from 'react';
import { AnalysisPanel } from './AnalysisPanel';
import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';

interface AnalysisResultsDisplayProps {
  analysis: UXAnalysis;
  image: UploadedImage;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AnalysisResultsDisplay({
  analysis,
  image,
  isOpen = true,
  onClose = () => {}
}: AnalysisResultsDisplayProps) {
  
  // Only render if we have valid analysis data
  if (!analysis || !image) {
    return null;
  }

  return (
    <AnalysisPanel 
      analysis={analysis}
      image={image}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}