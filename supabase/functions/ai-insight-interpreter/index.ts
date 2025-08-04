import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * AI Insight Interpreter - Processes natural AI responses into relevant insights
 * This meta-analysis AI synthesizes raw insights from multiple models and generates
 * domain-appropriate, actionable recommendations for the UI.
 */

interface InterpreterRequest {
  rawResponses: Array<{
    model: string;
    response: string;
    confidence: number;
    processingTime: number;
    error?: string;
  }>;
  analysisContext?: any;
  userContext?: string;
  imageUrl?: string;
}

interface InterpretedInsight {
  category: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  suggestions: string[];
  sourceModels: string[];
}

interface InterpreterResult {
  insights: InterpretedInsight[];
  summary: {
    overallAssessment: string;
    keyStrengths: string[];
    criticalIssues: string[];
    recommendedActions: string[];
    confidenceScore: number;
  };
  domainSpecificFindings: Record<string, any>;
  metadata: {
    totalInsights: number;
    interpretationTime: number;
    sourceModels: string[];
    timestamp: string;
  };
}

/**
 * Generate context-aware interpretation prompt
 */
function generateInterpreterPrompt(rawResponses: any[], analysisContext?: any, userContext?: string): string {
  const interfaceType = analysisContext?.image?.primaryType || 'interface';
  const domain = analysisContext?.domain || 'general';
  const userRole = analysisContext?.user?.inferredRole || 'general user';

  let prompt = `You are a meta-analysis AI that specializes in interpreting UX/UI analysis from multiple AI models. Your job is to synthesize the following raw insights and generate relevant, actionable findings.

CONTEXT:
- Interface Type: ${interfaceType}
- Domain: ${domain}
- User Role/Perspective: ${userRole}`;

  if (userContext) {
    prompt += `
- User Context: ${userContext}`;
  }

  prompt += `

RAW AI RESPONSES TO INTERPRET:
`;

  rawResponses.forEach((response, index) => {
    if (response.response && !response.error) {
      prompt += `
--- ${response.model.toUpperCase()} ANALYSIS ---
${response.response}

`;
    }
  });

  prompt += `
INTERPRETATION INSTRUCTIONS:

1. EXTRACT GENUINE INSIGHTS: Look for specific, actionable observations about the interface. Ignore generic or vague statements.

2. CATEGORIZE BY RELEVANCE: Focus on insights that are actually relevant to a ${interfaceType} in the ${domain} domain.

3. PRIORITIZE BY IMPACT: Identify which insights would have the most meaningful impact on user experience.

4. CONSIDER USER PERSPECTIVE: Adapt the insights to be relevant for a ${userRole}.

5. SYNTHESIZE CONSENSUS: When multiple models agree on something, give it higher confidence.

6. DOMAIN-SPECIFIC FOCUS: Pay special attention to ${domain}-specific best practices and standards.

Please provide a JSON response with this structure:
{
  "insights": [
    {
      "category": "usability|accessibility|visual|content|performance|domain-specific",
      "title": "Brief, specific title",
      "description": "Detailed explanation of what was observed and why it matters",
      "severity": "low|medium|high",
      "confidence": 0.0-1.0,
      "actionable": true/false,
      "suggestions": ["Specific action items"],
      "sourceModels": ["model1", "model2"]
    }
  ],
  "summary": {
    "overallAssessment": "High-level assessment of the interface",
    "keyStrengths": ["What works well"],
    "criticalIssues": ["Most important problems to address"],
    "recommendedActions": ["Top priority actions"],
    "confidenceScore": 0.0-1.0
  },
  "domainSpecificFindings": {
    "${domain}": {
      "specificInsights": ["Domain-specific observations"],
      "industryStandards": ["Relevant standards compliance"],
      "bestPractices": ["Domain-specific recommendations"]
    }
  }
}

Focus on quality over quantity. Better to have fewer, highly relevant insights than many generic ones.`;

  return prompt;
}

/**
 * Execute interpretation with OpenAI
 */
async function interpretWithOpenAI(prompt: string): Promise<any> {
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert UX/UI analysis interpreter. You excel at synthesizing insights from multiple AI models and generating actionable, domain-specific recommendations. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.3, // Lower temperature for more consistent, analytical responses
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI interpretation error:', error);
    throw error;
  }
}

/**
 * Execute interpretation with Claude
 */
async function interpretWithClaude(prompt: string): Promise<any> {
  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nPlease respond with valid JSON only.'
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude interpretation error:', error);
    throw error;
  }
}

/**
 * Create fallback interpretation when AI interpretation fails
 */
function createFallbackInterpretation(rawResponses: any[], analysisContext?: any): InterpreterResult {
  const successfulResponses = rawResponses.filter(r => !r.error && r.response);
  
  return {
    insights: [
      {
        category: 'general',
        title: 'Analysis Available',
        description: 'Multiple AI models have provided insights about this interface. Please review the detailed findings.',
        severity: 'medium' as const,
        confidence: 0.6,
        actionable: false,
        suggestions: ['Review detailed AI analysis', 'Consider running additional analysis'],
        sourceModels: successfulResponses.map(r => r.model)
      }
    ],
    summary: {
      overallAssessment: 'Interface analysis completed with multiple AI model insights available.',
      keyStrengths: ['Analysis data available'],
      criticalIssues: ['Requires manual review'],
      recommendedActions: ['Review AI responses', 'Extract actionable insights'],
      confidenceScore: 0.5
    },
    domainSpecificFindings: {
      general: {
        specificInsights: ['Multiple AI models provided analysis'],
        industryStandards: ['Standard UX principles apply'],
        bestPractices: ['Consider professional UX review']
      }
    },
    metadata: {
      totalInsights: 1,
      interpretationTime: 0,
      sourceModels: successfulResponses.map(r => r.model),
      timestamp: new Date().toISOString()
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: InterpreterRequest = await req.json();
    const { rawResponses, analysisContext, userContext } = requestData;

    if (!rawResponses || !Array.isArray(rawResponses)) {
      return new Response(
        JSON.stringify({ error: 'Raw responses array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('🧠 AI Insight Interpreter starting:', {
      totalResponses: rawResponses.length,
      successfulResponses: rawResponses.filter(r => !r.error).length,
      hasAnalysisContext: !!analysisContext,
      hasUserContext: !!userContext
    });

    const startTime = Date.now();

    // Filter out failed responses
    const validResponses = rawResponses.filter(r => !r.error && r.response);
    
    if (validResponses.length === 0) {
      console.warn('⚠️ No valid responses to interpret');
      const fallback = createFallbackInterpretation(rawResponses, analysisContext);
      return new Response(
        JSON.stringify(fallback),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const interpreterPrompt = generateInterpreterPrompt(validResponses, analysisContext, userContext);
    
    let interpretedResult: any = null;
    let interpreterUsed = '';

    // Try OpenAI first, then Claude as fallback
    try {
      console.log('🧠 Using OpenAI for interpretation...');
      interpretedResult = await interpretWithOpenAI(interpreterPrompt);
      interpreterUsed = 'openai';
    } catch (openaiError) {
      console.warn('⚠️ OpenAI interpretation failed, trying Claude:', openaiError.message);
      
      try {
        console.log('🧠 Using Claude for interpretation...');
        interpretedResult = await interpretWithClaude(interpreterPrompt);
        interpreterUsed = 'claude';
      } catch (claudeError) {
        console.error('❌ Both interpretation models failed:', {
          openaiError: openaiError.message,
          claudeError: claudeError.message
        });
        
        const fallback = createFallbackInterpretation(rawResponses, analysisContext);
        return new Response(
          JSON.stringify(fallback),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const interpretationTime = Date.now() - startTime;

    // Enhance the result with metadata
    const enhancedResult: InterpreterResult = {
      ...interpretedResult,
      metadata: {
        totalInsights: interpretedResult.insights?.length || 0,
        interpretationTime,
        sourceModels: validResponses.map(r => r.model),
        timestamp: new Date().toISOString(),
        interpreterUsed
      }
    };

    console.log('🧠 AI Insight Interpreter completed:', {
      interpreterUsed,
      totalInsights: enhancedResult.insights?.length || 0,
      confidenceScore: enhancedResult.summary?.confidenceScore || 0,
      interpretationTime,
      sourceModels: enhancedResult.metadata.sourceModels
    });

    return new Response(
      JSON.stringify(enhancedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ AI Insight Interpreter error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Insight interpretation failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});