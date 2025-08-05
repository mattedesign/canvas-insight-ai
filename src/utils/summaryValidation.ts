export interface SummaryValidationResult {
  isValid: boolean;
  missingProperties: string[];
  warnings: string[];
  fixedSummary?: any;
}

export interface RequiredSummaryProperties {
  overallScore: number;
  categoryScores: {
    usability: number;
    accessibility: number;
    visual: number;
    content: number;
  };
  keyIssues: string[];
  strengths: string[];
  confidence: number;
  // Group analysis properties (optional)
  consistency?: number;
  thematicCoherence?: number;
  userFlowContinuity?: number;
}

export class SummaryValidator {
  static validateSummaryObject(summary: any): SummaryValidationResult {
    const result: SummaryValidationResult = {
      isValid: true,
      missingProperties: [],
      warnings: []
    };

    // Enhanced debugging for summary validation
    console.log('🔍 SummaryValidator: Validating summary object...', {
      hasSummary: !!summary,
      summaryType: typeof summary,
      summaryKeys: summary ? Object.keys(summary) : [],
      isArray: Array.isArray(summary)
    });

    if (!summary || typeof summary !== 'object') {
      console.warn('⚠️ SummaryValidator: Summary missing or invalid, creating default');
      result.isValid = false;
      result.missingProperties.push('summary (entire object missing)');
      return result;
    }

    // Check overallScore
    if (typeof summary.overallScore !== 'number') {
      result.isValid = false;
      result.missingProperties.push('overallScore');
    } else if (summary.overallScore < 0 || summary.overallScore > 100) {
      result.warnings.push('overallScore should be between 0-100');
    }

    // Check categoryScores
    if (!summary.categoryScores || typeof summary.categoryScores !== 'object') {
      result.isValid = false;
      result.missingProperties.push('categoryScores');
    } else {
      const requiredCategories = ['usability', 'accessibility', 'visual', 'content'];
      requiredCategories.forEach(category => {
        if (typeof summary.categoryScores[category] !== 'number') {
          result.missingProperties.push(`categoryScores.${category}`);
          result.isValid = false;
        }
      });
    }

    // Check keyIssues
    if (!Array.isArray(summary.keyIssues)) {
      result.isValid = false;
      result.missingProperties.push('keyIssues');
    } else if (summary.keyIssues.some(issue => typeof issue !== 'string')) {
      result.warnings.push('keyIssues contains non-string values');
    }

    // Check strengths
    if (!Array.isArray(summary.strengths)) {
      result.isValid = false;
      result.missingProperties.push('strengths');
    } else if (summary.strengths.some(strength => typeof strength !== 'string')) {
      result.warnings.push('strengths contains non-string values');
    }

    // Check confidence
    if (typeof summary.confidence !== 'number') {
      result.isValid = false;
      result.missingProperties.push('confidence');
    } else if (summary.confidence < 0 || summary.confidence > 1) {
      result.warnings.push('confidence should be between 0-1');
    }

    // Check for legacy properties that should be converted
    if (summary.keyOpportunities && !summary.strengths) {
      result.warnings.push('keyOpportunities found - should be renamed to strengths');
    }

    if (summary.confidenceScore && !summary.confidence) {
      result.warnings.push('confidenceScore found - should be renamed to confidence');
    }

    return result;
  }

  static createValidSummary(originalSummary: any = {}, synthesisData: any = {}): RequiredSummaryProperties {
    return {
      overallScore: this.extractOrCalculateOverallScore(originalSummary, synthesisData),
      categoryScores: this.extractOrCalculateCategoryScores(originalSummary, synthesisData),
      keyIssues: this.extractOrCalculateKeyIssues(originalSummary, synthesisData),
      strengths: this.extractOrCalculateStrengths(originalSummary, synthesisData),
      confidence: this.extractOrCalculateConfidence(originalSummary, synthesisData),
      // Group analysis properties with defaults
      consistency: originalSummary.consistency || 0.75,
      thematicCoherence: originalSummary.thematicCoherence || 0.8,
      userFlowContinuity: originalSummary.userFlowContinuity || 0.7
    };
  }

  private static extractOrCalculateOverallScore(summary: any, synthesis: any): number {
    if (typeof summary.overallScore === 'number') {
      return Math.max(0, Math.min(100, summary.overallScore));
    }

    // Calculate based on prioritized actions
    if (synthesis.prioritizedActions?.length > 0) {
      const criticalIssues = synthesis.prioritizedActions.filter(a => a.priority === 'critical').length;
      const highIssues = synthesis.prioritizedActions.filter(a => a.priority === 'high').length;
      
      let score = 85;
      score -= criticalIssues * 15;
      score -= highIssues * 10;
      
      return Math.max(0, Math.min(100, score));
    }
    
    return 70; // Default moderate score
  }

  private static extractOrCalculateCategoryScores(summary: any, synthesis: any): { usability: number; accessibility: number; visual: number; content: number; } {
    if (summary.categoryScores && typeof summary.categoryScores === 'object') {
      const required = ['usability', 'accessibility', 'visual', 'content'];
      const allPresent = required.every(cat => typeof summary.categoryScores[cat] === 'number');
      
      if (allPresent) {
        return summary.categoryScores;
      }
    }

    // Calculate default scores
    const defaultScores = {
      usability: 75,
      accessibility: 70,
      visual: 80,
      content: 75
    };

    if (synthesis.prioritizedActions?.length > 0) {
      const categoryMap = {
        usability: ['usability', 'navigation', 'interaction'],
        accessibility: ['accessibility', 'a11y', 'inclusive'],
        visual: ['visual', 'design', 'layout', 'color'],
        content: ['content', 'text', 'copywriting', 'information']
      };

      Object.keys(categoryMap).forEach(category => {
        const relatedActions = synthesis.prioritizedActions.filter(action => 
          categoryMap[category].some(keyword => 
            (action.category || action.title || '').toLowerCase().includes(keyword)
          )
        );
        
        if (relatedActions.length > 0) {
          const criticalCount = relatedActions.filter(a => a.priority === 'critical').length;
          const highCount = relatedActions.filter(a => a.priority === 'high').length;
          
          defaultScores[category] = Math.max(0, Math.min(100, 
            defaultScores[category] - (criticalCount * 20) - (highCount * 10)
          ));
        }
      });
    }

    return defaultScores;
  }

  private static extractOrCalculateKeyIssues(summary: any, synthesis: any): string[] {
    if (Array.isArray(summary.keyIssues) && summary.keyIssues.every(issue => typeof issue === 'string')) {
      return summary.keyIssues.slice(0, 5); // Limit to 5 issues
    }

    // Extract from prioritized actions
    if (synthesis.prioritizedActions?.length > 0) {
      return synthesis.prioritizedActions
        .filter(action => action.priority === 'critical' || action.priority === 'high')
        .slice(0, 3)
        .map(action => action.title || action.description)
        .filter(Boolean);
    }

    return [];
  }

  private static extractOrCalculateStrengths(summary: any, synthesis: any): string[] {
    // Check for strengths first
    if (Array.isArray(summary.strengths) && summary.strengths.every(strength => typeof strength === 'string')) {
      return summary.strengths.slice(0, 5); // Limit to 5 strengths
    }

    // Fallback to keyOpportunities for backward compatibility
    if (Array.isArray(summary.keyOpportunities) && summary.keyOpportunities.every(opp => typeof opp === 'string')) {
      return summary.keyOpportunities.slice(0, 5);
    }

    // Extract positive aspects from prioritized actions
    if (synthesis.prioritizedActions?.length > 0) {
      const positiveActions = synthesis.prioritizedActions
        .filter(action => action.impact === 'high' && action.priority !== 'critical')
        .slice(0, 3)
        .map(action => action.title || action.description)
        .filter(Boolean);
      
      if (positiveActions.length > 0) {
        return positiveActions.map(action => `Good implementation of ${action.toLowerCase()}`);
      }
    }
    
    // Fallback generic strengths
    return [
      'Interface demonstrates clear visual hierarchy',
      'Content is well-organized and accessible',
      'User interaction patterns are intuitive'
    ];
  }

  private static extractOrCalculateConfidence(summary: any, synthesis: any): number {
    // Check for confidence first
    if (typeof summary.confidence === 'number') {
      return Math.max(0, Math.min(1, summary.confidence));
    }

    // Fallback to confidenceScore for backward compatibility
    if (typeof summary.confidenceScore === 'number') {
      return Math.max(0, Math.min(1, summary.confidenceScore));
    }

    // Calculate based on available data quality
    if (synthesis.prioritizedActions?.length > 0) {
      return 0.8; // High confidence with good data
    }

    return 0.65; // Moderate confidence
  }
}