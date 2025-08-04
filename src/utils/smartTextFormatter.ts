/**
 * Smart Text Formatter for Converting JSON Analysis to Human-Readable Text
 */

interface AnalysisFindings {
  domain?: string;
  screen_type?: string;
  findings?: any;
  suggestions?: any[];
  issues?: any[];
  recommendations?: any[];
}

export class SmartTextFormatter {
  /**
   * Converts structured analysis data to natural language descriptions
   */
  static formatAnalysisDescription(data: any): string {
    if (!data || typeof data !== 'object') {
      return 'Analysis data not available';
    }

    // Handle different data structures
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return data;
      }
    }

    // Extract key information
    const domain = data.domain || data.detectedDomain || 'general';
    const screenType = data.screen_type || data.screenType || data.interfaceType || 'interface';
    const findings = data.findings || data.analysis || data;

    let description = '';

    // Start with domain and screen type context
    description += this.formatContextIntro(domain, screenType);

    // Add main findings
    if (findings) {
      description += this.formatFindings(findings, domain);
    }

    // Add suggestions if available
    if (data.suggestions && Array.isArray(data.suggestions)) {
      description += this.formatSuggestions(data.suggestions);
    }

    return description.trim();
  }

  /**
   * Formats the context introduction based on domain and screen type
   */
  private static formatContextIntro(domain: string, screenType: string): string {
    const domainLabels: Record<string, string> = {
      ecommerce: 'e-commerce',
      finance: 'financial',
      healthcare: 'healthcare',
      education: 'educational',
      saas: 'SaaS',
      portfolio: 'portfolio',
      blog: 'blog',
      general: 'web'
    };

    const screenLabels: Record<string, string> = {
      landing_page: 'landing page',
      product_page: 'product page',
      checkout: 'checkout flow',
      dashboard: 'dashboard',
      form: 'form interface',
      navigation: 'navigation',
      mobile_app: 'mobile application',
      desktop_app: 'desktop application'
    };

    const domainLabel = domainLabels[domain.toLowerCase()] || domain;
    const screenLabel = screenLabels[screenType.toLowerCase()] || screenType;

    return `This ${domainLabel} ${screenLabel} analysis reveals several key insights. `;
  }

  /**
   * Formats findings based on domain-specific patterns
   */
  private static formatFindings(findings: any, domain: string): string {
    let result = '';

    // Handle different finding structures
    if (typeof findings === 'string') {
      return findings + ' ';
    }

    // E-commerce specific formatting
    if (domain.toLowerCase().includes('ecommerce') || domain.toLowerCase().includes('commerce')) {
      result += this.formatEcommerceFindings(findings);
    }
    // Finance specific formatting
    else if (domain.toLowerCase().includes('finance') || domain.toLowerCase().includes('banking')) {
      result += this.formatFinanceFindings(findings);
    }
    // General formatting
    else {
      result += this.formatGeneralFindings(findings);
    }

    return result;
  }

  /**
   * Formats e-commerce specific findings
   */
  private static formatEcommerceFindings(findings: any): string {
    let result = '';

    // Common e-commerce patterns
    if (findings.cart_optimization || findings.checkout_optimization) {
      result += 'The shopping experience shows opportunities for cart and checkout optimization. ';
    }

    if (findings.product_presentation || findings.product_display) {
      result += 'Product presentation and display elements could be enhanced for better user engagement. ';
    }

    if (findings.trust_signals || findings.security_indicators) {
      result += 'Trust signals and security indicators are important for customer confidence. ';
    }

    if (findings.mobile_experience || findings.responsive_design) {
      result += 'Mobile shopping experience requires attention for optimal conversion rates. ';
    }

    // Extract specific insights from the findings object
    const insights = this.extractInsights(findings);
    if (insights.length > 0) {
      result += insights.join(' ') + ' ';
    }

    return result;
  }

  /**
   * Formats finance specific findings
   */
  private static formatFinanceFindings(findings: any): string {
    let result = '';

    if (findings.security || findings.compliance) {
      result += 'Security and compliance considerations are critical for financial interfaces. ';
    }

    if (findings.data_visualization || findings.dashboard_design) {
      result += 'Data visualization and dashboard design impact user decision-making. ';
    }

    const insights = this.extractInsights(findings);
    if (insights.length > 0) {
      result += insights.join(' ') + ' ';
    }

    return result;
  }

  /**
   * Formats general findings for any domain
   */
  private static formatGeneralFindings(findings: any): string {
    let result = '';

    // Common UX patterns
    if (findings.usability || findings.user_experience) {
      result += 'Usability and user experience elements show potential for improvement. ';
    }

    if (findings.accessibility || findings.wcag_compliance) {
      result += 'Accessibility compliance and inclusive design practices should be considered. ';
    }

    if (findings.visual_hierarchy || findings.design_consistency) {
      result += 'Visual hierarchy and design consistency affect user comprehension. ';
    }

    if (findings.performance || findings.loading_experience) {
      result += 'Performance and loading experience impact user satisfaction. ';
    }

    const insights = this.extractInsights(findings);
    if (insights.length > 0) {
      result += insights.join(' ') + ' ';
    }

    return result;
  }

  /**
   * Extracts actionable insights from findings object
   */
  private static extractInsights(findings: any): string[] {
    const insights: string[] = [];

    // Look for specific patterns in the data
    Object.entries(findings).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 10 && value.length < 200) {
        // Clean up the insight text
        const insight = this.cleanInsightText(value);
        if (insight && !insight.includes('{') && !insight.includes('[')) {
          insights.push(insight);
        }
      } else if (typeof value === 'object' && value && !Array.isArray(value)) {
        // Recursively extract from nested objects
        const nestedInsights = this.extractInsights(value);
        insights.push(...nestedInsights);
      }
    });

    return insights.slice(0, 3); // Limit to 3 insights to avoid overwhelming
  }

  /**
   * Cleans and formats insight text
   */
  private static cleanInsightText(text: string): string {
    // Remove common technical prefixes/suffixes
    let cleaned = text.replace(/^(finding|insight|recommendation|suggestion):\s*/i, '');
    cleaned = cleaned.replace(/\s*(\.|\,)$/, '');
    
    // Ensure proper capitalization
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Ensure it ends with proper punctuation
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    return cleaned;
  }

  /**
   * Formats suggestions into actionable recommendations
   */
  private static formatSuggestions(suggestions: any[]): string {
    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      return '';
    }

    let result = 'Key recommendations include: ';
    
    const formattedSuggestions = suggestions
      .slice(0, 3) // Limit to top 3 suggestions
      .map(suggestion => {
        if (typeof suggestion === 'string') {
          return this.cleanInsightText(suggestion);
        } else if (suggestion && suggestion.text) {
          return this.cleanInsightText(suggestion.text);
        } else if (suggestion && suggestion.description) {
          return this.cleanInsightText(suggestion.description);
        }
        return null;
      })
      .filter(Boolean);

    if (formattedSuggestions.length > 0) {
      result += formattedSuggestions.join(', ') + '.';
    } else {
      result = ''; // Remove the intro if no valid suggestions
    }

    return result;
  }

  /**
   * Fallback formatter for malformed data
   */
  static formatFallback(data: any): string {
    if (!data) {
      return 'Analysis data is not available at this time.';
    }

    if (typeof data === 'string') {
      // If it's already a string, try to clean it up
      if (data.includes('{') || data.includes('[')) {
        return 'Analysis completed with technical findings available for review.';
      }
      return data;
    }

    return 'Analysis completed. Please review the detailed findings in the analysis panel.';
  }
}