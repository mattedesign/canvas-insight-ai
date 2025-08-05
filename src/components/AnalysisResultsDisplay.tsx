/**
 * Enhanced Analysis Results Display with Context Detection
 */

import React from 'react';
import { AnalysisPanel } from './AnalysisPanel';
import { ScreenTypeDetectionDisplay } from './ScreenTypeDetectionDisplay';
import { AnalysisContextDisplay } from './AnalysisContextDisplay';
import { NaturalAnalysisDisplay } from './NaturalAnalysisDisplay';
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
  
  // 🔍 TEMPORARY DEBUG - Check data format
  console.log('🔍 Debug - Raw analysis data:', analysis);
  console.log('🔍 Debug - Has snake_case fields?', {
    has_visual_annotations: !!(analysis as any)?.visual_annotations,
    has_image_id: !!(analysis as any)?.image_id,
    has_overall_score: !!(analysis as any)?.summary?.overall_score
  });
  console.log('🔍 Debug - Has camelCase fields?', {
    hasVisualAnnotations: !!analysis?.visualAnnotations,
    hasImageId: !!analysis?.imageId,
    hasOverallScore: !!analysis?.summary?.overallScore
  });
  
  // Only render if we have valid analysis data
  if (!analysis || !image) {
    return null;
  }

  // Check if this is a natural analysis
  const isNaturalAnalysis = analysis.metadata.naturalAnalysisMetadata;
  
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
      
      {/* Natural Analysis Display (for new pipeline) */}
      {isNaturalAnalysis ? (
        <NaturalAnalysisDisplay analysis={analysis} />
      ) : (
        /* Traditional Analysis Panel (for backward compatibility) */
        <AnalysisPanel 
          analysis={analysis}
          image={image}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
    </div>
  );
}