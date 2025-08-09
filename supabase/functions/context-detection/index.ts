import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      imageUrl, 
      imageBase64, 
      prompt, 
      model = 'gpt-4o', 
      maxTokens = 1000, 
      useMetadataMode = false,
      enhancedContextMode = false 
    } = await req.json();

    // Handle image data - prioritize base64 from frontend over URL fetching
    let processedImageUrl = null;
    
    if (imageBase64) {
      console.log('Using provided base64 image data for context detection, length:', imageBase64.length);
      processedImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      console.log('Using existing data URL for context detection');
      processedImageUrl = imageUrl;
    } else if (imageUrl && !imageUrl.startsWith('blob:')) {
      console.log('Using provided image URL for context detection');
      processedImageUrl = imageUrl;
    } else {
      throw new Error('No valid image data provided. Blob URLs cannot be accessed from edge functions.');
    }

    // Optimize for metadata mode with faster processing
    const optimizedModel = useMetadataMode ? 'gpt-4o-mini' : model;
    const optimizedTemperature = 0.0;
    const optimizedMaxTokens = useMetadataMode ? Math.min(maxTokens, 300) : maxTokens;
    
    console.log(`Using ${useMetadataMode ? 'optimized metadata' : 'full vision'} mode with model ${optimizedModel}`);

    // Enhanced context detection with structured fallback
    const systemPrompt = enhancedContextMode ? 
      `You are an expert UX analyst specializing in context detection. Analyze the interface comprehensively and return a complete JSON response with all required fields. Pay special attention to:

1. Interface Type Detection: Look for specific UI patterns (dashboards have charts/metrics, landing pages have hero sections/CTAs, mobile apps have touch-friendly elements)
2. Domain Identification: Identify industry-specific elements (finance: currency/charts, healthcare: medical terms, education: learning modules)
3. User Experience Maturity: Assess design sophistication and feature completeness
4. Design System Analysis: Evaluate consistency in spacing, colors, typography

CRITICAL: Always return a confidence score between 0.0-1.0 based on visual clarity and pattern recognition certainty.` :
      'You are a fast UI analyzer. Return only the requested JSON fields with no explanation.';

    const contextMessages = enhancedContextMode ? [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: { url: processedImageUrl }
          }
        ]
      }
    ] : [{
      role: useMetadataMode ? 'system' : 'user',
      content: useMetadataMode ? systemPrompt :
        [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: { url: processedImageUrl }
          }
        ]
    }, ...(useMetadataMode ? [{
      role: 'user',
      content: prompt
    }] : [])];

    console.log(`Context detection with ${enhancedContextMode ? 'enhanced' : useMetadataMode ? 'metadata' : 'standard'} mode`);

    // Context detection using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: optimizedModel,
        messages: contextMessages,
        max_tokens: optimizedMaxTokens,
        temperature: optimizedTemperature,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ContextDetection',
            schema: {
              type: 'object',
              properties: {
                primaryType: { type: 'string', minLength: 2 },
                domain: { type: 'string', minLength: 2 },
                targetAudience: { type: 'string' },
                platform: { type: 'string' },
                designSystem: { type: 'string' },
                complexity: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 }
              },
              required: ['primaryType', 'domain'],
              additionalProperties: true
            },
            strict: true
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let contextData;

    try {
      contextData = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    } catch (parseError) {
      console.error('[context-detection] Failed to parse model JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON returned by model', details: String(parseError) }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strict validation: require primaryType and domain, no fallbacks
    if (!contextData || typeof contextData !== 'object' || !contextData.primaryType || !contextData.domain) {
      console.error('[context-detection] Missing required fields in context data', { contextData });
      return new Response(
        JSON.stringify({
          error: 'Incomplete context data from model',
          required: ['primaryType', 'domain'],
          received: contextData ?? null
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize confidence if provided; do not invent values
    if (contextData.confidence != null && typeof contextData.confidence !== 'number') {
      console.warn('[context-detection] Non-numeric confidence provided; removing');
      delete contextData.confidence;
    }

    return new Response(
      JSON.stringify(contextData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Context detection error:', error);
    return new Response(
      JSON.stringify({ error: 'Context detection failed', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback helpers removed to enforce No Fallback Data policy.
