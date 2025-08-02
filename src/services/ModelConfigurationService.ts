export const MODEL_REGISTRY = {
  'gpt-3.5-turbo': {
    name: 'GPT 3.5 Turbo',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation'],
    provider: 'openai',
    costPerRequest: 0.002,
    contextWindow: 4096,
    features: {
      conversationalFlow: true
    }
  },
  'gpt-4': {
    name: 'GPT 4',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning'],
    provider: 'openai',
    costPerRequest: 0.06,
    contextWindow: 8192,
    features: {
      conversationalFlow: true,
      complexReasoning: true
    }
  },
  'gpt-4-32k': {
    name: 'GPT 4 32k',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning'],
    provider: 'openai',
    costPerRequest: 0.12,
    contextWindow: 32768,
    features: {
      conversationalFlow: true,
      complexReasoning: true
    }
  },
  'claude-2': {
    name: 'Claude 2',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning'],
    provider: 'anthropic',
    costPerRequest: 0.01102,
    contextWindow: 100000,
    features: {
      conversationalFlow: true,
      complexReasoning: true
    }
  },
  'palm-2': {
    name: 'PaLM 2',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning'],
    provider: 'google',
    costPerRequest: 0.002,
    contextWindow: 8192,
    features: {
      conversationalFlow: true,
      complexReasoning: true
    }
  },
  'llama-2-70b-chat': {
    name: 'Llama 2 70B Chat',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning'],
    provider: 'meta',
    costPerRequest: 0.0006,
    contextWindow: 4096,
    features: {
      conversationalFlow: true,
      complexReasoning: true
    }
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning'],
    provider: 'google',
    costPerRequest: 0.0004,
    contextWindow: 32768,
    features: {
      conversationalFlow: true,
      complexReasoning: true
    }
  },
  'perplexity-sonar': {
    name: 'Perplexity Sonar',
    category: 'conversational',
    capabilities: ['web-search', 'conversational-analysis', 'real-time-data'],
    provider: 'perplexity',
    costPerRequest: 0.002,
    contextWindow: 16000,
    features: {
      webSearch: true,
      citations: true,
      realTimeData: true,
      conversationalFlow: true
    }
  }
};
