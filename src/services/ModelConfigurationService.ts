export const MODEL_REGISTRY = {
  'gpt-4o': {
    name: 'GPT 4o',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning', 'vision'],
    provider: 'openai',
    costPerRequest: 0.06,
    contextWindow: 128000,
    features: {
      conversationalFlow: true,
      complexReasoning: true,
      vision: true
    }
  },
  'claude-opus-4-20250514': {
    name: 'Claude Opus 4',
    category: 'conversational',
    capabilities: ['conversational-analysis', 'multi-turn-conversation', 'complex-reasoning', 'vision'],
    provider: 'anthropic',
    costPerRequest: 0.015,
    contextWindow: 200000,
    features: {
      conversationalFlow: true,
      complexReasoning: true,
      vision: true
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
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
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
