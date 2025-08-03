import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Analysis validation utility for data normalization
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  data: any;
}

class AnalysisValidator {
  static validateAndNormalize(rawAnalysis: any): ValidationResult {
    const warnings: string[] = [];
    
    if (!rawAnalysis || typeof rawAnalysis !== 'object') {
      warnings.push('Analysis data is null or not an object');
      return {
        isValid: false,
        warnings,
        data: this.createDefaultAnalysis()
      };
    }

    const suggestions = this.validateSuggestions(rawAnalysis.suggestions, warnings);
    const visualAnnotations = this.validateAnnotations(rawAnalysis.visual_annotations || rawAnalysis.visualAnnotations, warnings);
    const summary = this.validateSummary(rawAnalysis.summary, warnings);
    const metadata = this.validateMetadata(rawAnalysis.metadata, warnings);

    const normalizedAnalysis = {
      id: rawAnalysis.id || `analysis_${Date.now()}`,
      imageId: rawAnalysis.image_id || rawAnalysis.imageId || '',
      imageName: rawAnalysis.image_name || rawAnalysis.imageName || 'Untitled Image',
      imageUrl: rawAnalysis.image_url || rawAnalysis.imageUrl || '',
      userContext: rawAnalysis.user_context || rawAnalysis.userContext || '',
      visualAnnotations,
      suggestions,
      summary,
      metadata,
      createdAt: new Date(rawAnalysis.created_at || rawAnalysis.createdAt || Date.now()),
      modelUsed: rawAnalysis.model_used || rawAnalysis.modelUsed || 'unknown',
      status: rawAnalysis.status || 'completed'
    };

    return {
      isValid: warnings.length === 0,
      warnings,
      data: normalizedAnalysis
    };
  }

  private static validateSuggestions(rawSuggestions: any, warnings: string[]): any[] {
    if (!Array.isArray(rawSuggestions)) {
      warnings.push('Suggestions is not an array, using empty array');
      return [];
    }

    return rawSuggestions.map((suggestion, index) => {
      if (!suggestion || typeof suggestion !== 'object') {
        warnings.push(`Suggestion at index ${index} is invalid`);
        return this.createDefaultSuggestion(index);
      }

      return {
        id: suggestion.id || `suggestion_${index}`,
        category: this.validateSuggestionCategory(suggestion.category),
        title: suggestion.title || 'Untitled Suggestion',
        description: suggestion.description || 'No description provided',
        impact: suggestion.impact || 'medium',
        effort: suggestion.effort || 'medium',
        actionItems: Array.isArray(suggestion.actionItems) ? suggestion.actionItems : 
                    Array.isArray(suggestion.action_items) ? suggestion.action_items : [],
        relatedAnnotations: Array.isArray(suggestion.relatedAnnotations) ? suggestion.relatedAnnotations : []
      };
    });
  }

  private static validateSuggestionCategory(category: any): string {
    const validCategories = ['usability', 'accessibility', 'visual', 'content', 'performance'];
    return validCategories.includes(category) ? category : 'usability';
  }

  private static validateAnnotations(rawAnnotations: any, warnings: string[]): any[] {
    if (!Array.isArray(rawAnnotations)) {
      warnings.push('Visual annotations is not an array, using empty array');
      return [];
    }

    return rawAnnotations.map((annotation, index) => {
      if (!annotation || typeof annotation !== 'object') {
        warnings.push(`Annotation at index ${index} is invalid`);
        return this.createDefaultAnnotation(index);
      }

      return {
        id: annotation.id || `annotation_${index}`,
        x: typeof annotation.x === 'number' ? annotation.x : 0,
        y: typeof annotation.y === 'number' ? annotation.y : 0,
        type: annotation.type || 'issue',
        title: annotation.title || 'Untitled Issue',
        description: annotation.description || 'No description provided',
        severity: annotation.severity || 'medium'
      };
    });
  }

  private static validateSummary(rawSummary: any, warnings: string[]): any {
    if (!rawSummary || typeof rawSummary !== 'object') {
      warnings.push('Summary is missing or invalid, using default values');
      return this.createDefaultSummary();
    }

    return {
      overallScore: typeof rawSummary.overallScore === 'number' ? rawSummary.overallScore : 
                   typeof rawSummary.overall_score === 'number' ? rawSummary.overall_score : 75,
      categoryScores: this.validateCategoryScores(rawSummary.categoryScores || rawSummary.category_scores),
      keyIssues: Array.isArray(rawSummary.keyIssues) ? rawSummary.keyIssues :
                Array.isArray(rawSummary.key_issues) ? rawSummary.key_issues : [],
      strengths: Array.isArray(rawSummary.strengths) ? rawSummary.strengths : []
    };
  }

  private static validateCategoryScores(scores: any): any {
    const defaultScores = { usability: 50, accessibility: 50, visual: 50, content: 50 };
    
    if (!scores || typeof scores !== 'object') {
      return defaultScores;
    }

    return {
      usability: typeof scores.usability === 'number' ? scores.usability : defaultScores.usability,
      accessibility: typeof scores.accessibility === 'number' ? scores.accessibility : defaultScores.accessibility,
      visual: typeof scores.visual === 'number' ? scores.visual : defaultScores.visual,
      content: typeof scores.content === 'number' ? scores.content : defaultScores.content
    };
  }

  private static validateMetadata(rawMetadata: any, warnings: string[]): any {
    if (!rawMetadata || typeof rawMetadata !== 'object') {
      warnings.push('Metadata is missing, using default vision metadata');
      return this.createDefaultMetadata();
    }

    return {
      objects: Array.isArray(rawMetadata.objects) ? rawMetadata.objects : [],
      text: Array.isArray(rawMetadata.text) ? rawMetadata.text : [],
      colors: Array.isArray(rawMetadata.colors) ? rawMetadata.colors : [],
      faces: typeof rawMetadata.faces === 'number' ? rawMetadata.faces : 0
    };
  }

  private static createDefaultAnalysis(): any {
    return {
      id: `analysis_${Date.now()}`,
      imageId: '',
      imageName: 'Untitled Image',
      imageUrl: '',
      userContext: '',
      visualAnnotations: [],
      suggestions: [],
      summary: this.createDefaultSummary(),
      metadata: this.createDefaultMetadata(),
      createdAt: new Date(),
      modelUsed: 'fallback',
      status: 'completed'
    };
  }

  private static createDefaultSuggestion(index: number = 0): any {
    return {
      id: `suggestion_${index}`,
      category: 'usability',
      title: 'Analysis Incomplete',
      description: 'Unable to generate specific suggestion due to data issues',
      impact: 'low',
      effort: 'low',
      actionItems: [],
      relatedAnnotations: []
    };
  }

  private static createDefaultAnnotation(index: number = 0): any {
    return {
      id: `annotation_${index}`,
      x: 0,
      y: 0,
      type: 'issue',
      title: 'Data Issue',
      description: 'Invalid annotation data',
      severity: 'low'
    };
  }

  private static createDefaultSummary(): any {
    return {
      overallScore: 50,
      categoryScores: {
        usability: 50,
        accessibility: 50,
        visual: 50,
        content: 50
      },
      keyIssues: ['Unable to analyze due to data issues'],
      strengths: []
    };
  }

  private static createDefaultMetadata(): any {
    return {
      objects: [],
      text: [],
      colors: [],
      faces: 0
    };
  }
}

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
        
        case 'get-parsing-metrics':
          // PHASE 4.2: Return JSON parsing metrics for monitoring
          return new Response(
            JSON.stringify(getParsingMetrics()),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        
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
  
  const { model, stage, imageUrl, imageBase64, prompt, systemPrompt, visionData, analysisData } = payload
  
  console.log('executeModel - Extracted fields:', { 
    model, 
    stage, 
    hasImageUrl: !!imageUrl, 
    hasImageBase64: !!imageBase64,
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

// PHASE 4.2: JSON Parsing Monitoring
interface JsonParsingMetrics {
  model: string;
  stage: string;
  method: 'direct' | 'smart-pattern' | 'content-cleaning' | 'failed';
  success: boolean;
  responseLength: number;
  parseTime: number;
}

// Simple in-memory metrics store for edge function
const parsingMetrics: JsonParsingMetrics[] = [];

function trackJsonParsing(
  model: string,
  stage: string,
  method: 'direct' | 'smart-pattern' | 'content-cleaning' | 'failed',
  success: boolean,
  responseLength: number,
  parseTime: number
) {
  const metric: JsonParsingMetrics = {
    model,
    stage,
    method,
    success,
    responseLength,
    parseTime
  };
  
  parsingMetrics.push(metric);
  
  // Keep only recent metrics to avoid memory bloat
  if (parsingMetrics.length > 500) {
    parsingMetrics.splice(0, 250); // Remove oldest half
  }
  
  console.log(`📊 JSON Parse Tracking [${model}/${stage}]: ${method} ${success ? '✅' : '❌'} (${parseTime}ms)`);
}

// PHASE 3.1: Smart Response Parsing - Alternative approach that doesn't rely on response_format
function parseJsonFromResponse(responseText: string, model: string, stage: string): { success: boolean; data?: any; error?: string } {
  console.log('🔍 PHASE 3.1: Attempting to parse JSON from response');
  const startTime = Date.now();
  
  try {
    // Method 1: Try direct JSON parsing first
    const directParse = JSON.parse(responseText);
    const parseTime = Date.now() - startTime;
    trackJsonParsing(model, stage, 'direct', true, responseText.length, parseTime);
    console.log('✅ Direct JSON parse successful');
    return { success: true, data: directParse };
  } catch (directError) {
    console.log('⚠️ Direct JSON parse failed, trying extraction methods');
    
    // Method 2: Extract JSON using regex patterns
    const jsonPatterns = [
      /\{[\s\S]*\}/,                    // Basic JSON object
      /```json\s*(\{[\s\S]*?\})\s*```/i, // JSON in code blocks
      /```\s*(\{[\s\S]*?\})\s*```/,     // JSON in plain code blocks
      /(?:^|\n)\s*(\{[\s\S]*?\})\s*(?:\n|$)/ // JSON at start/end of lines
    ];
    
    for (const pattern of jsonPatterns) {
      const match = responseText.match(pattern);
      if (match) {
        const extractedJson = match[1] || match[0];
        try {
          const parsed = JSON.parse(extractedJson);
          const parseTime = Date.now() - startTime;
          trackJsonParsing(model, stage, 'smart-pattern', true, responseText.length, parseTime);
          console.log('✅ JSON extracted successfully using pattern:', pattern.source.substring(0, 20) + '...');
          return { success: true, data: parsed };
        } catch (parseError) {
          console.log('❌ Pattern matched but JSON invalid:', pattern.source.substring(0, 20) + '...');
          continue;
        }
      }
    }
    
    // Method 3: Attempt to clean and parse
    try {
      // Remove common non-JSON prefixes/suffixes
      let cleaned = responseText
        .replace(/^[^{]*/, '')  // Remove everything before first {
        .replace(/[^}]*$/, ''); // Remove everything after last }
      
      if (cleaned.includes('{') && cleaned.includes('}')) {
        const parsed = JSON.parse(cleaned);
        const parseTime = Date.now() - startTime;
        trackJsonParsing(model, stage, 'content-cleaning', true, responseText.length, parseTime);
        console.log('✅ JSON parsed after cleaning');
        return { success: true, data: parsed };
      }
    } catch (cleanError) {
      console.log('❌ Cleaned JSON parse also failed');
    }
    
    const parseTime = Date.now() - startTime;
    trackJsonParsing(model, stage, 'failed', false, responseText.length, parseTime);
    console.error('❌ All JSON parsing methods failed');
    return { 
      success: false, 
      error: `Failed to extract valid JSON from response. Response length: ${responseText.length}` 
    };
  }
}

// PHASE 4.2: Get parsing metrics for monitoring endpoint
function getParsingMetrics() {
  const totalAttempts = parsingMetrics.length;
  const successfulAttempts = parsingMetrics.filter(m => m.success).length;
  const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;

  // Method breakdown
  const methodBreakdown: Record<string, number> = {};
  parsingMetrics.forEach(m => {
    methodBreakdown[m.method] = (methodBreakdown[m.method] || 0) + 1;
  });

  // Model performance breakdown
  const modelPerformance: Record<string, { success: number; total: number; rate: number }> = {};
  parsingMetrics.forEach(m => {
    if (!modelPerformance[m.model]) {
      modelPerformance[m.model] = { success: 0, total: 0, rate: 0 };
    }
    modelPerformance[m.model].total++;
    if (m.success) {
      modelPerformance[m.model].success++;
    }
  });

  // Calculate rates
  Object.keys(modelPerformance).forEach(model => {
    const perf = modelPerformance[model];
    perf.rate = perf.total > 0 ? perf.success / perf.total : 0;
  });

  // Average parse time
  const parseTimes = parsingMetrics.map(m => m.parseTime);
  const averageParseTime = parseTimes.length > 0 
    ? parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length 
    : 0;

  return {
    totalAttempts,
    successRate: Math.round(successRate * 100) / 100,
    methodBreakdown,
    modelPerformance,
    averageParseTime: Math.round(averageParseTime * 100) / 100,
    timestamp: new Date().toISOString()
  };
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
    hasImage: !!(payload.imageUrl || payload.imageBase64),
    promptLength: payload.prompt?.length || 0
  });
  
  
  try {
    const { imageUrl, imageBase64, systemPrompt } = payload;
    
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
    
    let processedImageUrl = null;
    
    // Handle image data - prioritize base64 from frontend over URL fetching
    if (imageBase64) {
      console.log('Using provided base64 image data, length:', imageBase64.length);
      processedImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    } else if (imageUrl && !imageUrl.startsWith('data:')) {
      console.log('Converting image URL to base64 for OpenAI...');
      const base64Data = await fetchImageAsBase64(imageUrl);
      processedImageUrl = `data:image/jpeg;base64,${base64Data}`;
      console.log('Image converted successfully');
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      console.log('Using existing data URL');
      processedImageUrl = imageUrl;
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
    
    // PHASE 3.2: Hybrid Strategy - Try strict JSON first, fallback to smart parsing
    try {
      // Method 1: Direct JSON parsing (for proper JSON responses)
      const parsedJson = JSON.parse(content);
      console.log('✅ PHASE 3.2: Direct JSON parsing successful');
      return new Response(
        JSON.stringify(parsedJson),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (directParseError) {
      console.log('⚠️ PHASE 3.2: Direct JSON parse failed, attempting smart parsing');
      
      // Method 2: Smart parsing fallback
      const smartParseResult = parseJsonFromResponse(content, payload.model, payload.stage);
      
      if (smartParseResult.success) {
        console.log('✅ PHASE 3.2: Smart parsing successful');
        return new Response(
          JSON.stringify(smartParseResult.data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error('❌ PHASE 3.2: Both parsing methods failed:', smartParseResult.error);
        // Return raw content with error info
        return new Response(
          JSON.stringify({ 
            content, 
            parseError: smartParseResult.error,
            note: 'Raw response returned due to JSON parsing failure'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
    hasImage: !!(payload.imageUrl || payload.imageBase64),
    promptLength: payload.prompt?.length || 0
  });
  
  try {
    const { imageUrl, imageBase64, prompt, systemPrompt } = payload;
    
    let base64Data = '';
    let mediaType = 'image/jpeg';
    
    // Handle image data - prioritize base64 from frontend over URL fetching
    if (imageBase64) {
      console.log('Using provided base64 image data, length:', imageBase64.length);
      base64Data = imageBase64;
      mediaType = 'image/jpeg'; // Default, could be enhanced to detect format
    } else if (imageUrl && !imageUrl.startsWith('data:')) {
      console.log('Converting image URL to base64 for Anthropic...');
      base64Data = await fetchImageAsBase64(imageUrl);
      mediaType = detectImageFormat(imageUrl, base64Data);
      console.log('Image converted successfully for Anthropic');
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      console.log('Using existing data URL for Anthropic');
      base64Data = imageUrl.split(',')[1];
      mediaType = detectImageFormat(imageUrl);
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
    
    // PHASE 3.2: Apply hybrid strategy to Anthropic as well
    try {
      // Method 1: Direct JSON parsing
      const parsedJson = JSON.parse(content);
      console.log('✅ Anthropic: Direct JSON parsing successful');
      return new Response(
        JSON.stringify(parsedJson),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (directParseError) {
      console.log('⚠️ Anthropic: Direct JSON parse failed, attempting smart parsing');
      
      // Method 2: Smart parsing fallback
      const smartParseResult = parseJsonFromResponse(content, payload.model, payload.stage);
      
      if (smartParseResult.success) {
        console.log('✅ Anthropic: Smart parsing successful');
        return new Response(
          JSON.stringify(smartParseResult.data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('⚠️ Anthropic: Smart parsing failed, returning raw content');
        return new Response(
          JSON.stringify({ content }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

function buildAnalysisPrompt(userContext?: string): string {
  const contextPart = userContext ? `Context: ${userContext}` : 'General UX analysis';
  
  return `Analyze this application interface for usability, navigation patterns, and feature discoverability. Document the interaction model, state management, and user workflows.

Designer Perspective:
- Evaluate visual hierarchy and gestalt principles
- Analyze color theory application and accessibility
- Assess typography system and readability
- Review spacing consistency and visual rhythm
- Consider emotional design impact
- Identify design system opportunities

Perform comprehensive UX analysis of this interface, identifying its purpose, user flows, and optimization opportunities.

Return analysis as structured JSON with:
{
  "elements": { /* UI elements detected */ },
  "layout": { /* Grid, spacing, hierarchy */ },
  "colors": { /* Color palette and usage */ },
  "content": { /* Text content and headings */ },
  "interactions": { /* Buttons, links, forms */ },
  "confidence": { /* Detection confidence scores */ }
}

Quality Requirements:
- Provide specific, measurable recommendations
- Include confidence scores for all assessments
- Reference established UX principles and guidelines
- Consider both user needs and business objectives
- Ensure compliance with WCAG-AA standards
- Prioritize recommendations by effort

${contextPart}`;
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
      try {
        // Map Canvas format to pipeline format
        const convertedPayload = {
          model: payload.aiModel || 'gpt-4o', // Use selected model
          stage: 'vision', // Start with vision stage
          imageUrl: payload.payload?.imageUrl,
          imageBase64: payload.payload?.imageBase64, // Handle base64 images
          prompt: buildAnalysisPrompt(payload.payload?.userContext),
          systemPrompt: 'You are a senior UX/UI designer with deep expertise in visual design, usability, and design systems. You are analyzing a app interface in the general domain. \n    Adapt your communication style to some-technical technical level.\n    Focus on effort-based prioritization.\n    \n    Always provide your responses in valid JSON format as specified in the user prompt.'
        }
        
        console.log('Converted Canvas payload:', convertedPayload)
        const modelResult = await executeModel(convertedPayload)
        
        // Wrap result in Canvas-expected format
        return new Response(
          JSON.stringify({
            success: true,
            data: modelResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Error in Canvas request:', error)
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
    default:
      throw new Error(`Unknown Canvas action: ${action}`)
  }
}

async function storeAnalysisResults(pipelineResults: any) {
  const { visionResults, analysisResults, synthesisResults, analysisContext } = pipelineResults
  
  // Create final analysis structure with context
  const rawAnalysis = {
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

  // Apply validation and normalization to ensure data integrity
  console.log('🔍 Validating and normalizing analysis data...');
  const validationResult = AnalysisValidator.validateAndNormalize(rawAnalysis);
  
  if (validationResult.warnings.length > 0) {
    console.warn('⚠️ Analysis validation warnings:', validationResult.warnings);
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: validationResult.data,
      warnings: validationResult.warnings
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}