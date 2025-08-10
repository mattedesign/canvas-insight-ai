/**
 * Analysis Validation Utility
 * Ensures all analysis objects have required properties with safe defaults
 */

import type { UXAnalysis, Suggestion, AnnotationPoint, AnalysisSummary, VisionMetadata } from '../types/ux-analysis';

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  data: UXAnalysis;
}

export class AnalysisValidator {
  
  /**
   * Validates and normalizes analysis data with safe defaults
   */
  static validateAndNormalize(rawAnalysis: any): ValidationResult {
    const warnings: string[] = [];
    
    // Enhanced debugging for validation input
    console.log('🔍 AnalysisValidator: Input validation...', {
      hasInput: !!rawAnalysis,
      inputType: typeof rawAnalysis,
      hasSummary: !!rawAnalysis?.summary,
      summaryType: typeof rawAnalysis?.summary,
      summaryKeys: rawAnalysis?.summary ? Object.keys(rawAnalysis.summary) : [],
      isNaturalAnalysis: !!rawAnalysis?._isNaturalAnalysis
    });
    
    // Ensure basic structure exists
    if (!rawAnalysis || typeof rawAnalysis !== 'object') {
      warnings.push('Analysis data is null or not an object');
      return {
        isValid: false,
        warnings,
        data: this.createDefaultAnalysis()
      };
    }

    // Skip validation for natural analysis (already validated by edge function)
    if (rawAnalysis._isNaturalAnalysis) {
      console.log('🚀 AnalysisValidator: Skipping validation for natural analysis');
      return {
        isValid: true,
        warnings: [],
        data: rawAnalysis
      };
    }

    // Validate and normalize suggestions
    const suggestions = this.validateSuggestions(rawAnalysis.suggestions, warnings);
    
    // Validate and normalize annotations
    const visualAnnotations = this.validateAnnotations(rawAnalysis.visual_annotations || rawAnalysis.visualAnnotations, warnings);
    
    // Validate and normalize summary
    const summary = this.validateSummary(rawAnalysis.summary, warnings);
    
    // Validate and normalize metadata
    const metadata = this.validateMetadata(rawAnalysis.metadata, warnings);

    const normalizedAnalysis: UXAnalysis = {
      id: rawAnalysis.id || `analysis_${Date.now()}`,
      imageId: rawAnalysis.image_id || rawAnalysis.imageId || '',
      imageName: rawAnalysis.image_name || rawAnalysis.imageName || 'Untitled Image',
      imageUrl: rawAnalysis.image_url || rawAnalysis.imageUrl || '',
      userContext: rawAnalysis.user_context || rawAnalysis.userContext || '',
      visualAnnotations,
      suggestions,
      summary,
      metadata,
      createdAt: new Date(rawAnalysis.created_at || rawAnalysis.createdAt || Date.now()),
      modelUsed: rawAnalysis.model_used || rawAnalysis.modelUsed || 'unknown',
      status: rawAnalysis.status || 'completed',
      analysisContext: rawAnalysis.analysis_context || rawAnalysis.analysisContext
    };

    return {
      isValid: warnings.length === 0,
      warnings,
      data: normalizedAnalysis
    };
  }

  private static validateSuggestions(rawSuggestions: any, warnings: string[]): Suggestion[] {
    if (!Array.isArray(rawSuggestions)) {
      warnings.push('Suggestions is not an array, using empty array');
      return [];
    }

    return rawSuggestions.map((suggestion, index) => {
      if (!suggestion || typeof suggestion !== 'object') {
        warnings.push(`Suggestion at index ${index} is invalid`);
        return this.createDefaultSuggestion(index);
      }

      return {
        id: suggestion.id || `suggestion_${index}`,
        category: this.validateSuggestionCategory(suggestion.category),
        title: suggestion.title || 'Untitled Suggestion',
        description: suggestion.description || 'No description provided',
        impact: suggestion.impact || 'medium',
        effort: suggestion.effort || 'medium',
        actionItems: Array.isArray(suggestion.actionItems) ? suggestion.actionItems : 
                    Array.isArray(suggestion.action_items) ? suggestion.action_items : [],
        relatedAnnotations: Array.isArray(suggestion.relatedAnnotations) ? suggestion.relatedAnnotations : []
      };
    });
  }

  private static validateSuggestionCategory(category: any): 'usability' | 'accessibility' | 'visual' | 'content' | 'performance' {
    const validCategories = ['usability', 'accessibility', 'visual', 'content', 'performance'];
    return validCategories.includes(category) ? category : 'usability';
  }

  private static validateAnnotations(rawAnnotations: any, warnings: string[]): AnnotationPoint[] {
    if (!Array.isArray(rawAnnotations)) {
      warnings.push('Visual annotations is not an array, using empty array');
      return [];
    }

    return rawAnnotations.map((annotation, index) => {
      if (!annotation || typeof annotation !== 'object') {
        warnings.push(`Annotation at index ${index} is invalid`);
        return this.createDefaultAnnotation(index);
      }

      return {
        id: annotation.id || `annotation_${index}`,
        x: typeof annotation.x === 'number' ? annotation.x : 0,
        y: typeof annotation.y === 'number' ? annotation.y : 0,
        type: annotation.type || 'issue',
        title: annotation.title || 'Untitled Issue',
        description: annotation.description || 'No description provided',
        severity: annotation.severity || 'medium'
      };
    });
  }

  private static validateSummary(rawSummary: any, warnings: string[]): AnalysisSummary {
    if (!rawSummary || typeof rawSummary !== 'object') {
      warnings.push('Summary is missing or invalid, using default values');
      return this.createDefaultSummary();
    }

    return {
      overallScore: typeof rawSummary.overallScore === 'number' ? rawSummary.overallScore : 
                   typeof rawSummary.overall_score === 'number' ? rawSummary.overall_score : 75,
      categoryScores: this.validateCategoryScores(rawSummary.categoryScores || rawSummary.category_scores),
      keyIssues: Array.isArray(rawSummary.keyIssues) ? rawSummary.keyIssues :
                Array.isArray(rawSummary.key_issues) ? rawSummary.key_issues : [],
      strengths: Array.isArray(rawSummary.strengths) ? rawSummary.strengths : []
    };
  }

  private static validateCategoryScores(scores: any): { usability: number; accessibility: number; visual: number; content: number } {
    const defaultScores = { usability: 50, accessibility: 50, visual: 50, content: 50 };
    
    if (!scores || typeof scores !== 'object') {
      return defaultScores;
    }

    return {
      usability: typeof scores.usability === 'number' ? scores.usability : defaultScores.usability,
      accessibility: typeof scores.accessibility === 'number' ? scores.accessibility : defaultScores.accessibility,
      visual: typeof scores.visual === 'number' ? scores.visual : defaultScores.visual,
      content: typeof scores.content === 'number' ? scores.content : defaultScores.content
    };
  }

  private static validateMetadata(rawMetadata: any, warnings: string[]): VisionMetadata {
    if (!rawMetadata || typeof rawMetadata !== 'object') {
      warnings.push('Metadata is missing, using default vision metadata');
      return this.createDefaultMetadata();
    }

    return {
      objects: Array.isArray(rawMetadata.objects) ? rawMetadata.objects : [],
      text: Array.isArray(rawMetadata.text) ? rawMetadata.text : [],
      colors: Array.isArray(rawMetadata.colors) ? rawMetadata.colors : [],
      faces: typeof rawMetadata.faces === 'number' ? rawMetadata.faces : 0
    };
  }

  private static createDefaultAnalysis(): UXAnalysis {
    return {
      id: `analysis_${Date.now()}`,
      imageId: '',
      imageName: 'Untitled Image',
      imageUrl: '',
      userContext: '',
      visualAnnotations: [],
      suggestions: [],
      summary: this.createDefaultSummary(),
      metadata: this.createDefaultMetadata(),
      createdAt: new Date(),
      modelUsed: 'fallback',
      status: 'completed'
    };
  }

  private static createDefaultSuggestion(index: number = 0): Suggestion {
    return {
      id: `suggestion_${index}`,
      category: 'usability',
      title: 'Analysis Incomplete',
      description: 'Unable to generate specific suggestion due to data issues',
      impact: 'low',
      effort: 'low',
      actionItems: [],
      relatedAnnotations: []
    };
  }

  private static createDefaultAnnotation(index: number = 0): AnnotationPoint {
    return {
      id: `annotation_${index}`,
      x: 0,
      y: 0,
      type: 'issue',
      title: 'Data Issue',
      description: 'Invalid annotation data',
      severity: 'low'
    };
  }

  private static createDefaultSummary(): AnalysisSummary {
    return {
      overallScore: 50,
      categoryScores: {
        usability: 50,
        accessibility: 50,
        visual: 50,
        content: 50
      },
      keyIssues: ['Unable to analyze due to data issues'],
      strengths: []
    };
  }

  private static createDefaultMetadata(): VisionMetadata {
    return {
      objects: [],
      text: [],
      colors: [],
      faces: 0
    };
  }

  /**
   * Quick validation check without normalization
   */
  static isValidAnalysis(analysis: any): boolean {
    return !!(
      analysis &&
      typeof analysis === 'object' &&
      analysis.id &&
      analysis.summary &&
      Array.isArray(analysis.suggestions) &&
      Array.isArray(analysis.visualAnnotations || analysis.visual_annotations)
    );
  }
}