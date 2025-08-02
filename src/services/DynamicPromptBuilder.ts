import { AnalysisContext, PromptComponents, Citation } from '@/types/contextTypes';
import { pipelineConfig } from '@/config/pipelineConfig';

export class DynamicPromptBuilder {
  private perplexityEnabled: boolean;

  constructor() {
    this.perplexityEnabled = pipelineConfig.perplexity?.enabled || false;
  }

  /**
   * Build context-aware prompts that adapt to image type and user needs
   * THIS IS CRITICAL - NO GENERIC PROMPTS
   */
  async buildContextualPrompt(
    stage: 'vision' | 'analysis' | 'synthesis',
    context: AnalysisContext,
    previousStageData?: any
  ): Promise<string> {
    const components = await this.generatePromptComponents(stage, context);
    
    // Assemble prompt with quality markers
    let prompt = components.contextualBase;
    
    // Add domain-specific requirements
    if (components.domainSpecific) {
      prompt += `\n\n${components.domainSpecific}`;
    }
    
    // Add role-specific focus
    if (components.roleSpecific) {
      prompt += `\n\n${components.roleSpecific}`;
    }
    
    // Add research context if Perplexity is enabled
    if (components.researchContext) {
      prompt += `\n\nCurrent Best Practices & Standards:\n${components.researchContext}`;
    }
    
    // Add focus directives
    if (components.focusDirectives.length > 0) {
      prompt += '\n\nPriority Focus Areas:\n';
      components.focusDirectives.forEach((directive, index) => {
        prompt += `${index + 1}. ${directive}\n`;
      });
    }
    
    // Add output format requirements
    prompt += `\n\n${components.outputFormat}`;
    
    // Add quality markers
    if (components.qualityMarkers.length > 0) {
      prompt += '\n\nQuality Requirements:\n';
      components.qualityMarkers.forEach(marker => {
        prompt += `- ${marker}\n`;
      });
    }
    
    // Add citation requirements if available
    if (components.citations && components.citations.length > 0) {
      prompt += '\n\nProvide citations for recommendations using these sources:\n';
      components.citations.forEach((citation, index) => {
        prompt += `[${index + 1}] ${citation.title} - ${citation.source}\n`;
      });
    }
    
    // Add previous stage context if available
    if (previousStageData) {
      prompt += `\n\nBuilding upon previous analysis:\n${this.summarizePreviousStage(previousStageData)}`;
    }
    
    return prompt;
  }

  private async generatePromptComponents(
    stage: string,
    context: AnalysisContext
  ): Promise<PromptComponents> {
    const components: PromptComponents = {
      contextualBase: '',
      domainSpecific: '',
      roleSpecific: '',
      focusDirectives: [],
      outputFormat: '',
      qualityMarkers: []
    };

    // Generate base prompt based on stage and image type
    components.contextualBase = this.getContextualBase(stage, context);
    
    // Add domain-specific analysis requirements
    components.domainSpecific = this.getDomainSpecificPrompt(context);
    
    // Add role-specific perspectives
    components.roleSpecific = this.getRoleSpecificPrompt(context);
    
    // Generate focus directives
    components.focusDirectives = this.generateFocusDirectives(context);
    
    // Define output format based on user preferences
    components.outputFormat = this.getOutputFormat(stage, context);
    
    // Add quality markers for high-quality output
    components.qualityMarkers = this.getQualityMarkers(context);
    
    // Fetch research context if Perplexity is enabled
    if (this.perplexityEnabled && stage !== 'vision') {
      const research = await this.fetchResearchContext(context);
      if (research) {
        components.researchContext = research.context;
        components.citations = research.citations;
      }
    }
    
    return components;
  }

  /**
   * Fetch relevant research and standards using Perplexity
   */
  private async fetchResearchContext(
    context: AnalysisContext
  ): Promise<{ context: string; citations: Citation[] } | null> {
    if (!this.perplexityEnabled) {
      throw new Error('Research augmentation requires Perplexity API key. Configure PERPLEXITY_API_KEY in Supabase Edge Functions.');
    }

    // Build research query based on context
    const queries = this.buildResearchQueries(context);
    
    // TODO: Implement actual Perplexity API call here
    throw new Error('Perplexity integration not yet implemented. Research augmentation unavailable.');
  }

  private buildResearchQueries(context: AnalysisContext): string[] {
    const queries: string[] = [];
    
    // Interface-specific query
    queries.push(
      `${context.image.primaryType} ${context.image.domain} best practices 2024`
    );
    
    // Standards query
    if (context.industryStandards && context.industryStandards.length > 0) {
      queries.push(
        `${context.industryStandards.join(' ')} compliance requirements latest`
      );
    }
    
    // Focus area queries
    context.focusAreas.forEach(area => {
      queries.push(`${area} optimization ${context.image.primaryType}`);
    });
    
    return queries;
  }

  private getContextualBase(stage: string, context: AnalysisContext): string {
    const { image, user } = context;
    
    const basePrompts: Record<string, Record<string, string>> = {
      vision: {
        dashboard: `Analyze this ${image.domain} dashboard interface with focus on data visualization effectiveness, information hierarchy, and decision-making support. Identify every metric, chart, widget, and interactive element.`,
        
        landing: `Examine this landing page for conversion optimization, messaging clarity, and user journey flow. Map the visual hierarchy, CTAs, trust signals, and persuasion elements.`,
        
        app: `Analyze this application interface for usability, navigation patterns, and feature discoverability. Document the interaction model, state management, and user workflows.`,
        
        form: `Evaluate this form interface for completion rates, error prevention, and user guidance. Assess field organization, validation patterns, and submission flow.`,
        
        ecommerce: `Analyze this e-commerce interface for purchase journey optimization, product presentation, and trust building. Examine the cart flow, payment options, and conversion barriers.`,
        
        mobile: `Examine this mobile interface for touch accessibility, gesture patterns, and mobile-specific optimizations. Consider thumb reach, tap targets, and orientation handling.`,
        
        saas: `Analyze this SaaS interface for onboarding effectiveness, feature adoption, and user retention patterns. Identify upgrade prompts, feature discovery, and engagement mechanics.`,
        
        unknown: `Perform comprehensive UX analysis of this interface, identifying its purpose, user flows, and optimization opportunities.`
      },
      
      analysis: {
        dashboard: `Provide deep insights on data presentation effectiveness, cognitive load management, and actionable intelligence delivery.`,
        
        landing: `Analyze psychological triggers, conversion funnel optimization, and competitive differentiation strategies.`,
        
        app: `Evaluate task completion efficiency, learning curve, and long-term usability patterns.`,
        
        form: `Assess form psychology, completion optimization, and error recovery strategies.`,
        
        ecommerce: `Analyze purchase psychology, cart abandonment factors, and revenue optimization opportunities.`,
        
        mobile: `Evaluate mobile-first design principles, performance implications, and platform-specific optimizations.`,
        
        saas: `Analyze user activation patterns, feature adoption strategies, and churn reduction opportunities.`,
        
        unknown: `Provide comprehensive UX insights covering usability, accessibility, and optimization opportunities.`
      },
      
      synthesis: {
        all: `Synthesize all findings into actionable recommendations prioritized by ${user.outputPreferences?.prioritization || 'impact'}. Create a cohesive improvement strategy that balances user needs, business goals, and technical feasibility.`
      }
    };

    if (stage === 'synthesis') {
      return basePrompts.synthesis.all;
    }
    
    return basePrompts[stage][image.primaryType] || basePrompts[stage].unknown;
  }

  private getDomainSpecificPrompt(context: AnalysisContext): string {
    const { image } = context;
    
    const domainPrompts: Record<string, string> = {
      finance: `Financial Interface Requirements:
- Analyze data accuracy presentation and trust signals
- Evaluate security perception and compliance indicators
- Assess numerical formatting and calculation transparency
- Review regulatory disclosure placement
- Consider risk communication effectiveness`,
      
      healthcare: `Healthcare Interface Requirements:
- Evaluate HIPAA compliance indicators
- Assess patient data privacy signals
- Review accessibility for diverse user capabilities
- Analyze emergency action visibility
- Consider clinical workflow optimization`,
      
      education: `Educational Interface Requirements:
- Analyze learning progression indicators
- Evaluate cognitive load management
- Assess engagement and motivation mechanics
- Review accessibility for diverse learners
- Consider pedagogical effectiveness`,
      
      retail: `Retail Interface Requirements:
- Analyze product discovery patterns
- Evaluate purchase decision support
- Assess inventory and availability communication
- Review promotional effectiveness
- Consider cross-selling opportunities`,
      
      enterprise: `Enterprise Interface Requirements:
- Analyze workflow efficiency patterns
- Evaluate role-based access indicators
- Assess bulk action capabilities
- Review audit trail visibility
- Consider integration touchpoints`
    };
    
    return domainPrompts[image.domain] || '';
  }

  private getRoleSpecificPrompt(context: AnalysisContext): string {
    const { user } = context;
    
    const rolePrompts: Record<string, string> = {
      designer: `Designer Perspective:
- Evaluate visual hierarchy and gestalt principles
- Analyze color theory application and accessibility
- Assess typography system and readability
- Review spacing consistency and visual rhythm
- Consider emotional design impact
- Identify design system opportunities`,
      
      developer: `Developer Perspective:
- Identify component architecture patterns
- Analyze state management implications
- Assess API interaction points
- Review performance optimization opportunities
- Consider code maintainability factors
- Identify technical debt indicators`,
      
      business: `Business Perspective:
- Analyze revenue generation opportunities
- Evaluate conversion funnel optimization
- Assess competitive differentiation
- Review customer acquisition costs impact
- Consider retention and lifetime value
- Identify growth lever opportunities`,
      
      product: `Product Perspective:
- Evaluate feature discovery and adoption
- Analyze user journey completeness
- Assess MVP vs full feature balance
- Review metric tracking opportunities
- Consider roadmap implications
- Identify quick wins vs long-term bets`,
      
      marketing: `Marketing Perspective:
- Analyze messaging effectiveness and clarity
- Evaluate brand consistency and positioning
- Assess lead generation and conversion paths
- Review social proof and trust indicators
- Consider SEO and discoverability factors
- Identify content optimization opportunities`
    };
    
    return rolePrompts[user.inferredRole || 'designer'] || rolePrompts.designer;
  }

  private generateFocusDirectives(context: AnalysisContext): string[] {
    const directives: string[] = [];
    
    // Add focus areas from context
    context.focusAreas.forEach(area => {
      directives.push(`Prioritize ${area} analysis and recommendations`);
    });
    
    // Add domain-specific directives
    if (context.image.domain === 'healthcare') {
      directives.push('Ensure HIPAA compliance considerations are highlighted');
    } else if (context.image.domain === 'finance') {
      directives.push('Focus on security and trust building elements');
    }
    
    // Add user preference directives
    if (context.user.outputPreferences?.prioritization === 'quick-wins') {
      directives.push('Identify low-effort, high-impact improvements');
    } else if (context.user.outputPreferences?.prioritization === 'impact') {
      directives.push('Focus on maximum user impact opportunities');
    }
    
    return directives;
  }

  private getOutputFormat(stage: string, context: AnalysisContext): string {
    const { user } = context;
    
    const formats: Record<string, string> = {
      vision: `Perform comprehensive UX analysis of this interface, identifying its purpose, user flows, and optimization opportunities.

${context.user.inferredRole === 'designer' ? `Designer Perspective:
- Evaluate visual hierarchy and gestalt principles
- Analyze color theory application and accessibility
- Assess typography system and readability
- Review spacing consistency and visual rhythm
- Consider emotional design impact
- Identify design system opportunities

` : ''}Return analysis as structured JSON with:
{
  "elements": { /* UI elements detected */ },
  "layout": { /* Grid, spacing, hierarchy */ },
  "colors": { /* Color palette and usage */ },
  "content": { /* Text content and headings */ },
  "interactions": { /* Buttons, links, forms */ },
  "confidence": { /* Detection confidence scores */ }
}`,
      
      analysis: `Provide comprehensive UX insights covering usability, accessibility, and optimization opportunities.

${context.user.inferredRole === 'designer' ? `Designer Perspective:
- Evaluate visual hierarchy and gestalt principles
- Analyze color theory application and accessibility
- Assess typography system and readability
- Review spacing consistency and visual rhythm
- Consider emotional design impact
- Identify design system opportunities

` : ''}Provide insights as structured JSON with:
{
  "usabilityIssues": [{ "severity": "high|medium|low", "category": "", "description": "", "recommendation": "" }],
  "accessibilityFindings": [{ "wcagLevel": "AA|AAA", "guideline": "", "issue": "", "solution": "" }],
  "designOpportunities": [{ "area": "", "current": "", "improvement": "", "impact": "high|medium|low" }],
  "businessImpact": { "conversionOpportunities": [], "userExperienceScore": 0.0, "competitiveAdvantages": [] },
  "technicalConsiderations": [{ "area": "", "recommendation": "", "effort": "low|medium|high" }]
}`,
      
      synthesis: `Synthesize all findings into actionable recommendations prioritized by effort. Create a cohesive improvement strategy that balances user needs, business goals, and technical feasibility.

${context.user.inferredRole === 'designer' ? `Designer Perspective:
- Evaluate visual hierarchy and gestalt principles
- Analyze color theory application and accessibility
- Assess typography system and readability
- Review spacing consistency and visual rhythm
- Consider emotional design impact
- Identify design system opportunities

` : ''}Create final recommendations as JSON:
{
  "executiveSummary": "Brief overview of key findings",
  "prioritizedActions": [{ "title": "", "description": "", "priority": "critical|high|medium|low", "effort": "", "impact": "", "timeline": "" }],
  "visualAnnotations": [{ "element": "", "x": 0, "y": 0, "issue": "", "recommendation": "" }],
  "implementationRoadmap": { "immediate": [], "shortTerm": [], "longTerm": [] },
  "successMetrics": [{ "metric": "", "currentState": "", "targetState": "", "measurement": "" }],
  "summary": {
    "overallScore": 0,
    "keyIssues": ["Most critical issues found"],
    "keyOpportunities": ["Highest impact improvements"],
    "confidenceScore": 0.85
  }
}`
    };
    
    // Ensure all prompts explicitly mention JSON formatting
    let baseFormat = formats[stage];
    
    // Adjust format based on user technical level
    if (user.technicalLevel === 'non-technical') {
      baseFormat += '\n\nUse simple, non-technical language and provide clear explanations.';
    } else if (user.technicalLevel === 'technical') {
      baseFormat += '\n\nInclude detailed technical specifications and advanced implementation guidance.';
    }
    
    // CRITICAL: Ensure the word "json" appears in the prompt for OpenAI compatibility
    if (!baseFormat.toLowerCase().includes('json')) {
      baseFormat += '\n\nPlease format your response as JSON.';
    }
    
    return baseFormat;
  }

  private getQualityMarkers(context: AnalysisContext): string[] {
    const markers: string[] = [
      'Provide specific, measurable recommendations',
      'Include confidence scores for all assessments',
      'Reference established UX principles and guidelines',
      'Consider both user needs and business objectives'
    ];
    
    // Add context-specific markers
    if (context.industryStandards && context.industryStandards.length > 0) {
      markers.push(`Ensure compliance with ${context.industryStandards.join(', ')} standards`);
    }
    
    if (context.user.outputPreferences?.prioritization) {
      markers.push(`Prioritize recommendations by ${context.user.outputPreferences.prioritization}`);
    }
    
    return markers;
  }

  private summarizePreviousStage(data: any): string {
    if (!data) return 'No previous stage data available';
    
    try {
      // Create a concise summary of key findings
      const summary = [];
      
      if (data.elements) {
        summary.push(`Elements detected: ${Object.keys(data.elements).length} categories`);
      }
      
      if (data.usabilityIssues) {
        summary.push(`Usability issues found: ${data.usabilityIssues.length}`);
      }
      
      if (data.confidence) {
        summary.push(`Analysis confidence: ${Math.round(data.confidence.overall * 100)}%`);
      }
      
      return summary.join(', ') || 'Previous analysis completed successfully';
    } catch (error) {
      return 'Previous stage data available but not parseable';
    }
  }
}