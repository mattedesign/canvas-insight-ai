import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Domain detection function (from existing pipeline)
function detectDomain(imageName: string, userContext?: string): string {
  const nameAndContext = `${imageName} ${userContext || ''}`.toLowerCase();
  
  if (nameAndContext.includes('mobile') || nameAndContext.includes('app') || nameAndContext.includes('ios') || nameAndContext.includes('android')) {
    return 'mobile_app';
  } else if (nameAndContext.includes('dashboard') || nameAndContext.includes('admin') || nameAndContext.includes('analytics')) {
    return 'dashboard';
  } else if (nameAndContext.includes('ecommerce') || nameAndContext.includes('shop') || nameAndContext.includes('store') || nameAndContext.includes('cart')) {
    return 'ecommerce';
  } else if (nameAndContext.includes('landing') || nameAndContext.includes('homepage') || nameAndContext.includes('marketing')) {
    return 'landing_page';
  } else if (nameAndContext.includes('form') || nameAndContext.includes('signup') || nameAndContext.includes('login')) {
    return 'form';
  } else {
    return 'web_interface';
  }
}

// Generate domain-specific prompt (from existing pipeline)
function generateDomainPrompt(domain: string, imageName: string, userContext?: string): string {
  const baseContext = userContext ? `\n\nUser Context: ${userContext}` : '';
  
  const domainPrompts = {
    mobile_app: `You are analyzing a mobile app interface. Focus on:
- Touch target sizes (minimum 44px for iOS, 48dp for Android)
- Mobile navigation patterns and accessibility
- Screen size optimization and responsive design
- Mobile-specific usability issues
- App store guidelines compliance${baseContext}`,

    dashboard: `You are analyzing a dashboard interface. Focus on:
- Data visualization effectiveness and clarity
- Information hierarchy and layout density
- User workflow efficiency
- Key metrics visibility and accessibility
- Dashboard-specific UX patterns${baseContext}`,

    ecommerce: `You are analyzing an e-commerce interface. Focus on:
- Product discovery and search functionality
- Checkout flow optimization
- Trust signals and security indicators
- Conversion optimization opportunities
- E-commerce accessibility standards${baseContext}`,

    landing_page: `You are analyzing a landing page. Focus on:
- Clear value proposition and messaging
- Call-to-action effectiveness and placement
- Visual hierarchy and conversion flow
- Loading performance implications
- Marketing conversion optimization${baseContext}`,

    form: `You are analyzing a form interface. Focus on:
- Form field usability and validation
- Error handling and user guidance
- Input accessibility and mobile optimization
- Form completion flow efficiency
- Data entry user experience${baseContext}`,

    web_interface: `You are analyzing a web interface. Focus on:
- General usability principles and navigation
- Accessibility compliance (WCAG guidelines)
- Visual design consistency and hierarchy
- User interaction patterns
- Cross-browser compatibility considerations${baseContext}`
  };

  return domainPrompts[domain as keyof typeof domainPrompts] || domainPrompts.web_interface;
}

// Main UX analysis prompt
function generateUXAnalysisPrompt(domain: string, imageName: string, userContext?: string): string {
  const domainPrompt = generateDomainPrompt(domain, imageName, userContext);
  
  return `${domainPrompt}

Please analyze this UI/UX design and provide a comprehensive assessment in the following JSON format:

{
  "visualAnnotations": [
    {
      "id": "unique-id",
      "x": number (0-100, percentage from left),
      "y": number (0-100, percentage from top),
      "type": "issue" | "suggestion" | "success",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "low" | "medium" | "high"
    }
  ],
  "suggestions": [
    {
      "id": "unique-id",
      "category": "accessibility" | "usability" | "visual" | "content",
      "title": "Suggestion title",
      "description": "Detailed description",
      "impact": "low" | "medium" | "high",
      "effort": "low" | "medium" | "high",
      "actionItems": ["action 1", "action 2"],
      "relatedAnnotations": ["annotation-id"]
    }
  ],
  "summary": {
    "overallScore": number (0-100),
    "categoryScores": {
      "usability": number (0-100),
      "accessibility": number (0-100),
      "visual": number (0-100),
      "content": number (0-100)
    },
    "keyIssues": ["issue 1", "issue 2"],
    "strengths": ["strength 1", "strength 2"]
  },
  "metadata": {
    "objects": [
      {
        "name": "object type",
        "confidence": number (0-1),
        "boundingBox": {"x": number, "y": number, "width": number, "height": number}
      }
    ],
    "text": ["detected text"],
    "colors": [
      {"color": "#hex", "percentage": number}
    ],
    "faces": number,
    "aiGenerated": true
  }
}

Provide specific, actionable insights focused on the ${domain.replace('_', ' ')} domain. Include 3-6 visual annotations marking specific areas of concern or success, and 3-5 comprehensive suggestions with clear action items.`;
}

export default async function handler(req: Request) {
  console.log('OpenAI Test Analysis Function - Request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageName, imageId, userContext, model } = await req.json();
    
    console.log('Analysis request:', { imageName, imageId, model, userContextLength: userContext?.length || 0 });

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Detect domain and generate prompt
    const domain = detectDomain(imageName, userContext);
    const prompt = generateUXAnalysisPrompt(domain, imageName, userContext);
    
    console.log('Detected domain:', domain);
    console.log('Generated prompt length:', prompt.length);

    const startTime = Date.now();

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const analysisTime = Date.now() - startTime;
    
    console.log('OpenAI response received in', analysisTime, 'ms');
    console.log('Tokens used:', data.usage?.total_tokens || 'unknown');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid OpenAI response format');
    }

    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let analysisData;
    try {
      // Extract JSON from response (in case there's additional text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        analysisData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Response content:', content);
      throw new Error('Failed to parse analysis results');
    }

    // Validate and structure the response
    const analysis = {
      id: `openai-test-${imageId}`,
      imageId,
      imageName,
      imageUrl,
      userContext: userContext || '',
      visualAnnotations: analysisData.visualAnnotations || [],
      suggestions: analysisData.suggestions || [],
      summary: {
        overallScore: analysisData.summary?.overallScore || 75,
        categoryScores: {
          usability: analysisData.summary?.categoryScores?.usability || 75,
          accessibility: analysisData.summary?.categoryScores?.accessibility || 75,
          visual: analysisData.summary?.categoryScores?.visual || 75,
          content: analysisData.summary?.categoryScores?.content || 75
        },
        keyIssues: analysisData.summary?.keyIssues || [],
        strengths: analysisData.summary?.strengths || []
      },
      metadata: {
        ...analysisData.metadata,
        aiGenerated: true,
        model: model || 'gpt-4.1-2025-04-14',
        domain,
        analysisTime,
        tokensUsed: data.usage?.total_tokens
      },
      createdAt: new Date()
    };

    console.log('Analysis completed successfully');
    console.log('Generated annotations:', analysis.visualAnnotations.length);
    console.log('Generated suggestions:', analysis.suggestions.length);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      promptUsed: prompt,
      executionTime: analysisTime,
      model: model || 'gpt-4.1-2025-04-14'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OpenAI test analysis error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Analysis failed',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}