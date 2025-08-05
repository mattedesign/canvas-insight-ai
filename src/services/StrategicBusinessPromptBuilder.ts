import { AnalysisContext } from '@/types/contextTypes';

export class StrategicBusinessPromptBuilder {
  /**
   * Generate strategic business analysis prompt using Google Gemini's approach
   * Focuses on the single biggest business problem rather than generic solutions
   */
  static buildStrategicPrompt(context: AnalysisContext, analysisData: any): string {
    const basePrompt = `You are a senior business strategist with 15+ years of experience helping companies identify their core challenges and transform them into competitive advantages.

Your task is not to find solutions, but to define the SINGLE BIGGEST business problem this interface creates for the organization. Think like a consultant who charges $500/hour - be strategic, not tactical.

Interface Context:
- Type: ${context.image.primaryType}
- Domain: ${context.image.domain}
- User Role: ${context.user.inferredRole || 'business stakeholder'}

Analysis Data Available:
${this.formatAnalysisDataForContext(analysisData)}

Your Strategic Framework:

1. PROBLEM IDENTIFICATION (Not Solution Finding)
   - What is the ONE business problem that, if solved, would have the biggest impact?
   - Think revenue, competitive position, customer retention, market share
   - Avoid tactical UX issues - focus on business impact

2. BUSINESS JUSTIFICATION
   - Why is this THE problem to solve right now?
   - What business context makes this critical?
   - How does this connect to broader organizational goals?

3. QUALITATIVE OUTCOME VISION
   - What changes when this problem is solved?
   - How does the business fundamentally improve?
   - What new capabilities or advantages emerge?

Return your analysis as JSON with EXACTLY this structure:
{
  "primaryConcern": "The single biggest business problem this interface creates (one clear sentence)",
  "strategicRecommendation": {
    "title": "Strategic intervention needed (action-oriented title)",
    "businessJustification": "Why this is the right business priority right now (2-3 sentences)",
    "expectedOutcome": "Qualitative transformation when solved (what fundamentally changes for the business)"
  }
}

Remember: You're a business strategist, not a UX designer. Focus on business problems, not interface problems.`;

    return this.addDomainSpecificContext(basePrompt, context);
  }

  private static formatAnalysisDataForContext(analysisData: any): string {
    if (!analysisData) return "No previous analysis available";

    let summary = "";
    
    if (analysisData.usabilityIssues?.length > 0) {
      summary += `\nKey Usability Issues: ${analysisData.usabilityIssues.slice(0, 3).map((issue: any) => issue.description).join('; ')}`;
    }
    
    if (analysisData.businessImpact) {
      summary += `\nBusiness Impact Notes: ${JSON.stringify(analysisData.businessImpact)}`;
    }
    
    if (analysisData.summary?.keyIssues?.length > 0) {
      summary += `\nCritical Issues: ${analysisData.summary.keyIssues.slice(0, 3).join('; ')}`;
    }

    return summary || "General UX analysis completed";
  }

  private static addDomainSpecificContext(prompt: string, context: AnalysisContext): string {
    const domainContext: Record<string, string> = {
      finance: `
Financial Services Context:
- Consider regulatory compliance costs and audit risks
- Think about customer trust and security perception
- Focus on transaction completion rates and error costs
- Consider competitive pressure from fintech disruption`,

      healthcare: `
Healthcare Context:
- Consider patient safety and compliance risks
- Think about provider efficiency and patient satisfaction
- Focus on care delivery effectiveness and operational costs
- Consider regulatory requirements and liability concerns`,

      ecommerce: `
E-commerce Context:
- Consider conversion rates and cart abandonment costs
- Think about customer acquisition cost vs lifetime value
- Focus on competitive differentiation and market share
- Consider seasonal revenue impact and growth scalability`,

      enterprise: `
Enterprise Context:
- Consider employee productivity and training costs
- Think about process efficiency and operational overhead
- Focus on adoption rates and change management
- Consider integration costs and technical debt`,

      education: `
Education Context:
- Consider learning outcomes and engagement metrics
- Think about instructor efficiency and content effectiveness
- Focus on student retention and satisfaction
- Consider scalability and resource allocation`
    };

    const contextAddition = domainContext[context.image.domain];
    if (contextAddition) {
      return prompt + contextAddition;
    }

    return prompt;
  }
}