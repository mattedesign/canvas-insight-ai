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
    const optimizedTemperature = useMetadataMode ? 0.1 : 0.3;
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
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let contextData;
    
    try {
      contextData = JSON.parse(data.choices[0].message.content);
      
      // Enhanced validation and fallback for context data
      if (!contextData.primaryType || !contextData.domain) {
        console.warn('Incomplete context data received, applying structured fallback');
        contextData = applyStructuredFallback(contextData, prompt);
      }
      
      // Ensure confidence is set
      if (typeof contextData.confidence !== 'number') {
        contextData.confidence = enhancedContextMode ? 0.6 : 0.4;
      }
      
    } catch (parseError) {
      console.error('Failed to parse context data, using intelligent fallback:', parseError);
      contextData = createIntelligentFallback(prompt);
    }

    return new Response(
      JSON.stringify(contextData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Context detection error:', error);
    
    // Instead of returning error, provide intelligent fallback
    const fallbackContext = createIntelligentFallback(
      req.url.includes('prompt') ? 'analyze interface' : 'general analysis'
    );
    
    console.log('Providing fallback context due to error:', fallbackContext);
    
    return new Response(
      JSON.stringify(fallbackContext),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Structured fallback for incomplete context data
function applyStructuredFallback(partialContext: any, originalPrompt: string): any {
  const enhanced = { ...partialContext };
  
  // Infer interface type from prompt if missing
  if (!enhanced.primaryType || enhanced.primaryType === 'unknown') {
    enhanced.primaryType = inferInterfaceTypeFromPrompt(originalPrompt);
  }
  
  // Infer domain from prompt if missing or generic
  if (!enhanced.domain || enhanced.domain === 'general') {
    enhanced.domain = inferDomainFromPrompt(originalPrompt);
  }
  
  // Set reasonable defaults for other fields
  enhanced.complexity = enhanced.complexity || 'moderate';
  enhanced.platform = enhanced.platform || 'web';
  enhanced.maturityStage = enhanced.maturityStage || 'mvp';
  enhanced.targetAudience = enhanced.targetAudience || 'general users';
  enhanced.userIntent = enhanced.userIntent || ['improve usability'];
  enhanced.subTypes = enhanced.subTypes || [];
  enhanced.designSystem = enhanced.designSystem || {
    detected: false,
    consistency: 0.5
  };
  enhanced.confidence = Math.max(enhanced.confidence || 0, 0.5);
  
  return enhanced;
}

// Create intelligent fallback when parsing fails completely
function createIntelligentFallback(prompt: string): any {
  const interfaceType = inferInterfaceTypeFromPrompt(prompt);
  const domain = inferDomainFromPrompt(prompt);
  const userRole = inferUserRoleFromPrompt(prompt);
  
  return {
    primaryType: interfaceType,
    subTypes: getSubTypesForInterface(interfaceType),
    domain: domain,
    complexity: 'moderate',
    userIntent: inferUserIntentFromPrompt(prompt),
    businessModel: getBusinessModelForDomain(domain),
    targetAudience: 'general users',
    maturityStage: 'mvp',
    platform: 'web',
    designSystem: {
      detected: false,
      type: 'custom',
      consistency: 0.5
    },
    confidence: 0.4 // Lower confidence for fallback
  };
}

function inferInterfaceTypeFromPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('analytics') || lowerPrompt.includes('metrics')) {
    return 'dashboard';
  }
  if (lowerPrompt.includes('landing') || lowerPrompt.includes('homepage') || lowerPrompt.includes('marketing')) {
    return 'landing';
  }
  if (lowerPrompt.includes('mobile') || lowerPrompt.includes('app') || lowerPrompt.includes('ios') || lowerPrompt.includes('android')) {
    return 'mobile';
  }
  if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop') || lowerPrompt.includes('cart') || lowerPrompt.includes('product')) {
    return 'ecommerce';
  }
  if (lowerPrompt.includes('form') || lowerPrompt.includes('signup') || lowerPrompt.includes('login') || lowerPrompt.includes('registration')) {
    return 'form';
  }
  if (lowerPrompt.includes('saas') || lowerPrompt.includes('software') || lowerPrompt.includes('platform')) {
    return 'saas';
  }
  
  return 'app'; // Default to generic app
}

function inferDomainFromPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('financ') || lowerPrompt.includes('bank') || lowerPrompt.includes('trading') || lowerPrompt.includes('investment')) {
    return 'finance';
  }
  if (lowerPrompt.includes('health') || lowerPrompt.includes('medical') || lowerPrompt.includes('clinical') || lowerPrompt.includes('patient')) {
    return 'healthcare';
  }
  if (lowerPrompt.includes('education') || lowerPrompt.includes('learning') || lowerPrompt.includes('course') || lowerPrompt.includes('school')) {
    return 'education';
  }
  if (lowerPrompt.includes('retail') || lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shopping')) {
    return 'retail';
  }
  if (lowerPrompt.includes('real estate') || lowerPrompt.includes('property') || lowerPrompt.includes('housing')) {
    return 'real-estate';
  }
  if (lowerPrompt.includes('tech') || lowerPrompt.includes('software') || lowerPrompt.includes('development')) {
    return 'technology';
  }
  
  return 'general';
}

function inferUserRoleFromPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('design') || lowerPrompt.includes('ui') || lowerPrompt.includes('visual')) {
    return 'designer';
  }
  if (lowerPrompt.includes('develop') || lowerPrompt.includes('code') || lowerPrompt.includes('technical')) {
    return 'developer';
  }
  if (lowerPrompt.includes('business') || lowerPrompt.includes('revenue') || lowerPrompt.includes('conversion')) {
    return 'business';
  }
  if (lowerPrompt.includes('product') || lowerPrompt.includes('feature') || lowerPrompt.includes('user experience')) {
    return 'product';
  }
  if (lowerPrompt.includes('marketing') || lowerPrompt.includes('campaign') || lowerPrompt.includes('brand')) {
    return 'marketing';
  }
  
  return 'general';
}

function inferUserIntentFromPrompt(prompt: string): string[] {
  const intents: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('improve') || lowerPrompt.includes('enhance') || lowerPrompt.includes('optimize')) {
    intents.push('improve usability');
  }
  if (lowerPrompt.includes('conversion') || lowerPrompt.includes('convert')) {
    intents.push('increase conversions');
  }
  if (lowerPrompt.includes('accessible') || lowerPrompt.includes('accessibility')) {
    intents.push('improve accessibility');
  }
  if (lowerPrompt.includes('mobile') || lowerPrompt.includes('responsive')) {
    intents.push('optimize for mobile');
  }
  
  return intents.length > 0 ? intents : ['general analysis'];
}

function getSubTypesForInterface(interfaceType: string): string[] {
  const subTypeMap: Record<string, string[]> = {
    dashboard: ['analytics', 'metrics', 'data-visualization'],
    landing: ['marketing', 'conversion', 'lead-generation'],
    mobile: ['native', 'responsive', 'touch-interface'],
    ecommerce: ['product-catalog', 'checkout-flow', 'shopping-cart'],
    form: ['data-entry', 'validation', 'multi-step'],
    saas: ['workflow', 'feature-rich', 'enterprise'],
    app: ['general', 'web-application']
  };
  
  return subTypeMap[interfaceType] || ['general'];
}

function getBusinessModelForDomain(domain: string): string {
  const businessModelMap: Record<string, string> = {
    finance: 'enterprise',
    healthcare: 'enterprise',
    education: 'saas',
    retail: 'ecommerce',
    technology: 'saas',
    'real-estate': 'marketplace'
  };
  
  return businessModelMap[domain] || 'saas';
}