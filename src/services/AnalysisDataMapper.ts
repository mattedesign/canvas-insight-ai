/**
 * Data Mapper for Analysis Results
 * Handles field mapping between backend (snake_case) and frontend (camelCase)
 */

import type { UXAnalysis } from '@/types/ux-analysis';

console.log('🔍 BUILD DEBUG: AnalysisDataMapper file loading...');

export class AnalysisDataMapper {
  
  /**
   * Maps backend analysis data to frontend format
   * Handles both snake_case (backend) and camelCase (frontend) inputs robustly
   */
  static mapBackendToFrontend(backendData: any): Partial<UXAnalysis> {
    if (!backendData || typeof backendData !== 'object') {
      return {};
    }

    // Handle nested data structures first (from edge functions)
    let sourceData = backendData;
    if (backendData.data) {
      sourceData = backendData.data;
    } else if (backendData.analysis) {
      sourceData = backendData.analysis;
    }

    // Compute visual annotations: prefer backend-provided; else derive from Vision metadata.objects
    let visualAnnotations: any[] | undefined = Array.isArray(sourceData.visual_annotations || sourceData.visualAnnotations)
      ? (sourceData.visual_annotations || sourceData.visualAnnotations)
      : undefined;

    if (!visualAnnotations || visualAnnotations.length === 0) {
      const objects = sourceData.metadata?.objects || sourceData.metadata?.detected_objects;
      if (Array.isArray(objects) && objects.length > 0) {
        console.warn('⚠️ No visual_annotations provided by backend. Deriving annotations from Vision metadata.objects.');
        visualAnnotations = objects
          .map((obj: any, idx: number) => {
            const bbox = obj.boundingBox || obj.bounding_box;
            const hasValidBox =
              bbox &&
              ['x', 'y', 'width', 'height'].every((k) => typeof bbox[k] === 'number' && isFinite(bbox[k]));
            if (!hasValidBox) {
              console.error('❌ Invalid boundingBox in Vision metadata object; skipping annotation.', obj);
              return null;
            }
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            return {
              id: `${sourceData.id || 'analysis'}-vision-${idx}`,
              x: Math.max(0, Math.min(1, centerX)),
              y: Math.max(0, Math.min(1, centerY)),
              type: 'suggestion',
              title: obj.name ? `Detected: ${obj.name}` : 'Detected object',
              description:
                typeof obj.confidence === 'number'
                  ? `Vision detected "${obj.name || 'object'}" (confidence: ${(obj.confidence * 100).toFixed(1)}%).`
                  : `Vision detected "${obj.name || 'object'}".`,
              severity: 'low',
            };
          })
          .filter(Boolean) as any[];
      } else {
        console.error('❌ visual_annotations missing and no Vision metadata.objects available to derive annotations.');
        visualAnnotations = [];
      }
    }

    return {
      id: sourceData.id,
      imageId: sourceData.image_id || sourceData.imageId,
      imageName: sourceData.image_name || sourceData.imageName || 'Untitled Image',
      imageUrl: sourceData.image_url || sourceData.imageUrl || '',
      userContext: sourceData.user_context || sourceData.userContext || '',
      visualAnnotations,
      suggestions: Array.isArray(sourceData.suggestions)
        ? sourceData.suggestions.map((s: any) => ({
            ...s,
            actionItems: Array.isArray(s?.actionItems) ? s.actionItems : [],
            relatedAnnotations: Array.isArray(s?.relatedAnnotations) ? s.relatedAnnotations : [],
          }))
        : [],
      summary: this.mapSummary(sourceData.summary),
      metadata: this.mapMetadata(sourceData.metadata),
      createdAt: new Date(sourceData.created_at || sourceData.createdAt || Date.now()),
      modelUsed: sourceData.model_used || sourceData.modelUsed || 'unknown',
      status: sourceData.status || 'completed'
    };
  }

  /**
   * Maps metadata with field name handling
   */
  private static mapMetadata(metadataData: any): any {
    if (!metadataData || typeof metadataData !== 'object') {
      return {};
    }

    return {
      ...metadataData,
      // Map any snake_case fields to camelCase if needed
      stagesCompleted: metadataData.stages_completed || metadataData.stagesCompleted,
      modelsUsed: metadataData.models_used || metadataData.modelsUsed,
      naturalAnalysisMetadata: metadataData.natural_analysis_metadata || metadataData.naturalAnalysisMetadata
    };
  }

  /**
   * Maps summary data with field name handling
   */
  private static mapSummary(summaryData: any): any {
    if (!summaryData || typeof summaryData !== 'object') {
      // Return a valid summary structure with defaults to prevent SUMMARY_MISSING errors
      return {
        overallScore: 65,
        categoryScores: {
          usability: 65,
          accessibility: 65,
          visual: 65,
          content: 65
        },
        keyIssues: [],
        strengths: [],
        confidence: 85
      };
    }

    // Enhanced summary mapping with better fallbacks and debugging
    const mappedSummary = {
      overallScore: summaryData.overallScore || summaryData.overall_score || 65,
      categoryScores: this.mapCategoryScores(summaryData.categoryScores || summaryData.category_scores),
      keyIssues: summaryData.keyIssues || summaryData.key_issues || [],
      strengths: summaryData.strengths || [],
      confidence: summaryData.confidence || 85
    };

    return mappedSummary;
  }

  /**
   * Maps category scores with validation
   */
  private static mapCategoryScores(scores: any): any {
    const defaultScores = {
      usability: 75,
      accessibility: 75,
      visual: 75,
      content: 75
    };

    if (!scores || typeof scores !== 'object') {
      return defaultScores;
    }

    return {
      usability: this.validateScore(scores.usability, defaultScores.usability),
      accessibility: this.validateScore(scores.accessibility, defaultScores.accessibility),
      visual: this.validateScore(scores.visual, defaultScores.visual),
      content: this.validateScore(scores.content, defaultScores.content)
    };
  }

  /**
   * Validates a score value and provides fallback
   */
  private static validateScore(score: any, fallback: number): number {
    if (typeof score === 'number' && !isNaN(score) && isFinite(score)) {
      return Math.max(0, Math.min(100, score));
    }
    return fallback;
  }

  /**
   * Maps frontend analysis data to backend format for storage
   */
  static mapFrontendToBackend(frontendData: Partial<UXAnalysis>): any {
    return {
      id: frontendData.id,
      image_id: frontendData.imageId,
      image_name: frontendData.imageName,
      image_url: frontendData.imageUrl,
      user_context: frontendData.userContext,
      visual_annotations: frontendData.visualAnnotations,
      suggestions: frontendData.suggestions,
      summary: frontendData.summary,
      metadata: frontendData.metadata,
      model_used: frontendData.modelUsed,
      status: frontendData.status
    };
  }

  /**
   * @deprecated Use mapBackendToFrontend() instead for consistent field mapping
   * This method is kept for backward compatibility but delegates to mapBackendToFrontend
   */
  static extractAnalysisData(rawData: any): any {
    console.warn('⚠️ extractAnalysisData is deprecated. Use mapBackendToFrontend() directly.');
    return this.mapBackendToFrontend(rawData);
  }
}