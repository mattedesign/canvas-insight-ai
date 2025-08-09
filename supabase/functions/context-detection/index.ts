import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
      model = 'gpt-4o-mini', 
      maxTokens = 1000, 
      useMetadataMode = false,
      enhancedContextMode = false 
    } = await req.json();

    const safePrompt = (typeof prompt === 'string' && prompt.trim().length > 0)
      ? prompt
      : 'Analyze the interface image and return STRICTLY a minimal JSON object with required fields: primaryType and domain, and optional confidence (0-1). No extra keys, no prose.';

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
    const optimizedModel = model || 'gpt-4.1-2025-04-14';
    const optimizedTemperature = 0.0;
    const optimizedMaxTokens = useMetadataMode ? Math.min(maxTokens, 600) : maxTokens;
    
    console.log(`Using ${useMetadataMode ? 'optimized metadata' : 'full vision'} mode with model ${optimizedModel}`);

    // Enhanced context detection with structured fallback
    const systemPrompt = enhancedContextMode ? 
      `You are an expert UX analyst specializing in context detection. Analyze the interface comprehensively and return a complete JSON response with all required fields. Pay special attention to:

1. Interface Type Detection: Look for specific UI patterns (dashboards have charts/metrics, landing pages have hero sections/CTAs, mobile apps have touch-friendly elements)
2. Domain Identification: Identify industry-specific elements (finance: currency/charts, healthcare: medical terms, education: learning modules)
3. User Experience Maturity: Assess design sophistication and feature completeness
4. Design System Analysis: Evaluate consistency in spacing, colors, typography

CRITICAL: Always return a confidence score between 0.0-1.0 based on visual clarity and pattern recognition certainty.

OUTPUT FORMAT: Return strictly a JSON object with only these keys: primaryType (string), domain (string), confidence (number between 0 and 1). No additional keys, no prose.` :
      'You are a fast UI analyzer. Return strictly a JSON object with only keys: primaryType (string), domain (string), confidence (number between 0 and 1). No additional keys, no prose.';

    const contextMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: safePrompt
          },
          {
            type: 'image_url',
            image_url: { url: processedImageUrl }
          }
        ]
      }
    ];

    console.log(`Context detection with ${enhancedContextMode ? 'enhanced' : useMetadataMode ? 'metadata' : 'standard'} mode`);

    // Ensure OpenAI API key is configured
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('[context-detection] Missing OPENAI_API_KEY secret');
      return new Response(
        JSON.stringify({ error: 'Missing OpenAI API key', solution: 'Add OPENAI_API_KEY in Supabase Edge Functions settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Context detection using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: optimizedModel,
        messages: contextMessages,
        max_tokens: optimizedMaxTokens,
        temperature: optimizedTemperature,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[context-detection] OpenAI error', response.status, errText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let contextData;

    const rawContent = data.choices?.[0]?.message?.content ?? '';
    console.log('[context-detection] raw model content:', rawContent);

    const tryParse = (text: string) => {
      try {
        return JSON.parse(text);
      } catch (_) {
        // Strip code fences if present
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenced && fenced[1]) {
          try {
            return JSON.parse(fenced[1]);
          } catch (_) {}
        }
        // Fallback: extract the largest JSON object substring
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const candidate = text.substring(start, end + 1);
          try {
            return JSON.parse(candidate);
          } catch (_) {}
        }
        throw new Error('Unable to parse JSON from model content');
      }
    };

    try {
      contextData = tryParse(rawContent || '{}');
    } catch (parseError) {
      console.error('[context-detection] Failed to parse model JSON:', parseError);
      // Attempt minimal extraction of required fields from partial content (no invented values)
      const extract = (keys: string[]) => {
        for (const k of keys) {
          const re = new RegExp(`"${k}"\\s*:\\s*"([^"]+)"`, 'i');
          const m = rawContent.match(re);
          if (m && m[1]) return m[1];
        }
        return undefined;
      };
      const primary = extract(['primaryType','interfaceType','interface_type','screenType','screen_type','type']);
      const domainVal = extract(['domain','detectedDomain','industry','category','sector']);
      if (primary && domainVal) {
        contextData = { primaryType: primary, domain: domainVal };
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON returned by model', details: String(parseError), rawPreview: rawContent?.slice(0, 400) ?? null }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Strict validation with synonym mapping (no invented values)
    // Map common synonyms returned by different prompts/models
    if (!contextData.primaryType) {
      const pt = contextData.interfaceType || contextData.interface_type || contextData.screenType || contextData.screen_type || contextData.type;
      if (pt) contextData.primaryType = pt;
    }
    if (!contextData.domain) {
      const dm = contextData.detectedDomain || contextData.industry || contextData.category || contextData.sector;
      if (dm) contextData.domain = dm;
    }

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
