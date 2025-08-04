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
 * Natural AI Analysis - Collects unfiltered insights from multiple AI models
 * This function removes structural constraints and allows AI models to provide
 * natural, unfiltered responses about UX/UI design.
 */

interface NaturalAnalysisRequest {
  imageUrl: string;
  userContext?: string;
  analysisContext?: any;
  models?: string[];
}

interface ModelResponse {
  model: string;
  response: string;
  confidence: number;
  processingTime: number;
  error?: string;
}

interface NaturalAnalysisResult {
  imageUrl: string;
  userContext?: string;
  analysisContext?: any;
  rawResponses: ModelResponse[];
  timestamp: string;
  totalProcessingTime: number;
}

/**
 * Generate natural, open-ended prompts for AI models
 */
function generateNaturalPrompt(analysisContext?: any, userContext?: string): string {
  let prompt = `You are an expert UX/UI designer and researcher. Please analyze this interface/design and share your honest, detailed insights.

Focus on providing natural, conversational analysis rather than structured responses. Think out loud about what you observe, what works well, what could be improved, and why.

Consider these aspects in your natural analysis:
- First impressions and visual hierarchy
- User experience and usability concerns
- Design patterns and conventions
- Accessibility and inclusivity
- Content clarity and effectiveness
- Any domain-specific considerations

`;

  // Add context-specific guidance without forcing structure
  if (analysisContext?.image?.primaryType) {
    const interfaceType = analysisContext.image.primaryType;
    prompt += `This appears to be a ${interfaceType}. Please consider the specific needs and expectations users would have for this type of interface.

`;
  }

  if (analysisContext?.domain) {
    const domain = analysisContext.domain;
    prompt += `This is in the ${domain} domain. Please consider industry-specific standards and user expectations for ${domain} applications.

`;
  }

  if (userContext) {
    prompt += `User context: ${userContext}

`;
  }

  prompt += `Please provide your insights in a natural, conversational way. Don't worry about specific formats or structures - just share what you genuinely observe and recommend. Be specific about what you see and why it matters.`;

  return prompt;
}

/**
 * Execute natural analysis with OpenAI
 */
async function analyzeWithOpenAI(imageUrl: string, prompt: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
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
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.7, // Allow for natural, slightly creative responses
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    return {
      model: 'gpt-4.1-2025-04-14',
      response: data.choices[0].message.content,
      confidence: 0.85, // High confidence for GPT-4
      processingTime,
    };
  } catch (error) {
    return {
      model: 'gpt-4.1-2025-04-14',
      response: '',
      confidence: 0,
      processingTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Execute natural analysis with Anthropic Claude
 */
async function analyzeWithClaude(imageUrl: string, prompt: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Convert image URL to base64 for Anthropic
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image for Claude analysis');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    return {
      model: 'claude-sonnet-4-20250514',
      response: data.content[0].text,
      confidence: 0.9, // Very high confidence for Claude
      processingTime,
    };
  } catch (error) {
    return {
      model: 'claude-sonnet-4-20250514',
      response: '',
      confidence: 0,
      processingTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Execute natural analysis with Google Vision (for metadata)
 */
async function analyzeWithGoogleVision(imageUrl: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    const googleKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!googleKey) {
      throw new Error('Google Vision API key not configured');
    }

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              source: {
                imageUri: imageUrl
              }
            },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'TEXT_DETECTION' },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'FACE_DETECTION' },
              { type: 'IMAGE_PROPERTIES' }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    // Convert Google Vision data to natural language
    const visionResults = data.responses[0];
    let naturalDescription = "Technical analysis from Google Vision: ";

    if (visionResults.labelAnnotations) {
      const labels = visionResults.labelAnnotations.slice(0, 5).map(l => l.description).join(', ');
      naturalDescription += `Detected elements include ${labels}. `;
    }

    if (visionResults.textAnnotations && visionResults.textAnnotations.length > 0) {
      naturalDescription += `Contains text content. `;
    }

    if (visionResults.localizedObjectAnnotations) {
      const objects = visionResults.localizedObjectAnnotations.length;
      naturalDescription += `Identified ${objects} distinct interface objects. `;
    }

    if (visionResults.imagePropertiesAnnotation?.dominantColors) {
      naturalDescription += `Color palette analysis available. `;
    }

    return {
      model: 'google-vision',
      response: naturalDescription,
      confidence: 0.8,
      processingTime,
    };
  } catch (error) {
    return {
      model: 'google-vision',
      response: '',
      confidence: 0,
      processingTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: NaturalAnalysisRequest = await req.json();
    const { imageUrl, userContext, analysisContext, models = ['openai', 'claude', 'google'] } = requestData;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('🎯 Natural AI Analysis starting:', {
      imageUrl: imageUrl.substring(0, 50) + '...',
      hasUserContext: !!userContext,
      hasAnalysisContext: !!analysisContext,
      requestedModels: models
    });

    const naturalPrompt = generateNaturalPrompt(analysisContext, userContext);
    const responses: ModelResponse[] = [];
    const startTime = Date.now();

    // Execute models in parallel for speed
    const promises: Promise<ModelResponse>[] = [];

    if (models.includes('openai')) {
      promises.push(analyzeWithOpenAI(imageUrl, naturalPrompt));
    }

    if (models.includes('claude')) {
      promises.push(analyzeWithClaude(imageUrl, naturalPrompt));
    }

    if (models.includes('google')) {
      promises.push(analyzeWithGoogleVision(imageUrl));
    }

    // Wait for all models to complete
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
        console.log(`✅ Model ${models[index]} completed:`, {
          model: result.value.model,
          confidence: result.value.confidence,
          responseLength: result.value.response.length,
          processingTime: result.value.processingTime
        });
      } else {
        console.error(`❌ Model ${models[index]} failed:`, result.reason);
        responses.push({
          model: models[index],
          response: '',
          confidence: 0,
          processingTime: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    const totalProcessingTime = Date.now() - startTime;

    const result: NaturalAnalysisResult = {
      imageUrl,
      userContext,
      analysisContext,
      rawResponses: responses,
      timestamp: new Date().toISOString(),
      totalProcessingTime
    };

    console.log('🎯 Natural AI Analysis completed:', {
      totalResponses: responses.length,
      successfulResponses: responses.filter(r => !r.error).length,
      totalProcessingTime,
      averageConfidence: responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Natural AI Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Natural analysis failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});