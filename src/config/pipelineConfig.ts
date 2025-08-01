export const pipelineConfig = {
  models: {
    vision: {
      primary: ['openai-vision', 'anthropic-vision'],
      secondary: ['google-vision'],
      timeout: 10000
    },
    analysis: {
      primary: ['gpt-4o', 'claude-3-5-sonnet-20241022'],
      secondary: ['gemini-1.5-pro'],
      timeout: 30000
    }
  },
  execution: {
    maxParallelism: 5,
    globalTimeout: 45000,
    retryAttempts: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  },
  quality: {
    minConfidence: 0.75,
    minModelAgreement: 0.6,
    requiredStages: ['vision', 'analysis', 'synthesis']
  },
  contextDetection: {
    enabled: true,
    priority: 'high',
    confidence_threshold: 0.7,
    clarificationEnabled: true
  },
  // Perplexity Integration (Optional Enhancement)
  perplexity: {
    enabled: !!process.env.VITE_PERPLEXITY_API_KEY,
    features: {
      contextClarification: true,
      knowledgeAugmentation: true,
      citationGeneration: true,
      standardsRetrieval: true
    },
    timeout: 15000
  },
  // Learning & Persistence (Optional Enhancement)
  learning: {
    enableContextMemory: true,
    userProfileRetention: 30, // days
    analysisHistoryLimit: 50,
    feedbackLoop: {
      enabled: true,
      minConfidence: 0.8
    }
  }
};