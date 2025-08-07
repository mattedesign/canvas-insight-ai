import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisualSuggestion {
  id: string;
  type: 'mockup' | 'improvement' | 'variation' | 'inpainting';
  title: string;
  description: string;
  prompt: string;
  targetElement?: string;
  maskData?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

interface StabilityAnalysisRequest {
  imageUrl: string;
  analysis: any;
  context?: any;
  generationType: 'suggestions' | 'mockups' | 'variations' | 'inpainting';
  userPreferences?: {
    style?: 'modern' | 'minimalist' | 'bold' | 'classic';
    colorScheme?: 'current' | 'high-contrast' | 'accessible' | 'brand-aligned';
    complexity?: 'simple' | 'detailed' | 'comprehensive';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stabilityApiKey = Deno.env.get('STABILITY_API_KEY');
    if (!stabilityApiKey) {
      return new Response(
        JSON.stringify({ error: 'Stability AI API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const request: StabilityAnalysisRequest = await req.json();
    console.log('Processing Stability analysis request:', request.generationType);

    // Analyze the UX analysis results to generate visual suggestions
    const visualSuggestions = await generateVisualSuggestions(request, openaiApiKey);
    
    // Generate images for high-priority suggestions if requested
    let generatedImages: any[] = [];
    if (request.generationType === 'mockups' || request.generationType === 'variations') {
      generatedImages = await generateMockupImages(
        visualSuggestions.filter(s => s.priority === 'high').slice(0, 3),
        stabilityApiKey
      );
    }

    // Generate analysis insights
    const analysisInsights = await generateAnalysisInsights(request, openaiApiKey);

    const result = {
      success: true,
      visualSuggestions,
      generatedImages,
      analysisInsights
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in stability-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        visualSuggestions: [],
        analysisInsights: {
          visualOpportunities: [],
          designPatterns: [],
          accessibilityImprovements: [],
          conversionOptimizations: []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateVisualSuggestions(
  request: StabilityAnalysisRequest,
  openaiApiKey: string
): Promise<VisualSuggestion[]> {
  try {
    const interfaceType = request.context?.image?.detectedType || 'interface';
    const userRole = request.context?.user?.role || 'designer';
    
    const prompt = `As a UX expert, analyze this ${interfaceType} analysis and generate specific visual improvement suggestions.

Analysis Summary:
- Usability Issues: ${request.analysis.usabilityIssues?.length || 0}
- Accessibility Issues: ${request.analysis.accessibilityIssues?.length || 0}
- Design Suggestions: ${request.analysis.designSuggestions?.length || 0}

User Preferences:
- Style: ${request.userPreferences?.style || 'modern'}
- Color Scheme: ${request.userPreferences?.colorScheme || 'current'}
- Complexity: ${request.userPreferences?.complexity || 'detailed'}

Generate 5-8 actionable visual suggestions that would improve this interface. For each suggestion, provide:
1. A clear title
2. Detailed description
3. A specific Stability AI prompt for generating the improvement
4. Priority level (high/medium/low)
5. Estimated impact

Focus on ${request.generationType === 'suggestions' ? 'specific improvement recommendations' : 
          request.generationType === 'mockups' ? 'complete interface mockups' :
          request.generationType === 'variations' ? 'design variations and alternatives' :
          'targeted inpainting suggestions'}.

Return as JSON array with this structure:
{
  "suggestions": [
    {
      "id": "unique-id",
      "type": "mockup|improvement|variation|inpainting",
      "title": "suggestion title",
      "description": "detailed description",
      "prompt": "stability ai generation prompt",
      "priority": "high|medium|low",
      "estimatedImpact": "impact description"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert UX designer and visual design specialist. Generate specific, actionable visual improvement suggestions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      return parsed.suggestions || [];
    } catch {
      // Fallback to text parsing if JSON fails
      return parseTextSuggestions(content);
    }
  } catch (error) {
    console.error('Error generating visual suggestions:', error);
    return [];
  }
}

async function generateMockupImages(
  suggestions: VisualSuggestion[],
  stabilityApiKey: string
): Promise<Array<{ suggestionId: string; imageUrl: string; prompt: string; model: string }>> {
  const results = [];

  for (const suggestion of suggestions) {
    try {
      const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stabilityApiKey}`,
          'Accept': 'image/*',
        },
        body: new FormData(Object.assign(new FormData(), {
          prompt: suggestion.prompt,
          aspect_ratio: '16:9',
          model: 'sd3-large-turbo',
          output_format: 'png'
        } as any))
      });

      if (response.ok) {
        const imageBlob = await response.blob();
        const base64 = await blobToBase64(imageBlob);
        
        results.push({
          suggestionId: suggestion.id,
          imageUrl: base64,
          prompt: suggestion.prompt,
          model: 'sd3-large-turbo'
        });
      }
    } catch (error) {
      console.error(`Error generating image for suggestion ${suggestion.id}:`, error);
    }
  }

  return results;
}

async function generateAnalysisInsights(
  request: StabilityAnalysisRequest,
  openaiApiKey: string
): Promise<{
  visualOpportunities: string[];
  designPatterns: string[];
  accessibilityImprovements: string[];
  conversionOptimizations: string[];
}> {
  try {
    const prompt = `Analyze this UX analysis and provide strategic insights for visual improvements:

Analysis: ${JSON.stringify(request.analysis, null, 2)}
Context: ${JSON.stringify(request.context, null, 2)}

Provide insights in these categories:
1. Visual Opportunities - What visual elements could be enhanced
2. Design Patterns - Which proven patterns could be applied
3. Accessibility Improvements - Visual accessibility enhancements needed
4. Conversion Optimizations - Visual changes that could improve conversions

Return as JSON with arrays for each category.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a UX strategy expert. Provide concise, actionable insights.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch {
      return {
        visualOpportunities: ['Improve visual hierarchy and contrast'],
        designPatterns: ['Apply modern card-based layouts'],
        accessibilityImprovements: ['Increase color contrast ratios'],
        conversionOptimizations: ['Enhance call-to-action visibility']
      };
    }
  } catch (error) {
    console.error('Error generating analysis insights:', error);
    return {
      visualOpportunities: [],
      designPatterns: [],
      accessibilityImprovements: [],
      conversionOptimizations: []
    };
  }
}

function parseTextSuggestions(content: string): VisualSuggestion[] {
  // Fallback text parsing implementation
  return [
    {
      id: 'fallback-1',
      type: 'improvement',
      title: 'Visual Enhancement',
      description: 'Improve overall visual design based on analysis',
      prompt: 'Create a modern, accessible interface design with improved visual hierarchy',
      priority: 'high',
      estimatedImpact: 'Enhanced user experience and engagement'
    }
  ];
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}