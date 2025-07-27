import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleVisionRequest {
  imageUrl: string;
  userContext?: string;
  features?: string[];
}

interface VisionFeature {
  type: string;
  maxResults?: number;
}

interface GoogleVisionResponse {
  responses: Array<{
    labelAnnotations?: Array<{
      mid: string;
      description: string;
      score: number;
      topicality: number;
    }>;
    textAnnotations?: Array<{
      description: string;
      boundingPoly: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    faceAnnotations?: Array<{
      boundingPoly: {
        vertices: Array<{ x: number; y: number }>;
      };
      fdBoundingPoly: {
        vertices: Array<{ x: number; y: number }>;
      };
      landmarks: Array<{
        type: string;
        position: { x: number; y: number; z: number };
      }>;
      rollAngle: number;
      panAngle: number;
      tiltAngle: number;
      detectionConfidence: number;
      landmarkingConfidence: number;
      joyLikelihood: string;
      sorrowLikelihood: string;
      angerLikelihood: string;
      surpriseLikelihood: string;
      underExposedLikelihood: string;
      blurredLikelihood: string;
      headwearLikelihood: string;
    }>;
    objectAnnotations?: Array<{
      mid: string;
      name: string;
      score: number;
      boundingPoly: {
        normalizedVertices: Array<{ x: number; y: number }>;
      };
    }>;
    webDetection?: {
      webEntities: Array<{
        entityId: string;
        score: number;
        description: string;
      }>;
      fullMatchingImages: Array<{
        url: string;
      }>;
      partialMatchingImages: Array<{
        url: string;
      }>;
      pagesWithMatchingImages: Array<{
        url: string;
        pageTitle: string;
      }>;
    };
  }>;
}

async function analyzeImageWithGoogleVision(imageUrl: string, features: string[]): Promise<GoogleVisionResponse> {
  const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
  
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Google Vision API key not configured');
  }

  // Convert image URL to base64 if needed
  let imageData: string;
  try {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    imageData = base64Image;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }

  const visionFeatures: VisionFeature[] = features.map(feature => {
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

  return await response.json() as GoogleVisionResponse;
}

function convertToUXAnalysis(visionResponse: GoogleVisionResponse, userContext?: string) {
  const response = visionResponse.responses[0];
  
  // Extract visual annotations from Google Vision data
  const visualAnnotations = [];
  
  // Add text detection annotations
  if (response.textAnnotations && response.textAnnotations.length > 0) {
    response.textAnnotations.slice(1).forEach((text, index) => {
      const bounds = text.boundingPoly.vertices;
      const centerX = bounds.reduce((sum, v) => sum + v.x, 0) / bounds.length;
      const centerY = bounds.reduce((sum, v) => sum + v.y, 0) / bounds.length;
      
      visualAnnotations.push({
        id: `text-${index}`,
        x: centerX,
        y: centerY,
        type: 'suggestion',
        title: 'Text Element Detected',
        description: `Text content: "${text.description}"`,
        severity: 'medium'
      });
    });
  }

  // Add face detection annotations
  if (response.faceAnnotations) {
    response.faceAnnotations.forEach((face, index) => {
      const bounds = face.boundingPoly.vertices;
      const centerX = bounds.reduce((sum, v) => sum + v.x, 0) / bounds.length;
      const centerY = bounds.reduce((sum, v) => sum + v.y, 0) / bounds.length;
      
      visualAnnotations.push({
        id: `face-${index}`,
        x: centerX,
        y: centerY,
        type: 'success',
        title: 'Human Face Detected',
        description: `Face detected with ${Math.round(face.detectionConfidence * 100)}% confidence`,
        severity: 'low'
      });
    });
  }

  // Add object detection annotations
  if (response.objectAnnotations) {
    response.objectAnnotations.forEach((object, index) => {
      const bounds = object.boundingPoly.normalizedVertices;
      const centerX = bounds.reduce((sum, v) => sum + v.x, 0) / bounds.length * 1000; // Assuming 1000px width
      const centerY = bounds.reduce((sum, v) => sum + v.y, 0) / bounds.length * 1000; // Assuming 1000px height
      
      visualAnnotations.push({
        id: `object-${index}`,
        x: centerX,
        y: centerY,
        type: 'suggestion',
        title: `${object.name} Detected`,
        description: `Object: ${object.name} (${Math.round(object.score * 100)}% confidence)`,
        severity: 'medium'
      });
    });
  }

  // Generate UX suggestions based on detected content
  const suggestions = [];
  
  // Text-based suggestions
  if (response.textAnnotations && response.textAnnotations.length > 1) {
    suggestions.push({
      id: 'text-readability',
      category: 'accessibility',
      title: 'Text Readability Analysis',
      description: 'Multiple text elements detected. Ensure proper contrast and font sizes.',
      impact: 'medium',
      effort: 'low',
      actionItems: [
        'Check color contrast ratios meet WCAG guidelines',
        'Ensure minimum font size of 14px for body text',
        'Verify text hierarchy is clear and consistent'
      ],
      relatedAnnotations: response.textAnnotations.slice(1).map((_, i) => `text-${i}`)
    });
  }

  // Face detection suggestions
  if (response.faceAnnotations && response.faceAnnotations.length > 0) {
    suggestions.push({
      id: 'human-faces',
      category: 'usability',
      title: 'Human Elements in Design',
      description: 'Human faces detected - leverage for emotional connection.',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Ensure faces are clearly visible and well-lit',
        'Consider eye gaze direction to guide user attention',
        'Maintain authentic and diverse representation'
      ],
      relatedAnnotations: response.faceAnnotations.map((_, i) => `face-${i}`)
    });
  }

  // Object-based suggestions
  if (response.objectAnnotations && response.objectAnnotations.length > 0) {
    suggestions.push({
      id: 'object-composition',
      category: 'visual',
      title: 'Visual Composition',
      description: 'Multiple objects detected - consider layout and hierarchy.',
      impact: 'medium',
      effort: 'medium',
      actionItems: [
        'Ensure clear visual hierarchy between objects',
        'Check for proper spacing and alignment',
        'Consider the rule of thirds for object placement'
      ],
      relatedAnnotations: response.objectAnnotations.map((_, i) => `object-${i}`)
    });
  }

  // Generate scores based on detected elements
  const hasText = response.textAnnotations && response.textAnnotations.length > 1;
  const hasFaces = response.faceAnnotations && response.faceAnnotations.length > 0;
  const hasObjects = response.objectAnnotations && response.objectAnnotations.length > 0;
  
  const summary = {
    overallScore: 75 + (hasText ? 5 : 0) + (hasFaces ? 10 : 0) + (hasObjects ? 5 : 0),
    categoryScores: {
      usability: 80 + (hasFaces ? 10 : 0),
      accessibility: 70 + (hasText ? 15 : 0),
      visual: 75 + (hasObjects ? 10 : 0),
      content: 80 + (hasText ? 10 : 0)
    },
    keyIssues: suggestions.filter(s => s.impact === 'high').map(s => s.title),
    strengths: [
      ...(hasText ? ['Clear text content structure'] : []),
      ...(hasFaces ? ['Human elements for engagement'] : []),
      ...(hasObjects ? ['Rich visual content'] : [])
    ]
  };

  // Extract metadata
  const metadata = {
    objects: (response.objectAnnotations || []).map(obj => ({
      name: obj.name,
      confidence: obj.score,
      boundingBox: {
        x: obj.boundingPoly.normalizedVertices[0].x,
        y: obj.boundingPoly.normalizedVertices[0].y,
        width: obj.boundingPoly.normalizedVertices[2].x - obj.boundingPoly.normalizedVertices[0].x,
        height: obj.boundingPoly.normalizedVertices[2].y - obj.boundingPoly.normalizedVertices[0].y
      }
    })),
    text: response.textAnnotations ? [response.textAnnotations[0]?.description || ''] : [],
    colors: [], // Google Vision doesn't provide color analysis, would need separate API
    faces: response.faceAnnotations ? response.faceAnnotations.length : 0,
    labels: (response.labelAnnotations || []).map(label => ({
      description: label.description,
      score: label.score
    }))
  };

  return {
    visualAnnotations,
    suggestions,
    summary,
    metadata,
    provider: 'google-vision',
    analysisType: 'vision-analysis'
  };
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

    const { imageUrl, userContext, features = ['labels', 'text', 'faces', 'objects'] }: GoogleVisionRequest = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Google Vision analysis for:', imageUrl);

    // Analyze image with Google Vision
    const visionResponse = await analyzeImageWithGoogleVision(imageUrl, features);
    
    console.log('Google Vision analysis completed');

    // Convert to UX analysis format
    const uxAnalysis = convertToUXAnalysis(visionResponse, userContext);

    console.log('UX analysis conversion completed');

    return new Response(
      JSON.stringify({
        success: true,
        analysis: uxAnalysis,
        rawVisionData: visionResponse // Include raw data for debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in Google Vision analysis:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to analyze image with Google Vision',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});