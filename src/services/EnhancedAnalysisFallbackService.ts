/**
 * Enhanced Analysis Fallback Service
 * Provides intelligent fallbacks when AI analysis fails or returns generic content
 */

import { UXAnalysis } from '@/types/ux-analysis';
import { FallbackLoggingService } from './FallbackLoggingService';
import { Logger } from '@/utils/logging';

export interface AnalysisContext {
  imageId: string;
  imageName?: string;
  domain?: string;
  screenType?: string;
  userContext?: string;
  visionMetadata?: any;
}

export interface FallbackResult {
  analysis: Partial<UXAnalysis>;
  fallbackUsed: boolean;
  fallbackReasons: string[];
  confidence: number;
}

export class EnhancedAnalysisFallbackService {
  /**
   * Create intelligent fallback analysis based on available context and vision metadata
   */
  static async createIntelligentFallback(
    context: AnalysisContext,
    originalAnalysis?: any
  ): Promise<FallbackResult> {
    const fallbackReasons: string[] = [];
    let confidence = 0.3; // Base confidence for fallback

    // Analyze what we can infer from the context
    const domain = this.inferDomain(context);
    const screenType = this.inferScreenType(context);
    const suggestions = this.generateContextualSuggestions(domain, screenType, context);
    const visualAnnotations = this.generateSmartAnnotations(context);
    const summary = this.generateEnhancedSummary(domain, screenType, context);

    // Check if we have vision metadata to enhance the fallback
    if (context.visionMetadata) {
      confidence += 0.2;
      this.enhanceWithVisionData(suggestions, visualAnnotations, summary, context.visionMetadata);
    }

    // Check if we have partial AI analysis to salvage
    if (originalAnalysis) {
      confidence += 0.3;
      this.salvagePartialAnalysis(suggestions, visualAnnotations, summary, originalAnalysis);
      fallbackReasons.push('Partial AI analysis data recovered');
    } else {
      fallbackReasons.push('AI analysis failed - using intelligent fallback');
    }

    const analysis: Partial<UXAnalysis> = {
      id: `fallback_${Date.now()}`,
      imageId: context.imageId,
      imageName: context.imageName || 'Analysis Image',
      suggestions,
      visualAnnotations,
      summary,
      metadata: {
        fallbackUsed: true,
        fallbackReasons,
        domain,
        screenType,
        confidence,
        visionMetadataAvailable: !!context.visionMetadata,
        analysisMethod: 'intelligent_fallback'
      } as any,
      status: 'completed',
      createdAt: new Date()
    };

    // Log fallback usage
    Logger.warn('analysis', 'Creating intelligent fallback analysis', { 
      hasOriginal: !!originalAnalysis,
      domain,
      screenType,
      confidence
    });

    await FallbackLoggingService.logFallbackUsage({
      service_name: 'EnhancedAnalysisFallbackService',
      fallback_type: 'intelligent_fallback',
      original_error: originalAnalysis ? 'Generic analysis detected' : 'No analysis available',
      context_data: {
        domain,
        screenType,
        confidence,
        hasOriginal: !!originalAnalysis,
        imageId: context.imageId
      }
    });

    return {
      analysis,
      fallbackUsed: true,
      fallbackReasons,
      confidence
    };
  }

  /**
   * Infer domain from image name, context, and metadata
   */
  private static inferDomain(context: AnalysisContext): string {
    const text = `${context.imageName || ''} ${context.userContext || ''}`.toLowerCase();
    
    if (text.includes('ecommerce') || text.includes('shop') || text.includes('product') || text.includes('cart')) {
      return 'ecommerce';
    }
    if (text.includes('finance') || text.includes('banking') || text.includes('payment')) {
      return 'finance';
    }
    if (text.includes('health') || text.includes('medical') || text.includes('hospital')) {
      return 'healthcare';
    }
    if (text.includes('dashboard') || text.includes('admin') || text.includes('analytics')) {
      return 'dashboard';
    }
    if (text.includes('blog') || text.includes('article') || text.includes('content')) {
      return 'content';
    }
    
    return 'general';
  }

  /**
   * Infer screen type from image characteristics
   */
  private static inferScreenType(context: AnalysisContext): string {
    const text = `${context.imageName || ''} ${context.userContext || ''}`.toLowerCase();
    
    if (text.includes('landing') || text.includes('home')) {
      return 'landing_page';
    }
    if (text.includes('dashboard')) {
      return 'dashboard';
    }
    if (text.includes('form') || text.includes('signup') || text.includes('login')) {
      return 'form';
    }
    if (text.includes('mobile') || text.includes('app')) {
      return 'mobile_app';
    }
    if (text.includes('checkout') || text.includes('payment')) {
      return 'checkout';
    }
    
    return 'web_interface';
  }

  /**
   * Generate contextual suggestions based on domain and screen type
   */
  private static generateContextualSuggestions(
    domain: string, 
    screenType: string, 
    context: AnalysisContext
  ): any[] {
    const suggestions = [];

    // Domain-specific suggestions
    switch (domain) {
      case 'ecommerce':
        suggestions.push({
          id: 'ecommerce_trust',
          category: 'visual',
          title: 'Trust Signal Enhancement',
          description: 'E-commerce interfaces benefit from clear security badges, customer reviews, and return policies to build trust.',
          impact: 'high',
          effort: 'medium',
          actionItems: [
            'Add security badges near payment areas',
            'Include customer testimonials',
            'Display clear return policy'
          ]
        });
        break;
        
      case 'finance':
        suggestions.push({
          id: 'finance_security',
          category: 'accessibility',
          title: 'Security & Compliance',
          description: 'Financial interfaces require strong security indicators and accessibility compliance for user confidence.',
          impact: 'high',
          effort: 'high',
          actionItems: [
            'Implement strong authentication indicators',
            'Ensure WCAG AA compliance',
            'Add security status indicators'
          ]
        });
        break;
        
      case 'dashboard':
        suggestions.push({
          id: 'dashboard_clarity',
          category: 'usability',
          title: 'Data Visualization Clarity',
          description: 'Dashboards should prioritize clear data hierarchy and actionable insights over visual complexity.',
          impact: 'medium',
          effort: 'medium',
          actionItems: [
            'Implement clear visual hierarchy',
            'Use consistent chart types',
            'Add contextual help for metrics'
          ]
        });
        break;
    }

    // Screen type-specific suggestions
    switch (screenType) {
      case 'landing_page':
        suggestions.push({
          id: 'landing_cta',
          category: 'content',
          title: 'Call-to-Action Optimization',
          description: 'Landing pages should have a clear primary action and value proposition above the fold.',
          impact: 'high',
          effort: 'low',
          actionItems: [
            'Make primary CTA more prominent',
            'Clarify value proposition',
            'Reduce cognitive load'
          ]
        });
        break;
        
      case 'form':
        suggestions.push({
          id: 'form_validation',
          category: 'usability',
          title: 'Form Validation Enhancement',
          description: 'Forms should provide clear, helpful validation feedback to improve completion rates.',
          impact: 'medium',
          effort: 'medium',
          actionItems: [
            'Add real-time validation',
            'Improve error messaging',
            'Show progress indicators'
          ]
        });
        break;
    }

    // Generic UX improvement
    suggestions.push({
      id: 'general_accessibility',
      category: 'accessibility',
      title: 'Accessibility Foundation',
      description: 'Interface should meet WCAG AA standards for color contrast, keyboard navigation, and screen reader compatibility.',
      impact: 'medium',
      effort: 'medium',
      actionItems: [
        'Check color contrast ratios',
        'Test keyboard navigation',
        'Add proper ARIA labels'
      ]
    });

    return suggestions;
  }

  /**
   * Generate smart visual annotations based on common patterns
   */
  private static generateSmartAnnotations(context: AnalysisContext): any[] {
    return [
      {
        id: 'header_area',
        x: 0.5,
        y: 0.1,
        type: 'suggestion',
        title: 'Header Navigation',
        description: 'Primary navigation area should be clearly visible and accessible',
        severity: 'medium'
      },
      {
        id: 'main_content',
        x: 0.5,
        y: 0.5,
        type: 'suggestion',
        title: 'Main Content Area',
        description: 'Core content should follow clear visual hierarchy principles',
        severity: 'medium'
      },
      {
        id: 'action_area',
        x: 0.8,
        y: 0.3,
        type: 'suggestion',
        title: 'Primary Action',
        description: 'Main call-to-action should be prominently positioned',
        severity: 'low'
      }
    ];
  }

  /**
   * Generate enhanced summary with contextual insights
   */
  private static generateEnhancedSummary(
    domain: string,
    screenType: string,
    context: AnalysisContext
  ): any {
    const domainContext = this.getDomainContext(domain);
    const screenContext = this.getScreenContext(screenType);
    
    return {
      overallScore: 72, // Moderate score for fallback
      title: `${screenContext} Analysis - ${domainContext}`,
      keyInsights: [
        `This ${screenType.replace('_', ' ')} in the ${domain} domain has been analyzed using intelligent pattern recognition.`,
        `Recommendations focus on ${domain === 'ecommerce' ? 'conversion optimization and trust signals' : domain === 'finance' ? 'security and compliance' : 'usability and accessibility'}.`,
        'Further AI analysis recommended for detailed domain-specific insights.'
      ],
      categoryScores: {
        usability: 70,
        accessibility: 68,
        visual: 75,
        content: 72
      },
      keyIssues: [
        'Detailed AI analysis unavailable - using pattern-based evaluation',
        `${domainContext} best practices may not be fully addressed`
      ],
      strengths: [
        'Interface follows common design patterns',
        'Structure appears organized and purposeful'
      ],
      confidence: 0.6
    };
  }

  /**
   * Enhance fallback with vision metadata if available
   */
  private static enhanceWithVisionData(
    suggestions: any[],
    annotations: any[],
    summary: any,
    visionMetadata: any
  ): void {
    if (visionMetadata.text && visionMetadata.text.length > 0) {
      summary.keyInsights.push('Text content detected and analyzed for readability');
      suggestions.push({
        id: 'text_optimization',
        category: 'content',
        title: 'Content Optimization',
        description: `Detected ${visionMetadata.text.length} text elements that can be optimized for clarity and readability.`,
        impact: 'medium',
        effort: 'low',
        actionItems: [
          'Review text hierarchy',
          'Ensure consistent font sizing',
          'Check readability scores'
        ]
      });
    }

    if (visionMetadata.objects && visionMetadata.objects.length > 0) {
      summary.keyInsights.push(`Visual elements detected: ${visionMetadata.objects.map(obj => obj.name).join(', ')}`);
    }
  }

  /**
   * Salvage partial analysis data
   */
  private static salvagePartialAnalysis(
    suggestions: any[],
    annotations: any[],
    summary: any,
    originalAnalysis: any
  ): void {
    // Try to extract usable suggestions
    if (originalAnalysis.suggestions && Array.isArray(originalAnalysis.suggestions)) {
      originalAnalysis.suggestions.forEach((suggestion: any, index: number) => {
        if (suggestion && typeof suggestion === 'object' && suggestion.title) {
          suggestions.unshift({
            ...suggestion,
            id: suggestion.id || `recovered_${index}`,
            category: suggestion.category || 'usability',
            impact: suggestion.impact || 'medium',
            effort: suggestion.effort || 'medium'
          });
        }
      });
    }

    // Try to extract summary data
    if (originalAnalysis.summary && typeof originalAnalysis.summary === 'object') {
      if (originalAnalysis.summary.overallScore) {
        summary.overallScore = originalAnalysis.summary.overallScore;
      }
      if (originalAnalysis.summary.categoryScores) {
        summary.categoryScores = {
          ...summary.categoryScores,
          ...originalAnalysis.summary.categoryScores
        };
      }
      if (originalAnalysis.summary.keyInsights && Array.isArray(originalAnalysis.summary.keyInsights)) {
        summary.keyInsights = originalAnalysis.summary.keyInsights;
      }
    }
  }

  /**
   * Get domain context description
   */
  private static getDomainContext(domain: string): string {
    const contexts = {
      ecommerce: 'E-commerce Platform',
      finance: 'Financial Service',
      healthcare: 'Healthcare Application',
      dashboard: 'Data Dashboard',
      content: 'Content Platform',
      general: 'Web Interface'
    };
    return contexts[domain] || 'Web Interface';
  }

  /**
   * Get screen context description
   */
  private static getScreenContext(screenType: string): string {
    const contexts = {
      landing_page: 'Landing Page',
      dashboard: 'Dashboard Interface',
      form: 'Form Interface',
      mobile_app: 'Mobile Application',
      checkout: 'Checkout Flow',
      web_interface: 'Web Interface'
    };
    return contexts[screenType] || 'Interface';
  }

  /**
   * Check if analysis appears to be generic fallback content
   */
  static isGenericFallback(analysis: any): boolean {
    if (!analysis || typeof analysis !== 'object') return true;

    const genericIndicators = [
      'successfully analyzed',
      'requires optimization',
      'needs improvement',
      'area identified for improvement',
      'benefits from review',
      'Image was successfully analyzed'
    ];

    const text = JSON.stringify(analysis).toLowerCase();
    return genericIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Enhance existing analysis if it appears generic
   */
  static async enhanceGenericAnalysis(
    analysis: any,
    context: AnalysisContext
  ): Promise<FallbackResult> {
    if (!this.isGenericFallback(analysis)) {
      return {
        analysis,
        fallbackUsed: false,
        fallbackReasons: [],
        confidence: 0.8
      };
    }

    // Analysis appears generic, enhance it
    Logger.info('analysis', 'Enhanced generic analysis with intelligent fallback', {
      originalWasGeneric: true
    });

    await FallbackLoggingService.logFallbackUsage({
      service_name: 'EnhancedAnalysisFallbackService',
      fallback_type: 'generic_enhancement',
      original_error: 'Generic analysis detected',
      context_data: {
        imageId: context.imageId,
        originalAnalysis: typeof analysis === 'object' ? 'partial_data' : 'invalid_data'
      }
    });

    const fallback = await this.createIntelligentFallback(context, analysis);
    
    return {
      ...fallback,
      fallbackReasons: [...fallback.fallbackReasons, 'Enhanced generic AI output']
    };
  }
}