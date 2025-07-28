import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleVisionMetadataRequest {
  imageId: string;
  imageUrl: string;
  features?: string[];
}

interface VisionMetadata {
  objects: Array<{ name: string; confidence: number; boundingBox?: any }>;
  text: string[];
  colors: Array<{ color: string; percentage: number }>;
  faces: number;
  labels: Array<{ name: string; confidence: number }>;
  web?: any;
  extractedAt: string;
  provider: string;
}

async function extractGoogleVisionMetadata(imageUrl: string, features: string[]): Promise<VisionMetadata> {
  const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
  
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Google Vision API key not configured');
  }

  // Convert image URL to base64 if needed
  let imageData: string;
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    imageData = base64Image;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }

  const visionFeatures = features.map(feature => {
    switch (feature) {
      case 'labels':
        return { type: 'LABEL_DETECTION', maxResults: 20 };
      case 'text':
        return { type: 'TEXT_DETECTION' };
      case 'faces':
        return { type: 'FACE_DETECTION', maxResults: 10 };
      case 'objects':
        return { type: 'OBJECT_LOCALIZATION', maxResults: 20 };
      case 'web':
        return { type: 'WEB_DETECTION' };
      case 'colors':
        return { type: 'IMAGE_PROPERTIES' };
      default:
        return { type: 'LABEL_DETECTION', maxResults: 10 };
    }
  });

  const requestBody = {
    requests: [
      {
        image: {
          content: imageData
        },
        features: visionFeatures
      }
    ]
  };

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Vision API error:', errorText);
    throw new Error(`Google Vision API error: ${response.status}`);
  }

  const data = await response.json();
  const annotations = data.responses[0];

  // Extract metadata in standardized format
  const metadata: VisionMetadata = {
    objects: (annotations.localizedObjectAnnotations || []).map((obj: any) => ({
      name: obj.name,
      confidence: obj.score,
      boundingBox: obj.boundingPoly
    })),
    text: (annotations.textAnnotations || []).slice(1).map((text: any) => text.description),
    colors: (annotations.imagePropertiesAnnotation?.dominantColors?.colors || [])
      .slice(0, 5)
      .map((color: any) => ({
        color: `rgb(${Math.round(color.color.red || 0)}, ${Math.round(color.color.green || 0)}, ${Math.round(color.color.blue || 0)})`,
        percentage: Math.round((color.pixelFraction || 0) * 100)
      })),
    faces: (annotations.faceAnnotations || []).length,
    labels: (annotations.labelAnnotations || []).map((label: any) => ({
      name: label.description,
      confidence: label.score
    })),
    web: annotations.webDetection || null,
    extractedAt: new Date().toISOString(),
    provider: 'google-vision'
  };

  return metadata;
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

    const { imageId, imageUrl, features = ['labels', 'text', 'faces', 'objects', 'colors'] }: GoogleVisionMetadataRequest = await req.json();

    if (!imageId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image ID and URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Google Vision metadata extraction for image:', imageId);

    // Extract metadata with Google Vision
    const metadata = await extractGoogleVisionMetadata(imageUrl, features);
    
    console.log('Google Vision metadata extraction completed');

    // Store metadata in images table
    const { error: updateError } = await supabaseClient
      .from('images')
      .update({ metadata })
      .eq('id', imageId);

    if (updateError) {
      console.error('Failed to store metadata:', updateError);
      throw new Error('Failed to store metadata in database');
    }

    console.log('Metadata stored in database successfully');

    return new Response(
      JSON.stringify({
        success: true,
        metadata,
        imageId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in Google Vision metadata extraction:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to extract metadata with Google Vision',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});