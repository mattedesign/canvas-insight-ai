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
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...payload } = await req.json()
    
    console.log('UX Analysis Edge Function - Raw Request Body:', JSON.stringify(payload, null, 2))
    console.log('UX Analysis Edge Function - Action:', action)
    console.log('UX Analysis Edge Function - Payload Fields:', Object.keys(payload))
    
    // Check available API keys
    const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY')
    const hasAnthropic = !!Deno.env.get('ANTHROPIC_API_KEY')
    const hasGoogle = !!Deno.env.get('GOOGLE_VISION_API_KEY')
    
    console.log('Available APIs:', { hasOpenAI, hasAnthropic, hasGoogle })

    // Handle special actions
    switch (action) {
      case 'store':
        return await storeAnalysisResults(payload.pipelineResults)
      
      case 'check-keys':
        return new Response(
          JSON.stringify({
            available: {
              openai: hasOpenAI,
              anthropic: hasAnthropic,
              google: hasGoogle
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      
      default:
        // Execute model based on stage - no action means direct execution
        return await executeModel(payload)
    }

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
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

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  return base64
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