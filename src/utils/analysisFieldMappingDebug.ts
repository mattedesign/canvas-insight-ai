/**
 * Debug utilities for analysis field mapping issues
 */

export class AnalysisFieldMappingDebug {
  
  /**
   * Log field mapping transformation for debugging
   */
  static logFieldMapping(rawData: any, mappedData: any, stage: string): void {
    if (import.meta.env.DEV) {
      console.group(`🔧 Field Mapping Debug - ${stage}`);
      
      console.log('Raw data fields:', {
        id: rawData?.id,
        image_id: rawData?.image_id,
        imageId: rawData?.imageId,
        visual_annotations: Array.isArray(rawData?.visual_annotations) ? rawData.visual_annotations.length : 'not array',
        visualAnnotations: Array.isArray(rawData?.visualAnnotations) ? rawData.visualAnnotations.length : 'not array',
        suggestions: Array.isArray(rawData?.suggestions) ? rawData.suggestions.length : 'not array',
        summary: rawData?.summary ? 'present' : 'missing',
        overallScore: rawData?.summary?.overallScore,
        overall_score: rawData?.summary?.overall_score
      });
      
      console.log('Mapped data fields:', {
        id: mappedData?.id,
        imageId: mappedData?.imageId,
        visualAnnotations: Array.isArray(mappedData?.visualAnnotations) ? mappedData.visualAnnotations.length : 'not array',
        suggestions: Array.isArray(mappedData?.suggestions) ? mappedData.suggestions.length : 'not array',
        summary: mappedData?.summary ? 'present' : 'missing',
        overallScore: mappedData?.summary?.overallScore
      });
      
      console.groupEnd();
    }
  }

  /**
   * Validate expected field transformations
   */
  static validateFieldMapping(rawData: any, mappedData: any): { 
    valid: boolean; 
    issues: string[] 
  } {
    const issues: string[] = [];

    // Check imageId mapping
    const sourceImageId = rawData?.image_id || rawData?.imageId;
    if (sourceImageId && mappedData?.imageId !== sourceImageId) {
      issues.push(`imageId mapping failed: ${sourceImageId} -> ${mappedData?.imageId}`);
    }

    // Check visual annotations mapping
    const sourceAnnotations = rawData?.visual_annotations || rawData?.visualAnnotations;
    if (Array.isArray(sourceAnnotations) && !Array.isArray(mappedData?.visualAnnotations)) {
      issues.push('visualAnnotations not properly mapped to array');
    }

    // Check summary score mapping
    const sourceScore = rawData?.summary?.overallScore || rawData?.summary?.overall_score;
    if (typeof sourceScore === 'number' && typeof mappedData?.summary?.overallScore !== 'number') {
      issues.push(`overallScore mapping failed: ${sourceScore} -> ${mappedData?.summary?.overallScore}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Check if data has common field mapping issues
   */
  static detectCommonIssues(data: any): string[] {
    const issues: string[] = [];

    if (data?.image_id && !data?.imageId) {
      issues.push('Found snake_case image_id but no camelCase imageId');
    }

    if (data?.visual_annotations && !data?.visualAnnotations) {
      issues.push('Found snake_case visual_annotations but no camelCase visualAnnotations');
    }

    if (data?.summary?.overall_score && !data?.summary?.overallScore) {
      issues.push('Found snake_case overall_score but no camelCase overallScore');
    }

    if (data?.summary?.category_scores && !data?.summary?.categoryScores) {
      issues.push('Found snake_case category_scores but no camelCase categoryScores');
    }

    return issues;
  }

  /**
   * Generate a field mapping report
   */
  static generateMappingReport(data: any): {
    hasIssues: boolean;
    report: string;
    recommendations: string[];
  } {
    const commonIssues = this.detectCommonIssues(data);
    const recommendations: string[] = [];

    if (commonIssues.length > 0) {
      recommendations.push('Apply AnalysisDataMapper.mapBackendToFrontend() to fix field naming');
      recommendations.push('Check edge function response format for consistency');
    }

    const report = `
Analysis Data Mapping Report:
----------------------------
Common Issues Found: ${commonIssues.length}
${commonIssues.map(issue => `- ${issue}`).join('\n')}

Data Structure:
- ID: ${data?.id || 'missing'}
- Image ID (snake_case): ${data?.image_id || 'missing'}
- Image ID (camelCase): ${data?.imageId || 'missing'}
- Visual Annotations (snake_case): ${Array.isArray(data?.visual_annotations) ? `${data.visual_annotations.length} items` : 'missing'}
- Visual Annotations (camelCase): ${Array.isArray(data?.visualAnnotations) ? `${data.visualAnnotations.length} items` : 'missing'}
- Suggestions: ${Array.isArray(data?.suggestions) ? `${data.suggestions.length} items` : 'missing'}
- Summary: ${data?.summary ? 'present' : 'missing'}
- Overall Score (snake_case): ${data?.summary?.overall_score || 'missing'}
- Overall Score (camelCase): ${data?.summary?.overallScore || 'missing'}
    `.trim();

    return {
      hasIssues: commonIssues.length > 0,
      report,
      recommendations
    };
  }
}