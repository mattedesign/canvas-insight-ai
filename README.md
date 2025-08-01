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
- [ ] Delete ALL functions listed in Step 1.1
- [ ] Remove ResilientAnalysisPipeline.ts completely
- [ ] Remove fallback references from hooks
- [ ] DO NOT create new error handlers

**Phase 2: Context Detection (EXACT IMPLEMENTATION)**
- [ ] Create ONLY the types in contextTypes.ts
- [ ] Create ONLY the services listed
- [ ] Use EXACT method signatures provided
- [ ] DO NOT add extra context fields

**Phase 3: Pipeline Implementation**
- [ ] Copy code EXACTLY as provided
- [ ] DO NOT add error boundaries
- [ ] DO NOT add loading states unless shown
- [ ] DO NOT optimize the code

**Phase 4: UI Components**
- [ ] Build ONLY listed components
- [ ] Use ONLY the props specified
- [ ] DO NOT add animations
- [ ] DO NOT add extra styling

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