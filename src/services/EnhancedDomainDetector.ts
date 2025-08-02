/**
 * Enhanced Domain Detection Service
 * Analyzes image names, file paths, and user context to identify UI types
 */

export interface DomainAnalysis {
  detectedDomain: string;
  confidence: number;
  uiType: string;
  characteristics: string[];
  recommendedPrompts: string[];
}

export interface DomainPattern {
  keywords: string[];
  domain: string;
  uiType: string;
  characteristics: string[];
  weight: number;
}

export class EnhancedDomainDetector {
  private domainPatterns: DomainPattern[] = [
    // Authentication & Login
    {
      keywords: ['login', 'signin', 'signup', 'register', 'auth', 'password', 'forgot', 'reset'],
      domain: 'authentication',
      uiType: 'Authentication Flow',
      characteristics: ['Form validation', 'Security indicators', 'Error messaging', 'Social login'],
      weight: 10
    },
    
    // Dashboard & Analytics
    {
      keywords: ['dashboard', 'analytics', 'metrics', 'charts', 'stats', 'overview', 'kpi'],
      domain: 'dashboard',
      uiType: 'Dashboard Interface',
      characteristics: ['Data visualization', 'KPI metrics', 'Navigation hierarchy', 'Quick actions'],
      weight: 9
    },
    
    // E-commerce
    {
      keywords: ['product', 'cart', 'checkout', 'payment', 'shop', 'store', 'price', 'buy'],
      domain: 'ecommerce',
      uiType: 'E-commerce Interface',
      characteristics: ['Product display', 'Shopping flow', 'Trust indicators', 'Call-to-action'],
      weight: 8
    },
    
    // Forms & Data Entry
    {
      keywords: ['form', 'submit', 'input', 'field', 'validation', 'survey', 'questionnaire'],
      domain: 'forms',
      uiType: 'Form Interface',
      characteristics: ['Field organization', 'Validation feedback', 'Progress indication', 'Error handling'],
      weight: 7
    },
    
    // Social Media & Community
    {
      keywords: ['social', 'profile', 'feed', 'post', 'comment', 'like', 'share', 'follow'],
      domain: 'social',
      uiType: 'Social Interface',
      characteristics: ['Content feeds', 'User interactions', 'Social proof', 'Engagement patterns'],
      weight: 8
    },
    
    // Content Management
    {
      keywords: ['admin', 'cms', 'editor', 'content', 'manage', 'publish', 'draft'],
      domain: 'cms',
      uiType: 'Content Management',
      characteristics: ['Content hierarchy', 'Editing tools', 'Workflow status', 'Publishing controls'],
      weight: 7
    },
    
    // Landing Pages
    {
      keywords: ['landing', 'hero', 'cta', 'feature', 'pricing', 'testimonial', 'marketing'],
      domain: 'landing',
      uiType: 'Landing Page',
      characteristics: ['Value proposition', 'Social proof', 'Clear CTA', 'Conversion optimization'],
      weight: 6
    },
    
    // Mobile Apps
    {
      keywords: ['mobile', 'app', 'swipe', 'tap', 'gesture', 'navigation', 'tab'],
      domain: 'mobile',
      uiType: 'Mobile Application',
      characteristics: ['Touch targets', 'Gesture navigation', 'Responsive design', 'Mobile patterns'],
      weight: 8
    },
    
    // SaaS Applications
    {
      keywords: ['saas', 'settings', 'config', 'workspace', 'team', 'subscription', 'billing'],
      domain: 'saas',
      uiType: 'SaaS Application',
      characteristics: ['User onboarding', 'Feature discovery', 'Settings organization', 'Upgrade flows'],
      weight: 7
    }
  ];

  /**
   * Analyze domain from multiple sources
   */
  detectDomain(imageName: string, userContext?: string, filePath?: string): DomainAnalysis {
    const text = this.combineAnalysisText(imageName, userContext, filePath);
    const matches = this.findDomainMatches(text);
    
    if (matches.length === 0) {
      throw new Error('No domain patterns matched for the provided input. Ensure input contains recognizable UI/domain keywords.');
    }

    // Get the highest confidence match
    const bestMatch = matches[0];
    
    return {
      detectedDomain: bestMatch.domain,
      confidence: bestMatch.confidence,
      uiType: bestMatch.pattern.uiType,
      characteristics: bestMatch.pattern.characteristics,
      recommendedPrompts: this.generateDomainPrompts(bestMatch.pattern)
    };
  }

  /**
   * Combine all available text for analysis
   */
  private combineAnalysisText(imageName: string, userContext?: string, filePath?: string): string {
    const parts = [
      imageName?.toLowerCase() || '',
      userContext?.toLowerCase() || '',
      filePath?.toLowerCase() || ''
    ].filter(Boolean);
    
    return parts.join(' ');
  }

  /**
   * Find matching domain patterns and calculate confidence
   */
  private findDomainMatches(text: string): Array<{ pattern: DomainPattern; confidence: number; domain: string }> {
    const matches = this.domainPatterns.map(pattern => {
      const matchCount = pattern.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      ).length;
      
      const confidence = Math.min((matchCount / pattern.keywords.length) * pattern.weight * 10, 100);
      
      return {
        pattern,
        confidence,
        domain: pattern.domain
      };
    }).filter(match => match.confidence > 10);

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate domain-specific prompts
   */
  private generateDomainPrompts(pattern: DomainPattern): string[] {
    const basePrompts = [
      `Focus on ${pattern.uiType.toLowerCase()} best practices`,
      `Evaluate the effectiveness of this ${pattern.uiType.toLowerCase()}`,
      `Check for industry-standard patterns in this ${pattern.uiType.toLowerCase()}`
    ];

    const specificPrompts = pattern.characteristics.map(char => 
      `Analyze ${char.toLowerCase()} implementation`
    );

    return [...basePrompts, ...specificPrompts].slice(0, 5);
  }

  /**
   * Create fallback analysis for unknown domains
   */
  private createFallbackAnalysis(): DomainAnalysis {
    return {
      detectedDomain: 'general',
      confidence: 50,
      uiType: 'General Interface',
      characteristics: ['Visual hierarchy', 'Usability principles', 'Accessibility standards'],
      recommendedPrompts: [
        'Analyze general usability principles',
        'Check visual hierarchy effectiveness',
        'Evaluate accessibility compliance',
        'Review interaction patterns'
      ]
    };
  }

  /**
   * Get domain-specific analysis instructions
   */
  getDomainInstructions(domain: string): string {
    const instructions = {
      authentication: `
        Focus on authentication UX patterns:
        - Form field clarity and validation
        - Error message effectiveness
        - Security indicators and trust building
        - Progressive disclosure for complex flows
        - Social login integration
        - Password strength indicators
      `,
      dashboard: `
        Focus on dashboard design patterns:
        - Information hierarchy and organization
        - Data visualization effectiveness
        - Quick action accessibility
        - Navigation clarity
        - Performance metrics visibility
        - Customization capabilities
      `,
      ecommerce: `
        Focus on e-commerce UX patterns:
        - Product discovery and browsing
        - Trust signals and social proof
        - Cart and checkout flow
        - Payment security indicators
        - Product information clarity
        - Conversion optimization
      `,
      forms: `
        Focus on form design patterns:
        - Field organization and grouping
        - Validation feedback timing
        - Error message clarity
        - Progress indication
        - Input method optimization
        - Accessibility compliance
      `,
      social: `
        Focus on social interface patterns:
        - Content feed organization
        - Interaction affordances
        - Social proof elements
        - User profile presentation
        - Engagement patterns
        - Privacy considerations
      `,
      mobile: `
        Focus on mobile interface patterns:
        - Touch target sizing
        - Gesture navigation
        - Screen size optimization
        - Thumb-friendly interactions
        - Loading states
        - Offline considerations
      `,
      landing: `
        Focus on landing page patterns:
        - Value proposition clarity
        - Call-to-action prominence
        - Social proof presentation
        - Feature benefit communication
        - Conversion funnel optimization
        - Trust building elements
      `
    };

    return instructions[domain] || instructions['general'] || `
      Focus on general UX principles:
      - Visual hierarchy and layout
      - Usability and accessibility
      - Interaction patterns
      - Content organization
      - User flow optimization
    `;
  }
}

export const enhancedDomainDetector = new EnhancedDomainDetector();