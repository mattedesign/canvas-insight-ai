import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisualSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  prompt: string;
  priority: string;
  estimatedImpact: string;
}

interface MockupRequest {
  imageUrl: string;
  suggestions: VisualSuggestion[];
  context?: any;
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

    const request: MockupRequest = await req.json();
    console.log('Generating mockups for', request.suggestions.length, 'suggestions');

    const generatedMockups = [];

    for (const suggestion of request.suggestions.slice(0, 5)) { // Limit to 5 mockups
      try {
        console.log('Generating mockup for suggestion:', suggestion.id);

        // Enhanced prompt for better results
        const enhancedPrompt = `Professional UI/UX mockup: ${suggestion.prompt}. 
        Modern interface design with clean typography, proper spacing, accessible colors, 
        and user-friendly layout. High-quality digital design mockup, 
        professional presentation, sharp details, modern aesthetic.`;

        const formData = new FormData();
        formData.append('prompt', enhancedPrompt);
        formData.append('aspect_ratio', '16:9');
        formData.append('model', 'sd3-large-turbo');
        formData.append('output_format', 'png');
        formData.append('style_preset', 'digital-art');

        const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stabilityApiKey}`,
            'Accept': 'image/*',
          },
          body: formData
        });

        if (response.ok) {
          const imageBlob = await response.blob();
          const base64 = await blobToBase64(imageBlob);
          
          generatedMockups.push({
            suggestionId: suggestion.id,
            imageUrl: base64,
            prompt: enhancedPrompt,
            model: 'sd3-large-turbo',
            title: suggestion.title,
            description: suggestion.description
          });

          console.log('Successfully generated mockup for suggestion:', suggestion.id);
        } else {
          console.error('Failed to generate mockup for suggestion:', suggestion.id, response.status);
        }
      } catch (error) {
        console.error('Error generating mockup for suggestion:', suggestion.id, error);
      }

      // Add delay between requests to avoid rate limiting
      if (request.suggestions.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      generatedMockups,
      totalGenerated: generatedMockups.length,
      totalRequested: Math.min(request.suggestions.length, 5)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in stability-mockup-generator function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        generatedMockups: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}