import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIAnalysisRequest {
  imageId: string;
  imageUrl: string;
  imageName: string;
  userContext?: string;
  aiModel: 'claude' | 'openai';
}

interface VisionMetadata {
  objects: Array<{ name: string; confidence: number; boundingBox?: any }>;
  text: string[];
  colors: Array<{ color: string; percentage: number }>;
  faces: number;
  labels: Array<{ name: string; confidence: number }>;
  web?: any;
}

async function performClaudeAnalysis(imageUrl: string, imageName: string, userContext: string, metadata: VisionMetadata) {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  // Create enhanced prompt using metadata
  const metadataContext = `
Pre-extracted metadata about this image:
- Objects detected: ${metadata.objects.map(o => o.name).join(', ')}
- Text content: ${metadata.text.join(', ')}
- Dominant colors: ${metadata.colors.map(c => c.color).join(', ')}
- Human faces detected: ${metadata.faces}
- Labels: ${metadata.labels.map(l => l.name).join(', ')}`;

  const prompt = `Analyze this UI/UX design for comprehensive usability insights.

${metadataContext}

${userContext ? `User context: ${userContext}` : ''}

Please provide a detailed UX analysis in this JSON format:
{
  "visualAnnotations": [
    {
      "id": "string",
      "x": number,
      "y": number,
      "type": "issue|suggestion|success",
      "title": "string",
      "description": "string",
      "severity": "low|medium|high"
    }
  ],
  "suggestions": [
    {
      "id": "string",
      "category": "usability|accessibility|visual|content",
      "title": "string",
      "description": "string",
      "impact": "low|medium|high",
      "effort": "low|medium|high",
      "actionItems": ["string"]
    }
  ],
  "summary": {
    "overallScore": number,
    "categoryScores": {
      "usability": number,
      "accessibility": number,
      "visual": number,
      "content": number
    },
    "keyIssues": ["string"],
    "strengths": ["string"]
  }
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anthropicApiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2024-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl
            }
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse Claude response:', content);
    throw new Error('Invalid response format from Claude');
  }
}

async function performOpenAIAnalysis(imageUrl: string, imageName: string, userContext: string, metadata: VisionMetadata) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Create enhanced prompt using metadata
  const metadataContext = `
Pre-extracted metadata about this image:
- Objects detected: ${metadata.objects.map(o => o.name).join(', ')}
- Text content: ${metadata.text.join(', ')}
- Dominant colors: ${metadata.colors.map(c => c.color).join(', ')}
- Human faces detected: ${metadata.faces}
- Labels: ${metadata.labels.map(l => l.name).join(', ')}`;

  const prompt = `Analyze this UI/UX design for comprehensive usability insights.

${metadataContext}

${userContext ? `User context: ${userContext}` : ''}

Please provide a detailed UX analysis in this exact JSON format:
{
  "visualAnnotations": [
    {
      "id": "string",
      "x": number,
      "y": number,
      "type": "issue|suggestion|success",
      "title": "string",
      "description": "string",
      "severity": "low|medium|high"
    }
  ],
  "suggestions": [
    {
      "id": "string",
      "category": "usability|accessibility|visual|content",
      "title": "string",
      "description": "string",
      "impact": "low|medium|high",
      "effort": "low|medium|high",
      "actionItems": ["string"]
    }
  ],
  "summary": {
    "overallScore": number,
    "categoryScores": {
      "usability": number,
      "accessibility": number,
      "visual": number,
      "content": number
    },
    "keyIssues": ["string"],
    "strengths": ["string"]
  }
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
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
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Invalid response format from OpenAI');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { imageId, imageUrl, imageName, userContext = '', aiModel }: AIAnalysisRequest = await req.json();

    if (!imageId || !imageUrl || !imageName || !aiModel) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageId, imageUrl, imageName, aiModel' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting AI analysis with ${aiModel} for image:`, imageId);

    // Get pre-extracted metadata from database
    const { data: imageData, error: imageError } = await supabaseClient
      .from('images')
      .select('metadata')
      .eq('id', imageId)
      .single();

    if (imageError || !imageData) {
      return new Response(
        JSON.stringify({ error: 'Image not found or metadata not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = imageData.metadata as VisionMetadata;
    if (!metadata || !metadata.provider) {
      return new Response(
        JSON.stringify({ error: 'Image metadata not yet extracted. Please try again in a few moments.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform AI analysis using selected model
    let analysisResult;
    if (aiModel === 'claude') {
      analysisResult = await performClaudeAnalysis(imageUrl, imageName, userContext, metadata);
    } else {
      analysisResult = await performOpenAIAnalysis(imageUrl, imageName, userContext, metadata);
    }

    console.log(`${aiModel} analysis completed`);

    // Store analysis in database
    const { data: analysis, error: dbError } = await supabaseClient
      .from('ux_analyses')
      .insert({
        image_id: imageId,
        user_context: userContext,
        visual_annotations: analysisResult.visualAnnotations,
        suggestions: analysisResult.suggestions,
        summary: analysisResult.summary,
        analysis_type: 'ai_analysis',
        metadata: {
          aiModel,
          analysisTimestamp: new Date().toISOString(),
          basedOnMetadata: true,
          metadataProvider: metadata.provider
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store analysis');
    }

    console.log('AI analysis stored in database successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: analysis.id,
          imageId,
          imageName,
          imageUrl,
          userContext: analysis.user_context,
          visualAnnotations: analysis.visual_annotations,
          suggestions: analysis.suggestions,
          summary: analysis.summary,
          metadata: analysis.metadata,
          createdAt: analysis.created_at,
          aiModel
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to perform AI analysis',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});