/**
 * Data Mapper for Analysis Results
 * Handles field mapping between backend (snake_case) and frontend (camelCase)
 */

import type { UXAnalysis } from '@/types/ux-analysis';

export class AnalysisDataMapper {
  
  /**
   * Maps backend analysis data to frontend format
   */
  static mapBackendToFrontend(backendData: any): Partial<UXAnalysis> {
    if (!backendData || typeof backendData !== 'object') {
      return {};
    }

    return {
      id: backendData.id,
      imageId: backendData.image_id || backendData.imageId,
      imageName: backendData.image_name || backendData.imageName || 'Untitled Image',
      imageUrl: backendData.image_url || backendData.imageUrl || '',
      userContext: backendData.user_context || backendData.userContext || '',
      visualAnnotations: backendData.visual_annotations || backendData.visualAnnotations || [],
      suggestions: backendData.suggestions || [],
      summary: this.mapSummary(backendData.summary),
      metadata: backendData.metadata || {},
      createdAt: new Date(backendData.created_at || backendData.createdAt || Date.now()),
      modelUsed: backendData.model_used || backendData.modelUsed || 'unknown',
      status: backendData.status || 'completed'
    };
  }

  /**
   * Maps summary data with field name handling
   */
  private static mapSummary(summaryData: any): any {
    if (!summaryData || typeof summaryData !== 'object') {
      return {};
    }

    return {
      overallScore: summaryData.overallScore || summaryData.overall_score || 75,
      categoryScores: this.mapCategoryScores(summaryData.categoryScores || summaryData.category_scores),
      keyIssues: summaryData.keyIssues || summaryData.key_issues || [],
      strengths: summaryData.strengths || []
    };
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
   * Safely extracts data from complex analysis results
   */
  static extractAnalysisData(rawData: any): any {
    // Handle nested data structures from edge functions
    if (rawData?.data) {
      return this.mapBackendToFrontend(rawData.data);
    }

    // Handle direct analysis data
    if (rawData?.analysis) {
      return this.mapBackendToFrontend(rawData.analysis);
    }

    // Handle raw analysis object
    return this.mapBackendToFrontend(rawData);
  }
}