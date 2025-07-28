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
  aiModel?: 'openai' | 'google-vision' | 'claude-vision' | 'stability-ai' | 'auto'
}

async function analyzeImage(payload: { imageId: string; imageUrl: string; imageName: string; userContext?: string }, aiModel = 'auto') {
  console.log('Analyzing image:', payload);
  console.log('Using AI model:', aiModel);
  
  try {
    let analysisResult;
    
    // Determine which AI model to use
    const selectedModel = aiModel === 'auto' ? await selectBestModel() : aiModel;
    console.log('Selected AI model:', selectedModel);
    
    switch (selectedModel) {
      case 'google-vision':
        analysisResult = await performGoogleVisionAnalysis(payload);
        break;
      case 'claude-vision':
        analysisResult = await performClaudeVisionAnalysis(payload);
        break;
      case 'stability-ai':
        analysisResult = await performStabilityAIAnalysis(payload);
        break;
      case 'openai':
        analysisResult = await performOpenAIAnalysis(payload);
        break;
      default:
        console.log('No AI models available, using mock analysis');
        analysisResult = generateMockAnalysisData();
    }

    // Get the actual image record ID from database using the client-side imageId
    const { data: imageRecord, error: imageError } = await supabase
      .from('images')
      .select('id')
      .eq('id', payload.imageId) // Search by ID directly since we now store it correctly
      .single();

    let dbImageId = payload.imageId; // Use the provided imageId directly
    if (imageError || !imageRecord) {
      console.log('Image record not found in database, imageId:', payload.imageId);
      console.log('Database error:', imageError);
      // Image should exist if uploaded properly, but continue with analysis anyway
    } else {
      console.log('Found image record:', imageRecord.id);
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
        metadata: {
          ...analysisResult.metadata,
          aiModel: selectedModel,
          analysisTimestamp: new Date().toISOString()
        }
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
        createdAt: analysis.created_at,
        aiModel: selectedModel
      }
    };

  } catch (error) {
    console.error('CRITICAL ERROR in analysis pipeline:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      payload: payload
    });
    
    // Still store the error analysis in database for debugging
    try {
      await supabase
        .from('ux_analyses')
        .insert({
          image_id: payload.imageId,
          user_context: payload.userContext || '',
          visual_annotations: [],
          suggestions: [],
          summary: { error: true, message: error.message },
          metadata: { 
            error: true, 
            fallbackToMock: true, 
            timestamp: new Date().toISOString(),
            originalError: error.message
          }
        });
    } catch (dbError) {
      console.error('Failed to store error analysis:', dbError);
    }
    
    return generateMockAnalysisResponse(payload);
  }
}

async function selectBestModel(): Promise<string> {
  // Check which AI models are available based on API keys
  const hasGoogleVision = !!Deno.env.get('GOOGLE_VISION_API_KEY');
  const hasClaudeVision = !!Deno.env.get('ANTHROPIC_API_KEY');
  const hasStabilityAI = !!Deno.env.get('STABILITY_API_KEY');
  const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');
  
  console.log('API key availability check:');
  console.log('- Google Vision API Key:', hasGoogleVision ? 'Available' : 'Missing');
  console.log('- Claude/Anthropic API Key:', hasClaudeVision ? 'Available' : 'Missing');
  console.log('- Stability AI API Key:', hasStabilityAI ? 'Available' : 'Missing');
  console.log('- OpenAI API Key:', hasOpenAI ? 'Available' : 'Missing');
  
  // Priority order: OpenAI (most reliable) > Claude > Google Vision > Stability AI
  if (hasOpenAI) {
    console.log('Selected AI model: OpenAI');
    return 'openai';
  } else if (hasClaudeVision) {
    console.log('Selected AI model: Claude Vision');
    return 'claude-vision';
  } else if (hasGoogleVision) {
    console.log('Selected AI model: Google Vision');
    return 'google-vision';
  } else if (hasStabilityAI) {
    console.log('Selected AI model: Stability AI');
    return 'stability-ai';
  }
  
  console.log('No AI models available, falling back to mock data');
  return 'mock';
}

async function performGoogleVisionAnalysis(payload: any) {
  console.log('Performing Google Vision analysis');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/google-vision-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        imageUrl: payload.imageUrl,
        userContext: payload.userContext,
        features: ['labels', 'text', 'faces', 'objects', 'web']
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Google Vision analysis failed');
    }

    return result.analysis;
  } catch (error) {
    console.error('Google Vision analysis failed:', error);
    throw error;
  }
}

async function performClaudeVisionAnalysis(payload: any) {
  console.log('Performing Claude Vision analysis');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/claude-vision-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        imageUrl: payload.imageUrl,
        userContext: payload.userContext,
        analysisType: 'comprehensive'
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude Vision API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Claude Vision analysis failed');
    }

    return result.analysis;
  } catch (error) {
    console.error('Claude Vision analysis failed:', error);
    throw error;
  }
}

async function performStabilityAIAnalysis(payload: any) {
  console.log('Performing Stability.ai analysis');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/stability-ai-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        imageUrl: payload.imageUrl,
        imageName: payload.imageName,
        userContext: payload.userContext
      }),
    });

    if (!response.ok) {
      throw new Error(`Stability.ai API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Stability.ai analysis failed');
    }

    return result.data;
  } catch (error) {
    console.error('Stability.ai analysis failed:', error);
    throw error;
  }
}

async function performOpenAIAnalysis(payload: any) {
  console.log('Performing OpenAI analysis');
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not available');
  }
  
  return await performAIAnalysis(payload, openaiApiKey);
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
    
    // Parse JSON response - handle markdown code blocks
    let aiAnalysis;
    try {
      // Remove markdown code block wrapping if present
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      aiAnalysis = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw AI response:', aiResponse);
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
  
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openaiApiKey && payload.imageUrls && payload.imageUrls.length > 0) {
      console.log('Using AI for intelligent group analysis');
      return await performAIGroupAnalysis(payload, openaiApiKey);
    } else {
      console.log('Using mock group analysis');
      return generateMockGroupAnalysis();
    }
  } catch (error) {
    console.error('Error in group analysis, falling back to mock:', error);
    return generateMockGroupAnalysis();
  }
}

function generateMockGroupAnalysis() {
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
  };
  
  return { success: true, data: mockGroupAnalysis };
}

async function generateConcept(payload: any) {
  console.log('Generating concept:', payload)
  
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openaiApiKey && payload.analysisData) {
      console.log('Using AI for concept generation');
      return await performAIConceptGeneration(payload, openaiApiKey);
    } else {
      console.log('Using mock concept generation');
      return generateMockConcept();
    }
  } catch (error) {
    console.error('Error in concept generation, falling back to mock:', error);
    return generateMockConcept();
  }
}

function generateMockConcept() {
  const mockConcept = {
    title: 'Enhanced Design Concept',
    description: 'A conceptual design addressing key usability issues identified in the analysis',
    imageUrl: `https://picsum.photos/1024/768?random=${Date.now()}`,
    improvements: [
      'Improved navigation hierarchy',
      'Enhanced button consistency',
      'Better visual contrast'
    ]
  };
  
  return { success: true, data: mockConcept };
}

async function performAIGroupAnalysis(payload: any, apiKey: string) {
  console.log('Performing AI group analysis');
  
  try {
    // Build message content with multiple images
    const imageContent = payload.imageUrls.slice(0, 5).map((url: string, index: number) => ({
      type: 'image_url',
      image_url: { url, detail: 'high' }
    }));

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
                text: `Analyze these ${payload.imageUrls.length} interface designs as a cohesive group. Focus on:

1. Visual consistency across screens
2. Design patterns and component reuse
3. User flow continuity and navigation
4. Brand consistency and thematic coherence
5. Overall user experience across the journey

${payload.prompt ? `Specific focus: ${payload.prompt}` : ''}

Respond with a JSON object:
{
  "summary": {"overallScore": 85, "consistency": 90, "thematicCoherence": 80, "userFlowContinuity": 75},
  "insights": ["Detailed insight 1", "Detailed insight 2"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "patterns": {
    "commonElements": ["Element 1", "Element 2"],
    "designInconsistencies": ["Inconsistency 1", "Inconsistency 2"],
    "userJourneyGaps": ["Gap 1", "Gap 2"]
  }
}`
              },
              ...imageContent
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    const aiAnalysis = JSON.parse(aiResponse);
    
    return {
      success: true,
      data: {
        summary: aiAnalysis.summary || {
          overallScore: 78,
          consistency: 80,
          thematicCoherence: 75,
          userFlowContinuity: 70
        },
        insights: aiAnalysis.insights || ['AI analysis completed'],
        recommendations: aiAnalysis.recommendations || ['Review group coherence'],
        patterns: aiAnalysis.patterns || {
          commonElements: ['Consistent styling'],
          designInconsistencies: ['Minor variations'],
          userJourneyGaps: ['Navigation improvements needed']
        }
      }
    };

  } catch (error) {
    console.error('AI group analysis failed:', error);
    throw error;
  }
}

async function performAIConceptGeneration(payload: any, apiKey: string) {
  console.log('Performing AI concept generation');
  
  try {
    const analysisData = payload.analysisData;
    const imageUrl = payload.imageUrl;

    // Create contextual prompt based on analysis data
    const issuesContext = analysisData.suggestions?.slice(0, 5).map((s: any) => 
      `- ${s.title}: ${s.description}`
    ).join('\n') || 'General UX improvements needed';

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
                text: `Based on this UX analysis, generate an improved design concept that addresses these key issues:

${issuesContext}

Overall Score: ${analysisData.summary?.overallScore || 'N/A'}

Create a comprehensive design concept that:
1. Addresses the identified usability issues
2. Improves accessibility and visual hierarchy
3. Enhances the overall user experience
4. Maintains brand consistency

Respond with a JSON object:
{
  "title": "Descriptive concept title",
  "description": "Detailed description of the concept and improvements",
  "improvements": ["Specific improvement 1", "Specific improvement 2", "Specific improvement 3"],
  "rationale": "Why these changes will improve the user experience",
  "implementationNotes": ["Technical note 1", "Design note 2"]
}`
              },
              ...(imageUrl ? [{
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' }
              }] : [])
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    const aiConcept = JSON.parse(aiResponse);
    
    // Generate the actual concept image using OpenAI's image generation
    const imagePrompt = `Create a modern UI/UX design concept based on: ${aiConcept.title}. ${aiConcept.description}. Focus on: ${aiConcept.improvements?.slice(0, 3).join(', ')}. Style: clean, modern, professional interface design with good visual hierarchy and accessibility.`;
    
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        output_format: 'png'
      })
    });

    if (!imageResponse.ok) {
      console.error('Image generation failed, using placeholder');
      var generatedImageUrl = `https://picsum.photos/1024/768?random=${Date.now()}`;
    } else {
      const imageData = await imageResponse.json();
      var generatedImageUrl = imageData.data[0].url || `https://picsum.photos/1024/768?random=${Date.now()}`;
    }
    
    return {
      success: true,
      data: {
        title: aiConcept.title || 'AI-Enhanced Design Concept',
        description: aiConcept.description || 'A comprehensive design improvement based on UX analysis',
        imageUrl: generatedImageUrl,
        improvements: aiConcept.improvements || ['Enhanced usability', 'Improved accessibility', 'Better visual hierarchy'],
        rationale: aiConcept.rationale || 'Addresses key usability concerns identified in the analysis',
        implementationNotes: aiConcept.implementationNotes || ['Consider user testing', 'Implement incrementally']
      }
    };

  } catch (error) {
    console.error('AI concept generation failed:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, payload, aiModel }: AnalysisRequest = await req.json()
    
    console.log(`Processing ${type} request with AI model: ${aiModel || 'auto'}`)
    
    let result
    switch (type) {
      case 'ANALYZE_IMAGE':
        result = await analyzeImage(payload, aiModel)
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