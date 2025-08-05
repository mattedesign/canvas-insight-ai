import { StrategicBusinessPromptBuilder } from './StrategicBusinessPromptBuilder';
import { AnalysisContext } from '@/types/contextTypes';
import { StrategicBusinessInsights } from '@/types/ux-analysis';
import { supabase } from '@/integrations/supabase/client';

export class StrategicAnalysisService {
  /**
   * Generate strategic business insights using Google Gemini's approach
   * Focuses on business problems rather than UX solutions
   */
  static async generateStrategicInsights(
    context: AnalysisContext,
    analysisData: any
  ): Promise<StrategicBusinessInsights | null> {
    try {
      // Build the strategic business prompt
      const prompt = StrategicBusinessPromptBuilder.buildStrategicPrompt(context, analysisData);
      
      console.log('🎯 Strategic Analysis: Generating business insights using new framework');

      // Call Supabase Edge Function for AI analysis
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          imageUrl: 'strategic-analysis',
          userContext: prompt,
          options: {
            stage: 'strategic',
            model: 'gpt-4o-mini',
            analysisType: 'strategic-business'
          }
        }
      });

      if (error) {
        console.error('Strategic analysis failed:', error);
        return this.generateFallbackInsights(context, analysisData);
      }

      if (data?.strategicInsights) {
        console.log('✅ Strategic insights generated successfully');
        return this.validateAndCleanInsights(data.strategicInsights);
      }

      return this.generateFallbackInsights(context, analysisData);
    } catch (error) {
      console.error('Error generating strategic insights:', error);
      return this.generateFallbackInsights(context, analysisData);
    }
  }

  /**
   * Validate and clean the AI-generated strategic insights
   */
  private static validateAndCleanInsights(insights: any): StrategicBusinessInsights {
    return {
      primaryConcern: insights.primaryConcern || 'Business impact assessment required',
      strategicRecommendation: {
        title: insights.strategicRecommendation?.title || 'Strategic review needed',
        businessJustification: insights.strategicRecommendation?.businessJustification || 
          'Comprehensive analysis required to identify business priorities',
        expectedOutcome: insights.strategicRecommendation?.expectedOutcome || 
          'Improved business performance and competitive positioning'
      }
    };
  }

  /**
   * Generate fallback strategic insights based on available data
   */
  private static generateFallbackInsights(
    context: AnalysisContext, 
    analysisData: any
  ): StrategicBusinessInsights {
    const domainContext = this.getDomainContext(context.image.domain);
    const primaryIssue = analysisData?.summary?.keyIssues?.[0] || 'Interface optimization needed';
    
    return {
      primaryConcern: `${domainContext.challenge}: ${primaryIssue.toLowerCase()} creating friction in critical user workflows`,
      strategicRecommendation: {
        title: domainContext.recommendation,
        businessJustification: domainContext.justification,
        expectedOutcome: domainContext.outcome
      }
    };
  }

  /**
   * Get domain-specific context for fallback insights
   */
  private static getDomainContext(domain: string): {
    challenge: string;
    recommendation: string;
    justification: string;
    outcome: string;
  } {
    const domainContexts: Record<string, any> = {
      finance: {
        challenge: 'Trust and compliance risk',
        recommendation: 'Enhance security perception and regulatory compliance',
        justification: 'Financial interfaces must prioritize user trust and regulatory compliance to prevent customer churn and avoid penalties',
        outcome: 'Increased customer confidence, reduced regulatory risk, and improved conversion rates'
      },
      healthcare: {
        challenge: 'Patient safety and efficiency risk',
        recommendation: 'Optimize care delivery workflows and safety protocols',
        justification: 'Healthcare interfaces directly impact patient outcomes and provider efficiency, making optimization critical for safety and cost control',
        outcome: 'Improved patient outcomes, enhanced provider productivity, and reduced operational costs'
      },
      ecommerce: {
        challenge: 'Revenue leakage through conversion barriers',
        recommendation: 'Eliminate friction in purchase journey',
        justification: 'E-commerce interfaces directly impact revenue through conversion rates, making optimization essential for competitive advantage',
        outcome: 'Increased conversion rates, higher average order value, and improved customer lifetime value'
      },
      enterprise: {
        challenge: 'Productivity loss and adoption barriers',
        recommendation: 'Streamline workflows and reduce training overhead',
        justification: 'Enterprise interfaces affect employee productivity and operational efficiency, impacting bottom-line performance',
        outcome: 'Enhanced employee productivity, reduced training costs, and improved operational efficiency'
      }
    };

    return domainContexts[domain] || {
      challenge: 'Operational efficiency risk',
      recommendation: 'Optimize user experience and operational workflows',
      justification: 'Interface improvements are needed to maintain competitive position and operational efficiency',
      outcome: 'Enhanced user satisfaction, improved operational metrics, and competitive advantage'
    };
  }
}