import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaudeVisionRequest {
  imageUrl: string;
  userContext?: string;
  analysisType?: 'ux-critique' | 'accessibility' | 'usability' | 'comprehensive';
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

async function analyzeImageWithClaude(imageUrl: string, userContext?: string, analysisType = 'comprehensive'): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  // Get image as base64
  let imageData: string;
  let mediaType: string;
  
  try {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    // Determine media type from URL or default to jpeg
    const url = new URL(imageUrl);
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'png':
        mediaType = 'image/png';
        break;
      case 'webp':
        mediaType = 'image/webp';
        break;
      case 'gif':
        mediaType = 'image/gif';
        break;
      default:
        mediaType = 'image/jpeg';
    }
    
    imageData = base64Image;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image for Claude analysis');
  }

  // Create analysis prompt based on type
  let systemPrompt = '';
  let userPrompt = '';

  switch (analysisType) {
    case 'ux-critique':
      systemPrompt = 'You are an expert UX designer and researcher. Analyze this interface design critically and provide actionable feedback.';
      userPrompt = `Please analyze this UI/UX design and provide a comprehensive critique. Focus on:

1. User experience and interaction design
2. Information architecture and navigation
3. Visual hierarchy and layout
4. User flow and task completion
5. Overall usability concerns

${userContext ? `Additional context: ${userContext}` : ''}

Please structure your response as a JSON object with this exact format:
{
  "visualAnnotations": [
    {
      "id": "annotation-id",
      "x": 100,
      "y": 200,
      "type": "issue|suggestion|success",
      "title": "Short title",
      "description": "Detailed description",
      "severity": "low|medium|high"
    }
  ],
  "suggestions": [
    {
      "id": "suggestion-id",
      "category": "usability|accessibility|visual|content|performance",
      "title": "Suggestion title",
      "description": "Detailed description",
      "impact": "low|medium|high",
      "effort": "low|medium|high",
      "actionItems": ["action 1", "action 2"],
      "relatedAnnotations": ["annotation-id"]
    }
  ],
  "summary": {
    "overallScore": 85,
    "categoryScores": {
      "usability": 90,
      "accessibility": 75,
      "visual": 85,
      "content": 80
    },
    "keyIssues": ["issue 1", "issue 2"],
    "strengths": ["strength 1", "strength 2"]
  }
}`;
      break;
      
    case 'accessibility':
      systemPrompt = 'You are an accessibility expert specializing in WCAG guidelines and inclusive design. Analyze this interface for accessibility compliance.';
      userPrompt = `Please analyze this interface for accessibility compliance and inclusive design. Focus on:

1. WCAG 2.1 AA compliance
2. Color contrast and readability
3. Keyboard navigation support
4. Screen reader compatibility
5. Motor accessibility considerations
6. Cognitive accessibility factors

${userContext ? `Additional context: ${userContext}` : ''}

Provide your analysis in the same JSON format as specified above, with emphasis on accessibility-related annotations and suggestions.`;
      break;
      
    case 'usability':
      systemPrompt = 'You are a usability expert. Analyze this interface for ease of use, efficiency, and user satisfaction.';
      userPrompt = `Please analyze this interface for usability. Focus on:

1. Ease of learning and use
2. Efficiency of task completion
3. User error prevention and recovery
4. User satisfaction and delight
5. Consistency and standards compliance

${userContext ? `Additional context: ${userContext}` : ''}

Provide your analysis in the same JSON format as specified above, focusing on usability aspects.`;
      break;
      
    default: // comprehensive
      systemPrompt = 'You are a senior UX/UI designer with expertise in user research, accessibility, and visual design. Provide a comprehensive analysis of this interface.';
      userPrompt = `Please provide a comprehensive UX/UI analysis of this interface. Analyze:

1. Visual design and aesthetics
2. User experience and usability
3. Accessibility compliance
4. Information architecture
5. Interaction design
6. Content strategy
7. Performance implications
8. Mobile responsiveness (if applicable)

${userContext ? `Additional context: ${userContext}` : ''}

Please structure your response as a JSON object with this exact format:
{
  "visualAnnotations": [
    {
      "id": "annotation-id",
      "x": 100,
      "y": 200,
      "type": "issue|suggestion|success",
      "title": "Short title",
      "description": "Detailed description",
      "severity": "low|medium|high"
    }
  ],
  "suggestions": [
    {
      "id": "suggestion-id",
      "category": "usability|accessibility|visual|content|performance",
      "title": "Suggestion title",
      "description": "Detailed description",
      "impact": "low|medium|high",
      "effort": "low|medium|high",
      "actionItems": ["action 1", "action 2"],
      "relatedAnnotations": ["annotation-id"]
    }
  ],
  "summary": {
    "overallScore": 85,
    "categoryScores": {
      "usability": 90,
      "accessibility": 75,
      "visual": 85,
      "content": 80
    },
    "keyIssues": ["issue 1", "issue 2"],
    "strengths": ["strength 1", "strength 2"]
  }
}

Ensure all coordinates (x, y) are reasonable pixel values for the interface elements you're annotating.`;
  }

  const requestBody = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageData
            }
          },
          {
            type: 'text',
            text: userPrompt
          }
        ]
      }
    ]
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const claudeResponse: ClaudeResponse = await response.json();
  
  if (!claudeResponse.content || claudeResponse.content.length === 0) {
    throw new Error('No content received from Claude');
  }

  return claudeResponse.content[0].text;
}

function parseClaudeResponse(responseText: string) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // Validate required structure
      if (!parsed.visualAnnotations) parsed.visualAnnotations = [];
      if (!parsed.suggestions) parsed.suggestions = [];
      if (!parsed.summary) {
        parsed.summary = {
          overallScore: 75,
          categoryScores: {
            usability: 75,
            accessibility: 75,
            visual: 75,
            content: 75
          },
          keyIssues: [],
          strengths: []
        };
      }
      
      return {
        ...parsed,
        provider: 'claude-vision',
        analysisType: 'ai-critique'
      };
    } else {
      // If no JSON found, create structured response from text
      return createFallbackResponse(responseText);
    }
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    return createFallbackResponse(responseText);
  }
}

function createFallbackResponse(responseText: string) {
  // Create a structured response from unstructured text
  const lines = responseText.split('\n').filter(line => line.trim());
  
  const suggestions = [];
  const issues = [];
  
  // Extract potential issues and suggestions from text
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('issue') || line.toLowerCase().includes('problem')) {
      issues.push(line.trim());
    }
    if (line.toLowerCase().includes('suggest') || line.toLowerCase().includes('recommend')) {
      suggestions.push({
        id: `claude-suggestion-${index}`,
        category: 'usability',
        title: 'Claude Recommendation',
        description: line.trim(),
        impact: 'medium',
        effort: 'medium',
        actionItems: [line.trim()],
        relatedAnnotations: []
      });
    }
  });

  return {
    visualAnnotations: [{
      id: 'claude-general',
      x: 400,
      y: 300,
      type: 'suggestion',
      title: 'Claude Analysis Available',
      description: 'Click to view detailed Claude analysis',
      severity: 'medium'
    }],
    suggestions: suggestions.length > 0 ? suggestions : [{
      id: 'claude-analysis',
      category: 'usability',
      title: 'Claude UX Analysis',
      description: responseText.substring(0, 200) + '...',
      impact: 'medium',
      effort: 'low',
      actionItems: ['Review detailed Claude analysis', 'Implement suggested improvements'],
      relatedAnnotations: ['claude-general']
    }],
    summary: {
      overallScore: 75,
      categoryScores: {
        usability: 75,
        accessibility: 75,
        visual: 75,
        content: 75
      },
      keyIssues: issues.slice(0, 3),
      strengths: ['Analyzed by Claude AI', 'Detailed feedback available']
    },
    metadata: {
      rawResponse: responseText,
      provider: 'claude-vision',
      analysisType: 'ai-critique'
    },
    provider: 'claude-vision',
    analysisType: 'ai-critique'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userContext, analysisType }: ClaudeVisionRequest = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Claude vision analysis for:', imageUrl);
    console.log('Analysis type:', analysisType);

    // Analyze image with Claude
    const claudeResponse = await analyzeImageWithClaude(imageUrl, userContext, analysisType);
    
    console.log('Claude analysis completed');

    // Parse and structure the response
    const uxAnalysis = parseClaudeResponse(claudeResponse);

    console.log('Claude response parsing completed');

    return new Response(
      JSON.stringify({
        success: true,
        analysis: uxAnalysis,
        rawClaudeResponse: claudeResponse // Include raw response for debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in Claude vision analysis:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to analyze image with Claude',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});