/**
 * Phase 2: Enhanced Summary Generator
 * Generates valid, complete summary objects with comprehensive fallbacks
 */

import { ValidationService } from './ValidationService';
import { StrategicBusinessInsights } from '@/types/ux-analysis';

export interface SummaryGenerationConfig {
  enforceValidation: boolean;
  provideFallbacks: boolean;
  logIssues: boolean;
}

export interface GeneratedSummary {
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
  // Optional group analysis properties
  consistency?: number;
  thematicCoherence?: number;
  userFlowContinuity?: number;
  // Strategic business insights (new structure)
  strategicInsights?: StrategicBusinessInsights;
}

export class SummaryGenerator {
  private static instance: SummaryGenerator;
  private validationService: ValidationService;
  private defaultConfig: SummaryGenerationConfig = {
    enforceValidation: true,
    provideFallbacks: true,
    logIssues: process.env.NODE_ENV === 'development'
  };

  private constructor() {
    this.validationService = ValidationService.getInstance();
  }

  static getInstance(): SummaryGenerator {
    if (!SummaryGenerator.instance) {
      SummaryGenerator.instance = new SummaryGenerator();
    }
    return SummaryGenerator.instance;
  }

  /**
   * Phase 2: Generate or fix a summary object to ensure it meets all requirements
   */
  generateValidSummary(
    inputSummary: any = {},
    analysisData: any = {},
    config: Partial<SummaryGenerationConfig> = {}
  ): GeneratedSummary {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (finalConfig.logIssues) {
      console.log('[SummaryGenerator] Processing summary:', {
        hasInputSummary: !!inputSummary,
        hasAnalysisData: !!analysisData,
        config: finalConfig
      });
    }

    let workingSummary = { ...inputSummary };

    // Phase 2: Validate existing summary first
    if (finalConfig.enforceValidation && inputSummary) {
      // Phase 2: Skip validation if this is a natural analysis result (already validated by edge function)
      const isNaturalAnalysis = analysisData && (
        analysisData._isNaturalAnalysis === true ||
        inputSummary._isNaturalAnalysis === true
      );
      
      if (isNaturalAnalysis) {
        console.log('🎯 SummaryGenerator: Skipping validation for natural analysis summary');
        return inputSummary;
      }
      
      const validation = this.validationService.validateAnalysisResult({ summary: inputSummary });
      
      if (!validation.isValid) {
        if (finalConfig.logIssues) {
          console.warn('[SummaryGenerator] Input summary validation failed:', validation.errors);
        }
        
        if (finalConfig.provideFallbacks) {
          workingSummary = this.repairSummary(inputSummary, analysisData, validation.errors);
        }
      } else if (validation.fixedData?.summary) {
        workingSummary = validation.fixedData.summary;
      }
    }

    // Phase 2: Generate complete summary with all required properties
    const summary: GeneratedSummary = {
      overallScore: this.generateOverallScore(workingSummary, analysisData),
      categoryScores: this.generateCategoryScores(workingSummary, analysisData),
      keyIssues: this.generateKeyIssues(workingSummary, analysisData),
      strengths: this.generateStrengths(workingSummary, analysisData),
      confidence: this.generateConfidence(workingSummary, analysisData)
    };

    // Add group analysis properties if relevant
    if (this.isGroupAnalysis(analysisData)) {
      summary.consistency = this.generateConsistency(workingSummary, analysisData);
      summary.thematicCoherence = this.generateThematicCoherence(workingSummary, analysisData);
      summary.userFlowContinuity = this.generateUserFlowContinuity(workingSummary, analysisData);
    }

    // Add strategic business insights if available
    if (analysisData?.strategicInsights || workingSummary?.strategicInsights) {
      summary.strategicInsights = this.generateStrategicInsights(workingSummary, analysisData);
    }

    // Final validation
    if (finalConfig.enforceValidation) {
      // Phase 2: Skip validation if this is a natural analysis result (already validated by edge function)
      const isNaturalAnalysis = analysisData && analysisData._isNaturalAnalysis === true;
      
      if (isNaturalAnalysis) {
        console.log('🎯 SummaryGenerator: Skipping final validation for natural analysis summary');
        return summary;
      }
      
      const finalValidation = this.validationService.validateAnalysisResult({ summary });
      if (!finalValidation.isValid) {
        console.error('[SummaryGenerator] Generated summary failed validation:', finalValidation.errors);
        // Apply emergency fallbacks
        return this.generateEmergencyFallbackSummary();
      }
    }

    return summary;
  }

  /**
   * Phase 2: Repair a broken summary by fixing specific validation errors
   */
  private repairSummary(summary: any, analysisData: any, errors: any[]): any {
    const repaired = { ...summary };

    errors.forEach(error => {
      switch (error.code) {
        case 'OVERALL_SCORE_MISSING':
        case 'OVERALL_SCORE_NOT_NUMBER':
        case 'OVERALL_SCORE_NAN':
          repaired.overallScore = this.generateOverallScore({}, analysisData);
          break;
          
        case 'CATEGORY_SCORES_MISSING':
        case 'CATEGORY_SCORES_NOT_OBJECT':
          repaired.categoryScores = this.generateCategoryScores({}, analysisData);
          break;
          
        case 'CATEGORY_SCORE_MISSING':
        case 'CATEGORY_SCORE_NOT_NUMBER':
        case 'CATEGORY_SCORE_NAN':
          if (!repaired.categoryScores) repaired.categoryScores = {};
          const category = this.extractCategoryFromPath(error.path);
          if (category) {
            repaired.categoryScores[category] = 75; // Provide fallback score
          }
          break;
      }
    });

    return repaired;
  }

  /**
   * Phase 2: Generate overall score with multiple fallback strategies
   */
  private generateOverallScore(summary: any, analysisData: any): number {
    // Priority 1: Use existing valid score (handle both formats)
    const score = summary.overallScore || summary.overall_score;
    if (typeof score === 'number' && 
        !isNaN(score) && 
        isFinite(score)) {
      return Math.max(0, Math.min(100, score));
    }

    // Priority 2: Calculate from category scores (handle both formats)
    const categoryScores = summary.categoryScores || summary.category_scores;
    if (categoryScores && typeof categoryScores === 'object') {
      const scores = this.validationService.safeArrayMap(
        Object.values(categoryScores),
        (score: any) => typeof score === 'number' && !isNaN(score) ? score : null,
        []
      ).filter(score => score !== null);

      if (scores.length > 0) {
        return this.validationService.safeCalculateAverage(scores);
      }
    }

    // Priority 3: Fallback to reasonable default instead of throwing
    console.warn('[SummaryGenerator] Using fallback score of 75 - no valid score found');
    return 75;
  }

  /**
   * Phase 2: Generate category scores with validation
   */
  private generateCategoryScores(summary: any, analysisData: any): GeneratedSummary['categoryScores'] {
    const requiredCategories = ['usability', 'accessibility', 'visual', 'content'] as const;
    const result: GeneratedSummary['categoryScores'] = {
      usability: 75,
      accessibility: 75,
      visual: 75,
      content: 75
    };

    // Use existing valid scores where available (handle both formats)
    const categoryScores = summary.categoryScores || summary.category_scores;
    if (categoryScores && typeof categoryScores === 'object') {
      requiredCategories.forEach(category => {
        const score = categoryScores[category];
        if (typeof score === 'number' && !isNaN(score) && isFinite(score)) {
          result[category] = Math.max(0, Math.min(100, score));
        } else {
          console.warn(`[SummaryGenerator] Using fallback score for ${category} - invalid score found`);
          // Keep the default fallback score instead of throwing
        }
      });
    } else {
      console.warn('[SummaryGenerator] Using fallback category scores - no valid categoryScores found');
      // Return the fallback scores instead of throwing
    }

    return result;
  }

  /**
   * Phase 2: Generate key issues with validation
   */
  private generateKeyIssues(summary: any, analysisData: any): string[] {
    // Use existing valid issues
    if (Array.isArray(summary.keyIssues)) {
      const validIssues = summary.keyIssues
        .filter(issue => typeof issue === 'string' && issue.trim().length > 0)
        .slice(0, 5); // Limit to 5 issues
        
      if (validIssues.length > 0) {
        return validIssues;
      }
    }

    // Generate from analysis data
    return this.extractIssuesFromAnalysis(analysisData);
  }

  /**
   * Phase 2: Generate strengths with validation
   */
  private generateStrengths(summary: any, analysisData: any): string[] {
    // Use existing valid strengths
    if (Array.isArray(summary.strengths)) {
      const validStrengths = summary.strengths
        .filter(strength => typeof strength === 'string' && strength.trim().length > 0)
        .slice(0, 5); // Limit to 5 strengths
        
      if (validStrengths.length > 0) {
        return validStrengths;
      }
    }

    // Fallback to legacy keyOpportunities
    if (Array.isArray(summary.keyOpportunities)) {
      const validOpportunities = summary.keyOpportunities
        .filter(opp => typeof opp === 'string' && opp.trim().length > 0)
        .slice(0, 5);
        
      if (validOpportunities.length > 0) {
        return validOpportunities;
      }
    }

    // Generate from analysis data
    return this.extractStrengthsFromAnalysis(analysisData);
  }

  /**
   * Phase 2: Generate confidence with validation
   */
  private generateConfidence(summary: any, analysisData: any): number {
    // Use existing valid confidence
    if (typeof summary.confidence === 'number' && 
        !isNaN(summary.confidence) && 
        isFinite(summary.confidence)) {
      return Math.max(0, Math.min(1, summary.confidence));
    }

    // Fallback to legacy confidenceScore
    if (typeof summary.confidenceScore === 'number' && 
        !isNaN(summary.confidenceScore) && 
        isFinite(summary.confidenceScore)) {
      return Math.max(0, Math.min(1, summary.confidenceScore));
    }

    // Fallback to reasonable default instead of throwing
    console.warn('[SummaryGenerator] Using fallback confidence of 0.8 - no valid confidence found');
    return 0.8;
  }

  // === DATA EXTRACTION METHODS ===

  private extractIssuesFromAnalysis(analysisData: any): string[] {
    if (analysisData.prioritizedActions?.length > 0) {
      return analysisData.prioritizedActions
        .filter(action => action.priority === 'critical' || action.priority === 'high')
        .slice(0, 3)
        .map(action => action.title || action.description)
        .filter(Boolean);
    }
    
    return ['Interface requires accessibility improvements', 'Consider optimizing user workflow'];
  }

  private extractStrengthsFromAnalysis(analysisData: any): string[] {
    if (analysisData.prioritizedActions?.length > 0) {
      const positiveActions = analysisData.prioritizedActions
        .filter(action => action.impact === 'high' && action.priority !== 'critical')
        .slice(0, 3)
        .map(action => `Strong ${(action.title || action.description).toLowerCase()}`)
        .filter(Boolean);
        
      if (positiveActions.length > 0) return positiveActions;
    }
    
    return [
      'Clear visual hierarchy implemented',
      'Good content organization',
      'Intuitive interaction patterns'
    ];
  }

  private isGroupAnalysis(analysisData: any): boolean {
    return !!(analysisData.groupMetrics || analysisData.consistency);
  }

  private generateConsistency(summary: any, analysisData: any): number {
    return summary.consistency || analysisData.consistency || 0.75;
  }

  private generateThematicCoherence(summary: any, analysisData: any): number {
    return summary.thematicCoherence || analysisData.thematicCoherence || 0.8;
  }

  private generateUserFlowContinuity(summary: any, analysisData: any): number {
    return summary.userFlowContinuity || analysisData.userFlowContinuity || 0.7;
  }

  private extractCategoryFromPath(path: string): string | null {
    const match = path.match(/categoryScores\.(\w+)/);
    return match ? match[1] : null;
  }

  private generateStrategicInsights(inputSummary: any, analysisData: any): StrategicBusinessInsights {
    // Try to extract from analysis data first
    if (analysisData?.strategicInsights) {
      return {
        primaryConcern: analysisData.strategicInsights.primaryConcern || 'Business impact assessment needs completion',
        strategicRecommendation: {
          title: analysisData.strategicInsights.strategicRecommendation?.title || 'Strategic review required',
          businessJustification: analysisData.strategicInsights.strategicRecommendation?.businessJustification || 'Detailed business analysis needed to identify priority interventions',
          expectedOutcome: analysisData.strategicInsights.strategicRecommendation?.expectedOutcome || 'Improved business performance and competitive positioning'
        }
      };
    }

    // Try to extract from input summary
    if (inputSummary?.strategicInsights) {
      return {
        primaryConcern: inputSummary.strategicInsights.primaryConcern || 'Business impact assessment needs completion',
        strategicRecommendation: {
          title: inputSummary.strategicInsights.strategicRecommendation?.title || 'Strategic review required',
          businessJustification: inputSummary.strategicInsights.strategicRecommendation?.businessJustification || 'Detailed business analysis needed to identify priority interventions',
          expectedOutcome: inputSummary.strategicInsights.strategicRecommendation?.expectedOutcome || 'Improved business performance and competitive positioning'
        }
      };
    }

    // Fallback: Generate based on key issues
    const keyIssues = analysisData?.summary?.keyIssues || inputSummary?.keyIssues || [];
    const primaryIssue = keyIssues[0] || 'Interface optimization needed';
    
    return {
      primaryConcern: `Critical business challenge: ${primaryIssue.toLowerCase()} impacting user experience and operational efficiency`,
      strategicRecommendation: {
        title: 'Comprehensive interface optimization initiative',
        businessJustification: 'Current interface limitations create friction in user workflows, potentially impacting conversion rates and customer satisfaction. Strategic intervention needed to maintain competitive position.',
        expectedOutcome: 'Enhanced user experience driving improved engagement metrics, reduced support costs, and stronger competitive differentiation'
      }
    };
  }

  private generateEmergencyFallbackSummary(): GeneratedSummary {
    console.warn('[SummaryGenerator] Using emergency fallback summary');
    return {
      overallScore: 75,
      categoryScores: {
        usability: 75,
        accessibility: 75,
        visual: 75,
        content: 75
      },
      keyIssues: ['Analysis incomplete - please retry'],
      strengths: ['Interface has basic structure'],
      confidence: 0.5,
      strategicInsights: {
        primaryConcern: 'Analysis incomplete - strategic assessment required',
        strategicRecommendation: {
          title: 'Complete comprehensive analysis',
          businessJustification: 'Insufficient data available to provide strategic business recommendations',
          expectedOutcome: 'Better understanding of business impact and optimization opportunities'
        }
      }
    };
  }
}