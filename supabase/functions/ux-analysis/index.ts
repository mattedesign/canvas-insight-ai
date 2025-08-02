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
  'gpt-4.1-2025-04-14': {
    api: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    requiresKey: 'OPENAI_API_KEY'
  },
  'openai-vision': {
    api: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-2025-04-14',
    requiresKey: 'OPENAI_API_KEY'
  },
  'claude-opus-4-20250514': {
    api: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    requiresKey: 'ANTHROPIC_API_KEY'
  },
  'anthropic-vision': {
    api: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-opus-4-20250514',
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
  
  const modelConfig = MODEL_CONFIGS[model]
  
  if (!modelConfig) {
    const availableModels = Object.keys(MODEL_CONFIGS)
    throw new Error(`Unknown model: ${model}. Available models: ${availableModels.join(', ')}`)
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

async function executeOpenAI(config: any, apiKey: string, payload: any) {
  const { imageUrl, prompt, systemPrompt } = payload
  
  const messages = [
    {
      role: 'system',
      content: systemPrompt || 'You are an expert UX/UI analyst.'
    },
    {
      role: 'user',
      content: imageUrl ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ] : prompt
    }
  ]

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
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content
  
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
}

async function executeAnthropic(config: any, apiKey: string, payload: any) {
  const { imageUrl, prompt, systemPrompt } = payload
  
  const messages = [{
    role: 'user',
    content: imageUrl ? [
      { type: 'text', text: prompt },
      { 
        type: 'image', 
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: await fetchImageAsBase64(imageUrl)
        }
      }
    ] : prompt
  }]

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
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${error}`)
  }

  const data = await response.json()
  const content = data.content[0].text
  
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

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()
  
  // Handle large images efficiently - convert chunks to avoid stack overflow
  const uint8Array = new Uint8Array(arrayBuffer)
  let binaryString = ''
  const chunkSize = 32768 // Process in 32KB chunks
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize)
    binaryString += String.fromCharCode.apply(null, Array.from(chunk))
  }
  
  return btoa(binaryString)
}

async function handleCanvasRequest(action: string, payload: any) {
  console.log('Handling Canvas request - Action:', action, 'Payload:', payload)
  
  // Convert old Canvas format to new pipeline format
  switch (action) {
    case 'ANALYZE_IMAGE':
      // Map Canvas format to pipeline format
      const convertedPayload = {
        model: 'gpt-4.1-2025-04-14', // Default model for Canvas requests
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