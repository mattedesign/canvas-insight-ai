import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

interface GroupAnalysisRequest {
  imageUrls: string[];
  prompt: string;
  userContext?: string;
  groupId?: string;
  groupName?: string;
}

interface ImageAnalysisResult {
  url: string;
  analysis: any;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Group UX Analysis function called');
    
    const body: GroupAnalysisRequest = await req.json();
    console.log('Request body:', {
      imageUrlsCount: body.imageUrls?.length || 0,
      hasPrompt: !!body.prompt,
      groupId: body.groupId,
      groupName: body.groupName
    });

    // Validate input
    if (!body.imageUrls || !Array.isArray(body.imageUrls) || body.imageUrls.length === 0) {
      throw new Error('imageUrls is required and must be a non-empty array');
    }

    if (!body.prompt) {
      throw new Error('prompt is required');
    }

    // Validate image URLs
    const validImageUrls = body.imageUrls.filter(url => 
      url && typeof url === 'string' && url.trim() !== ''
    );

    if (validImageUrls.length === 0) {
      throw new Error('No valid image URLs provided');
    }

    console.log(`Processing ${validImageUrls.length} valid image URLs`);

    // Step 1: Analyze each image individually
    const individualAnalyses: ImageAnalysisResult[] = [];
    
    for (let i = 0; i < validImageUrls.length; i++) {
      const imageUrl = validImageUrls[i];
      console.log(`Analyzing image ${i + 1}/${validImageUrls.length}`);
      
      try {
        const analysis = await analyzeIndividualImage(imageUrl, body.prompt, body.userContext);
        individualAnalyses.push({
          url: imageUrl,
          analysis
        });
        console.log(`Successfully analyzed image ${i + 1}`);
      } catch (error) {
        console.error(`Failed to analyze image ${i + 1}:`, error);
        individualAnalyses.push({
          url: imageUrl,
          analysis: null,
          error: error.message
        });
      }
    }

    // Step 2: Synthesize group insights using AI
    console.log('Synthesizing group insights from individual analyses');
    const groupAnalysis = await synthesizeGroupInsights(
      individualAnalyses,
      body.prompt,
      body.userContext,
      body.groupName
    );

    // Try to convert AI response into structured JSON for UI
    const stripCodeFences = (input: string) =>
      (input || '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    let structuredAnalysis: any = null;
    try {
      const raw = (groupAnalysis as any)?.groupInsights as string;
      structuredAnalysis = JSON.parse(stripCodeFences(raw));
    } catch (e) {
      console.error('Failed to parse structured group analysis JSON');
      throw new Error('AI did not return valid JSON for group analysis synthesis');
    }

    const toScore = (v: any) => {
      const n = Math.round(Number(v));
      if (Number.isNaN(n)) return 0;
      return Math.max(0, Math.min(100, n));
    };

    const normalizedGroupAnalysis = {
      sessionId: body.groupId || 'session_group',
      groupId: body.groupId || 'group',
      prompt: body.prompt,
      summary: {
        overallScore: toScore(structuredAnalysis?.summary?.overallScore),
        consistency: toScore(structuredAnalysis?.summary?.consistency),
        thematicCoherence: toScore(structuredAnalysis?.summary?.thematicCoherence),
        userFlowContinuity: toScore(structuredAnalysis?.summary?.userFlowContinuity),
      },
      insights: Array.isArray(structuredAnalysis?.insights) ? structuredAnalysis.insights : [],
      recommendations: Array.isArray(structuredAnalysis?.recommendations) ? structuredAnalysis.recommendations : [],
      patterns: {
        commonElements: Array.isArray(structuredAnalysis?.patterns?.commonElements) ? structuredAnalysis.patterns.commonElements : [],
        designInconsistencies: Array.isArray(structuredAnalysis?.patterns?.designInconsistencies) ? structuredAnalysis.patterns.designInconsistencies : [],
        userJourneyGaps: Array.isArray(structuredAnalysis?.patterns?.userJourneyGaps) ? structuredAnalysis.patterns.userJourneyGaps : [],
      },
      createdAt: new Date().toISOString(),
    };

    const result = {
      success: true,
      groupAnalysis: normalizedGroupAnalysis,
      individualAnalyses: individualAnalyses.map(result => ({
        url: result.url,
        hasAnalysis: !!result.analysis,
        error: result.error
      })),
      metadata: {
        totalImages: validImageUrls.length,
        successfulAnalyses: individualAnalyses.filter(r => !r.error).length,
        processingTime: Date.now()
      }
    };

    console.log('Group analysis completed successfully');
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Group analysis error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Analyze a single image using OpenAI GPT-4 Vision
 */
async function analyzeIndividualImage(imageUrl: string, prompt: string, userContext?: string): Promise<any> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are a UX/UI expert analyzing interface designs. Provide specific, actionable insights about usability, visual design, accessibility, and user experience.

Focus on:
- Visual hierarchy and layout effectiveness
- User flow and interaction patterns
- Accessibility considerations
- Content clarity and information architecture
- Mobile responsiveness indicators
- Conversion optimization opportunities

User context: ${userContext || 'General UX analysis'}
Analysis prompt: ${prompt}

Provide your analysis in a structured format with specific observations and actionable recommendations.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this interface design based on the requirements: ${prompt}`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || 'No analysis generated',
    model: 'gpt-4o',
    timestamp: new Date().toISOString(),
    imageUrl
  };
}

/**
 * Synthesize group insights from individual image analyses
 */
async function synthesizeGroupInsights(
  individualAnalyses: ImageAnalysisResult[],
  originalPrompt: string,
  userContext?: string,
  groupName?: string
): Promise<any> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured for synthesis');
  }

  // Filter out failed analyses
  const successfulAnalyses = individualAnalyses.filter(result => !result.error && result.analysis);
  
  if (successfulAnalyses.length === 0) {
    throw new Error('No successful individual analyses to synthesize');
  }

  // Prepare analysis summaries for AI synthesis
  const analysisSummaries = successfulAnalyses.map((result, index) => ({
    imageNumber: index + 1,
    url: result.url.substring(result.url.lastIndexOf('/') + 1, result.url.lastIndexOf('/') + 20) + '...',
    analysis: result.analysis.content
  }));

  const structureSpec = {
    summary: {
      overallScore: '0-100 integer',
      consistency: '0-100 integer',
      thematicCoherence: '0-100 integer',
      userFlowContinuity: '0-100 integer'
    },
    insights: ['string'],
    recommendations: ['string'],
    patterns: {
      commonElements: ['string'],
      designInconsistencies: ['string'],
      userJourneyGaps: ['string']
    }
  };

  const synthesisPrompt = `You are a senior UX researcher analyzing multiple interface designs as a group. You have individual analyses of ${successfulAnalyses.length} images from the same project/collection.

Group Context:
- Group Name: ${groupName || 'Interface Collection'}
- Original Analysis Request: ${originalPrompt}
- User Context: ${userContext || 'General UX analysis'}

Individual Analyses:
${analysisSummaries.map(summary => `Image ${summary.imageNumber} (${summary.url}):\n${summary.analysis}`).join('\n---\n')}

Return a SINGLE valid JSON object only (no commentary, no code fences) matching this shape:
{
  "summary": { "overallScore": number, "consistency": number, "thematicCoherence": number, "userFlowContinuity": number },
  "insights": string[],
  "recommendations": string[],
  "patterns": { "commonElements": string[], "designInconsistencies": string[], "userJourneyGaps": string[] }
}

Rules:
- All scores are integers 0-100.
- Use concise, actionable phrasing for arrays.
- Do NOT include any markdown fences or prose.`;

  const callOpenAI = async (temp: number) => {
    const payload = {
      model: 'gpt-4.1-2025-04-14',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a senior UX researcher. Output strict JSON only. Never include code fences.'
        },
        {
          role: 'user',
          content: synthesisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: temp
    } as const;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI synthesis API error: ${res.status} - ${t}`);
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```\s*$/i, '').trim();

    // Validate JSON
    try {
      const parsed = JSON.parse(cleaned);
      return JSON.stringify(parsed);
    } catch (_) {
      throw new Error('Non-JSON content from model');
    }
  };

  // First attempt (low temp)
  let jsonString: string | null = null;
  try {
    jsonString = await callOpenAI(0.2);
  } catch (e) {
    console.warn('Synthesis attempt 1 failed, retrying once with stricter prompt...', e?.message || e);
    // One retry with even lower temperature
    jsonString = await callOpenAI(0.1);
  }

  return {
    groupInsights: jsonString!,
    analysisCount: successfulAnalyses.length,
    totalRequested: individualAnalyses.length,
    synthesisModel: 'gpt-4.1-2025-04-14',
    timestamp: new Date().toISOString(),
    groupName: groupName || 'Interface Collection',
    originalPrompt,
    structure: structureSpec
  };
}