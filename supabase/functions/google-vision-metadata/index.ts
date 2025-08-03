import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface definitions
interface GoogleVisionMetadataRequest {
  imageId: string;
  imageUrl: string;
  features?: string[];
}

interface VisionMetadata {
  labels?: Array<{ description: string; score: number }>;
  faces?: Array<{ joy: string; sorrow: string; anger: string; surprise: string }>;
  text?: Array<{ description: string; locale?: string }>;
  objects?: Array<{ name: string; score: number }>;
  safeSearch?: {
    adult: string;
    spoof: string;
    medical: string;
    violence: string;
    racy: string;
  };
  imageProperties?: {
    dominantColors?: Array<{ color: { red: number; green: number; blue: number }; score: number }>;
  };
}

// Google Vision metadata extraction function
async function extractGoogleVisionMetadata(
  imageUrl: string, 
  features: string[], 
  imageBase64?: string
): Promise<VisionMetadata> {
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  if (!apiKey) {
    throw new Error('Google Vision API key not configured');
  }

  try {
    let base64Content: string;
    
    // PHASE 2: Use provided base64 data if available (for blob URLs)
    if (imageBase64) {
      console.log('Using provided base64 data for Google Vision API');
      base64Content = imageBase64;
    } else {
      // Fetch image and convert to base64 for regular URLs
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Check file size (limit to 10MB for Vision API)
      if (imageBuffer.byteLength > 10 * 1024 * 1024) {
        throw new Error('Image too large for Google Vision API (max 10MB)');
      }

      base64Content = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    }

    // Prepare Vision API request
    const visionFeatures = features.map(feature => {
      switch (feature.toLowerCase()) {
        case 'labels':
          return { type: 'LABEL_DETECTION', maxResults: 10 };
        case 'faces':
          return { type: 'FACE_DETECTION', maxResults: 10 };
        case 'text':
          return { type: 'TEXT_DETECTION' };
        case 'objects':
          return { type: 'OBJECT_LOCALIZATION', maxResults: 10 };
        case 'safesearch':
          return { type: 'SAFE_SEARCH_DETECTION' };
        case 'properties':
          return { type: 'IMAGE_PROPERTIES' };
        default:
          return { type: 'LABEL_DETECTION', maxResults: 10 };
      }
    });

    const visionRequest = {
      requests: [
        {
          image: {
            content: base64Content
          },
          features: visionFeatures
        }
      ]
    };

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visionRequest)
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      throw new Error(`Google Vision API error: ${visionResponse.status} - ${errorText}`);
    }

    const visionData = await visionResponse.json();
    const annotations = visionData.responses?.[0];

    if (annotations?.error) {
      throw new Error(`Vision API error: ${annotations.error.message}`);
    }

    // Parse Vision API response into structured metadata
    const metadata: VisionMetadata = {};

    if (annotations.labelAnnotations) {
      metadata.labels = annotations.labelAnnotations.map((label: any) => ({
        description: label.description,
        score: label.score
      }));
    }

    if (annotations.faceAnnotations) {
      metadata.faces = annotations.faceAnnotations.map((face: any) => ({
        joy: face.joyLikelihood || 'UNKNOWN',
        sorrow: face.sorrowLikelihood || 'UNKNOWN',
        anger: face.angerLikelihood || 'UNKNOWN',
        surprise: face.surpriseLikelihood || 'UNKNOWN'
      }));
    }

    if (annotations.textAnnotations) {
      metadata.text = annotations.textAnnotations.map((text: any) => ({
        description: text.description,
        locale: text.locale
      }));
    }

    if (annotations.localizedObjectAnnotations) {
      metadata.objects = annotations.localizedObjectAnnotations.map((obj: any) => ({
        name: obj.name,
        score: obj.score
      }));
    }

    if (annotations.safeSearchAnnotation) {
      metadata.safeSearch = {
        adult: annotations.safeSearchAnnotation.adult || 'UNKNOWN',
        spoof: annotations.safeSearchAnnotation.spoof || 'UNKNOWN',
        medical: annotations.safeSearchAnnotation.medical || 'UNKNOWN',
        violence: annotations.safeSearchAnnotation.violence || 'UNKNOWN',
        racy: annotations.safeSearchAnnotation.racy || 'UNKNOWN'
      };
    }

    if (annotations.imagePropertiesAnnotation?.dominantColors?.colors) {
      metadata.imageProperties = {
        dominantColors: annotations.imagePropertiesAnnotation.dominantColors.colors.map((color: any) => ({
          color: {
            red: color.color?.red || 0,
            green: color.color?.green || 0,
            blue: color.color?.blue || 0
          },
          score: color.score || 0
        }))
      };
    }

    return metadata;

  } catch (error) {
    console.error('Google Vision API error:', error);
    throw error;
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
    const { imageId, imageUrl, features = ['labels', 'faces', 'text'], imageBase64 } = await req.json();

    // Validate required parameters
    if (!imageId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: imageId and imageUrl' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing Google Vision metadata for image ${imageId}`);

    // Check if metadata already exists and is recent
    const { data: existingImage, error: fetchError } = await supabase
      .from('images')
      .select('metadata')
      .eq('id', imageId)
      .single();

    if (fetchError) {
      console.error('Error fetching existing image:', fetchError);
    } else if (existingImage?.metadata && typeof existingImage.metadata === 'object') {
      const metadata = existingImage.metadata as any;
      if (metadata.googleVision && metadata.googleVision.extractedAt) {
        const extractedAt = new Date(metadata.googleVision.extractedAt);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (extractedAt > oneHourAgo) {
          console.log('Using cached Google Vision metadata');
          return new Response(
            JSON.stringify({
              success: true,
              cached: true,
              metadata: metadata.googleVision
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }

    // Extract metadata using Google Vision API
    const visionMetadata = await extractGoogleVisionMetadata(imageUrl, features, imageBase64);

    // Prepare metadata update
    const metadataUpdate = {
      googleVision: {
        ...visionMetadata,
        extractedAt: new Date().toISOString(),
        features: features
      }
    };

    // Update the image metadata in Supabase
    const { error: updateError } = await supabase
      .from('images')
      .update({ 
        metadata: existingImage?.metadata 
          ? { ...existingImage.metadata, ...metadataUpdate }
          : metadataUpdate
      })
      .eq('id', imageId);

    if (updateError) {
      console.error('Error updating image metadata:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update metadata', 
          details: updateError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully extracted Google Vision metadata for image ${imageId}`);

    return new Response(
      JSON.stringify({
        success: true,
        metadata: visionMetadata
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Google Vision metadata extraction error:', error);
    
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