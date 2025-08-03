import { ImageContext, UserContext, AnalysisContext, ClarifiedContext } from '@/types/contextTypes';
import { supabase } from '@/integrations/supabase/client';
import { PipelineError } from '@/types/pipelineErrors';

export class ContextDetectionService {
  async detectImageContext(imageUrl: string, imageBase64?: string): Promise<ImageContext> {
    const timeoutMs = 30000; // 30 second timeout
    
    try {
      console.log('[ContextDetection] Starting image context detection...');
      
      const contextPrompt = `Analyze this UI/UX interface image and provide detailed context detection. Focus on identifying specific patterns, domain indicators, and user characteristics.

CRITICAL: You must return a complete JSON object with all fields populated based on visual analysis.

Analyze these key aspects:
1. **Interface Type**: What type of interface is this? Look for visual cues:
   - Dashboard: Charts, graphs, KPIs, data tables, metrics
   - Landing Page: Hero sections, CTAs, marketing copy, testimonials
   - Mobile App: Touch-friendly elements, mobile navigation patterns
   - E-commerce: Product listings, shopping carts, payment flows
   - Form: Input fields, validation, submission buttons
   - SaaS: Feature-rich interfaces, complex workflows, settings

2. **Domain Detection**: Look for industry-specific elements:
   - Finance: Currency symbols, charts, trading interfaces, bank layouts
   - Healthcare: Medical terminology, patient info, clinical workflows
   - Education: Learning modules, progress tracking, gradebooks
   - Retail: Product catalogs, inventory, pricing
   - Real Estate: Property listings, maps, search filters

3. **Platform & Design System**: 
   - Web vs Mobile indicators
   - Design framework patterns (Material, Bootstrap, custom)
   - Consistency in spacing, colors, typography

4. **User Experience Maturity**:
   - Prototype: Basic layouts, placeholder content
   - MVP: Core functionality, simple design
   - Growth: Feature-rich, polished interface
   - Mature: Complex workflows, advanced features

Required JSON format:
{
  "primaryType": "dashboard|landing|app|form|ecommerce|content|portfolio|saas|mobile",
  "subTypes": ["specific_patterns"],
  "domain": "finance|healthcare|education|retail|technology|general",
  "complexity": "simple|moderate|complex",
  "userIntent": ["primary_user_goals"],
  "businessModel": "saas|ecommerce|marketplace|content|enterprise",
  "targetAudience": "consumers|professionals|enterprise|developers",
  "maturityStage": "prototype|mvp|growth|mature",
  "platform": "web|mobile|desktop|responsive",
  "designSystem": {
    "detected": true/false,
    "type": "material|bootstrap|custom|unknown",
    "consistency": 0.0-1.0
  },
  "confidence": 0.0-1.0
}`;

      console.log('[ContextDetection] Calling edge function with:', { imageUrl, prompt: contextPrompt });
      
      // Add timeout to the function call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Context detection timed out')), timeoutMs);
      });

      const analysisPromise = supabase.functions.invoke('context-detection', {
        body: {
          imageUrl,
          imageBase64,
          prompt: contextPrompt,
          model: 'gpt-4o',
          maxTokens: 1000
        }
      });

      const { data, error } = await Promise.race([analysisPromise, timeoutPromise]) as any;

      if (error) {
        console.error('[ContextDetection] Supabase function error:', error);
        console.log('[ContextDetection] Attempting enhanced context mode fallback...');
        
        // Try enhanced context mode as fallback
        try {
          const enhancedAnalysisPromise = supabase.functions.invoke('context-detection', {
            body: {
              imageUrl,
              imageBase64,
              prompt: contextPrompt,
              model: 'gpt-4o-mini',
              maxTokens: 500,
              enhancedContextMode: true
            }
          });
          
          const { data: enhancedData, error: enhancedError } = await Promise.race([enhancedAnalysisPromise, timeoutPromise]) as any;
          
          if (!enhancedError && enhancedData) {
            console.log('[ContextDetection] Enhanced mode fallback successful');
            return this.parseImageContext(enhancedData);
          }
        } catch (enhancedError) {
          console.warn('[ContextDetection] Enhanced mode fallback also failed:', enhancedError);
        }
        
        throw new PipelineError(
          `Context detection API error: ${error.message}`, 
          'context-detection',
          { originalError: error, stage: 'api-call' }
        );
      }

      if (!data) {
        console.error('[ContextDetection] No data returned from function');
        throw new PipelineError(
          'No context data received from analysis service', 
          'context-detection',
          { stage: 'data-validation' }
        );
      }

      console.log('[ContextDetection] Successfully received response:', data);
      return this.parseImageContext(data);
      
    } catch (error) {
      console.error('[ContextDetection] Failed to detect context:', error);
      
      // Enhanced error classification for better user experience
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('timeout')) {
        throw new PipelineError(
          'Context detection timed out. The AI service may be experiencing high load.',
          'context-detection',
          { originalError: error, timeout: timeoutMs, stage: 'timeout' }
        );
      }
      
      if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
        throw new PipelineError(
          'AI service is not properly configured. Please check your API settings.',
          'context-detection',
          { originalError: error, stage: 'authentication' }
        );
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        throw new PipelineError(
          'Network error during context detection. Please check your connection.',
          'context-detection',
          { originalError: error, stage: 'network' }
        );
      }
      
      // For any other errors, provide a graceful fallback with logging
      console.warn('[ContextDetection] Falling back to default context due to error:', error);
      return this.createFallbackContext(errorMessage);
    }
  }

  private createFallbackContext(errorReason: string): ImageContext {
    console.log('[ContextDetection] Creating intelligent fallback context due to:', errorReason);
    
    // Create more intelligent fallback based on error reason
    let primaryType: ImageContext['primaryType'] = 'app';
    let domain = 'general';
    
    if (errorReason.includes('dashboard') || errorReason.includes('metrics')) {
      primaryType = 'dashboard';
      domain = 'technology';
    } else if (errorReason.includes('landing') || errorReason.includes('marketing')) {
      primaryType = 'landing';
      domain = 'general';
    } else if (errorReason.includes('mobile')) {
      primaryType = 'mobile';
      domain = 'technology';
    } else if (errorReason.includes('ecommerce') || errorReason.includes('shop')) {
      primaryType = 'ecommerce';
      domain = 'retail';
    }
    
    return {
      primaryType,
      subTypes: this.getSubTypesForInterface(primaryType),
      domain,
      complexity: 'moderate',
      userIntent: ['improve usability', 'enhance user experience'],
      platform: primaryType === 'mobile' ? 'mobile' : 'web',
      businessModel: this.getBusinessModelForDomain(domain),
      targetAudience: 'general users',
      maturityStage: 'mvp',
      designSystem: {
        detected: false,
        type: 'custom',
        consistency: 0.5
      }
    };
  }

  private getSubTypesForInterface(interfaceType: ImageContext['primaryType']): string[] {
    const subTypeMap: Record<string, string[]> = {
      dashboard: ['analytics', 'metrics', 'data-visualization'],
      landing: ['marketing', 'conversion', 'lead-generation'],
      mobile: ['native', 'responsive', 'touch-interface'],
      ecommerce: ['product-catalog', 'checkout-flow', 'shopping-cart'],
      form: ['data-entry', 'validation', 'multi-step'],
      saas: ['workflow', 'feature-rich', 'enterprise'],
      app: ['general', 'web-application'],
      content: ['content-management', 'publishing'],
      portfolio: ['showcase', 'creative'],
      unknown: ['general']
    };
    
    return subTypeMap[interfaceType] || ['general'];
  }

  private getBusinessModelForDomain(domain: string): string {
    const businessModelMap: Record<string, string> = {
      finance: 'enterprise',
      healthcare: 'enterprise', 
      education: 'saas',
      retail: 'ecommerce',
      technology: 'saas',
      'real-estate': 'marketplace'
    };
    
    return businessModelMap[domain] || 'saas';
  }


  /**
   * Infer user context from their input and behavior
   */
  inferUserContext(
    explicitContext: string,
    previousInteractions?: any[]
  ): UserContext {
    console.log('[ContextDetection] Inferring user context from:', explicitContext);
    
    const context: UserContext = {
      technicalLevel: 'some-technical',
      expertise: 'intermediate'
    };

    // Enhanced role indicators with more patterns
    const roleIndicators = {
      designer: /design|ui|ux|visual|aesthetic|color|typography|figma|sketch|adobe|wireframe|mockup|prototype|user interface|user experience|brand|layout|style|creative/i,
      developer: /code|component|api|implement|technical|architecture|react|vue|angular|javascript|typescript|frontend|backend|development|programming|software engineer|dev/i,
      business: /revenue|conversion|roi|metrics|growth|acquisition|sales|marketing|business|profit|kpi|analytics|stakeholder|ceo|founder|manager|strategy|market/i,
      product: /feature|roadmap|user story|backlog|priorit|product manager|product owner|pm|scrum|agile|requirements|specs|mvp|sprint/i,
      marketing: /campaign|messaging|brand|seo|content|copy|lead|funnel|engagement|social media|email marketing|advertising|cta|traffic/i
    };

    let roleFound = false;
    for (const [role, pattern] of Object.entries(roleIndicators)) {
      if (pattern.test(explicitContext)) {
        context.inferredRole = role as any;
        roleFound = true;
        console.log('[ContextDetection] Detected user role:', role);
        break;
      }
    }

    // If no role detected, try to infer from general language patterns
    if (!roleFound) {
      if (/improve|enhance|better|optimize|fix|problem|issue|analysis/i.test(explicitContext)) {
        context.inferredRole = 'product'; // Default to product perspective for improvement-focused users
      }
    }

    // Enhanced expertise level detection
    if (/beginner|new to|help me understand|basic|novice|learning|first time/i.test(explicitContext)) {
      context.expertise = 'beginner';
      context.technicalLevel = 'non-technical';
    } else if (/advanced|expert|deep dive|comprehensive|professional|senior|experienced|detailed analysis/i.test(explicitContext)) {
      context.expertise = 'expert';
      context.technicalLevel = 'technical';
    }

    // Enhanced goal extraction with more patterns
    const goalPatterns = [
      /(?:want to|need to|help me|looking to|trying to|hoping to|planning to)\s+([^.!?]+)/gi,
      /(?:improve|enhance|optimize|fix|analyze|review|assess)\s+([^.!?]+)/gi,
      /(?:make|create|build|develop)\s+([^.!?]+)/gi
    ];

    context.goals = [];
    goalPatterns.forEach(pattern => {
      const matches = explicitContext.matchAll(pattern);
      for (const match of matches) {
        const goal = match[1].trim();
        if (goal && goal.length > 3) { // Filter out very short matches
          context.goals!.push(goal);
        }
      }
    });

    // If no goals detected, try to infer from action words
    if (!context.goals || context.goals.length === 0) {
      const actionWords = explicitContext.match(/\b(improve|enhance|optimize|analyze|review|assess|fix|increase|reduce|boost|streamline)\b/gi);
      if (actionWords) {
        context.goals = [`${actionWords[0].toLowerCase()} user experience`];
      }
    }

    // Enhanced focus area detection
    const focusPatterns = {
      conversion: /conversion|convert|cta|call to action|purchase|buy|checkout|funnel|signup|lead generation/i,
      accessibility: /accessible|a11y|wcag|screen reader|disability|inclusive|compliance|keyboard navigation/i,
      performance: /performance|speed|fast|load|optimize|slow|lag|responsive|quick/i,
      mobile: /mobile|responsive|touch|gesture|small screen|tablet|phone|ios|android/i,
      'data-visualization': /chart|graph|data|metrics|dashboard|visualiz|analytics|report|insights|kpi/i,
      'trust-signals': /trust|security|credibility|testimonial|social proof|reviews|badges|certification/i,
      usability: /usability|user friendly|intuitive|easy to use|navigation|flow|experience|confusion|clarity/i,
      design: /design|visual|appearance|layout|styling|color|font|spacing|alignment|hierarchy/i
    };

    context.focusAreas = [];
    for (const [area, pattern] of Object.entries(focusPatterns)) {
      if (pattern.test(explicitContext)) {
        context.focusAreas.push(area);
      }
    }

    // Add default focus areas if none detected
    if (context.focusAreas.length === 0) {
      context.focusAreas = ['usability']; // Default to usability focus
    }

    // Enhanced output preferences based on detected context
    context.outputPreferences = {
      detailLevel: context.expertise === 'expert' ? 'comprehensive' : 
                  context.expertise === 'beginner' ? 'concise' : 'detailed',
      jargonLevel: context.technicalLevel === 'technical' ? 'technical' : 
                  context.technicalLevel === 'non-technical' ? 'avoid' : 'minimal',
      prioritization: context.inferredRole === 'business' ? 'impact' : 
                     context.inferredRole === 'developer' ? 'effort' : 'quick-wins'
    };

    console.log('[ContextDetection] Final user context:', {
      inferredRole: context.inferredRole,
      expertise: context.expertise,
      focusAreas: context.focusAreas,
      goalsCount: context.goals?.length || 0
    });

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
    console.log('[ContextDetection] Raw AI response:', data);
    
    // Handle different response structures - AI might nest the data
    const responseData = data.data || data.result || data;
    
    // Enhanced parsing with fallback detection
    let primaryType = responseData.primaryType || responseData.interface_type || responseData.type || 'unknown';
    
    // Smart inference from detected elements if primaryType is unknown/unclear
    if (primaryType === 'unknown' || !primaryType) {
      primaryType = this.inferInterfaceFromElements(responseData);
    }
    
    console.log('[ContextDetection] Parsed primaryType:', primaryType);
    
    return {
      primaryType: primaryType as ImageContext['primaryType'],
      subTypes: responseData.subTypes || responseData.sub_types || [],
      domain: responseData.domain || responseData.industry || 'general',
      complexity: responseData.complexity || 'moderate',
      userIntent: responseData.userIntent || responseData.user_intent || [],
      businessModel: responseData.businessModel || responseData.business_model,
      targetAudience: responseData.targetAudience || responseData.target_audience,
      maturityStage: responseData.maturityStage || responseData.maturity_stage || 'mvp',
      platform: responseData.platform || 'web',
      designSystem: responseData.designSystem || responseData.design_system
    };
  }

  private inferInterfaceFromElements(data: any): ImageContext['primaryType'] {
    // Look for dashboard indicators in the AI response
    const text = JSON.stringify(data).toLowerCase();
    
    if (text.includes('dashboard') || text.includes('metric') || text.includes('chart') || text.includes('kpi')) {
      return 'dashboard';
    }
    if (text.includes('landing') || text.includes('hero') || text.includes('cta')) {
      return 'landing';
    }
    if (text.includes('form') || text.includes('input') || text.includes('submit')) {
      return 'form';
    }
    if (text.includes('mobile') || text.includes('app') || text.includes('touch')) {
      return 'mobile';
    }
    if (text.includes('ecommerce') || text.includes('product') || text.includes('cart') || text.includes('shop')) {
      return 'ecommerce';
    }
    if (text.includes('saas') || text.includes('software')) {
      return 'saas';
    }
    
    return 'app'; // Default fallback
  }
}