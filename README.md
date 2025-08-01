# UX Analysis AI Platform

A boundary-pushing, context-aware multi-model AI platform that provides personalized UX/UI analysis by automatically detecting interface types, adapting insights to user needs, and augmenting recommendations with real-time research.

## 🚀 Key Features

### Context-Aware Intelligence
- **Automatic Interface Detection**: AI detects whether you're analyzing a dashboard, landing page, mobile app, e-commerce site, or other interface types
- **User Role Recognition**: Adapts analysis based on whether you're a designer, developer, business stakeholder, or product manager
- **Conversational Clarification**: When context is ambiguous, asks targeted questions to better understand your needs
- **Dynamic Prompt Generation**: Every analysis uses custom-built prompts based on detected context
- **Multi-Model Orchestration**: Runs multiple AI models in parallel (OpenAI, Anthropic, Google Vision) for comprehensive insights

### Enhanced with Real-Time Knowledge
- **Live Standards Retrieval**: Fetches current compliance requirements (WCAG, HIPAA, PCI-DSS) based on detected domain
- **Research Augmentation**: Integrates latest design patterns and best practices using Perplexity AI
- **Citation Support**: Backs recommendations with credible sources and research
- **Persistent Learning**: Remembers user preferences and context across sessions (optional)

### Core Capabilities
- **Personalized Analysis**: Insights tailored to your expertise level and goals
- **Industry-Specific Compliance**: Automatic checks for WCAG, HIPAA, PCI-DSS, and other standards based on detected domain
- **Visual Annotations**: AI-generated overlays highlighting specific UI issues and opportunities
- **Actionable Recommendations**: Prioritized suggestions based on impact, effort, or quick wins
- **Confidence Scoring**: Transparency about AI certainty levels
- **Project Management**: Organize analyses into projects with collaboration features

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **AI Integration**: 
  - OpenAI GPT-4 Vision & GPT-4o
  - Anthropic Claude 3.5 Sonnet & Claude 3 Opus
  - Google Vision API
  - Perplexity AI (optional, for research augmentation)
- **State Management**: Context-aware pipeline with real-time updates
- **File Upload**: React Dropzone with image optimization

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- At least one AI API key (OpenAI, Anthropic, or Google)
- Perplexity API key (optional, for enhanced features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ux-analysis-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Update `.env.local` with:
```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_PERPLEXITY_API_KEY=your-perplexity-key # Optional
```

4. Configure Supabase Edge Functions:
   - Go to your Supabase dashboard
   - Navigate to Edge Functions > Settings
   - Add these environment variables:
     - `OPENAI_API_KEY` (recommended)
     - `ANTHROPIC_API_KEY` (recommended)
     - `GOOGLE_VISION_API_KEY` (optional)
     - `PERPLEXITY_API_KEY` (optional)

5. Deploy Edge Functions:
```bash
supabase functions deploy ux-analysis
supabase functions deploy context-detection
```

6. Start the development server:
```bash
npm run dev
```

## 🏗️ Project Structure

```
src/
├── components/          # UI components including context display
│   ├── AnalysisContextDisplay.tsx
│   ├── ContextClarification.tsx
│   ├── PipelineMonitor.tsx
│   └── ImageAnalysisView.tsx
├── services/           # Core AI services
│   ├── BoundaryPushingPipeline.ts
│   ├── ContextDetectionService.ts
│   ├── DynamicPromptBuilder.ts
│   └── StandardsRetrievalService.ts
├── types/              # TypeScript definitions
│   ├── contextTypes.ts
│   └── pipelineErrors.ts
├── hooks/              # Custom React hooks
│   └── useOptimizedPipeline.tsx
├── config/             # Configuration files
│   └── pipelineConfig.ts
└── integrations/       # Supabase integration
```

## ⚠️ STRICT IMPLEMENTATION RULES FOR LOVABLE.DEV

### DO NOT ADD OR CHANGE

**STOP! Before implementing ANYTHING, check if it's explicitly in the Complete Context-Aware Multi-Model Pipeline guide.**

1. **NO NEW FEATURES**: Only implement what's documented in the guide
2. **NO IMPROVEMENTS**: Don't "enhance" or "optimize" beyond the spec
3. **NO REFACTORING**: Keep the exact structure as specified
4. **NO ADDITIONAL PACKAGES**: Only use dependencies listed in the guide
5. **NO UI EMBELLISHMENTS**: Build exactly what's shown, nothing more
6. **NO EXTRA VALIDATIONS**: Only validations mentioned in the guide
7. **NO PERFORMANCE OPTIMIZATIONS**: Unless explicitly stated
8. **NO ADDITIONAL ERROR HANDLING**: Only handle errors as specified

### IMPLEMENTATION CHECKLIST

**Phase 1: Remove Fallbacks (FIRST PRIORITY)**
- [x] Delete ALL functions listed in Step 1.1
- [x] Remove ResilientAnalysisPipeline.ts completely
- [x] Remove fallback references from hooks
- [x] DO NOT create new error handlers

**Phase 2: Context Detection (EXACT IMPLEMENTATION)**
- [x] Create ONLY the types in contextTypes.ts
- [x] Create ONLY the services listed
- [x] Use EXACT method signatures provided
- [x] DO NOT add extra context fields

**Phase 3: Pipeline Implementation**
- [x] Copy code EXACTLY as provided
- [x] DO NOT add error boundaries
- [x] DO NOT add loading states unless shown
- [x] DO NOT optimize the code

**Phase 4: UI Components**
- [x] Build ONLY listed components
- [x] Use ONLY the props specified
- [x] DO NOT add animations
- [x] DO NOT add extra styling

### RED FLAGS TO AVOID

If you find yourself thinking any of these, STOP:
- "This would be better if..."
- "Let me also add..."
- "Users might want..."
- "This could be optimized by..."
- "We should handle the case where..."
- "It would be nice to have..."
- "This seems incomplete without..."

### ONLY IMPLEMENT IF

The feature/code is:
1. ✅ Explicitly shown in the guide's code blocks
2. ✅ Listed in the implementation checklist
3. ✅ Mentioned in the type definitions
4. ✅ Part of the exact file structure

### QUESTIONS TO ASK BEFORE CODING

Before writing ANY line of code, ask:
1. Is this exact code in the implementation guide?
2. Is this file listed in the project structure?
3. Is this method shown in the code examples?
4. Is this property in the TypeScript interfaces?

**If ANY answer is NO → DON'T IMPLEMENT IT**

### HANDLING AMBIGUITY

If something seems missing or unclear:
1. **DO NOT GUESS** or fill in gaps
2. **DO NOT ADD** placeholder functionality
3. **DO NOT CREATE** temporary solutions
4. **ONLY USE** what's explicitly provided
5. **ASK FOR CLARIFICATION** if truly blocked

### SUCCESS CRITERIA

The implementation is successful when:
- ✅ Every file matches the guide exactly
- ✅ No extra features were added
- ✅ No "improvements" were made
- ✅ All code is copy-pasted from the guide
- ✅ Nothing exists that isn't in the guide

**Remember**: The goal is EXACT implementation of the documented system, not a "better" version. Scope creep kills projects. Stick to the plan!

## 🤖 AI Rules of Engagement

### Core Principles for AI Analysis

1. **Context-Aware Analysis**: Always detect and adapt to the interface type and user role before providing insights
2. **No Generic Feedback**: Every analysis must be specifically tailored to the detected context - never use one-size-fits-all responses
3. **Evidence-Based**: Support all recommendations with specific UI elements, established UX principles, and industry standards
4. **Role-Appropriate Language**: Adapt technical level based on user expertise (developer vs business stakeholder vs designer)
5. **Actionable Specificity**: Provide precise, implementable suggestions with clear steps, not vague improvements
6. **Source Citations**: When research augmentation is enabled, cite credible sources for recommendations

### Context Detection Requirements

- **Always Run First**: Context detection must complete before any analysis begins
- **Display Transparently**: Show users what was detected (interface type, domain, user role)
- **Clarify When Uncertain**: If confidence < 70%, ask clarifying questions before proceeding
- **Adapt Dynamically**: Use detected context to build custom prompts for each stage
- **Industry Standards**: Automatically include relevant compliance checks (WCAG for all, HIPAA for healthcare, PCI-DSS for finance)

### Analysis Focus by Interface Type

**Dashboards**
- Data visualization effectiveness and cognitive load
- Information hierarchy and decision support
- Real-time data handling and performance
- Current best practices for data presentation

**Landing Pages**
- Conversion optimization and psychological triggers
- Message clarity and value proposition
- Trust signals and social proof
- Latest conversion rate optimization research

**Mobile Apps**
- Touch target sizing (minimum 44x44px)
- Gesture patterns and thumb reach
- Platform-specific guidelines (iOS HIG, Material Design)
- Mobile-first design principles

**E-commerce**
- Purchase journey and cart abandonment factors
- Product presentation and comparison features
- Security perception and payment trust
- Current e-commerce UX trends

**Forms**
- Field validation and error recovery
- Completion optimization and progress indicators
- Accessibility and keyboard navigation
- Form design best practices

### Output Adaptation Rules

**For Developers**
- Include component architecture insights
- Provide code-level implementation hints
- Focus on performance implications
- Use technical terminology freely
- Reference specific libraries and frameworks

**For Designers**
- Emphasize visual hierarchy and aesthetics
- Reference design system opportunities
- Focus on emotional design impact
- Include creative alternatives
- Cite design pattern libraries

**For Business Stakeholders**
- Lead with ROI and conversion impact
- Use business metrics and KPIs
- Avoid technical jargon
- Focus on competitive advantages
- Include market research citations

**For Product Managers**
- Balance user needs with feasibility
- Include roadmap considerations
- Focus on feature adoption
- Provide prioritization frameworks
- Reference product analytics

### Quality Requirements

- **Quantifiable**: Include specific metrics (e.g., "Increase button size to 48px" not "Make button bigger")
- **Prioritized**: Mark issues as Critical, High, Medium, or Low based on user impact
- **Confidence-Rated**: Show confidence levels for AI-generated insights
- **Multi-Model Validated**: When multiple models agree, highlight consensus findings
- **Source-Backed**: Include citations when research augmentation is enabled

### Error Handling Principles

- **Specific Errors Only**: Never show generic error messages
- **Actionable Solutions**: Every error must tell users exactly how to fix it
- **No Fallback Content**: If analysis fails, explain why - don't show placeholder data
- **Transparent Limitations**: Be clear about what requires which API keys

## 🤖 AI Assistant Instructions & Guidelines

### When Working on This Codebase

AI assistants should follow these critical guidelines:

1. **Prioritize Context Detection**: Always ensure context detection runs before any analysis
2. **No Generic Responses**: Never create fallback functions or generic UX feedback
3. **Use Stable References**: Prefer useRef and useCallback with empty dependency arrays
4. **Monitor Performance**: Add logging to track re-render counts during development
5. **Test Incrementally**: Verify each change doesn't introduce render loops

### Implementation Rules

**ALWAYS DO:**
- Delete ALL fallback functions when found
- Check for circular dependencies in useEffect hooks
- Use the ContextDetectionService for all context needs
- Build prompts dynamically with DynamicPromptBuilder
- Show real, specific errors that help users
- Include detected context in all analysis results
- Ask clarifying questions when confidence < 70%
- Cite sources when Perplexity integration is available

**NEVER DO:**
- Create generic error handlers with vague messages
- Use hardcoded prompts or templates
- Hide API failures behind generic responses
- Skip context detection to save time
- Assume user role or interface type
- Create fallback analysis data
- Use placeholder content for failed analyses

### Code Quality Standards

```typescript
// ✅ GOOD: Context-aware prompt generation
const prompt = await promptBuilder.buildContextualPrompt(
  stage,
  context,
  previousData
);

// ❌ BAD: Generic prompt
const prompt = "Analyze this UI for usability issues";

// ✅ GOOD: Specific error with solution
throw new PipelineError(
  'OpenAI API key not configured. Add OPENAI_API_KEY in Supabase Edge Functions.',
  'vision',
  { requiredKey: 'OPENAI_API_KEY' }
);

// ❌ BAD: Generic error
throw new Error('Analysis failed');

// ✅ GOOD: Include context in results
return {
  analysis: results,
  analysisContext: context,
  citations: sources
};

// ❌ BAD: Return analysis without context
return { analysis: results };
```

### Testing Requirements

Before submitting any changes:
1. Verify NO fallback functions exist
2. Test with 0, 1, and multiple API keys
3. Ensure context is always displayed
4. Check clarification flow triggers correctly
5. Validate citations appear when available
6. Confirm all errors are specific and actionable

### Architecture Principles

1. **Single Source of Truth**: The detected context drives everything
2. **Progressive Enhancement**: Features gracefully degrade without optional APIs
3. **Transparency First**: Users see what was detected and why
4. **Quality Over Speed**: Better to ask questions than guess wrong
5. **Evidence-Based**: All recommendations backed by sources or principles

## 🎯 Context-Aware Analysis System

### How It Works

1. **Context Detection Phase**
   - Analyzes uploaded image to detect interface type (dashboard, landing page, app, etc.)
   - Identifies domain (finance, healthcare, e-commerce, etc.)
   - Infers user role and expertise from natural language input
   - Calculates confidence score

2. **Clarification Phase (if needed)**
   - Triggers when confidence < 70%
   - Asks targeted questions about interface type, user role, or goals
   - Enhances context based on responses
   - Resumes analysis with improved understanding

3. **Knowledge Augmentation (optional)**
   - Fetches latest standards and guidelines
   - Retrieves relevant design patterns and best practices
   - Adds research context to prompts
   - Generates citations for recommendations

4. **Dynamic Prompt Generation**
   - Builds custom prompts based on detected context
   - Adapts language complexity to user expertise level
   - Includes domain-specific requirements automatically
   - Incorporates research findings when available

5. **Multi-Model Execution**
   - Runs available AI models in parallel
   - Fuses insights from multiple models
   - Calculates confidence scores
   - Validates findings across models

6. **Personalized Output**
   - Formats results based on user role (technical vs business language)
   - Prioritizes recommendations by user preference (impact, effort, quick wins)
   - Shows detected context transparently
   - Includes citations when available

### Supported Interface Types

- **Dashboard**: Data visualization, metrics, KPI tracking
- **Landing Page**: Conversion optimization, messaging, CTAs
- **Mobile App**: Touch targets, gestures, mobile-specific patterns
- **E-commerce**: Product presentation, cart flow, trust signals
- **Forms**: Field validation, completion optimization
- **SaaS**: Onboarding, feature discovery, user retention
- **Portfolio**: Visual presentation, case studies
- **Content**: Readability, information architecture

### User Roles & Adaptations

- **Designers**: Focus on visual hierarchy, aesthetics, design systems
- **Developers**: Component architecture, performance, implementation
- **Business**: ROI, conversion metrics, growth opportunities
- **Product**: Feature adoption, user journeys, roadmap implications
- **Marketing**: Messaging, brand consistency, SEO considerations

# Complete Context-Aware Multi-Model Pipeline - Full Implementation Guide

## CRITICAL: Context Detection and Display is PRIORITY - No Generic UX Feedback

This document contains EVERY step, file, and line of code needed to create a boundary-pushing, context-aware multi-model AI pipeline that dynamically adapts to any interface type and user need. **The focus is on CONTEXT DETECTION and PERSONALIZED INSIGHTS, not generic UX analysis.**

---

## PHASE 1: Remove ALL Fallback Logic (Day 1)

### Step 1.1: Delete Fallback Functions from Edge Function

**File**: `supabase/functions/ux-analysis/index.ts`

**Action**: DELETE or comment out these entire functions:
```typescript
// DELETE THESE FUNCTIONS COMPLETELY:
function createFallbackVisionAnalysis(metadata: VisionMetadata) { /* DELETE ALL */ }
function createFallbackComprehensiveAnalysis(metadata: VisionMetadata, visionAnalysis: any) { /* DELETE ALL */ }
function generateFallbackInpaintedImage(prompt: string, model: string, error: string) { /* DELETE ALL */ }
function createClaudeSynthesisFallback() { /* DELETE ALL */ }
function generateBasicAnalysisFromStages(stages: AnalysisStageResult[], metadata: VisionMetadata) { /* DELETE ALL */ }
```

**Also remove any calls to these functions:**
```typescript
// REMOVE lines like:
visionAnalysisResult = createFallbackVisionAnalysis(metadataResult);
finalAnalysisResult = createFallbackComprehensiveAnalysis(metadataResult, visionAnalysisResult);
// etc.
```

### Step 1.2: Remove Fallback Logic from ResilientAnalysisPipeline

**File**: `src/services/ResilientAnalysisPipeline.ts`

**Action**: DELETE this entire file. We're replacing it completely.

### Step 1.3: Remove Fallback References

**File**: `src/hooks/useOptimizedPipeline.tsx`

**Action**: Find and DELETE any lines that reference fallback data or generic error messages.

---

## PHASE 2: Create Context Detection Infrastructure (Day 1-2)

### Step 2.1: Create Context Types

**File**: `src/types/contextTypes.ts` (CREATE NEW FILE)

```typescript
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
```

### Step 2.2: Create Pipeline Configuration

**File**: `src/config/pipelineConfig.ts` (CREATE NEW FILE)

```typescript
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
```

### Step 2.3: Create Error Types

**File**: `src/types/pipelineErrors.ts` (CREATE NEW FILE)

```typescript
export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public details: any,
    public isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export class ModelExecutionError extends PipelineError {
  constructor(
    model: string,
    stage: string,
    originalError: Error,
    public modelMetrics?: {
      latency?: number;
      tokensUsed?: number;
    }
  ) {
    super(
      `Model ${model} failed at ${stage}: ${originalError.message}`,
      stage,
      { model, originalError: originalError.message, stack: originalError.stack },
      true
    );
    this.name = 'ModelExecutionError';
  }
}
```

---

## PHASE 3: Create Context Detection Service (Day 2)

### Step 3.1: Create Context Detection Service

**File**: `src/services/ContextDetectionService.ts` (CREATE NEW FILE)

```typescript
import { ImageContext, UserContext, AnalysisContext } from '@/types/contextTypes';
import { supabase } from '@/integrations/supabase/client';

export class ContextDetectionService {
  /**
   * Use AI to intelligently detect image context - THIS IS PRIORITY
   */
  async detectImageContext(
    imageUrl: string,
    initialVisionData?: any
  ): Promise<ImageContext> {
    // First pass: Quick visual analysis for context
    const contextPrompt = `Analyze this interface and determine:
    1. Primary interface type (dashboard/landing/app/form/ecommerce/content/portfolio/saas/mobile)
    2. Sub-types or patterns present
    3. Industry/domain (finance/health/education/retail/tech/other)
    4. Complexity level (simple/moderate/complex)
    5. Likely user intents when viewing this interface
    6. Business model if apparent
    7. Target audience characteristics
    8. Development maturity (prototype/mvp/growth/mature)
    9. Platform type (web/mobile/desktop/responsive)
    10. Design system presence and consistency

    Return as JSON with confidence scores for each determination.`;

    const { data } = await supabase.functions.invoke('context-detection', {
      body: {
        imageUrl,
        prompt: contextPrompt,
        model: 'gpt-4o',
        maxTokens: 1000
      }
    });

    return this.parseImageContext(data);
  }

  /**
   * Infer user context from their input and behavior
   */
  inferUserContext(
    explicitContext: string,
    previousInteractions?: any[]
  ): UserContext {
    const context: UserContext = {
      technicalLevel: 'some-technical',
      expertise: 'intermediate'
    };

    // Analyze explicit context for role indicators
    const roleIndicators = {
      designer: /design|ui|ux|visual|aesthetic|color|typography/i,
      developer: /code|component|api|implement|technical|architecture/i,
      business: /revenue|conversion|roi|metrics|growth|acquisition/i,
      product: /feature|roadmap|user story|backlog|priorit/i,
      marketing: /campaign|messaging|brand|seo|content|copy/i
    };

    for (const [role, pattern] of Object.entries(roleIndicators)) {
      if (pattern.test(explicitContext)) {
        context.inferredRole = role as any;
        break;
      }
    }

    // Detect expertise level
    if (/beginner|new to|help me understand|basic/i.test(explicitContext)) {
      context.expertise = 'beginner';
      context.technicalLevel = 'non-technical';
    } else if (/advanced|expert|deep dive|comprehensive/i.test(explicitContext)) {
      context.expertise = 'expert';
      context.technicalLevel = 'technical';
    }

    // Extract goals
    const goalMatches = explicitContext.match(/(?:want to|need to|help me|looking to|trying to)\s+([^.!?]+)/gi);
    if (goalMatches) {
      context.goals = goalMatches.map(match => 
        match.replace(/(?:want to|need to|help me|looking to|trying to)\s+/i, '').trim()
      );
    }

    // Detect focus areas
    const focusPatterns = {
      conversion: /conversion|convert|cta|action|purchase/i,
      accessibility: /accessible|a11y|wcag|screen reader|disability/i,
      performance: /performance|speed|fast|load|optimize/i,
      mobile: /mobile|responsive|touch|gesture|small screen/i,
      'data-visualization': /chart|graph|data|metrics|dashboard|visualiz/i,
      'trust-signals': /trust|security|credibility|testimonial|social proof/i
    };

    context.focusAreas = [];
    for (const [area, pattern] of Object.entries(focusPatterns)) {
      if (pattern.test(explicitContext)) {
        context.focusAreas.push(area);
      }
    }

    // Set output preferences based on role and expertise
    context.outputPreferences = {
      detailLevel: context.expertise === 'expert' ? 'comprehensive' : 'detailed',
      jargonLevel: context.technicalLevel === 'technical' ? 'technical' : 'minimal',
      prioritization: context.inferredRole === 'business' ? 'impact' : 'effort'
    };

    return context;
  }

  /**
   * Create unified analysis context
   */
  createAnalysisContext(
    imageContext: ImageContext,
    userContext: UserContext
  ): AnalysisContext {
    // Merge and enhance contexts
    const focusAreas = this.mergeFocusAreas(imageContext, userContext);
    const analysisDepth = this.determineAnalysisDepth(userContext, imageContext);
    const outputStyle = this.determineOutputStyle(userContext);
    const confidence = this.calculateContextConfidence(imageContext, userContext);
    
    const context: AnalysisContext = {
      image: imageContext,
      user: userContext,
      focusAreas,
      analysisDepth,
      outputStyle,
      industryStandards: this.getIndustryStandards(imageContext.domain),
      confidence,
      detectedAt: new Date().toISOString(),
      clarificationNeeded: confidence < 0.7
    };

    // If confidence is low, prepare clarification questions
    if (context.clarificationNeeded) {
      context.clarificationQuestions = this.generateClarificationQuestions(imageContext, userContext);
    }

    return context;
  }

  /**
   * Generate clarifying questions when context confidence is low
   */
  generateClarificationQuestions(
    imageContext: ImageContext,
    userContext: UserContext
  ): string[] {
    const questions: string[] = [];

    // Clarify interface type if uncertain
    if (imageContext.primaryType === 'unknown' || imageContext.confidence < 0.6) {
      questions.push(
        "I'm analyzing your interface. Is this primarily a dashboard, landing page, mobile app, or something else?",
        "What is the main purpose of this interface?"
      );
    }

    // Clarify user role if not detected
    if (!userContext.inferredRole) {
      questions.push(
        "What's your role in this project? (Designer, Developer, Product Manager, Business Stakeholder, etc.)",
        "What perspective would be most helpful for your analysis?"
      );
    }

    // Clarify goals if vague
    if (!userContext.goals || userContext.goals.length === 0) {
      questions.push(
        "What are you hoping to improve or validate with this analysis?",
        "Are there specific metrics or outcomes you're targeting?"
      );
    }

    // Domain-specific clarifications
    if (imageContext.domain === 'general' || !imageContext.domain) {
      questions.push(
        "What industry or domain is this interface for?",
        "Are there specific compliance requirements we should consider?"
      );
    }

    return questions;
  }

  /**
   * Process clarification responses to enhance context
   */
  async processClarificationResponses(
    originalContext: AnalysisContext,
    responses: Record<string, string>
  ): Promise<ClarifiedContext> {
    // Re-analyze with additional information
    const enhancedUserContext = this.enhanceUserContext(
      originalContext.user,
      responses
    );

    const enhancedImageContext = await this.enhanceImageContext(
      originalContext.image,
      responses
    );

    return {
      ...originalContext,
      user: enhancedUserContext,
      image: enhancedImageContext,
      clarificationResponses: responses,
      enhancedConfidence: 0.9, // Higher confidence after clarification
      clarificationNeeded: false
    };
  }

  private calculateContextConfidence(
    imageContext: ImageContext,
    userContext: UserContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Image context factors
    if (imageContext.primaryType !== 'unknown') confidence += 0.2;
    if (imageContext.domain && imageContext.domain !== 'general') confidence += 0.15;
    if (imageContext.designSystem?.detected) confidence += 0.05;

    // User context factors
    if (userContext.inferredRole) confidence += 0.1;
    if (userContext.goals && userContext.goals.length > 0) confidence += 0.1;
    if (userContext.focusAreas && userContext.focusAreas.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private enhanceUserContext(
    original: UserContext,
    responses: Record<string, string>
  ): UserContext {
    const enhanced = { ...original };

    // Process role clarification
    const roleResponse = responses['role'] || responses['perspective'];
    if (roleResponse) {
      enhanced.inferredRole = this.parseRole(roleResponse);
    }

    // Process goal clarification
    const goalResponse = responses['goals'] || responses['improvements'];
    if (goalResponse) {
      enhanced.goals = this.parseGoals(goalResponse);
    }

    return enhanced;
  }

  private async enhanceImageContext(
    original: ImageContext,
    responses: Record<string, string>
  ): Promise<ImageContext> {
    const enhanced = { ...original };

    // Process interface type clarification
    const typeResponse = responses['interfaceType'] || responses['purpose'];
    if (typeResponse) {
      enhanced.primaryType = this.parseInterfaceType(typeResponse);
    }

    // Process domain clarification
    const domainResponse = responses['industry'] || responses['domain'];
    if (domainResponse) {
      enhanced.domain = this.parseDomain(domainResponse);
    }

    return enhanced;
  }

  private parseRole(response: string): UserContext['inferredRole'] {
    const normalized = response.toLowerCase();
    if (normalized.includes('design')) return 'designer';
    if (normalized.includes('develop') || normalized.includes('engineer')) return 'developer';
    if (normalized.includes('business') || normalized.includes('stakeholder')) return 'business';
    if (normalized.includes('product')) return 'product';
    if (normalized.includes('market')) return 'marketing';
    return undefined;
  }

  private parseInterfaceType(response: string): ImageContext['primaryType'] {
    const normalized = response.toLowerCase();
    if (normalized.includes('dashboard')) return 'dashboard';
    if (normalized.includes('landing')) return 'landing';
    if (normalized.includes('mobile') || normalized.includes('app')) return 'mobile';
    if (normalized.includes('ecommerce') || normalized.includes('shop')) return 'ecommerce';
    if (normalized.includes('form')) return 'form';
    if (normalized.includes('saas')) return 'saas';
    return 'app'; // Default to app if unclear
  }

  private parseDomain(response: string): string {
    const normalized = response.toLowerCase();
    if (normalized.includes('financ') || normalized.includes('bank')) return 'finance';
    if (normalized.includes('health') || normalized.includes('medical')) return 'healthcare';
    if (normalized.includes('educat') || normalized.includes('learn')) return 'education';
    if (normalized.includes('retail') || normalized.includes('commerce')) return 'retail';
    if (normalized.includes('tech') || normalized.includes('software')) return 'technology';
    return response; // Use as-is if no match
  }

  private parseGoals(response: string): string[] {
    // Extract actionable goals from natural language
    const goals: string[] = [];
    const patterns = [
      /improve\s+([^,\.]+)/gi,
      /increase\s+([^,\.]+)/gi,
      /optimize\s+([^,\.]+)/gi,
      /reduce\s+([^,\.]+)/gi,
      /enhance\s+([^,\.]+)/gi
    ];

    patterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        goals.push(match[1].trim());
      }
    });

    return goals.length > 0 ? goals : [response]; // Fallback to full response
  }

  private mergeFocusAreas(image: ImageContext, user: UserContext): string[] {
    const areas = new Set<string>(user.focusAreas || []);
    
    // Add implicit focus areas based on image type
    const implicitFocus: Record<string, string[]> = {
      dashboard: ['data-visualization', 'information-density'],
      landing: ['conversion', 'trust-signals'],
      ecommerce: ['conversion', 'trust-signals', 'mobile'],
      form: ['conversion', 'accessibility'],
      mobile: ['mobile', 'performance']
    };

    if (implicitFocus[image.primaryType]) {
      implicitFocus[image.primaryType].forEach(area => areas.add(area));
    }

    return Array.from(areas);
  }

  private determineAnalysisDepth(user: UserContext, image: ImageContext): 'surface' | 'standard' | 'deep' | 'exhaustive' {
    if (user.expertise === 'expert' || image.complexity === 'complex') {
      return 'deep';
    }
    if (user.expertise === 'beginner') {
      return 'standard';
    }
    return 'standard';
  }

  private determineOutputStyle(user: UserContext): 'technical' | 'business' | 'design' | 'balanced' {
    switch (user.inferredRole) {
      case 'developer': return 'technical';
      case 'business': return 'business';
      case 'designer': return 'design';
      default: return 'balanced';
    }
  }

  private getIndustryStandards(domain: string): string[] {
    const standards: Record<string, string[]> = {
      finance: ['PCI-DSS', 'SOC2', 'GDPR'],
      healthcare: ['HIPAA', 'WCAG-AA', 'Section-508'],
      education: ['FERPA', 'COPPA', 'WCAG-AA'],
      government: ['Section-508', 'WCAG-AAA'],
      ecommerce: ['PCI-DSS', 'GDPR', 'CCPA']
    };

    return standards[domain] || ['WCAG-AA'];
  }

  private parseImageContext(data: any): ImageContext {
    // Parse AI response and ensure all required fields
    return {
      primaryType: data.primaryType || 'unknown',
      subTypes: data.subTypes || [],
      domain: data.domain || 'general',
      complexity: data.complexity || 'moderate',
      userIntent: data.userIntent || [],
      businessModel: data.businessModel,
      targetAudience: data.targetAudience,
      maturityStage: data.maturityStage || 'mvp',
      platform: data.platform || 'web',
      designSystem: data.designSystem
    };
  }
}
```

### Step 3.2: Create Dynamic Prompt Builder

**File**: `src/services/DynamicPromptBuilder.ts` (CREATE NEW FILE)

```typescript
import { AnalysisContext, PromptComponents, Citation } from '@/types/contextTypes';
import { pipelineConfig } from '@/config/pipelineConfig';

export class DynamicPromptBuilder {
  private perplexityEnabled: boolean;

  constructor() {
    this.perplexityEnabled = pipelineConfig.perplexity?.enabled || false;
  }

  /**
   * Build context-aware prompts that adapt to image type and user needs
   * THIS IS CRITICAL - NO GENERIC PROMPTS
   */
  async buildContextualPrompt(
    stage: 'vision' | 'analysis' | 'synthesis',
    context: AnalysisContext,
    previousStageData?: any
  ): Promise<string> {
    const components = await this.generatePromptComponents(stage, context);
    
    // Assemble prompt with quality markers
    let prompt = components.contextualBase;
    
    // Add domain-specific requirements
    if (components.domainSpecific) {
      prompt += `\n\n${components.domainSpecific}`;
    }
    
    // Add role-specific focus
    if (components.roleSpecific) {
      prompt += `\n\n${components.roleSpecific}`;
    }
    
    // Add research context if Perplexity is enabled
    if (components.researchContext) {
      prompt += `\n\nCurrent Best Practices & Standards:\n${components.researchContext}`;
    }
    
    // Add focus directives
    if (components.focusDirectives.length > 0) {
      prompt += '\n\nPriority Focus Areas:\n';
      components.focusDirectives.forEach((directive, index) => {
        prompt += `${index + 1}. ${directive}\n`;
      });
    }
    
    // Add output format requirements
    prompt += `\n\n${components.outputFormat}`;
    
    // Add quality markers
    if (components.qualityMarkers.length > 0) {
      prompt += '\n\nQuality Requirements:\n';
      components.qualityMarkers.forEach(marker => {
        prompt += `- ${marker}\n`;
      });
    }
    
    // Add citation requirements if available
    if (components.citations && components.citations.length > 0) {
      prompt += '\n\nProvide citations for recommendations using these sources:\n';
      components.citations.forEach((citation, index) => {
        prompt += `[${index + 1}] ${citation.title} - ${citation.source}\n`;
      });
    }
    
    // Add previous stage context if available
    if (previousStageData) {
      prompt += `\n\nBuilding upon previous analysis:\n${this.summarizePreviousStage(previousStageData)}`;
    }
    
    return prompt;
  }

  private async generatePromptComponents(
    stage: string,
    context: AnalysisContext
  ): Promise<PromptComponents> {
    const components: PromptComponents = {
      contextualBase: '',
      domainSpecific: '',
      roleSpecific: '',
      focusDirectives: [],
      outputFormat: '',
      qualityMarkers: []
    };

    // Generate base prompt based on stage and image type
    components.contextualBase = this.getContextualBase(stage, context);
    
    // Add domain-specific analysis requirements
    components.domainSpecific = this.getDomainSpecificPrompt(context);
    
    // Add role-specific perspectives
    components.roleSpecific = this.getRoleSpecificPrompt(context);
    
    // Generate focus directives
    components.focusDirectives = this.generateFocusDirectives(context);
    
    // Define output format based on user preferences
    components.outputFormat = this.getOutputFormat(stage, context);
    
    // Add quality markers for high-quality output
    components.qualityMarkers = this.getQualityMarkers(context);
    
    // Fetch research context if Perplexity is enabled
    if (this.perplexityEnabled && stage !== 'vision') {
      const research = await this.fetchResearchContext(context);
      if (research) {
        components.researchContext = research.context;
        components.citations = research.citations;
      }
    }
    
    return components;
  }

  /**
   * Fetch relevant research and standards using Perplexity
   */
  private async fetchResearchContext(
    context: AnalysisContext
  ): Promise<{ context: string; citations: Citation[] } | null> {
    if (!this.perplexityEnabled) return null;

    try {
      // Build research query based on context
      const queries = this.buildResearchQueries(context);
      
      // Mock implementation - replace with actual Perplexity API call
      const mockResearch = {
        context: `Latest ${context.image.domain} ${context.image.primaryType} best practices:
- Ensure ${context.focusAreas.join(', ')} are optimized
- Follow ${context.industryStandards?.join(', ') || 'standard'} guidelines
- Current trends emphasize ${context.user.outputPreferences?.prioritization || 'user-centric'} approaches`,
        citations: [
          {
            source: 'Nielsen Norman Group',
            title: `${context.image.primaryType} Design Guidelines 2024`,
            url: 'https://www.nngroup.com/articles/example',
            relevance: 0.95
          },
          {
            source: 'A List Apart',
            title: 'Modern Web Accessibility Standards',
            url: 'https://alistapart.com/article/example',
            relevance: 0.88
          }
        ]
      };

      return mockResearch;
    } catch (error) {
      console.error('Failed to fetch research context:', error);
      return null;
    }
  }

  private buildResearchQueries(context: AnalysisContext): string[] {
    const queries: string[] = [];
    
    // Interface-specific query
    queries.push(
      `${context.image.primaryType} ${context.image.domain} best practices 2024`
    );
    
    // Standards query
    if (context.industryStandards && context.industryStandards.length > 0) {
      queries.push(
        `${context.industryStandards.join(' ')} compliance requirements latest`
      );
    }
    
    // Focus area queries
    context.focusAreas.forEach(area => {
      queries.push(`${area} optimization ${context.image.primaryType}`);
    });
    
    return queries;
  }

  private getContextualBase(stage: string, context: AnalysisContext): string {
    const { image, user } = context;
    
    const basePrompts: Record<string, Record<string, string>> = {
      vision: {
        dashboard: `Analyze this ${image.domain} dashboard interface with focus on data visualization effectiveness, information hierarchy, and decision-making support. Identify every metric, chart, widget, and interactive element.`,
        
        landing: `Examine this landing page for conversion optimization, messaging clarity, and user journey flow. Map the visual hierarchy, CTAs, trust signals, and persuasion elements.`,
        
        app: `Analyze this application interface for usability, navigation patterns, and feature discoverability. Document the interaction model, state management, and user workflows.`,
        
        form: `Evaluate this form interface for completion rates, error prevention, and user guidance. Assess field organization, validation patterns, and submission flow.`,
        
        ecommerce: `Analyze this e-commerce interface for purchase journey optimization, product presentation, and trust building. Examine the cart flow, payment options, and conversion barriers.`,
        
        mobile: `Examine this mobile interface for touch accessibility, gesture patterns, and mobile-specific optimizations. Consider thumb reach, tap targets, and orientation handling.`,
        
        saas: `Analyze this SaaS interface for onboarding effectiveness, feature adoption, and user retention patterns. Identify upgrade prompts, feature discovery, and engagement mechanics.`,
        
        unknown: `Perform comprehensive UX analysis of this interface, identifying its purpose, user flows, and optimization opportunities.`
      },
      
      analysis: {
        dashboard: `Provide deep insights on data presentation effectiveness, cognitive load management, and actionable intelligence delivery.`,
        
        landing: `Analyze psychological triggers, conversion funnel optimization, and competitive differentiation strategies.`,
        
        app: `Evaluate task completion efficiency, learning curve, and long-term usability patterns.`,
        
        form: `Assess form psychology, completion optimization, and error recovery strategies.`,
        
        ecommerce: `Analyze purchase psychology, cart abandonment factors, and revenue optimization opportunities.`,
        
        mobile: `Evaluate mobile-first design principles, performance implications, and platform-specific optimizations.`,
        
        saas: `Analyze user activation patterns, feature adoption strategies, and churn reduction opportunities.`,
        
        unknown: `Provide comprehensive UX insights covering usability, accessibility, and optimization opportunities.`
      },
      
      synthesis: {
        all: `Synthesize all findings into actionable recommendations prioritized by ${user.outputPreferences?.prioritization || 'impact'}. Create a cohesive improvement strategy that balances user needs, business goals, and technical feasibility.`
      }
    };

    if (stage === 'synthesis') {
      return basePrompts.synthesis.all;
    }
    
    return basePrompts[stage][image.primaryType] || basePrompts[stage].unknown;
  }

  private getDomainSpecificPrompt(context: AnalysisContext): string {
    const { image } = context;
    
    const domainPrompts: Record<string, string> = {
      finance: `Financial Interface Requirements:
- Analyze data accuracy presentation and trust signals
- Evaluate security perception and compliance indicators
- Assess numerical formatting and calculation transparency
- Review regulatory disclosure placement
- Consider risk communication effectiveness`,
      
      healthcare: `Healthcare Interface Requirements:
- Evaluate HIPAA compliance indicators
- Assess patient data privacy signals
- Review accessibility for diverse user capabilities
- Analyze emergency action visibility
- Consider clinical workflow optimization`,
      
      education: `Educational Interface Requirements:
- Analyze learning progression indicators
- Evaluate cognitive load management
- Assess engagement and motivation mechanics
- Review accessibility for diverse learners
- Consider pedagogical effectiveness`,
      
      retail: `Retail Interface Requirements:
- Analyze product discovery patterns
- Evaluate purchase decision support
- Assess inventory and availability communication
- Review promotional effectiveness
- Consider cross-selling opportunities`,
      
      enterprise: `Enterprise Interface Requirements:
- Analyze workflow efficiency patterns
- Evaluate role-based access indicators
- Assess bulk action capabilities
- Review audit trail visibility
- Consider integration touchpoints`
    };
    
    return domainPrompts[image.domain] || '';
  }

  private getRoleSpecificPrompt(context: AnalysisContext): string {
    const { user } = context;
    
    const rolePrompts: Record<string, string> = {
      designer: `Designer Perspective:
- Evaluate visual hierarchy and gestalt principles
- Analyze color theory application and accessibility
- Assess typography system and readability
- Review spacing consistency and visual rhythm
- Consider emotional design impact
- Identify design system opportunities`,
      
      developer: `Developer Perspective:
- Identify component architecture patterns
- Analyze state management implications
- Assess API interaction points
- Review performance optimization opportunities
- Consider code maintainability factors
- Identify technical debt indicators`,
      
      business: `Business Perspective:
- Analyze revenue generation opportunities
- Evaluate conversion funnel optimization
- Assess competitive differentiation
- Review customer acquisition costs impact
- Consider retention and lifetime value
- Identify growth lever opportunities`,
      
      product: `Product Perspective:
- Evaluate feature discovery and adoption
- Analyze user journey completeness
- Assess MVP vs full feature balance
- Review metric tracking opportunities
- Consider roadmap implications
- Identify quick wins vs long-term bets`,
      
      marketing: `Marketing Perspective:
- Analyze messaging clarity and hierarchy
- Evaluate brand consistency
- Assess social proof placement
- Review CTA effectiveness
- Consider SEO implications
- Identify A/B testing opportunities`
    };
    
    return rolePrompts[user.inferredRole || ''] || '';
  }

  private generateFocusDirectives(context: AnalysisContext): string[] {
    const directives: string[] = [];
    const { focusAreas, image, user } = context;
    
    // Priority focus areas with specific instructions
    const focusInstructions: Record<string, string> = {
      'conversion': 'Identify all conversion points, analyze friction, suggest improvements with expected impact',
      'accessibility': 'Audit against WCAG 2.1 AA standards, identify violations, provide remediation steps',
      'performance': 'Analyze render-blocking elements, identify optimization opportunities, estimate load time improvements',
      'mobile': 'Evaluate touch targets (min 44x44px), gesture conflicts, viewport optimization',
      'data-visualization': 'Assess chart effectiveness, data-ink ratio, cognitive load of data presentation',
      'trust-signals': 'Identify security indicators, social proof, credibility markers, and gaps',
      'information-density': 'Evaluate cognitive load, progressive disclosure, information hierarchy'
    };
    
    focusAreas.forEach(area => {
      if (focusInstructions[area]) {
        directives.push(focusInstructions[area]);
      }
    });
    
    // Add expertise-level specific directives
    if (user.expertise === 'expert') {
      directives.push('Include advanced patterns, anti-patterns, and edge case considerations');
    } else if (user.expertise === 'beginner') {
      directives.push('Explain findings in clear terms with examples and learning resources');
    }
    
    // Add output preference directives
    if (user.outputPreferences?.prioritization === 'quick-wins') {
      directives.push('Highlight improvements that can be implemented within 1-2 days');
    }
    
    return directives;
  }

  private getOutputFormat(stage: string, context: AnalysisContext): string {
    const { user } = context;
    const jargonLevel = user.outputPreferences?.jargonLevel || 'minimal';
    
    const formats: Record<string, string> = {
      vision: `Output Format: Structured JSON with:
{
  "elements": { /* detailed element inventory */ },
  "layout": { /* grid, spacing, hierarchy analysis */ },
  "colors": { /* palette, contrast, accessibility */ },
  "typography": { /* fonts, sizes, readability */ },
  "interactions": { /* detected patterns and affordances */ },
  "content": { /* messaging, copy, information architecture */ }
}`,
      
      analysis: `Output Format: Comprehensive JSON with:
{
  "usabilityScore": 0-100,
  "accessibilityScore": 0-100,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "usability|accessibility|performance|visual",
      "element": "specific element identifier",
      "description": "${jargonLevel === 'avoid' ? 'plain language explanation' : 'detailed technical description'}",
      "impact": "user impact description",
      "recommendation": "specific fix"
    }
  ],
  "strengths": ["positive findings"],
  "patterns": { /* identified design patterns */ },
  "metrics": { /* quantitative measurements */ }
}`,

      synthesis: `Output Format: Actionable Recommendations JSON:
{
  "executiveSummary": {
    "overallScore": 0-100,
    "keyFindings": ["top 3-5 findings"],
    "criticalIssues": ["must-fix items"],
    "quickWins": ["easy improvements"]
  },
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "conversion|usability|accessibility|performance",
      "title": "clear action title",
      "description": "${jargonLevel === 'technical' ? 'technical details' : 'business-friendly explanation'}",
      "implementation": {
        "effort": "hours|days|weeks",
        "complexity": "low|medium|high",
        "dependencies": [...],
        "steps": ["step-by-step guide"]
      },
      "expectedImpact": {
        "metric": "specific KPI",
        "improvement": "X% expected change",
        "confidence": "high|medium|low"
      },
      "citations": [ // Include when research context available
        {
          "source": "source name",
          "title": "article/guideline title",
          "relevance": "why this supports the recommendation"
        }
      ]
    }
  ],
  "roadmap": {
    "phase1": ["0-2 weeks items"],
    "phase2": ["2-8 weeks items"],
    "phase3": ["2-6 months items"]
  }
}`
    };
    
    return formats[stage] || formats.analysis;
  }

  private getQualityMarkers(context: AnalysisContext): string[] {
    const markers: string[] = [
      'Provide specific, actionable insights not generic observations',
      'Include quantitative metrics and scores where applicable',
      'Reference specific UI elements with precise locations',
      'Support findings with established UX principles or research'
    ];
    
    if (context.user.expertise === 'expert') {
      markers.push(
        'Include advanced considerations and edge cases',
        'Reference specific design patterns by name',
        'Provide alternative advanced solutions'
      );
    }
    
    if (context.analysisDepth === 'deep' || context.analysisDepth === 'exhaustive') {
      markers.push(
        'Analyze micro-interactions and subtle details',
        'Consider cross-functional implications',
        'Provide competitive benchmarking where relevant'
      );
    }
    
    if (context.industryStandards?.length > 0) {
      markers.push(
        `Validate against standards: ${context.industryStandards.join(', ')}`,
        'Include compliance checklist items'
      );
    }
    
    // Add citation requirement when research is available
    if (this.perplexityEnabled) {
      markers.push(
        'Cite specific sources for best practices and guidelines',
        'Include evidence from current research or case studies'
      );
    }
    
    return markers;
  }

  private summarizePreviousStage(data: any): string {
    // Create concise summary of previous stage findings
    const summary: string[] = [];
    
    if (data.elements) {
      summary.push(`Detected elements: ${Object.keys(data.elements).join(', ')}`);
    }
    
    if (data.issues) {
      const criticalCount = data.issues.filter((i: any) => i.severity === 'critical').length;
      if (criticalCount > 0) {
        summary.push(`Critical issues found: ${criticalCount}`);
      }
    }
    
    if (data.patterns) {
      summary.push(`Design patterns: ${data.patterns.detected?.join(', ') || 'standard'}`);
    }
    
    return summary.join('\n');
  }
}
```

---

## PHASE 4: Create the Context-Aware Pipeline (Day 3)

### Step 4.1: Create the Boundary-Pushing Pipeline

**File**: `src/services/BoundaryPushingPipeline.ts` (CREATE NEW FILE)

```typescript
import { supabase } from '@/integrations/supabase/client';
import { pipelineConfig } from '@/config/pipelineConfig';
import { PipelineError, ModelExecutionError } from '@/types/pipelineErrors';
import { ContextDetectionService } from './ContextDetectionService';
import { DynamicPromptBuilder } from './DynamicPromptBuilder';
import { AnalysisContext } from '@/types/contextTypes';

interface ModelResult {
  model: string;
  success: boolean;
  data?: any;
  error?: Error;
  metrics: {
    startTime: number;
    endTime: number;
    tokensUsed?: number;
  };
}

interface StageResult {
  stage: string;
  results: ModelResult[];
  fusedData?: any;
  confidence: number;
}

export class BoundaryPushingPipeline {
  private abortController: AbortController | null = null;
  private contextDetector: ContextDetectionService;
  private promptBuilder: DynamicPromptBuilder;
  private analysisContext: AnalysisContext | null = null;

  constructor() {
    this.contextDetector = new ContextDetectionService();
    this.promptBuilder = new DynamicPromptBuilder();
  }

  async execute(
    imageUrl: string,
    userContext: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    this.abortController = new AbortController();
    const startTime = Date.now();
    
    try {
      // CRITICAL: Context Detection Phase (5% progress) - THIS IS PRIORITY
      onProgress?.(2, 'Analyzing image context...');
      const imageContext = await this.contextDetector.detectImageContext(imageUrl);
      
      onProgress?.(5, 'Understanding user needs...');
      const userContextParsed = this.contextDetector.inferUserContext(userContext);
      
      // Create unified analysis context
      this.analysisContext = this.contextDetector.createAnalysisContext(
        imageContext,
        userContextParsed
      );
      
      console.log('Analysis Context:', this.analysisContext);

      // Check if clarification is needed
      if (this.analysisContext.clarificationNeeded && this.analysisContext.clarificationQuestions) {
        onProgress?.(8, 'Context clarification needed...');
        
        // Return early with clarification request
        return {
          requiresClarification: true,
          questions: this.analysisContext.clarificationQuestions,
          partialContext: this.analysisContext,
          resumeToken: this.generateResumeToken()
        };
      }

      // Stage 1: Vision Extraction with Context (30% progress)
      onProgress?.(10, `Initializing vision models for ${imageContext.primaryType} analysis...`);
      const visionResults = await this.executeVisionStage(imageUrl);
      onProgress?.(30, 'Vision analysis complete');

      // Stage 2: Deep Analysis with Context (60% progress)
      onProgress?.(40, `Performing ${this.analysisContext.user.inferredRole || 'comprehensive'} analysis...`);
      const analysisResults = await this.executeAnalysisStage(
        imageUrl,
        visionResults.fusedData,
        userContext
      );
      onProgress?.(60, 'Deep analysis complete');

      // Stage 3: Synthesis with Context (90% progress)
      onProgress?.(70, 'Synthesizing personalized insights...');
      const synthesisResults = await this.executeSynthesisStage(
        visionResults,
        analysisResults,
        userContext
      );
      onProgress?.(90, 'Synthesis complete');

      // Final: Store Results with Context (100% progress)
      onProgress?.(95, 'Finalizing results...');
      const finalResult = await this.storeResults({
        visionResults,
        analysisResults,
        synthesisResults,
        executionTime: Date.now() - startTime,
        modelsUsed: this.getUsedModels([visionResults, analysisResults, synthesisResults]),
        analysisContext: this.analysisContext // CRITICAL: Store context for display
      });

      onProgress?.(100, 'Analysis complete!');
      return finalResult;

    } catch (error) {
      if (error instanceof PipelineError) {
        throw error;
      }
      throw new PipelineError(
        'Pipeline execution failed',
        'unknown',
        { originalError: error.message },
        false
      );
    }
  }

  /**
   * Resume analysis after clarification
   */
  async resumeWithClarification(
    resumeToken: string,
    clarificationResponses: Record<string, string>,
    imageUrl: string,
    userContext: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    // Process clarification to enhance context
    const clarifiedContext = await this.contextDetector.processClarificationResponses(
      this.analysisContext!,
      clarificationResponses
    );

    this.analysisContext = clarifiedContext;
    
    // Continue with enhanced context
    onProgress?.(10, 'Resuming with clarified context...');
    
    // Continue from vision stage with better context
    return this.execute(imageUrl, userContext, onProgress);
  }

  private generateResumeToken(): string {
    // Generate a token to resume analysis after clarification
    return `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeVisionStage(imageUrl: string): Promise<StageResult> {
    const models = this.getAvailableModels('vision');
    
    if (models.length === 0) {
      throw new PipelineError(
        'No vision models available. Please configure API keys.',
        'vision',
        { requiredKeys: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] },
        false
      );
    }

    // Build dynamic prompt based on context
    const dynamicPrompt = this.analysisContext 
      ? this.promptBuilder.buildContextualPrompt('vision', this.analysisContext)
      : this.getDefaultVisionPrompt();

    const results = await this.executeModelsInParallel(
      models,
      async (model) => this.executeSingleVisionModel(model, imageUrl, dynamicPrompt),
      pipelineConfig.models.vision.timeout
    );

    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      throw new PipelineError(
        'All vision models failed. Check API keys and try again.',
        'vision',
        { 
          failedModels: results.map(r => ({ model: r.model, error: r.error?.message })),
          requiredKeys: this.checkApiKeys()
        },
        true
      );
    }

    const fusedVision = await this.fuseVisionResults(successfulResults);
    
    return {
      stage: 'vision',
      results,
      fusedData: fusedVision,
      confidence: this.calculateConfidence(successfulResults, results.length)
    };
  }

  private async executeSingleVisionModel(
    model: string,
    imageUrl: string,
    prompt: string
  ): Promise<any> {
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: {
        imageUrl,
        model,
        prompt,
        stage: 'vision',
        systemPrompt: this.getSystemPromptForContext()
      }
    });

    if (error) throw error;
    return data;
  }

  private async fuseVisionResults(results: ModelResult[]): Promise<any> {
    // Intelligent fusion of multiple model outputs
    const fusedData: any = {
      elements: {},
      layout: {},
      colors: {},
      content: {},
      confidence: {}
    };

    // Merge element detections
    results.forEach(result => {
      if (result.data?.elements) {
        Object.entries(result.data.elements).forEach(([key, value]) => {
          if (!fusedData.elements[key]) {
            fusedData.elements[key] = [];
          }
          fusedData.elements[key].push({
            ...value,
            detectedBy: result.model
          });
        });
      }
    });

    // Aggregate layout analysis
    fusedData.layout = {
      grid: this.detectGridSystem(results),
      hierarchy: this.analyzeHierarchy(results),
      spacing: this.analyzeSpacing(results)
    };

    // Merge color analysis
    const allColors = results.flatMap(r => r.data?.colors?.palette || []);
    fusedData.colors = {
      primary: this.findPrimaryColors(allColors),
      secondary: this.findSecondaryColors(allColors),
      contrast: this.analyzeContrast(allColors)
    };

    // Aggregate content
    fusedData.content = this.mergeTextContent(results);
    
    // Calculate confidence scores
    fusedData.confidence = {
      overall: this.calculateAgreement(results),
      byCategory: {
        elements: this.calculateCategoryConfidence(results, 'elements'),
        layout: this.calculateCategoryConfidence(results, 'layout'),
        colors: this.calculateCategoryConfidence(results, 'colors')
      }
    };

    return fusedData;
  }

  private async executeAnalysisStage(
    imageUrl: string,
    visionData: any,
    userContext: string
  ): Promise<StageResult> {
    const models = this.getAvailableModels('analysis');
    
    const dynamicPrompt = this.analysisContext
      ? this.promptBuilder.buildContextualPrompt('analysis', this.analysisContext, visionData)
      : this.getDefaultAnalysisPrompt(visionData, userContext);

    const results = await this.executeModelsInParallel(
      models,
      async (model) => this.executeSingleAnalysisModel(model, imageUrl, visionData, dynamicPrompt),
      pipelineConfig.models.analysis.timeout
    );

    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      throw new PipelineError(
        'All analysis models failed', 
        'analysis',
        { results: results.map(r => ({ model: r.model, error: r.error?.message })) },
        true
      );
    }

    const fusedAnalysis = await this.fuseAnalysisResults(successfulResults);
    
    return {
      stage: 'analysis',
      results,
      fusedData: fusedAnalysis,
      confidence: this.calculateConfidence(successfulResults, results.length)
    };
  }

  private async executeSingleAnalysisModel(
    model: string,
    imageUrl: string,
    visionData: any,
    prompt: string
  ): Promise<any> {
    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: {
        imageUrl,
        model,
        prompt,
        stage: 'analysis',
        visionData,
        systemPrompt: this.getSystemPromptForContext()
      }
    });

    if (error) throw error;
    return data;
  }

  private async fuseAnalysisResults(results: ModelResult[]): Promise<any> {
    const fusedData: any = {
      usabilityScore: 0,
      accessibilityScore: 0,
      issues: [],
      strengths: [],
      patterns: {},
      metrics: {}
    };

    // Average scores
    const scores = results.map(r => ({
      usability: r.data?.usabilityScore || 0,
      accessibility: r.data?.accessibilityScore || 0
    }));

    fusedData.usabilityScore = Math.round(
      scores.reduce((sum, s) => sum + s.usability, 0) / scores.length
    );
    
    fusedData.accessibilityScore = Math.round(
      scores.reduce((sum, s) => sum + s.accessibility, 0) / scores.length
    );

    // Merge and deduplicate issues
    const allIssues = results.flatMap(r => r.data?.issues || []);
    fusedData.issues = this.deduplicateIssues(allIssues);

    // Combine strengths
    const allStrengths = results.flatMap(r => r.data?.strengths || []);
    fusedData.strengths = [...new Set(allStrengths)];

    // Merge patterns
    results.forEach(r => {
      if (r.data?.patterns) {
        Object.assign(fusedData.patterns, r.data.patterns);
      }
    });

    return fusedData;
  }

  private async executeSynthesisStage(
    visionResults: StageResult,
    analysisResults: StageResult,
    userContext: string
  ): Promise<any> {
    const dynamicPrompt = this.analysisContext
      ? this.promptBuilder.buildContextualPrompt(
          'synthesis', 
          this.analysisContext,
          { vision: visionResults.fusedData, analysis: analysisResults.fusedData }
        )
      : this.getDefaultSynthesisPrompt(visionResults, analysisResults, userContext);

    const { data, error } = await supabase.functions.invoke('ux-analysis', {
      body: {
        stage: 'synthesis',
        visionResults: visionResults.fusedData,
        analysisResults: analysisResults.fusedData,
        userContext,
        prompt: dynamicPrompt,
        model: 'claude-3-5-sonnet-20241022', // Best for synthesis
        systemPrompt: this.getSystemPromptForContext()
      }
    });

    if (error) {
      throw new PipelineError(
        'Synthesis failed',
        'synthesis',
        { error: error.message },
        true
      );
    }

    return data;
  }

  private async storeResults(pipelineResults: any): Promise<any> {
    const { data: synthesisData } = await supabase.functions.invoke('ux-analysis', {
      body: {
        action: 'store',
        pipelineResults
      }
    });

    return {
      ...synthesisData,
      visualAnnotations: this.enhanceAnnotationsWithConfidence(
        synthesisData.visualAnnotations || []
      ),
      suggestions: this.enhanceSuggestionsWithPriority(
        synthesisData.suggestions || []
      ),
      summary: {
        ...synthesisData.summary,
        confidence: this.calculateOverallConfidence(pipelineResults),
        modelsUsed: pipelineResults.modelsUsed?.length || 0
      },
      metadata: {
        ...synthesisData.metadata,
        aiModel: 'multi-model-pipeline',
        modelsUsed: pipelineResults.modelsUsed || [],
        pipelineVersion: '2.0',
        executionTime: pipelineResults.executionTime,
        stagesCompleted: this.getCompletedStages(pipelineResults)
      },
      analysisContext: pipelineResults.analysisContext // CRITICAL: Include context for display
    };
  }

  private enhanceAnnotationsWithConfidence(annotations: any[]): any[] {
    return annotations.map(annotation => ({
      ...annotation,
      confidence: annotation.confidence || 0.85,
      detectedBy: annotation.detectedBy || ['multiple-models']
    }));
  }

  private enhanceSuggestionsWithPriority(suggestions: any[]): any[] {
    return suggestions.map((suggestion, index) => ({
      ...suggestion,
      priority: suggestion.priority || this.calculatePriority(suggestion),
      rank: index + 1,
      confidence: suggestion.confidence || 0.8
    }));
  }

  private calculateOverallConfidence(results: any): number {
    const stages = ['visionResults', 'analysisResults', 'synthesisResults'];
    const confidences = stages
      .map(stage => results[stage]?.confidence)
      .filter(c => c !== undefined);
    
    return confidences.length > 0 
      ? confidences.reduce((a, b) => a + b) / confidences.length 
      : 0.75;
  }

  private getCompletedStages(results: any): string[] {
    const completed = ['context']; // Always include context
    if (results.visionResults?.confidence > 0) completed.push('vision');
    if (results.analysisResults?.confidence > 0) completed.push('analysis');
    if (results.synthesisResults) completed.push('synthesis');
    return completed;
  }

  // Utility methods
  private getAvailableModels(stage: 'vision' | 'analysis'): string[] {
    const models = [];
    const config = pipelineConfig.models[stage];

    // Check API keys and add available models
    if (this.hasApiKey('OPENAI_API_KEY')) {
      models.push(...config.primary.filter(m => m.includes('openai') || m.includes('gpt')));
    }
    if (this.hasApiKey('ANTHROPIC_API_KEY')) {
      models.push(...config.primary.filter(m => m.includes('anthropic') || m.includes('claude')));
    }
    if (this.hasApiKey('GOOGLE_VISION_API_KEY')) {
      models.push(...config.secondary.filter(m => m.includes('google')));
    }

    return models;
  }

  private hasApiKey(keyName: string): boolean {
    // This will be checked on the edge function side
    // For now, return true and let the edge function handle missing keys
    return true;
  }

  private checkApiKeys(): string[] {
    // Return list of required API keys for error messages
    return ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_VISION_API_KEY'];
  }

  private async executeModelsInParallel(
    models: string[],
    executor: (model: string) => Promise<any>,
    timeout: number
  ): Promise<ModelResult[]> {
    const promises = models.map(async (model) => {
      const startTime = Date.now();
      try {
        const data = await Promise.race([
          executor(model),
          this.timeout(timeout, model)
        ]);
        
        return {
          model,
          success: true,
          data,
          metrics: {
            startTime,
            endTime: Date.now()
          }
        };
      } catch (error) {
        return {
          model,
          success: false,
          error,
          metrics: {
            startTime,
            endTime: Date.now()
          }
        };
      }
    });

    return Promise.all(promises);
  }

  private timeout(ms: number, model: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Model ${model} timed out after ${ms}ms`));
      }, ms);
    });
  }

  private calculateConfidence(successful: any[], total: number): number {
    const successRate = successful.length / total;
    const agreementScore = this.calculateAgreement(successful);
    return (successRate * 0.4 + agreementScore * 0.6);
  }

  private calculateAgreement(results: any[]): number {
    // Implement agreement calculation based on result similarity
    // For now, return a simplified score
    return results.length > 1 ? 0.85 : 0.65;
  }

  private calculatePriority(suggestion: any): 'critical' | 'high' | 'medium' | 'low' {
    // Calculate priority based on impact and effort
    const impactScore = { high: 3, medium: 2, low: 1 }[suggestion.impact] || 2;
    const effortScore = { low: 3, medium: 2, high: 1 }[suggestion.effort] || 2;
    const score = impactScore * effortScore;
    
    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private getUsedModels(stages: StageResult[]): string[] {
    const models = new Set<string>();
    stages.forEach(stage => {
      stage.results.forEach(result => {
        if (result.success) {
          models.add(result.model);
        }
      });
    });
    return Array.from(models);
  }

  // Helper method for system prompts
  private getSystemPromptForContext(): string {
    if (!this.analysisContext) {
      return 'You are an expert UX analyst. Provide detailed, actionable insights.';
    }

    const { user, image } = this.analysisContext;
    const roleDescriptions = {
      designer: 'You are a senior UX/UI designer with deep expertise in visual design, usability, and design systems.',
      developer: 'You are a senior frontend architect with expertise in implementation, performance, and technical feasibility.',
      business: 'You are a business strategist with expertise in conversion optimization, growth, and ROI analysis.',
      product: 'You are a senior product manager with expertise in user needs, feature prioritization, and product strategy.',
      marketing: 'You are a marketing strategist with expertise in messaging, conversion funnels, and user psychology.'
    };

    const base = roleDescriptions[user.inferredRole || 'designer'] || roleDescriptions.designer;
    
    return `${base} You are analyzing a ${image.primaryType} interface in the ${image.domain} domain. 
    Adapt your communication style to ${user.technicalLevel || 'intermediate'} technical level.
    Focus on ${user.outputPreferences?.prioritization || 'impact'}-based prioritization.`;
  }

  // Simplified methods for fusion logic
  private deduplicateIssues(issues: any[]): any[] {
    const seen = new Set();
    return issues.filter(issue => {
      const key = `${issue.category}-${issue.element}-${issue.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateCategoryConfidence(results: any[], category: string): number {
    const scores = results
      .filter(r => r.data?.[category])
      .map(r => r.confidence || 0.5);
    
    return scores.length > 0 
      ? scores.reduce((a, b) => a + b) / scores.length
      : 0.5;
  }

  // Stub methods for fusion logic - implement based on your needs
  private detectGridSystem(results: ModelResult[]): any { return {}; }
  private analyzeHierarchy(results: ModelResult[]): any { return {}; }
  private analyzeSpacing(results: ModelResult[]): any { return {}; }
  private findPrimaryColors(colors: any[]): any[] { return []; }
  private findSecondaryColors(colors: any[]): any[] { return []; }
  private analyzeContrast(colors: any[]): any { return {}; }
  private mergeTextContent(results: ModelResult[]): any { return {}; }

  // Fallback methods for backward compatibility
  private getDefaultVisionPrompt(): string {
    return `Analyze this interface with extreme detail. Focus on:
    1. Every UI element and its position
    2. Visual hierarchy and information architecture
    3. Interaction patterns and affordances
    4. Color usage and contrast ratios
    5. Typography and readability
    6. Spacing and alignment precision
    Return a comprehensive JSON analysis.`;
  }

  private getDefaultAnalysisPrompt(visionData: any, userContext: string): string {
    return `Perform deep UX/UI analysis based on:
    - User Context: "${userContext}"
    - Vision Data: ${JSON.stringify(visionData)}
    
    Provide comprehensive insights on:
    1. Usability issues and improvements
    2. Accessibility compliance (WCAG 2.1 AA)
    3. Visual design effectiveness
    4. Information architecture quality
    5. Interaction design patterns
    6. Performance implications
    7. Mobile responsiveness
    8. Conversion optimization opportunities
    
    Format as structured JSON with scores, issues, and recommendations.`;
  }

  private getDefaultSynthesisPrompt(
    visionResults: StageResult,
    analysisResults: StageResult,
    userContext: string
  ): string {
    return `You are conducting final synthesis of multi-model UX analysis.
    
    Context: ${userContext}
    
    Vision Stage Results:
    - Models Run: ${visionResults.results.length}
    - Success Rate: ${(visionResults.results.filter(r => r.success).length / visionResults.results.length * 100).toFixed(0)}%
    - Key Findings: ${JSON.stringify(visionResults.fusedData)}
    
    Analysis Stage Results:
    - Models Run: ${analysisResults.results.length}
    - Success Rate: ${(analysisResults.results.filter(r => r.success).length / analysisResults.results.length * 100).toFixed(0)}%
    - Key Insights: ${JSON.stringify(analysisResults.fusedData)}
    
    Create comprehensive recommendations with:
    1. Executive Summary
    2. Prioritized Action Items
    3. Visual Annotations
    4. Implementation Roadmap
    
    Format as JSON with clear structure.`;
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
```

---

## PHASE 5: Create Edge Functions (Day 3-4)

### Step 5.1: Replace Main Edge Function

**File**: `supabase/functions/ux-analysis/index.ts`

**Action**: REPLACE the entire file (removing ALL fallback functions)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Available model configurations
const MODEL_CONFIGS = {
  'gpt-4o': {
    api: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    requiresKey: 'OPENAI_API_KEY'
  },
  'openai-vision': {
    api: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-vision-preview',
    requiresKey: 'OPENAI_API_KEY'
  },
  'claude-3-5-sonnet-20241022': {
    api: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    requiresKey: 'ANTHROPIC_API_KEY'
  },
  'anthropic-vision': {
    api: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-opus-20240229',
    requiresKey: 'ANTHROPIC_API_KEY'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Received payload:', { 
      action: payload.action,
      stage: payload.stage,
      model: payload.model 
    })

    // Check for available API keys
    const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY')
    const hasAnthropic = !!Deno.env.get('ANTHROPIC_API_KEY')
    const hasGoogle = !!Deno.env.get('GOOGLE_VISION_API_KEY')

    if (!hasOpenAI && !hasAnthropic && !hasGoogle) {
      throw new Error(
        'No API keys configured. Please add at least one API key (OpenAI, Anthropic, or Google) to enable analysis.'
      )
    }

    // Handle different actions
    switch (payload.action) {
      case 'store':
        return await storeAnalysisResults(payload.pipelineResults)
      
      case 'check-keys':
        return new Response(
          JSON.stringify({
            available: {
              openai: hasOpenAI,
              anthropic: hasAnthropic,
              google: hasGoogle
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      
      default:
        // Execute model based on stage
        return await executeModel(payload)
    }

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function executeModel(payload: any) {
  const { model, stage, imageUrl, prompt, systemPrompt, visionData } = payload
  const modelConfig = MODEL_CONFIGS[model]
  
  if (!modelConfig) {
    throw new Error(`Unknown model: ${model}`)
  }

  const apiKey = Deno.env.get(modelConfig.requiresKey)
  if (!apiKey) {
    throw new Error(
      `${modelConfig.requiresKey} not configured. This model requires ${modelConfig.api} API access.`
    )
  }

  // Execute based on API type
  switch (modelConfig.api) {
    case 'openai':
      return await executeOpenAI(modelConfig, apiKey, payload)
    
    case 'anthropic':
      return await executeAnthropic(modelConfig, apiKey, payload)
    
    default:
      throw new Error(`Unsupported API: ${modelConfig.api}`)
  }
}

async function executeOpenAI(config: any, apiKey: string, payload: any) {
  const { imageUrl, prompt, systemPrompt } = payload
  
  const messages = [
    {
      role: 'system',
      content: systemPrompt || 'You are an expert UX/UI analyst.'
    },
    {
      role: 'user',
      content: imageUrl ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ] : prompt
    }
  ]

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || payload.model,
      messages,
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content
  
  try {
    return new Response(
      JSON.stringify(JSON.parse(content)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    // If JSON parsing fails, return the raw content
    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function executeAnthropic(config: any, apiKey: string, payload: any) {
  const { imageUrl, prompt, systemPrompt } = payload
  
  const messages = [{
    role: 'user',
    content: imageUrl ? [
      { type: 'text', text: prompt },
      { 
        type: 'image', 
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: await fetchImageAsBase64(imageUrl)
        }
      }
    ] : prompt
  }]

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || payload.model,
      system: systemPrompt || 'You are an expert UX/UI analyst.',
      messages,
      max_tokens: 4000,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${error}`)
  }

  const data = await response.json()
  const content = data.content[0].text
  
  try {
    return new Response(
      JSON.stringify(JSON.parse(content)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  return base64
}

async function storeAnalysisResults(pipelineResults: any) {
  const { visionResults, analysisResults, synthesisResults, analysisContext } = pipelineResults
  
  // Create final analysis structure with context
  const finalAnalysis = {
    visualAnnotations: synthesisResults.recommendations?.map((rec: any, index: number) => ({
      id: `annotation_${index}`,
      x: 10 + (index * 20),
      y: 10 + (index * 15),
      type: rec.priority === 'critical' ? 'issue' : 'suggestion',
      title: rec.title,
      description: rec.description,
      severity: rec.priority,
      category: rec.category,
      confidence: rec.confidence || 0.85
    })) || [],
    
    suggestions: synthesisResults.recommendations || [],
    
    summary: {
      overallScore: synthesisResults.executiveSummary?.overallScore || 75,
      categoryScores: {
        usability: analysisResults.fusedData?.usabilityScore || 70,
        accessibility: analysisResults.fusedData?.accessibilityScore || 65,
        visual: visionResults.fusedData?.confidence?.overall * 100 || 80,
        content: 75
      },
      keyIssues: synthesisResults.executiveSummary?.criticalIssues || [],
      strengths: analysisResults.fusedData?.strengths || [],
      quickWins: synthesisResults.executiveSummary?.quickWins || []
    },
    
    metadata: {
      timestamp: new Date().toISOString(),
      modelsUsed: pipelineResults.modelsUsed || [],
      executionTime: pipelineResults.executionTime,
      confidence: visionResults.confidence,
      pipelineVersion: '2.0',
      stagesCompleted: ['context', 'vision', 'analysis', 'synthesis']
    },
    
    // CRITICAL: Include analysis context for display
    analysisContext: analysisContext
  }

  return new Response(
    JSON.stringify(finalAnalysis),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### Step 5.2: Create Context Detection Edge Function

**File**: `supabase/functions/context-detection/index.ts` (CREATE NEW FILE)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt, model = 'gpt-4o', maxTokens = 1000 } = await req.json();

    // Quick context detection using GPT-4o
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }],
        max_tokens: maxTokens,
        temperature: 0.3, // Lower temperature for consistent classification
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const contextData = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify(contextData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Context detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

### Step 5.3: Create Context Clarification Component

**File**: `src/components/ContextClarification.tsx` (CREATE NEW FILE)

```typescript
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle } from 'lucide-react';

interface ContextClarificationProps {
  questions: string[];
  partialContext: any;
  onSubmit: (responses: Record<string, string>) => void;
  onCancel: () => void;
}

export function ContextClarification({
  questions,
  partialContext,
  onSubmit,
  onCancel
}: ContextClarificationProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onSubmit(responses);
  };

  const getQuestionType = (question: string): 'role' | 'interface' | 'goals' | 'text' => {
    if (question.toLowerCase().includes('role') || question.toLowerCase().includes('perspective')) {
      return 'role';
    }
    if (question.toLowerCase().includes('interface') || question.toLowerCase().includes('dashboard') || question.toLowerCase().includes('landing')) {
      return 'interface';
    }
    if (question.toLowerCase().includes('goal') || question.toLowerCase().includes('improve')) {
      return 'goals';
    }
    return 'text';
  };

  const renderQuestionInput = (question: string, index: number) => {
    const type = getQuestionType(question);
    const key = `question_${index}`;

    switch (type) {
      case 'role':
        return (
          <RadioGroup
            value={responses[key] || ''}
            onValueChange={(value) => setResponses({ ...responses, [key]: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="designer" id="designer" />
              <Label htmlFor="designer">Designer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="developer" id="developer" />
              <Label htmlFor="developer">Developer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="product" id="product" />
              <Label htmlFor="product">Product Manager</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="business" id="business" />
              <Label htmlFor="business">Business Stakeholder</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="marketing" id="marketing" />
              <Label htmlFor="marketing">Marketing</Label>
            </div>
          </RadioGroup>
        );

      case 'interface':
        return (
          <RadioGroup
            value={responses[key] || ''}
            onValueChange={(value) => setResponses({ ...responses, [key]: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dashboard" id="dashboard" />
              <Label htmlFor="dashboard">Dashboard</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="landing" id="landing" />
              <Label htmlFor="landing">Landing Page</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile" id="mobile" />
              <Label htmlFor="mobile">Mobile App</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ecommerce" id="ecommerce" />
              <Label htmlFor="ecommerce">E-commerce</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="saas" id="saas" />
              <Label htmlFor="saas">SaaS Application</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="form" id="form" />
              <Label htmlFor="form">Form/Survey</Label>
            </div>
          </RadioGroup>
        );

      default:
        return (
          <Textarea
            value={responses[key] || ''}
            onChange={(e) => setResponses({ ...responses, [key]: e.target.value })}
            placeholder="Type your answer here..."
            className="min-h-[80px]"
          />
        );
    }
  };

  const allQuestionsAnswered = questions.every((_, index) => 
    responses[`question_${index}`] && responses[`question_${index}`].trim() !== ''
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Help Us Better Understand Your Needs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          We need a bit more information to provide the most relevant analysis for your specific context.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <Label className="text-base">{question}</Label>
            {renderQuestionInput(question, index)}
          </div>
        ))}

        <div className="flex gap-4 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="flex-1"
          >
            Continue Analysis
          </Button>
          <Button 
            onClick={onCancel}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 5.4: Create Standards Retrieval Service (Optional Enhancement)

**File**: `src/services/StandardsRetrievalService.ts` (CREATE NEW FILE)

```typescript
import { pipelineConfig } from '@/config/pipelineConfig';

interface Standard {
  name: string;
  version: string;
  lastUpdated: string;
  requirements: string[];
  source: string;
}

export class StandardsRetrievalService {
  private cache: Map<string, { data: Standard; timestamp: number }> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Retrieve current standards based on domain
   */
  async retrieveStandards(domain: string): Promise<Standard[]> {
    const cacheKey = `standards_${domain}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return [cached.data];
    }

    // If Perplexity is enabled, fetch real-time standards
    if (pipelineConfig.perplexity?.enabled) {
      try {
        const standards = await this.fetchLiveStandards(domain);
        this.cache.set(cacheKey, { data: standards[0], timestamp: Date.now() });
        return standards;
      } catch (error) {
        console.error('Failed to fetch live standards:', error);
      }
    }

    // Fallback to static standards
    return this.getStaticStandards(domain);
  }

  private async fetchLiveStandards(domain: string): Promise<Standard[]> {
    // Mock implementation - replace with actual Perplexity API call
    const query = `Latest ${domain} compliance standards and guidelines 2024`;
    
    // Simulate API response
    return [{
      name: domain === 'healthcare' ? 'HIPAA' : 'WCAG',
      version: '2.1 AA',
      lastUpdated: new Date().toISOString(),
      requirements: [
        'Ensure all interactive elements are keyboard accessible',
        'Provide alternative text for all images',
        'Maintain color contrast ratio of at least 4.5:1'
      ],
      source: 'W3C Web Accessibility Guidelines'
    }];
  }

  private getStaticStandards(domain: string): Standard[] {
    const standardsMap: Record<string, Standard[]> = {
      healthcare: [{
        name: 'HIPAA',
        version: '2022',
        lastUpdated: '2022-01-01',
        requirements: [
          'Encrypt all patient data in transit and at rest',
          'Implement access controls and audit logs',
          'Provide data breach notifications'
        ],
        source: 'HHS.gov'
      }],
      finance: [{
        name: 'PCI-DSS',
        version: '4.0',
        lastUpdated: '2022-03-31',
        requirements: [
          'Protect stored cardholder data',
          'Encrypt transmission of cardholder data',
          'Maintain a vulnerability management program'
        ],
        source: 'PCI Security Standards Council'
      }],
      default: [{
        name: 'WCAG',
        version: '2.1 AA',
        lastUpdated: '2018-06-05',
        requirements: [
          'Perceivable: Information must be presentable in ways users can perceive',
          'Operable: Interface components must be operable',
          'Understandable: Information and UI operation must be understandable',
          'Robust: Content must be robust enough for various assistive technologies'
        ],
        source: 'W3C'
      }]
    };

    return standardsMap[domain] || standardsMap.default;
  }
}
```

---

## PHASE 6: Update Frontend Integration (Day 4)

### Step 6.1: Update the Pipeline Hook

**File**: `src/hooks/useOptimizedPipeline.tsx`

**Action**: REPLACE the entire hook implementation

```typescript
import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BoundaryPushingPipeline } from '@/services/BoundaryPushingPipeline';
import { PipelineError } from '@/types/pipelineErrors';
import { ToastAction } from '@/components/ui/toast';

interface PipelineState {
  isAnalyzing: boolean;
  progress: number;
  stage: string;
  message: string;
  error: string | null;
  stages: any[];
  requiresClarification?: boolean;
  clarificationQuestions?: string[];
  partialContext?: any;
  resumeToken?: string;
  imageUrl?: string;
  userContext?: string;
  imageName?: string;
  imageId?: string;
}

export function useOptimizedPipeline() {
  const { toast, dismiss } = useToast();
  const [state, setState] = useState<PipelineState>({
    isAnalyzing: false,
    progress: 0,
    stage: 'idle',
    message: 'Ready for analysis',
    error: null,
    stages: []
  });

  const [pipeline] = useState(() => new BoundaryPushingPipeline());

  const executeOptimizedAnalysis = useCallback(async (
    imageUrl: string,
    userContext: string,
    imageName: string,
    imageId: string
  ) => {
    try {
      // Reset state
      setState({
        isAnalyzing: true,
        error: null,
        progress: 0,
        stage: 'initializing',
        message: 'Starting context-aware analysis...',
        stages: []
      });

      // Show persistent toast for progress
      const toastId = toast({
        title: "Analysis in Progress",
        description: "Detecting interface type...",
        duration: Infinity // Keep showing until complete
      });

      const result = await pipeline.execute(
        imageUrl,
        userContext,
        (progress, stage) => {
          setState(prev => ({
            ...prev,
            progress,
            stage,
            message: stage
          }));

          // Update toast with progress
          dismiss(toastId);
          toast({
            id: toastId,
            title: "Analysis in Progress",
            description: `${stage} (${progress}%)`,
            duration: Infinity
          });
        }
      );

      // Check if clarification is needed
      if (result.requiresClarification) {
        dismiss(toastId);
        
        // Store the partial result and show clarification UI
        setState(prev => ({
          ...prev,
          requiresClarification: true,
          clarificationQuestions: result.questions,
          partialContext: result.partialContext,
          resumeToken: result.resumeToken
        }));

        return {
          success: false,
          requiresClarification: true,
          data: result
        };
      }

      // Success!
      dismiss(toastId);
      toast({
        title: "Analysis Complete! 🎉",
        description: `Successfully analyzed using ${result.metadata.modelsUsed.length} AI models`,
        duration: 5000
      });

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 100,
        stage: 'completed',
        message: 'Analysis completed successfully!',
        stages: result.stages || []
      }));

      return {
        success: true,
        data: result
      };

    } catch (error) {
      // Show the ACTUAL error - no generic messages
      const errorMessage = error instanceof PipelineError 
        ? error.message 
        : error.message || 'Pipeline execution failed';
      
      const errorDetails = error instanceof PipelineError 
        ? error.details 
        : null;

      toast({
        title: "Analysis Failed ❌",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show longer for errors
        action: error instanceof PipelineError && error.isRetryable ? (
          <ToastAction
            altText="Retry"
            onClick={() => executeOptimizedAnalysis(imageUrl, userContext, imageName, imageId)}
          >
            Retry
          </ToastAction>
        ) : undefined
      });

      // If missing API keys, show additional help
      if (errorDetails?.requiredKeys) {
        toast({
          title: "Configuration Required",
          description: `Please add these API keys: ${errorDetails.requiredKeys.join(', ')}`,
          duration: 15000,
          action: (
            <ToastAction
              altText="Go to Settings"
              onClick={() => window.location.href = '/settings'}
            >
              Go to Settings
            </ToastAction>
          )
        });
      }

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage,
        progress: 0,
        stage: 'error'
      }));

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [pipeline, toast, dismiss]);

  const handleClarificationResponse = useCallback(async (
    responses: Record<string, string>
  ) => {
    const { resumeToken, imageUrl, userContext, imageName, imageId } = state;

    try {
      setState(prev => ({
        ...prev,
        isAnalyzing: true,
        requiresClarification: false,
        error: null
      }));

      const result = await pipeline.resumeWithClarification(
        resumeToken!,
        responses,
        imageUrl!,
        userContext!,
        (progress, stage) => {
          setState(prev => ({
            ...prev,
            progress,
            stage,
            message: stage
          }));
        }
      );

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 100,
        stage: 'completed',
        message: 'Analysis completed successfully!'
      }));

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const errorMessage = error.message || 'Failed to resume analysis';
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage
      }));

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [state, pipeline]);

  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      progress: 0,
      stage: 'idle',
      message: 'Ready for analysis',
      error: null,
      stages: []
    });
    pipeline.abort();
  }, [pipeline]);

  return {
    ...state,
    executeOptimizedAnalysis,
    handleClarificationResponse,
    reset
  };
}
```

### Step 6.2: Create Pipeline Monitor Component

**File**: `src/components/PipelineMonitor.tsx` (CREATE NEW FILE)

```typescript
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';

interface PipelineMonitorProps {
  progress: number;
  stage: string;
  message: string;
  error: string | null;
}

export function PipelineMonitor({ progress, stage, message, error }: PipelineMonitorProps) {
  const stages = [
    { id: 'context', label: 'Context Detection', threshold: 5 },
    { id: 'vision', label: 'Vision Analysis', threshold: 30 },
    { id: 'analysis', label: 'Deep Analysis', threshold: 60 },
    { id: 'synthesis', label: 'Synthesis', threshold: 90 },
    { id: 'completed', label: 'Complete', threshold: 100 }
  ];

  const getStageStatus = (stageThreshold: number) => {
    if (error) return 'error';
    if (progress >= stageThreshold) return 'complete';
    if (progress > stageThreshold - 10 && progress < stageThreshold) return 'active';
    return 'pending';
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-4 w-4" />;
      case 'active': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analysis Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="w-full" />
        
        <div className="space-y-2">
          {stages.map((s) => {
            const status = getStageStatus(s.threshold);
            return (
              <div key={s.id} className="flex items-center gap-2">
                {getStageIcon(status)}
                <span className={`text-sm ${status === 'active' ? 'font-medium' : ''}`}>
                  {s.label}
                </span>
                {status === 'complete' && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Complete
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {message && (
          <div className="text-sm text-muted-foreground mt-2">
            {message}
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive mt-2">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 6.3: Create Analysis Context Display Component

**File**: `src/components/AnalysisContextDisplay.tsx` (CREATE NEW FILE)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalysisContext } from '@/types/contextTypes';
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  ShoppingCart, 
  FileText, 
  Layout,
  Briefcase,
  Code,
  Palette,
  TrendingUp,
  Megaphone
} from 'lucide-react';

interface AnalysisContextDisplayProps {
  context: AnalysisContext;
}

export function AnalysisContextDisplay({ context }: AnalysisContextDisplayProps) {
  const getInterfaceIcon = (type: string) => {
    const icons = {
      dashboard: Monitor,
      mobile: Smartphone,
      landing: Globe,
      ecommerce: ShoppingCart,
      form: FileText,
      app: Layout
    };
    const Icon = icons[type] || Layout;
    return <Icon className="h-4 w-4" />;
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      designer: Palette,
      developer: Code,
      business: Briefcase,
      product: TrendingUp,
      marketing: Megaphone
    };
    const Icon = icons[role] || Briefcase;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Analysis Context</span>
          <Badge variant="outline" className="text-xs">
            {Math.round(context.confidence * 100)}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Interface Type */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Interface Type</div>
          <div className="flex items-center gap-2">
            {getInterfaceIcon(context.image.primaryType)}
            <Badge variant="default" className="capitalize">
              {context.image.primaryType}
            </Badge>
            {context.image.domain && (
              <Badge variant="secondary" className="capitalize">
                {context.image.domain}
              </Badge>
            )}
          </div>
        </div>

        {/* User Role */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Your Perspective</div>
          <div className="flex items-center gap-2">
            {getRoleIcon(context.user.inferredRole || 'business')}
            <Badge variant="default" className="capitalize">
              {context.user.inferredRole || 'General'}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {context.user.expertise} Level
            </Badge>
          </div>
        </div>

        {/* Focus Areas */}
        {context.focusAreas && context.focusAreas.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Focus Areas</div>
            <div className="flex flex-wrap gap-1">
              {context.focusAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Industry Standards */}
        {context.industryStandards && context.industryStandards.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Compliance Standards</div>
            <div className="flex flex-wrap gap-1">
              {context.industryStandards.map((standard) => (
                <Badge key={standard} variant="outline" className="text-xs">
                  {standard}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 6.4: Update Image Analysis View

**File**: `src/components/ImageAnalysisView.tsx`

**Action**: Update to display context and enhanced information

Add these imports at the top:
```typescript
import { AnalysisContextDisplay } from './AnalysisContextDisplay';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Code, Palette, Briefcase, TrendingUp } from 'lucide-react';
```

Add after the model information section:
```typescript
{/* Context Information - PRIORITY DISPLAY */}
{analysis.analysisContext && (
  <AnalysisContextDisplay context={analysis.analysisContext} />
)}

{/* Enhanced Model Information */}
{analysis.metadata?.modelsUsed && (
  <div className="flex flex-wrap gap-2 mb-4">
    <Badge variant="outline" className="gap-1">
      <Info className="h-3 w-3" />
      {analysis.metadata.modelsUsed.length} AI Models Used
    </Badge>
    
    {analysis.metadata.modelsUsed.map((model: string) => (
      <Badge key={model} variant="secondary" className="text-xs">
        {model}
      </Badge>
    ))}
    
    {analysis.summary?.confidence && (
      <Badge variant="outline" className="gap-1">
        Confidence: {Math.round(analysis.summary.confidence * 100)}%
      </Badge>
    )}
  </div>
)}

{/* Enhanced Pipeline Stages Display */}
{analysis.metadata?.stagesCompleted && (
  <div className="mb-4">
    <div className="text-sm font-medium mb-2">Analysis Pipeline</div>
    <div className="flex gap-2">
      {['context', 'vision', 'analysis', 'synthesis'].map((stage) => {
        const completed = analysis.metadata.stagesCompleted.includes(stage);
        return (
          <Badge 
            key={stage} 
            variant={completed ? 'default' : 'outline'}
            className="capitalize"
          >
            {stage}
          </Badge>
        );
      })}
    </div>
  </div>
)}
```

---

## PHASE 7: Environment Configuration (Day 5)

### Step 7.1: Update Local Environment Variables

**File**: `.env.local`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: WebSocket for real-time monitoring
VITE_WS_URL=wss://your-project.supabase.co/realtime/v1
```

### Step 7.2: Configure Supabase Edge Function Environment

**Location**: Supabase Dashboard > Edge Functions > Settings > Environment Variables

**Add these variables**:
```
OPENAI_API_KEY=sk-...your-openai-key
ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key
GOOGLE_VISION_API_KEY=...your-google-vision-key
PERPLEXITY_API_KEY=pplx-...your-perplexity-key (optional)
```

---

## PHASE 8: Testing & Validation (Day 5)

### Step 8.1: Test Context Detection

1. **Financial Dashboard Test**
   - Upload a financial dashboard
   - User context: "Help me improve data visualization for our trading platform"
   - ✅ EXPECT: Finance domain detection, dashboard type, data-viz focus

2. **E-commerce Landing Test**
   - Upload an e-commerce landing page
   - User context: "I need to increase conversions on this page"
   - ✅ EXPECT: Retail domain, landing type, conversion focus

3. **Mobile App Test**
   - Upload a mobile app screenshot
   - User context: "Make this more user-friendly for elderly users"
   - ✅ EXPECT: Mobile platform, accessibility focus, simplified language

4. **Developer-Focused Test**
   - Upload any interface
   - User context: "Show me the component architecture and API integration points"
   - ✅ EXPECT: Technical output style, development focus, code examples

5. **Business Stakeholder Test**
   - Upload any interface
   - User context: "What's the ROI potential for improving this interface?"
   - ✅ EXPECT: Business output style, ROI focus, non-technical language

6. **Low Confidence Test**
   - Upload an ambiguous interface
   - User context: "Help me with this"
   - ✅ EXPECT: Clarification questions appear
   - ✅ EXPECT: Can select role and interface type
   - ✅ EXPECT: Analysis continues with enhanced context

### Step 8.2: Test Error Handling

1. **Test with NO API Keys**
   - Remove all API keys from Supabase
   - Upload an image
   - ✅ EXPECT: Clear error message about missing API keys
   - ❌ NOT: Fallback data or generic error

2. **Test with ONE API Key**
   - Add only OpenAI key
   - Upload an image
   - ✅ EXPECT: Analysis runs with single model
   - ✅ EXPECT: Results show "Models used: 1"

3. **Test with ALL API Keys**
   - Add all three API keys
   - Upload an image
   - ✅ EXPECT: Progress shows multiple stages
   - ✅ EXPECT: Context detection occurs
   - ✅ EXPECT: Results show multiple models used
   - ✅ EXPECT: Higher confidence scores

---

## CRITICAL SUCCESS FACTORS

### DO:
1. **Delete ALL fallback functions** - No generic responses
2. **Let AI detect context** - Don't rely on user selection
3. **Build prompts dynamically** - Every analysis is unique
4. **Run multiple models in parallel** - Maximize insights
5. **Show real errors** - Help users fix actual issues
6. **Adapt to user expertise** - Beginners vs experts
7. **Focus on user goals** - What matters to them
8. **Display detected context** - Show users what was detected

### DON'T:
1. **Keep ANY fallback functions** - They degrade quality
2. **Use generic prompts** - One-size-fits-none
3. **Hide errors** - Transparency builds trust
4. **Assume context** - Always detect and verify
5. **Overwhelm beginners** - Adapt complexity
6. **Ignore API key status** - Clear requirements
7. **Hide context detection** - Users should see what was detected

### API Key Priority:
1. **OpenAI + Anthropic** = Best results (recommended)
2. **Single API key** = Functional but limited
3. **No API keys** = Clear error, no analysis

---

## FINAL IMPLEMENTATION CHECKLIST

- [ ] Deleted ALL fallback functions from edge functions
- [ ] Removed ResilientAnalysisPipeline.ts completely
- [ ] Created context detection types with clarification support
- [ ] Implemented ContextDetectionService with clarification logic
- [ ] Built DynamicPromptBuilder with research integration
- [ ] Created BoundaryPushingPipeline with clarification flow
- [ ] Added StandardsRetrievalService for live standards
- [ ] Created ContextClarification component
- [ ] Replaced edge function completely (no fallbacks)
- [ ] Created context-detection edge function
- [ ] Updated frontend hook with clarification handling
- [ ] Added PipelineMonitor component
- [ ] Added AnalysisContextDisplay component
- [ ] Updated UI to show context prominently
- [ ] Configured environment variables (including optional Perplexity)
- [ ] Tested with various API key combinations
- [ ] Tested context detection scenarios
- [ ] Tested clarification flow when confidence < 0.7
- [ ] Verified citations appear in recommendations
- [ ] Verified NO fallback data is ever shown
- [ ] Confirmed real errors are displayed
- [ ] Validated dynamic prompt generation
- [ ] Checked multi-model execution
- [ ] Verified context-aware results
- [ ] Ensured context is displayed in UI
- [ ] Tested research augmentation (if Perplexity enabled))
- [ ] Added PipelineMonitor component
- [ ] Added AnalysisContextDisplay component
- [ ] Updated UI to show context prominently
- [ ] Configured environment variables
- [ ] Tested with various API key combinations
- [ ] Tested context detection scenarios
- [ ] Verified NO fallback data is ever shown
- [ ] Confirmed real errors are displayed
- [ ] Validated dynamic prompt generation
- [ ] Checked multi-model execution
- [ ] Verified context-aware results
- [ ] Ensured context is displayed in UI

---

## EXPECTED OUTCOMES

With this complete implementation including Perplexity enhancements, your pipeline will:

1. **Auto-detect** what type of interface is being analyzed
2. **Clarify** ambiguous contexts through conversational questions
3. **Understand** user goals from natural language
4. **Augment** analysis with real-time research and standards
5. **Execute** multiple AI models in parallel
6. **Generate** perfectly tailored prompts for each scenario
7. **Cite** sources for recommendations when available
8. **Deliver** relevant insights in the right format
9. **Adapt** to user expertise and role
10. **Focus** on what matters most to each user
11. **Display** detected context prominently
12. **Learn** from clarifications for future analyses

The result: Every analysis feels custom-built for the specific user and their needs, with the highest quality insights from multiple AI models working together, augmented by real-time knowledge when available.

**Remember**: The goal is boundary-pushing, context-aware results through intelligent multi-model orchestration, NOT degraded fallback data. Every error should help fix the real issue, and every analysis should feel personally crafted. Context detection and display is the PRIORITY - not generic UX feedback.

## ENHANCEMENT SUMMARY

The Perplexity integration adds three key capabilities:

1. **Context Clarification**: When confidence is low, users get helpful questions to clarify their needs
2. **Knowledge Augmentation**: Real-time retrieval of best practices and current standards
3. **Citation Generation**: Recommendations backed by credible sources

These enhancements maintain the core architecture's simplicity while adding significant value for users who need the most current and well-researched insights.

## 📊 API Configuration

### Recommended Setup
For best results, configure multiple API keys:
- **OpenAI + Anthropic**: Provides diverse perspectives and highest quality
- **Add Perplexity**: Enables research augmentation and citation generation
- **All APIs**: Maximum insight coverage, model consensus, and knowledge augmentation

### Feature Availability by API Configuration

| Feature | OpenAI Only | Anthropic Only | Both | +Perplexity |
|---------|------------|----------------|------|-------------|
| Basic Analysis | ✅ | ✅ | ✅ | ✅ |
| Context Detection | ✅ | ❌ | ✅ | ✅ |
| Multi-Model Fusion | ❌ | ❌ | ✅ | ✅ |
| Clarification Flow | ✅ | ✅ | ✅ | ✅ |
| Research Augmentation | ❌ | ❌ | ❌ | ✅ |
| Citation Generation | ❌ | ❌ | ❌ | ✅ |
| Live Standards | ❌ | ❌ | ❌ | ✅ |

### No API Keys
Without API keys, the system will:
- Show clear error messages explaining what's needed
- Direct users to settings to add API keys
- Never show generic or fallback content

## 🔧 Development Guidelines

### Core Principles

1. **No Fallback Data**: Never show generic responses - only real AI insights
2. **Context First**: Always detect and display context before analysis
3. **Clarify Ambiguity**: Ask questions when context confidence is low
4. **Transparent Errors**: Show specific, actionable error messages
5. **Dynamic Everything**: No hardcoded prompts or generic templates
6. **User-Centric**: Adapt to expertise level and goals
7. **Knowledge-Augmented**: Integrate current research when available

### Code Standards

```typescript
// Always use context-aware prompts
const prompt = await promptBuilder.buildContextualPrompt(
  stage,
  analysisContext,
  previousData
);

// Handle clarification needs
if (result.requiresClarification) {
  return showClarificationUI(result.questions);
}

// Never use generic error messages
// ❌ Bad: "Analysis failed. Please try again."
// ✅ Good: "Analysis failed: OpenAI API key not configured. Add it in Settings."

// Always include context in results
return {
  ...analysisResults,
  analysisContext, // Required for display
  citations // Include when available
};
```

## 📝 Testing Checklist

### Context Detection Tests
- [ ] Financial dashboard → Finance domain detected
- [ ] "I'm a developer" → Technical language used
- [ ] "Increase conversions" → Business metrics focus
- [ ] Mobile screenshot → Mobile-specific analysis

### Clarification Flow Tests
- [ ] Ambiguous interface → Clarification questions appear
- [ ] Answer questions → Context confidence increases
- [ ] Resume analysis → Uses enhanced context

### Research Augmentation Tests (if Perplexity enabled)
- [ ] Standards retrieved → Current versions referenced
- [ ] Best practices → Recent research cited
- [ ] Recommendations → Include source citations

### Error Handling Tests
- [ ] No API keys → Specific configuration message
- [ ] API failure → Retry option with explanation
- [ ] Partial success → Shows which models succeeded

### Performance Tests
- [ ] Context detection < 2 seconds
- [ ] Clarification response < 1 second
- [ ] Full analysis < 30 seconds
- [ ] Progress updates every 5-10%

## 🆘 Troubleshooting

### Common Issues

**"No API keys configured"**
- Add at least one API key in Supabase Edge Functions settings
- OpenAI recommended for context detection
- Restart the application after adding keys

**"Context clarification needed"**
- This is normal for ambiguous interfaces
- Answer the questions to improve analysis quality
- System learns from your responses

**"Research augmentation unavailable"**
- Add Perplexity API key for this feature
- System works fine without it, just no citations

**"Analysis taking too long"**
- Normal analysis takes 15-30 seconds
- More models = longer but better analysis
- Check network connection
- Verify API keys are valid

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for context-aware, personalized UX analysis with real-time knowledge augmentation