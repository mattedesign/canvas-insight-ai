// Safe environment variable access for browser
const getEnvVar = (key: string): string | undefined => {
  // In Vite, environment variables are available on import.meta.env
  if (typeof window !== 'undefined' && import.meta?.env) {
    return import.meta.env[key];
  }
  return undefined;
};

export const pipelineConfig = {
  models: {
    vision: {
      primary: ['openai-vision', 'anthropic-vision'],
      secondary: ['google-vision'],
      timeout: 10000
    },
    analysis: {
      primary: ['gpt-4.1-2025-04-14', 'claude-opus-4-20250514'],
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
    enabled: !!getEnvVar('VITE_PERPLEXITY_API_KEY'),
    features: {
      contextClarification: true,
      knowledgeAugmentation: true,
      citationGeneration: true,
      standardsRetrieval: true
    },
    timeout: 15000,
    requiredForResearch: true
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