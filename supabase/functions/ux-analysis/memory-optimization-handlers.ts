// Memory Optimization Handlers for UX Analysis Edge Function

// Memory-optimized natural analysis handler
async function handleMemoryOptimizedNaturalAnalysis(body: any) {
  console.log('🧠 Memory-Optimized Natural Analysis - Processing request:', {
    hasPayload: !!body.payload,
    memoryLimit: body.payload?.maxMemoryMB || 80,
    imageUrl: body.payload?.imageUrl?.substring(0, 50) + '...'
  });

  try {
    const payload = body.payload || body;
    const {
      imageUrl,
      userContext,
      analysisContext,
      maxMemoryMB = 80
    } = payload;

    if (!imageUrl) {
      throw new Error('Missing required field: imageUrl');
    }

    console.log('🧠 Processing with memory limit:', `${maxMemoryMB}MB`);

    // Execute analysis with reduced models for memory efficiency
    const models = maxMemoryMB < 60 ? ['gpt-4o'] : ['gpt-4o', 'claude-opus-4-20250514'];
    console.log('🧠 Selected models for memory optimization:', models);

    // Process sequentially to avoid memory spikes
    const modelResults = [];
    for (const model of models) {
      try {
        console.log(`🧠 Processing with model: ${model}`);
        
        const modelPrompt = buildNaturalAnalysisPrompt(userContext, analysisContext);
        
        const modelResult = await executeModel({
          model,
          stage: 'memory_optimized_natural',
          imageUrl,
          prompt: modelPrompt,
          systemPrompt: 'You are a UX analyst providing natural language insights about interface design and usability.',
          analysisContext,
          userContext
        });

        const responseText = await modelResult.text();
        const parsedResult = parseJsonFromResponse(responseText, model, 'memory_optimized_natural');

        if (parsedResult.success) {
          modelResults.push({
            model,
            result: parsedResult.data,
            confidence: 0.8,
            processingTime: Date.now()
          });
        } else {
          // For natural mode, raw text is acceptable
          modelResults.push({
            model,
            result: responseText,
            confidence: 0.7,
            processingTime: Date.now()
          });
        }

        // Force garbage collection opportunity
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (modelError) {
        console.error(`❌ Model ${model} failed in memory-optimized mode:`, modelError);
        // Continue with remaining models
      }
    }

    if (modelResults.length === 0) {
      throw new Error('All models failed in memory-optimized mode');
    }

    // Create simplified synthesis for memory efficiency
    const synthesizedResult = createMemoryEfficientSynthesis(modelResults, {
      imageUrl,
      userContext,
      analysisContext
    });

    console.log('✅ Memory-optimized natural analysis completed:', {
      modelsProcessed: modelResults.length,
      memoryLimit: `${maxMemoryMB}MB`
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: synthesizedResult,
        rawResponses: modelResults,
        metadata: {
          memoryOptimized: true,
          memoryLimitMB: maxMemoryMB,
          modelsUsed: modelResults.map(r => r.model),
          processingTime: Date.now()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Memory-optimized natural analysis failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stage: 'memory-optimized-natural-analysis',
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Memory-optimized chunk handler
async function handleMemoryOptimizedChunk(body: any) {
  console.log('🧠 Memory-Optimized Chunk - Processing request:', {
    model: body.payload?.model,
    memoryLimit: body.payload?.memoryLimit || 100
  });

  try {
    const payload = body.payload || body;
    const {
      imageUrl,
      model,
      userContext,
      analysisContext,
      memoryLimit = 100
    } = payload;

    if (!imageUrl || !model) {
      throw new Error('Missing required fields: imageUrl and model');
    }

    console.log(`🧠 Processing chunk with ${model}, memory limit: ${memoryLimit}MB`);

    // Build focused prompt for single model analysis
    const chunkPrompt = buildChunkAnalysisPrompt(userContext, analysisContext, model);

    // Execute single model with memory constraints
    const result = await executeModel({
      model,
      stage: 'memory_chunk',
      imageUrl,
      prompt: chunkPrompt,
      systemPrompt: `You are a ${model.includes('gpt') ? 'GPT' : 'Claude'} UX analyst. Provide focused analysis within memory constraints.`,
      analysisContext,
      userContext
    });

    const responseText = await result.text();
    const parsedResult = parseJsonFromResponse(responseText, model, 'memory_chunk');

    let chunkData;
    if (parsedResult.success) {
      chunkData = parsedResult.data;
    } else {
      // Create structured fallback from text response
      chunkData = createStructuredFallback(responseText, model);
    }

    console.log(`✅ Memory-optimized chunk completed for ${model}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: chunkData,
        model,
        memoryUsed: 'estimated_low',
        processingTime: Date.now(),
        metadata: {
          memoryOptimized: true,
          memoryLimitMB: memoryLimit,
          chunkMode: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Memory-optimized chunk failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stage: 'memory-optimized-chunk',
        model: body.payload?.model,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Helper functions

function buildNaturalAnalysisPrompt(userContext?: string, analysisContext?: any): string {
  const contextPart = userContext ? `Context: ${userContext}` : 'General UX analysis';
  const interfaceType = analysisContext?.image?.primaryType || 'interface';
  
  return `Analyze this ${interfaceType} with natural language insights, focusing on:

1. **User Experience Quality**: What works well and what doesn't?
2. **Interface Clarity**: How clear and intuitive is the design?
3. **Accessibility Considerations**: Any barriers to accessibility?
4. **Visual Design Effectiveness**: Typography, colors, spacing, hierarchy
5. **Functional Assessment**: Does the interface serve its purpose well?

Provide specific, actionable insights in conversational language. Focus on the most important observations that would help improve the user experience.

${contextPart}

Respond with practical insights and recommendations in natural language.`;
}

function buildChunkAnalysisPrompt(userContext?: string, analysisContext?: any, model?: string): string {
  const contextPart = userContext ? `Context: ${userContext}` : 'General UX analysis';
  const interfaceType = analysisContext?.image?.primaryType || 'interface';
  const modelFocus = model?.includes('gpt') ? 'technical usability' : 'design and accessibility';
  
  return `As a UX expert focusing on ${modelFocus}, analyze this ${interfaceType}:

Focus Areas:
- Core usability patterns
- Key visual hierarchy elements
- Most critical user experience issues
- Essential accessibility considerations

Provide 2-3 specific, high-impact recommendations.

${contextPart}

Keep analysis focused and memory-efficient. Return structured JSON with suggestions and key insights.`;
}

function createMemoryEfficientSynthesis(modelResults: any[], context: any): any {
  // Extract key insights from all models
  const allInsights = [];
  const allSuggestions = [];

  modelResults.forEach((result, index) => {
    if (typeof result.result === 'string') {
      // Extract insights from natural language response
      const textInsights = extractInsightsFromText(result.result, result.model);
      allInsights.push(...textInsights);
    } else if (result.result && typeof result.result === 'object') {
      // Extract from structured response
      if (result.result.suggestions) {
        allSuggestions.push(...result.result.suggestions.slice(0, 2));
      }
      if (result.result.insights) {
        allInsights.push(...result.result.insights.slice(0, 2));
      }
    }
  });

  // Create memory-efficient analysis
  return {
    id: `memory_analysis_${Date.now()}`,
    imageId: '',
    imageName: 'Memory Optimized Analysis',
    imageUrl: context.imageUrl,
    userContext: context.userContext || '',
    visualAnnotations: allInsights.slice(0, 4).map((insight, index) => ({
      id: `mem_annotation_${index}`,
      x: 0.2 + (index * 0.2),
      y: 0.3,
      type: 'suggestion',
      title: insight.title || `Insight ${index + 1}`,
      description: insight.description || insight.text || 'UX insight identified',
      severity: 'medium'
    })),
    suggestions: allSuggestions.slice(0, 4).map((suggestion, index) => ({
      id: `mem_suggestion_${index}`,
      category: 'usability',
      title: suggestion.title || `Recommendation ${index + 1}`,
      description: suggestion.description || suggestion.text || 'UX improvement recommended',
      impact: 'medium',
      effort: 'medium',
      actionItems: Array.isArray(suggestion.actionItems) ? suggestion.actionItems : ['Review and implement'],
      relatedAnnotations: []
    })),
    summary: {
      overallScore: 70,
      categoryScores: {
        usability: 70,
        accessibility: 65,
        visual: 75,
        content: 70
      },
      keyIssues: allInsights.slice(0, 2).map(i => i.title || 'UX issue identified'),
      strengths: ['Memory-efficient analysis completed']
    },
    metadata: {
      objects: [],
      text: [],
      colors: [],
      faces: 0
    },
    createdAt: new Date().toISOString(),
    modelUsed: `memory-optimized-${modelResults.map(r => r.model).join('+')}`,
    status: 'completed'
  };
}

function extractInsightsFromText(text: string, model: string): any[] {
  const insights = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  sentences.slice(0, 3).forEach((sentence, index) => {
    insights.push({
      title: `${model} Insight ${index + 1}`,
      description: sentence.trim(),
      text: sentence.trim(),
      confidence: 0.7
    });
  });
  
  return insights;
}

function createStructuredFallback(responseText: string, model: string): any {
  return {
    suggestions: [{
      id: 'fallback_1',
      title: `${model} Analysis`,
      description: responseText.substring(0, 200) + '...',
      category: 'usability',
      impact: 'medium',
      effort: 'medium',
      actionItems: ['Review detailed analysis']
    }],
    summary: {
      overallScore: 65,
      categoryScores: {
        usability: 65,
        accessibility: 60,
        visual: 70,
        content: 65
      }
    },
    metadata: {
      model,
      fallbackUsed: true,
      originalResponse: responseText.substring(0, 500)
    }
  };
}