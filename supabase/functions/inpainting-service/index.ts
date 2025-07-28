import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InpaintingRequest {
  imageUrl: string;
  maskData: string; // Base64 encoded mask image
  prompt: string;
  userId: string;
  imageId?: string;
}

interface InpaintingResult {
  imageUrl: string;
  prompt: string;
  originalImageUrl: string;
  createdAt: string;
  provider: string;
}

async function performStabilityAIInpainting(
  imageUrl: string, 
  maskData: string, 
  prompt: string
): Promise<string> {
  const stabilityApiKey = Deno.env.get('STABILITY_API_KEY');
  if (!stabilityApiKey) {
    throw new Error('Stability AI API key not configured');
  }

  // Fetch the original image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

  // Prepare form data for Stability AI
  const formData = new FormData();
  formData.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }));
  formData.append('mask', new Blob([Uint8Array.from(atob(maskData), c => c.charCodeAt(0))], { type: 'image/png' }));
  formData.append('prompt', prompt);
  formData.append('output_format', 'png');

  const response = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stabilityApiKey}`,
      'Accept': 'image/*'
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
  }

  // Convert response to base64 for storage
  const resultBuffer = await response.arrayBuffer();
  const resultBase64 = btoa(String.fromCharCode(...new Uint8Array(resultBuffer)));
  
  return `data:image/png;base64,${resultBase64}`;
}

async function checkUserSubscription(userId: string, supabaseClient: any): Promise<boolean> {
  // Check if user has active subscription for premium features
  const { data: subscription, error } = await supabaseClient
    .from('subscribers')
    .select('subscribed, subscription_tier')
    .eq('user_id', userId)
    .single();

  if (error || !subscription) {
    return false;
  }

  return subscription.subscribed && 
         (subscription.subscription_tier === 'premium' || subscription.subscription_tier === 'enterprise');
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

    const { imageUrl, maskData, prompt, userId, imageId }: InpaintingRequest = await req.json();

    if (!imageUrl || !maskData || !prompt || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageUrl, maskData, prompt, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting inpainting service for user:', userId);

    // Check if user has premium access
    const hasPremiumAccess = await checkUserSubscription(userId, supabaseClient);
    if (!hasPremiumAccess) {
      return new Response(
        JSON.stringify({ 
          error: 'Premium subscription required for inpainting features',
          requiresUpgrade: true 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform inpainting with Stability AI
    const resultImageUrl = await performStabilityAIInpainting(imageUrl, maskData, prompt);
    
    console.log('Inpainting completed successfully');

    // Create result object
    const result: InpaintingResult = {
      imageUrl: resultImageUrl,
      prompt,
      originalImageUrl: imageUrl,
      createdAt: new Date().toISOString(),
      provider: 'stability-ai'
    };

    // Optionally store result in database for premium users
    if (imageId) {
      const { error: storageError } = await supabaseClient
        .from('ux_analyses')
        .insert({
          image_id: imageId,
          user_context: prompt,
          visual_annotations: [],
          suggestions: [],
          summary: {
            overallScore: 0,
            categoryScores: { usability: 0, accessibility: 0, visual: 0, content: 0 },
            keyIssues: [],
            strengths: ['Generated concept image']
          },
          analysis_type: 'inpainting_result',
          metadata: {
            inpaintingResult: result,
            analysisTimestamp: new Date().toISOString(),
            provider: 'stability-ai'
          }
        });

      if (storageError) {
        console.warn('Failed to store inpainting result:', storageError);
        // Don't fail the request if storage fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in inpainting service:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to perform inpainting',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});