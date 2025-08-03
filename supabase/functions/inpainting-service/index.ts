import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface definitions
interface InpaintingRequest {
  imageUrl: string;
  maskData: string;
  prompt: string;
  userId: string;
  imageId?: string;
}

interface InpaintingResult {
  imageUrl: string;
  prompt: string;
  originalImageUrl: string;
}

// Stability AI inpainting function
async function performStabilityAIInpainting(imageUrl: string, maskData: string, prompt: string): Promise<string> {
  const apiKey = Deno.env.get('STABILITY_API_KEY');
  if (!apiKey) {
    throw new Error('Stability AI API key not configured');
  }

  try {
    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Prepare form data for Stability AI API
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'image.png');
    formData.append('mask', new Blob([Uint8Array.from(atob(maskData), c => c.charCodeAt(0))]), 'mask.png');
    formData.append('prompt', prompt);
    formData.append('output_format', 'png');

    // Call Stability AI inpainting API
    const response = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/*'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
    }

    // Get the inpainted image as blob
    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    
    // Convert to base64 for storage
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // For now, return a data URL. In production, you'd upload to storage and return the URL
    return `data:image/png;base64,${base64Image}`;

  } catch (error) {
    console.error('Stability AI inpainting error:', error);
    throw error;
  }
}

// Check user subscription function
async function checkUserSubscription(userId: string, supabaseClient: any): Promise<boolean> {
  try {
    const { data: subscription, error } = await supabaseClient
      .from('subscribers')
      .select('subscribed, subscription_tier')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Subscription check error:', error);
      return false;
    }

    return subscription?.subscribed === true && 
           (subscription?.subscription_tier === 'premium' || subscription?.subscription_tier === 'enterprise');
  } catch (error) {
    console.error('Subscription check failed:', error);
    return false;
  }
}

// Main server function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { imageUrl, maskData, prompt, userId, imageId }: InpaintingRequest = await req.json();

    // Validate required parameters
    if (!imageUrl || !maskData || !prompt || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: imageUrl, maskData, prompt, userId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing inpainting request for user ${userId}`);

    // Check if user has premium subscription
    const hasPremiumAccess = await checkUserSubscription(userId, supabase);
    if (!hasPremiumAccess) {
      return new Response(
        JSON.stringify({ 
          error: 'Premium subscription required', 
          message: 'Inpainting feature requires a premium subscription' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Perform inpainting using Stability AI
    const inpaintedImageUrl = await performStabilityAIInpainting(imageUrl, maskData, prompt);

    // Prepare result
    const result: InpaintingResult = {
      imageUrl: inpaintedImageUrl,
      prompt: prompt,
      originalImageUrl: imageUrl
    };

    // Optionally store the result in the database if imageId is provided
    if (imageId) {
      try {
        const { error: insertError } = await supabase
          .from('ux_analyses')
          .update({
            metadata: {
              inpainting: {
                result: result,
                createdAt: new Date().toISOString()
              }
            }
          })
          .eq('image_id', imageId);

        if (insertError) {
          console.error('Failed to store inpainting result:', insertError);
          // Don't fail the request, just log the error
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
        // Continue without failing the request
      }
    }

    console.log(`Successfully completed inpainting for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        result: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Inpainting service error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});