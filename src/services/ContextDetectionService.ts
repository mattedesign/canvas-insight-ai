import { ImageContext, UserContext, AnalysisContext, ClarifiedContext } from '@/types/contextTypes';
import { supabase } from '@/integrations/supabase/client';

export class ContextDetectionService {
  async detectImageContext(imageUrl: string): Promise<ImageContext> {
    try {
      const contextPrompt = `Analyze this UI/UX interface image and determine:
      1. Primary interface type (dashboard/landing/app/form/ecommerce/content/portfolio/saas/mobile)
      2. Sub-types or specific patterns
      3. Domain/industry (finance/healthcare/education/retail/etc)
      4. Complexity level (simple/moderate/complex)
      5. Likely user intents based on UI elements
      6. Business model indicators
      7. Target audience indicators
      8. Product maturity stage
      9. Platform type (web/mobile/desktop/responsive)
      10. Design system presence and consistency

      Return as JSON with confidence scores for each determination.`;

      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Context detection timeout')), 15000)
      );

      const detectionPromise = supabase.functions.invoke('context-detection', {
        body: {
          imageUrl,
          prompt: contextPrompt,
          model: 'gpt-4-vision-preview', // Use vision model
          maxTokens: 1000
        }
      });

      const { data, error } = await Promise.race([
        detectionPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.warn('Context detection failed, using defaults:', error);
        return this.getDefaultContext();
      }

      return this.parseImageContext(data);
    } catch (error) {
      console.warn('Context detection error, using defaults:', error);
      return this.getDefaultContext();
    }
  }

  private getDefaultContext(): ImageContext {
    return {
      primaryType: 'unknown',
      subTypes: [],
      domain: 'general',
      complexity: 'moderate',
      userIntent: ['analyze', 'improve'],
      maturityStage: 'mvp',
      platform: 'web'
    };
  }

  /**
   * Infer user context from their input and behavior
   */
  inferUserContext(
    explicitContext: string,
    previousInteractions?: any[]
  ): UserContext {
    const context: UserContext = {
      technicalLevel: 'some-technical',
      expertise: 'intermediate'
    };

    // Analyze explicit context for role indicators
    const roleIndicators = {
      designer: /design|ui|ux|visual|aesthetic|color|typography/i,
      developer: /code|component|api|implement|technical|architecture/i,
      business: /revenue|conversion|roi|metrics|growth|acquisition/i,
      product: /feature|roadmap|user story|backlog|priorit/i,
      marketing: /campaign|messaging|brand|seo|content|copy/i
    };

    for (const [role, pattern] of Object.entries(roleIndicators)) {
      if (pattern.test(explicitContext)) {
        context.inferredRole = role as any;
        break;
      }
    }

    // Detect expertise level
    if (/beginner|new to|help me understand|basic/i.test(explicitContext)) {
      context.expertise = 'beginner';
      context.technicalLevel = 'non-technical';
    } else if (/advanced|expert|deep dive|comprehensive/i.test(explicitContext)) {
      context.expertise = 'expert';
      context.technicalLevel = 'technical';
    }

    // Extract goals
    const goalMatches = explicitContext.match(/(?:want to|need to|help me|looking to|trying to)\s+([^.!?]+)/gi);
    if (goalMatches) {
      context.goals = goalMatches.map(match => 
        match.replace(/(?:want to|need to|help me|looking to|trying to)\s+/i, '').trim()
      );
    }

    // Detect focus areas
    const focusPatterns = {
      conversion: /conversion|convert|cta|action|purchase/i,
      accessibility: /accessible|a11y|wcag|screen reader|disability/i,
      performance: /performance|speed|fast|load|optimize/i,
      mobile: /mobile|responsive|touch|gesture|small screen/i,
      'data-visualization': /chart|graph|data|metrics|dashboard|visualiz/i,
      'trust-signals': /trust|security|credibility|testimonial|social proof/i
    };

    context.focusAreas = [];
    for (const [area, pattern] of Object.entries(focusPatterns)) {
      if (pattern.test(explicitContext)) {
        context.focusAreas.push(area);
      }
    }

    // Set output preferences based on role and expertise
    context.outputPreferences = {
      detailLevel: context.expertise === 'expert' ? 'comprehensive' : 'detailed',
      jargonLevel: context.technicalLevel === 'technical' ? 'technical' : 'minimal',
      prioritization: context.inferredRole === 'business' ? 'impact' : 'effort'
    };

    return context;
  }

  /**
   * Create unified analysis context
   */
  createAnalysisContext(
    imageContext: ImageContext,
    userContext: UserContext
  ): AnalysisContext {
    // Merge and enhance contexts
    const focusAreas = this.mergeFocusAreas(imageContext, userContext);
    const analysisDepth = this.determineAnalysisDepth(userContext, imageContext);
    const outputStyle = this.determineOutputStyle(userContext);
    const confidence = this.calculateContextConfidence(imageContext, userContext);
    
    const context: AnalysisContext = {
      image: imageContext,
      user: userContext,
      focusAreas,
      analysisDepth,
      outputStyle,
      industryStandards: this.getIndustryStandards(imageContext.domain),
      confidence,
      detectedAt: new Date().toISOString(),
      clarificationNeeded: confidence < 0.7
    };

    // If confidence is low, prepare clarification questions
    if (context.clarificationNeeded) {
      context.clarificationQuestions = this.generateClarificationQuestions(imageContext, userContext);
    }

    return context;
  }

  generateClarificationQuestions(
    imageContext: ImageContext,
    userContext: UserContext
  ): string[] {
    const questions: string[] = [];

    // Always ensure we have questions when confidence is low
    
    // Clarify interface type if uncertain
    if (imageContext.primaryType === 'unknown') {
      questions.push(
        "What type of interface is this? (e.g., dashboard, landing page, mobile app, form, etc.)"
      );
    }

    // Clarify user role if not detected
    if (!userContext.inferredRole) {
      questions.push(
        "What's your role? (designer, developer, product manager, business owner, etc.)"
      );
    }

    // Clarify goals if not clear
    if (!userContext.goals || userContext.goals.length === 0) {
      questions.push(
        "What would you like me to focus on? (conversion, usability, accessibility, performance, etc.)"
      );
    }

    // Always have at least one question if confidence is low
    if (questions.length === 0) {
      questions.push(
        "Could you tell me more about this interface and what kind of analysis would be most helpful?"
      );
    }

    return questions;
  }

  /**
   * Process clarification responses to enhance context
   */
  async processClarificationResponses(
    originalContext: AnalysisContext,
    responses: Record<string, string>
  ): Promise<ClarifiedContext> {
    // Re-analyze with additional information
    const enhancedUserContext = this.enhanceUserContext(
      originalContext.user,
      responses
    );

    const enhancedImageContext = await this.enhanceImageContext(
      originalContext.image,
      responses
    );

    return {
      ...originalContext,
      user: enhancedUserContext,
      image: enhancedImageContext,
      clarificationResponses: responses,
      enhancedConfidence: 0.9, // Higher confidence after clarification
      clarificationNeeded: false
    };
  }

  private calculateContextConfidence(
    imageContext: ImageContext,
    userContext: UserContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Image context factors
    if (imageContext.primaryType !== 'unknown') confidence += 0.2;
    if (imageContext.domain && imageContext.domain !== 'general') confidence += 0.15;
    if (imageContext.designSystem?.detected) confidence += 0.05;

    // User context factors
    if (userContext.inferredRole) confidence += 0.1;
    if (userContext.goals && userContext.goals.length > 0) confidence += 0.1;
    if (userContext.focusAreas && userContext.focusAreas.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private enhanceUserContext(
    original: UserContext,
    responses: Record<string, string>
  ): UserContext {
    const enhanced = { ...original };

    // Process role clarification
    const roleResponse = responses['role'] || responses['perspective'];
    if (roleResponse) {
      enhanced.inferredRole = this.parseRole(roleResponse);
    }

    // Process goal clarification
    const goalResponse = responses['goals'] || responses['improvements'];
    if (goalResponse) {
      enhanced.goals = this.parseGoals(goalResponse);
    }

    return enhanced;
  }

  private async enhanceImageContext(
    original: ImageContext,
    responses: Record<string, string>
  ): Promise<ImageContext> {
    const enhanced = { ...original };

    // Process interface type clarification
    const typeResponse = responses['interfaceType'] || responses['purpose'];
    if (typeResponse) {
      enhanced.primaryType = this.parseInterfaceType(typeResponse);
    }

    // Process domain clarification
    const domainResponse = responses['industry'] || responses['domain'];
    if (domainResponse) {
      enhanced.domain = this.parseDomain(domainResponse);
    }

    return enhanced;
  }

  private parseRole(response: string): UserContext['inferredRole'] {
    const normalized = response.toLowerCase();
    if (normalized.includes('design')) return 'designer';
    if (normalized.includes('develop') || normalized.includes('engineer')) return 'developer';
    if (normalized.includes('business') || normalized.includes('stakeholder')) return 'business';
    if (normalized.includes('product')) return 'product';
    if (normalized.includes('market')) return 'marketing';
    return undefined;
  }

  private parseInterfaceType(response: string): ImageContext['primaryType'] {
    const normalized = response.toLowerCase();
    if (normalized.includes('dashboard')) return 'dashboard';
    if (normalized.includes('landing')) return 'landing';
    if (normalized.includes('mobile') || normalized.includes('app')) return 'mobile';
    if (normalized.includes('ecommerce') || normalized.includes('shop')) return 'ecommerce';
    if (normalized.includes('form')) return 'form';
    if (normalized.includes('saas')) return 'saas';
    return 'app'; // Default to app if unclear
  }

  private parseDomain(response: string): string {
    const normalized = response.toLowerCase();
    if (normalized.includes('financ') || normalized.includes('bank')) return 'finance';
    if (normalized.includes('health') || normalized.includes('medical')) return 'healthcare';
    if (normalized.includes('educat') || normalized.includes('learn')) return 'education';
    if (normalized.includes('retail') || normalized.includes('commerce')) return 'retail';
    if (normalized.includes('tech') || normalized.includes('software')) return 'technology';
    return response; // Use as-is if no match
  }

  private parseGoals(response: string): string[] {
    // Extract actionable goals from natural language
    const goals: string[] = [];
    const patterns = [
      /improve\s+([^,\.]+)/gi,
      /increase\s+([^,\.]+)/gi,
      /optimize\s+([^,\.]+)/gi,
      /reduce\s+([^,\.]+)/gi,
      /enhance\s+([^,\.]+)/gi
    ];

    patterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        goals.push(match[1].trim());
      }
    });

    return goals.length > 0 ? goals : [response]; // Fallback to full response
  }

  private mergeFocusAreas(image: ImageContext, user: UserContext): string[] {
    const areas = new Set<string>(user.focusAreas || []);
    
    // Add implicit focus areas based on image type
    const implicitFocus: Record<string, string[]> = {
      dashboard: ['data-visualization', 'information-density'],
      landing: ['conversion', 'trust-signals'],
      ecommerce: ['conversion', 'trust-signals', 'mobile'],
      form: ['conversion', 'accessibility'],
      mobile: ['mobile', 'performance']
    };

    if (implicitFocus[image.primaryType]) {
      implicitFocus[image.primaryType].forEach(area => areas.add(area));
    }

    return Array.from(areas);
  }

  private determineAnalysisDepth(user: UserContext, image: ImageContext): 'surface' | 'standard' | 'deep' | 'exhaustive' {
    if (user.expertise === 'expert' || image.complexity === 'complex') {
      return 'deep';
    }
    if (user.expertise === 'beginner') {
      return 'standard';
    }
    return 'standard';
  }

  private determineOutputStyle(user: UserContext): 'technical' | 'business' | 'design' | 'balanced' {
    switch (user.inferredRole) {
      case 'developer': return 'technical';
      case 'business': return 'business';
      case 'designer': return 'design';
      default: return 'balanced';
    }
  }

  private getIndustryStandards(domain: string): string[] {
    const standards: Record<string, string[]> = {
      finance: ['PCI-DSS', 'SOC2', 'GDPR'],
      healthcare: ['HIPAA', 'WCAG-AA', 'Section-508'],
      education: ['FERPA', 'COPPA', 'WCAG-AA'],
      government: ['Section-508', 'WCAG-AAA'],
      ecommerce: ['PCI-DSS', 'GDPR', 'CCPA']
    };

    return standards[domain] || ['WCAG-AA'];
  }

  private parseImageContext(data: any): ImageContext {
    // Parse AI response and ensure all required fields
    return {
      primaryType: data.primaryType || 'unknown',
      subTypes: data.subTypes || [],
      domain: data.domain || 'general',
      complexity: data.complexity || 'moderate',
      userIntent: data.userIntent || [],
      businessModel: data.businessModel,
      targetAudience: data.targetAudience,
      maturityStage: data.maturityStage || 'mvp',
      platform: data.platform || 'web',
      designSystem: data.designSystem
    };
  }
}