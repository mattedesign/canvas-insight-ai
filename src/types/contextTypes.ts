// Image context detection types
export interface ImageContext {
  primaryType: 'dashboard' | 'landing' | 'app' | 'form' | 'ecommerce' | 'content' | 'portfolio' | 'saas' | 'mobile' | 'unknown';
  subTypes: string[];
  domain: string; // finance, healthcare, education, retail, etc.
  complexity: 'simple' | 'moderate' | 'complex';
  userIntent: string[]; // likely user goals based on UI
  businessModel?: string;
  targetAudience?: string;
  maturityStage?: 'prototype' | 'mvp' | 'growth' | 'mature';
  platform?: 'web' | 'mobile' | 'desktop' | 'responsive';
  designSystem?: {
    detected: boolean;
    type?: string; // material, bootstrap, custom, etc.
    consistency: number; // 0-1 score
  };
}

// User context for personalization
export interface UserContext {
  explicitRole?: string; // from user input
  inferredRole?: 'designer' | 'developer' | 'business' | 'product' | 'marketing';
  expertise?: 'beginner' | 'intermediate' | 'expert';
  goals?: string[];
  constraints?: string[];
  industry?: string;
  technicalLevel?: 'non-technical' | 'some-technical' | 'technical';
  focusAreas?: string[]; // conversion, accessibility, performance, etc.
  outputPreferences?: {
    detailLevel: 'concise' | 'detailed' | 'comprehensive';
    jargonLevel: 'avoid' | 'minimal' | 'technical';
    prioritization: 'impact' | 'effort' | 'quick-wins';
  };
}

// Combined analysis context
export interface AnalysisContext {
  image: ImageContext;
  user: UserContext;
  focusAreas: string[];
  analysisDepth: 'surface' | 'standard' | 'deep' | 'exhaustive';
  outputStyle: 'technical' | 'business' | 'design' | 'balanced';
  industryStandards?: string[]; // WCAG, HIPAA, PCI, etc.
  confidence: number;
  detectedAt: string;
  clarificationNeeded?: boolean;
  clarificationQuestions?: string[];
}

// Dynamic prompt components
export interface PromptComponents {
  contextualBase: string;
  domainSpecific: string;
  roleSpecific: string;
  focusDirectives: string[];
  outputFormat: string;
  qualityMarkers: string[];
  researchContext?: string; // Added for Perplexity integration
  citations?: Citation[]; // Added for source tracking
}

// Citation tracking
export interface Citation {
  source: string;
  title: string;
  url?: string;
  relevance: number;
}

// Clarified context after user input
export interface ClarifiedContext extends AnalysisContext {
  clarificationResponses?: Record<string, string>;
  enhancedConfidence: number;
}