import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Available model configurations
const MODEL_CONFIGS = {
  'gpt-4o': {
    api: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    requiresKey: 'OPENAI_API_KEY'
  },
  'claude-opus-4-20250514': {
    api: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    requiresKey: 'ANTHROPIC_API_KEY'
  },
  'perplexity-research': {
    api: 'perplexity',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    model: 'llama-3.1-sonar-small-128k-online',
    requiresKey: 'PERPLEXITY_API_KEY'
  },
  'stability-inpainting': {
    api: 'stability',
    endpoint: 'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/image-to-image',
    requiresKey: 'STABILITY_API_KEY'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('🔥 Pipeline Request:', {
      stage: body.stage,
      model: body.model,
      timestamp: new Date().toISOString()
    })
    
    // Check available API keys
    const availableAPIs = {
      openai: !!Deno.env.get('OPENAI_API_KEY'),
      anthropic: !!Deno.env.get('ANTHROPIC_API_KEY'),
      google: !!Deno.env.get('GOOGLE_VISION_API_KEY'),
      perplexity: !!Deno.env.get('PERPLEXITY_API_KEY'),
      stability: !!Deno.env.get('STABILITY_API_KEY')
    }
    
    console.log('📝 Available APIs:', availableAPIs)

    // Handle special actions first
    if (body.action) {
      switch (body.action) {
        case 'store':
          return await storeAnalysisResults(body.pipelineResults)
        
        case 'check-keys':
          return new Response(
            JSON.stringify({ available: availableAPIs }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        
        case 'ANALYZE_IMAGE':
          // Convert old Canvas format to new pipeline format
          return await handleCanvasRequest(body.action, body)
        
        default:
          throw new Error(`Unknown action: ${body.action}`)
      }
    }

    // Handle pipeline requests (must have stage and model)
    if (!body.stage) {
      throw new Error(`Stage is required for pipeline execution`)
    }
    
    if (!body.model) {
      throw new Error(`Model is required for pipeline execution`)
    }

    return await executeModel(body)

  } catch (error) {
    console.error('❌ Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function executeModel(payload: any) {
  console.log('executeModel - Full payload received:', JSON.stringify(payload, null, 2))
  
  const { model, stage, imageUrl, prompt, systemPrompt, visionData, analysisData } = payload
  
  console.log('executeModel - Extracted fields:', { 
    model, 
    stage, 
    hasImageUrl: !!imageUrl, 
    hasPrompt: !!prompt, 
    hasSystemPrompt: !!systemPrompt,
    hasVisionData: !!visionData,
    hasAnalysisData: !!analysisData
  })
  
  if (!model) {
    throw new Error(`Model is required but received: ${model}. Full payload: ${JSON.stringify(payload)}`)
  }
  
  if (!stage) {
    throw new Error(`Stage is required but received: ${stage}. Full payload: ${JSON.stringify(payload)}`)
  }
  
  // Map newer model names to edge function model names
  const mappedModel = mapModelName(model)
  const modelConfig = MODEL_CONFIGS[mappedModel]
  
  if (!modelConfig) {
    const availableModels = Object.keys(MODEL_CONFIGS)
    const suggestion = findBestModelMatch(model, availableModels)
    console.error(`Model mapping failed:`, {
      requestedModel: model,
      mappedModel,
      availableModels,
      suggestion
    })
    throw new Error(`Unknown model: ${model} (mapped to: ${mappedModel}). Available models: ${availableModels.join(', ')}. Did you mean: ${suggestion}?`)
  }

  const apiKey = Deno.env.get(modelConfig.requiresKey)
  if (!apiKey) {
    throw new Error(
      `${modelConfig.requiresKey} not configured. This model requires ${modelConfig.api} API access.`
    )
  }

  // Execute based on API type
  switch (modelConfig.api) {
    case 'openai':
      return await executeOpenAI(modelConfig, apiKey, payload)
    
    case 'anthropic':
      return await executeAnthropic(modelConfig, apiKey, payload)
    
    case 'perplexity':
      return await executePerplexity(modelConfig, apiKey, payload)
    
    case 'stability':
      return await executeStability(modelConfig, apiKey, payload)
    
    default:
      throw new Error(`Unsupported API: ${modelConfig.api}`)
  }
}

// Helper function to ensure prompts contain "json" for OpenAI compatibility
function ensureJsonInPrompt(prompt: string): string {
  if (!prompt.toLowerCase().includes('json')) {
    console.log('⚠️ Adding JSON requirement to prompt for OpenAI compatibility');
    return prompt + '\n\nPlease format your response as JSON.';
  }
  return prompt;
}

// Pre-flight validation for JSON prompt requirements
function validateJsonPromptRequirement(payload: any): { isValid: boolean; error?: string; fixedPrompt?: string } {
  const { prompt, model } = payload;
  
  // Check if this is an OpenAI model that might use JSON mode
  const isOpenAIModel = model && (model.includes('gpt-') || model.includes('openai'));
  
  if (!isOpenAIModel) {
    return { isValid: true }; // Non-OpenAI models don't need this validation
  }
  
  // Check if prompt contains "json" keyword
  const hasJsonKeyword = prompt.toLowerCase().includes('json');
  
  if (!hasJsonKeyword) {
    console.log('🔧 Pre-flight validation: JSON keyword missing, auto-fixing prompt');
    const fixedPrompt = ensureJsonInPrompt(prompt);
    return { 
      isValid: true, 
      fixedPrompt,
      error: `Original prompt lacked "json" keyword required for OpenAI JSON mode. Auto-fixed.`
    };
  }
  
  console.log('✅ Pre-flight validation: JSON keyword present in prompt');
  return { isValid: true };
}

async function executeOpenAI(config: any, apiKey: string, payload: any) {
  console.log('Executing OpenAI with payload:', { 
    model: config.model || payload.model,
    stage: payload.stage,
    hasImage: !!payload.imageUrl,
    promptLength: payload.prompt?.length || 0
  });
  
  
  try {
    const { imageUrl, systemPrompt } = payload;
    
    // PHASE 2.1: Pre-flight validation with auto-fixing
    const validation = validateJsonPromptRequirement(payload);
    const promptToUse = validation.fixedPrompt || payload.prompt;
    
    if (validation.error) {
      console.log('⚠️ JSON validation warning:', validation.error);
    }
    
    // Additional logging for debugging
    console.log('🔍 JSON prompt check:', {
      originalContainsJson: payload.prompt.toLowerCase().includes('json'),
      finalPromptContainsJson: promptToUse.toLowerCase().includes('json'),
      promptWasModified: promptToUse !== payload.prompt,
      validationPassed: validation.isValid
    });
    
    let processedImageUrl = imageUrl;
    if (imageUrl && !imageUrl.startsWith('data:')) {
      console.log('Converting image to base64 for OpenAI...');
      const base64Data = await fetchImageAsBase64(imageUrl);
      processedImageUrl = `data:image/jpeg;base64,${base64Data}`;
      console.log('Image converted successfully');
    }
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt || 'You are an expert UX/UI analyst.'
      },
      {
        role: 'user',
        content: processedImageUrl ? [
          { type: 'text', text: promptToUse },
          { type: 'image_url', image_url: { url: processedImageUrl } }
        ] : promptToUse
      }
    ];

    console.log('Sending request to OpenAI API...');
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || payload.model,
        messages,
        max_tokens: 4000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorText);
      
      // PHASE 2.2: Enhanced error handling for JSON format issues
      if (response.status === 400 && errorText.includes('json')) {
        const enhancedError = `OpenAI JSON Format Error: ${errorText}
        
🔧 Troubleshooting Steps:
1. Ensure your prompt contains the word "json" when using JSON mode
2. Original prompt contained JSON keyword: ${payload.prompt.toLowerCase().includes('json')}
3. Final prompt contained JSON keyword: ${promptToUse.toLowerCase().includes('json')}
4. Prompt was auto-fixed: ${promptToUse !== payload.prompt}

💡 This error typically occurs when response_format: { type: 'json_object' } is used without mentioning "json" in the prompt.
The system attempted to auto-fix this issue. If you continue seeing this error, please check the prompt content.`;

        throw new Error(enhancedError);
      }
      
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}: ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');
    const content = data.choices[0].message.content;
    
    try {
      return new Response(
        JSON.stringify(JSON.parse(content)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (e) {
      // If JSON parsing fails, return the raw content
      return new Response(
        JSON.stringify({ content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in executeOpenAI:', error);
    throw error;
  }
}

async function executeAnthropic(config: any, apiKey: string, payload: any) {
  console.log('Executing Anthropic with payload:', { 
    model: config.model || payload.model,
    stage: payload.stage,
    hasImage: !!payload.imageUrl,
    promptLength: payload.prompt?.length || 0
  });
  
  try {
    const { imageUrl, prompt, systemPrompt } = payload;
    
    let base64Data = '';
    if (imageUrl && !imageUrl.startsWith('data:')) {
      console.log('Converting image to base64 for Anthropic...');
      base64Data = await fetchImageAsBase64(imageUrl);
      console.log('Image converted successfully for Anthropic');
    }
    
    const messages = [{
      role: 'user',
      content: imageUrl ? [
        { type: 'text', text: prompt },
          { 
            type: 'image', 
            source: {
              type: 'base64',
              media_type: detectImageFormat(imageUrl, base64Data),
              data: imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : base64Data
            }
          }
      ] : prompt
    }];

    console.log('Sending request to Anthropic API...');
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || payload.model,
        system: systemPrompt || 'You are an expert UX/UI analyst.',
        messages,
        max_tokens: 4000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, response.statusText, errorText);
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Anthropic response received successfully');
    const content = data.content[0].text;
    
    try {
      return new Response(
        JSON.stringify(JSON.parse(content)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (e) {
      return new Response(
        JSON.stringify({ content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in executeAnthropic:', error);
    throw error;
  }
}

async function executePerplexity(config: any, apiKey: string, payload: any) {
  const { prompt, systemPrompt } = payload
  
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a research assistant providing current UX/UI insights and best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.2
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Perplexity API error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content
  
  return new Response(
    JSON.stringify({ content, citations: data.citations || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function executeStability(config: any, apiKey: string, payload: any) {
  const { imageUrl, prompt, mask } = payload
  
  // For inpainting, we need to handle form data differently
  const formData = new FormData()
  
  // Fetch the original image
  const imageResponse = await fetch(imageUrl)
  const imageBlob = await imageResponse.blob()
  formData.append('init_image', imageBlob)
  
  if (mask) {
    const maskBlob = new Blob([mask], { type: 'image/png' })
    formData.append('mask_image', maskBlob)
  }
  
  formData.append('text_prompts[0][text]', prompt)
  formData.append('text_prompts[0][weight]', '1')
  formData.append('cfg_scale', '7')
  formData.append('steps', '30')
  
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Stability AI API error: ${error}`)
  }

  const data = await response.json()
  
  return new Response(
    JSON.stringify({ 
      imageBase64: data.artifacts[0].base64,
      finishReason: data.artifacts[0].finishReason
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Model name mapping function
function mapModelName(requestedModel: string): string {
  const modelMapping: Record<string, string> = {
    // OpenAI model mappings
    'gpt-4.1-2025-04-14': 'gpt-4o',
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    
    
    // Anthropic model mappings
    'claude-opus-4-20250514': 'claude-opus-4-20250514',
    'claude-3-5-sonnet-20241022': 'claude-opus-4-20250514',
    'claude-3-opus-20240229': 'claude-opus-4-20250514',
    
    // Note: Google Vision is handled separately for metadata extraction only
    // It should NOT appear in vision/analysis pipelines
    
    // Perplexity mappings
    'perplexity-sonar': 'llama-3.1-sonar-small-128k-online'
  }
  
  const mapped = modelMapping[requestedModel] || requestedModel
  console.log(`Model mapping: ${requestedModel} -> ${mapped}`)
  return mapped
}

// Find best model match for suggestions
function findBestModelMatch(requestedModel: string, availableModels: string[]): string {
  // Simple fuzzy matching
  if (requestedModel.includes('gpt') || requestedModel.includes('openai')) {
    return availableModels.find(m => m.includes('gpt')) || 'gpt-4o'
  }
  if (requestedModel.includes('claude') || requestedModel.includes('anthropic')) {
    return availableModels.find(m => m.includes('claude')) || 'claude-opus-4-20250514'
  }
  if (requestedModel.includes('gemini') || requestedModel.includes('google')) {
    return availableModels.find(m => m.includes('gemini')) || 'gemini-2.5-pro'
  }
  return availableModels[0] || 'gpt-4o'
}

// Image format detection function
function detectImageFormat(imageUrl: string, base64Data?: string): string {
  // Check data URL format first
  if (imageUrl.startsWith('data:image/')) {
    const format = imageUrl.match(/data:image\/([^;]+)/)?.[1]
    if (format) {
      return `image/${format}`
    }
  }
  
  // Check file extension
  const urlLower = imageUrl.toLowerCase()
  if (urlLower.includes('.png')) return 'image/png'
  if (urlLower.includes('.webp')) return 'image/webp'
  if (urlLower.includes('.gif')) return 'image/gif'
  if (urlLower.includes('.svg')) return 'image/svg+xml'
  
  // Check base64 data if available
  if (base64Data) {
    // PNG starts with iVBORw0KGgo
    if (base64Data.startsWith('iVBORw0KGgo')) return 'image/png'
    // WebP starts with UklGR
    if (base64Data.startsWith('UklGR')) return 'image/webp'
    // GIF starts with R0lGODlh or R0lGODdh
    if (base64Data.startsWith('R0lGOD')) return 'image/gif'
  }
  
  // Default to JPEG if unable to detect
  console.warn(`Could not detect image format for ${imageUrl}, defaulting to JPEG`)
  return 'image/jpeg'
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  console.log('Fetching image from URL:', imageUrl);
  
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('Image fetched successfully, size:', arrayBuffer.byteLength, 'bytes');
    
    // Convert ArrayBuffer to base64 using Deno's built-in btoa
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    const base64String = btoa(binaryString);
    
    console.log('Base64 conversion complete, length:', base64String.length);
    return base64String;
  } catch (error) {
    console.error('Error in fetchImageAsBase64:', error);
    throw new Error(`Failed to convert image to base64: ${error.message}`);
  }
}

async function handleCanvasRequest(action: string, payload: any) {
  console.log('Handling Canvas request - Action:', action, 'Payload:', payload)
  
  // Convert old Canvas format to new pipeline format
  switch (action) {
    case 'ANALYZE_IMAGE':
      // Map Canvas format to pipeline format
      const convertedPayload = {
        model: 'gpt-4o', // Default model for Canvas requests
        stage: 'vision', // Start with vision stage
        imageUrl: payload.payload?.imageUrl,
        prompt: `Analyze this ${payload.payload?.imageName || 'image'} for UX/UI insights. Context: ${payload.payload?.userContext || 'General analysis'}`,
        systemPrompt: 'You are an expert UX/UI analyst providing detailed insights.'
      }
      
      console.log('Converted Canvas payload:', convertedPayload)
      return await executeModel(convertedPayload)
      
    default:
      throw new Error(`Unknown Canvas action: ${action}`)
  }
}

async function storeAnalysisResults(pipelineResults: any) {
  const { visionResults, analysisResults, synthesisResults, analysisContext } = pipelineResults
  
  // Create final analysis structure with context
  const finalAnalysis = {
    visualAnnotations: synthesisResults.recommendations?.map((rec: any, index: number) => ({
      id: `annotation_${index}`,
      x: 10 + (index * 20),
      y: 10 + (index * 15),
      type: rec.priority === 'critical' ? 'issue' : 'suggestion',
      title: rec.title,
      description: rec.description,
      severity: rec.priority,
      category: rec.category,
      confidence: rec.confidence || 0.85
    })) || [],
    
    suggestions: synthesisResults.recommendations || [],
    
    summary: {
      overallScore: synthesisResults.executiveSummary?.overallScore || 75,
      categoryScores: {
        usability: analysisResults.fusedData?.usabilityScore || 70,
        accessibility: analysisResults.fusedData?.accessibilityScore || 65,
        visual: visionResults.fusedData?.confidence?.overall * 100 || 80,
        content: 75
      },
      keyIssues: synthesisResults.executiveSummary?.criticalIssues || [],
      strengths: analysisResults.fusedData?.strengths || [],
      quickWins: synthesisResults.executiveSummary?.quickWins || []
    },
    
    metadata: {
      timestamp: new Date().toISOString(),
      modelsUsed: pipelineResults.modelsUsed || [],
      executionTime: pipelineResults.executionTime,
      confidence: visionResults.confidence,
      pipelineVersion: '2.0',
      stagesCompleted: ['context', 'vision', 'analysis', 'synthesis']
    },
    
    // CRITICAL: Include analysis context for display
    analysisContext: analysisContext
  }

  return new Response(
    JSON.stringify(finalAnalysis),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}