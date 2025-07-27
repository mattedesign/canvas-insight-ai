import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface AnalysisRequest {
  type: 'ANALYZE_IMAGE' | 'ANALYZE_GROUP' | 'GENERATE_CONCEPT'
  payload: any
}

async function analyzeImage(payload: { imageId: string; imageUrl: string; imageName: string; userContext?: string }) {
  console.log('Analyzing image:', payload)
  
  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    let analysisResult;
    
    if (openaiApiKey) {
      console.log('Using OpenAI for real AI analysis');
      analysisResult = await performAIAnalysis(payload, openaiApiKey);
    } else {
      console.log('OpenAI API key not found, using mock analysis');
      analysisResult = generateMockAnalysisData();
    }

    // Get the actual image record ID from database using the client-side imageId
    const { data: imageRecord, error: imageError } = await supabase
      .from('images')
      .select('id')
      .eq('filename', payload.imageId)
      .single();

    let dbImageId;
    if (imageError || !imageRecord) {
      console.log('Image record not found, using imageId as-is');
      // If it's already a UUID, use it; otherwise generate one
      dbImageId = payload.imageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
        ? payload.imageId 
        : crypto.randomUUID();
    } else {
      dbImageId = imageRecord.id;
    }

    // Store analysis in database
    const { data: analysis, error } = await supabase
      .from('ux_analyses')
      .insert({
        image_id: dbImageId,
        user_context: payload.userContext || '',
        visual_annotations: analysisResult.visualAnnotations,
        suggestions: analysisResult.suggestions,
        summary: analysisResult.summary,
        metadata: analysisResult.metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Analysis completed and stored');
    return {
      success: true,
      data: {
        id: analysis.id,
        imageId: payload.imageId, // Return original imageId for client compatibility
        imageName: payload.imageName,
        imageUrl: payload.imageUrl,
        userContext: analysis.user_context,
        visualAnnotations: analysis.visual_annotations,
        suggestions: analysis.suggestions,
        summary: analysis.summary,
        metadata: analysis.metadata,
        createdAt: analysis.created_at
      }
    };

  } catch (error) {
    console.error('Error in analysis, falling back to mock:', error);
    return generateMockAnalysisResponse(payload);
  }
}

async function performAIAnalysis(payload: any, apiKey: string) {
  console.log('Performing real AI analysis with OpenAI');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a UX analysis expert. Analyze this interface design and provide detailed feedback.

Focus on:
1. Usability issues and improvements
2. Accessibility concerns  
3. Visual design effectiveness
4. Content clarity and organization

${payload.userContext ? `Additional context: ${payload.userContext}` : ''}

Respond with a JSON object containing:
- visualAnnotations: Array of specific issues/suggestions with x,y coordinates (0-1 scale)
- suggestions: Array of actionable recommendations
- summary: Overall scores and key insights

Format exactly as: {
  "visualAnnotations": [{"id": "annotation-1", "x": 0.5, "y": 0.3, "type": "issue", "title": "Clear title", "description": "Detailed description", "severity": "medium"}],
  "suggestions": [{"id": "suggestion-1", "category": "usability", "title": "Clear title", "description": "Detailed description", "impact": "high", "effort": "medium", "actionItems": ["Action 1", "Action 2"]}],
  "summary": {"overallScore": 75, "categoryScores": {"usability": 80, "accessibility": 70, "visual": 85, "content": 75}, "keyIssues": ["Issue 1", "Issue 2"], "strengths": ["Strength 1", "Strength 2"]}
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: payload.imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse JSON response
    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Ensure proper ID generation and structure
    const timestamp = Date.now();
    
    const visualAnnotations = (aiAnalysis.visualAnnotations || []).map((annotation: any, index: number) => ({
      id: `annotation-${timestamp}-${index}`,
      x: Math.min(Math.max(annotation.x || 0.5, 0), 1),
      y: Math.min(Math.max(annotation.y || 0.5, 0), 1),
      type: annotation.type || 'suggestion',
      title: annotation.title || 'UX Improvement',
      description: annotation.description || 'Improvement suggestion',
      severity: annotation.severity || 'medium'
    }));

    const suggestions = (aiAnalysis.suggestions || []).map((suggestion: any, index: number) => ({
      id: `suggestion-${timestamp}-${index}`,
      category: suggestion.category || 'usability',
      title: suggestion.title || 'Improvement Suggestion',
      description: suggestion.description || 'Detailed recommendation',
      impact: suggestion.impact || 'medium',
      effort: suggestion.effort || 'medium',
      actionItems: Array.isArray(suggestion.actionItems) ? suggestion.actionItems : ['Review and implement'],
      relatedAnnotations: visualAnnotations.slice(0, 2).map((ann: any) => ann.id)
    }));

    return {
      visualAnnotations,
      suggestions,
      summary: {
        overallScore: aiAnalysis.summary?.overallScore || 75,
        categoryScores: {
          usability: aiAnalysis.summary?.categoryScores?.usability || 75,
          accessibility: aiAnalysis.summary?.categoryScores?.accessibility || 70,
          visual: aiAnalysis.summary?.categoryScores?.visual || 80,
          content: aiAnalysis.summary?.categoryScores?.content || 75
        },
        keyIssues: Array.isArray(aiAnalysis.summary?.keyIssues) ? aiAnalysis.summary.keyIssues : ['Navigation clarity', 'Visual hierarchy'],
        strengths: Array.isArray(aiAnalysis.summary?.strengths) ? aiAnalysis.summary.strengths : ['Clean design', 'Good layout']
      },
      metadata: {
        aiGenerated: true,
        model: 'gpt-4o',
        timestamp: new Date().toISOString(),
        objects: [],
        text: [],
        colors: [
          { color: '#3b82f6', percentage: 30 },
          { color: '#ffffff', percentage: 50 },
          { color: '#1f2937', percentage: 20 }
        ],
        faces: 0
      }
    };

  } catch (error) {
    console.error('AI analysis failed:', error);
    throw error;
  }
}

function generateMockAnalysisData() {
  const timestamp = Date.now();
  
  return {
    visualAnnotations: [
      {
        id: `annotation-${timestamp}`,
        x: 0.3,
        y: 0.2,
        type: 'issue',
        title: 'Navigation unclear',
        description: 'The navigation menu lacks clear visual hierarchy',
        severity: 'medium'
      },
      {
        id: `annotation-${timestamp}-2`,
        x: 0.7,
        y: 0.4,
        type: 'suggestion',
        title: 'Improve contrast',
        description: 'Text contrast could be enhanced for better accessibility',
        severity: 'high'
      }
    ],
    suggestions: [
      {
        id: `suggestion-${timestamp}`,
        category: 'usability',
        title: 'Improve navigation hierarchy',
        description: 'Add visual weight to primary navigation items',
        impact: 'high',
        effort: 'medium',
        actionItems: ['Increase font size for primary items', 'Add icons to main categories'],
        relatedAnnotations: [`annotation-${timestamp}`]
      },
      {
        id: `suggestion-${timestamp}-2`,
        category: 'accessibility',
        title: 'Enhance color contrast',
        description: 'Improve text readability with higher contrast ratios',
        impact: 'high',
        effort: 'low',
        actionItems: ['Darken text color', 'Test with accessibility tools'],
        relatedAnnotations: [`annotation-${timestamp}-2`]
      }
    ],
    summary: {
      overallScore: Math.floor(65 + Math.random() * 25),
      categoryScores: {
        usability: Math.floor(60 + Math.random() * 30),
        accessibility: Math.floor(70 + Math.random() * 25),
        visual: Math.floor(65 + Math.random() * 30),
        content: Math.floor(70 + Math.random() * 25)
      },
      keyIssues: ['Navigation hierarchy', 'Color contrast', 'Button consistency'],
      strengths: ['Color scheme', 'Typography', 'Layout structure']
    },
    metadata: {
      aiGenerated: false,
      mock: true,
      timestamp: new Date().toISOString(),
      objects: [],
      text: [],
      colors: [
        { color: '#3b82f6', percentage: 30 },
        { color: '#ffffff', percentage: 50 },
        { color: '#1f2937', percentage: 20 }
      ],
      faces: 0
    }
  };
}

function generateMockAnalysisResponse(payload: any) {
  const mockData = generateMockAnalysisData();
  
  return {
    success: true,
    data: {
      id: crypto.randomUUID(),
      imageId: payload.imageId,
      imageName: payload.imageName,
      imageUrl: payload.imageUrl,
      userContext: payload.userContext || '',
      visualAnnotations: mockData.visualAnnotations,
      suggestions: mockData.suggestions,
      summary: mockData.summary,
      metadata: mockData.metadata,
      createdAt: new Date().toISOString()
    }
  };
}

async function analyzeGroup(payload: any) {
  console.log('Analyzing group:', payload)
  
  // Mock group analysis
  const mockGroupAnalysis = {
    summary: {
      overallScore: 78,
      consistency: 85,
      thematicCoherence: 80,
      userFlowContinuity: 70
    },
    insights: [
      'Visual hierarchy is consistently applied across all screens',
      'Color palette maintains brand consistency throughout the group'
    ],
    recommendations: [
      'Consider standardizing button sizes across all screens',
      'Implement consistent spacing patterns for better visual rhythm'
    ],
    patterns: {
      commonElements: ['Primary buttons', 'Navigation bar', 'Card components'],
      designInconsistencies: ['Button sizes', 'Icon styles'],
      userJourneyGaps: ['Missing back navigation', 'Unclear progress indicators']
    }
  }
  
  return { success: true, data: mockGroupAnalysis }
}

async function generateConcept(payload: any) {
  console.log('Generating concept:', payload)
  
  // Mock concept generation
  const mockConcept = {
    title: 'Enhanced Design Concept',
    description: 'A conceptual design addressing key usability issues identified in the analysis',
    imageUrl: `https://picsum.photos/1024/768?random=${Date.now()}`,
    improvements: [
      'Improved navigation hierarchy',
      'Enhanced button consistency',
      'Better visual contrast'
    ]
  }
  
  return { success: true, data: mockConcept }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, payload }: AnalysisRequest = await req.json()
    
    console.log(`Processing ${type} request`)
    
    let result
    switch (type) {
      case 'ANALYZE_IMAGE':
        result = await analyzeImage(payload)
        break
      case 'ANALYZE_GROUP':
        result = await analyzeGroup(payload)
        break
      case 'GENERATE_CONCEPT':
        result = await generateConcept(payload)
        break
      default:
        throw new Error(`Unknown analysis type: ${type}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing request:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})