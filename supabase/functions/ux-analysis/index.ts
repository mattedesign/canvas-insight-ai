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
  
  // Store analysis in database
  const { data: analysis, error } = await supabase
    .from('ux_analyses')
    .insert({
      image_id: payload.imageId,
      user_context: payload.userContext || '',
      visual_annotations: [
        {
          id: `annotation-${Date.now()}`,
          x: 0.3,
          y: 0.2,
          type: 'issue',
          title: 'Navigation unclear',
          description: 'The navigation menu lacks clear visual hierarchy',
          severity: 'medium'
        },
        {
          id: `annotation-${Date.now()}-2`,
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
          id: `suggestion-${Date.now()}`,
          category: 'usability',
          title: 'Improve navigation hierarchy',
          description: 'Add visual weight to primary navigation items',
          impact: 'high',
          effort: 'medium',
          actionItems: ['Increase font size for primary items', 'Add icons to main categories'],
          relatedAnnotations: [`annotation-${Date.now()}`]
        },
        {
          id: `suggestion-${Date.now()}-2`,
          category: 'accessibility',
          title: 'Enhance color contrast',
          description: 'Improve text readability with higher contrast ratios',
          impact: 'high',
          effort: 'low',
          actionItems: ['Darken text color', 'Test with accessibility tools'],
          relatedAnnotations: [`annotation-${Date.now()}-2`]
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
        objects: [],
        text: [],
        colors: [
          { color: '#3b82f6', percentage: 30 },
          { color: '#ffffff', percentage: 50 },
          { color: '#1f2937', percentage: 20 }
        ],
        faces: 0
      }
    })
    .select()
    .single()
  
  if (error) {
    console.error('Database error:', error)
    throw error
  }
  
  return { 
    success: true, 
    data: {
      id: analysis.id,
      imageId: analysis.image_id,
      imageName: payload.imageName,
      imageUrl: payload.imageUrl,
      userContext: analysis.user_context,
      visualAnnotations: analysis.visual_annotations,
      suggestions: analysis.suggestions,
      summary: analysis.summary,
      metadata: analysis.metadata,
      createdAt: analysis.created_at
    }
  }
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