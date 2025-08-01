# UX Analysis AI Platform

A boundary-pushing, context-aware multi-model AI platform that provides personalized UX/UI analysis by automatically detecting interface types and adapting insights to user needs.

## 🚀 Key Features

### Context-Aware Intelligence
- **Automatic Interface Detection**: AI detects whether you're analyzing a dashboard, landing page, mobile app, e-commerce site, or other interface types
- **User Role Recognition**: Adapts analysis based on whether you're a designer, developer, business stakeholder, or product manager
- **Dynamic Prompt Generation**: Every analysis uses custom-built prompts based on detected context
- **Multi-Model Orchestration**: Runs multiple AI models in parallel (OpenAI, Anthropic, Google Vision) for comprehensive insights

### Core Capabilities
- **Personalized Analysis**: Insights tailored to your expertise level and goals
- **Industry-Specific Compliance**: Automatic checks for WCAG, HIPAA, PCI-DSS, and other standards based on detected domain
- **Visual Annotations**: AI-generated overlays highlighting specific UI issues and opportunities
- **Actionable Recommendations**: Prioritized suggestions based on impact, effort, or quick wins
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
- **State Management**: Context-aware pipeline with real-time updates
- **File Upload**: React Dropzone with image optimization

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- At least one AI API key (OpenAI, Anthropic, or Google)

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
```

4. Configure Supabase Edge Functions:
   - Go to your Supabase dashboard
   - Navigate to Edge Functions > Settings
   - Add these environment variables:
     - `OPENAI_API_KEY` (recommended)
     - `ANTHROPIC_API_KEY` (recommended)
     - `GOOGLE_VISION_API_KEY` (optional)

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
│   ├── PipelineMonitor.tsx
│   └── ImageAnalysisView.tsx
├── services/           # Core AI services
│   ├── BoundaryPushingPipeline.ts
│   ├── ContextDetectionService.ts
│   └── DynamicPromptBuilder.ts
├── types/              # TypeScript definitions
│   ├── contextTypes.ts
│   └── pipelineErrors.ts
├── hooks/              # Custom React hooks
│   └── useOptimizedPipeline.tsx
├── config/             # Configuration files
│   └── pipelineConfig.ts
└── integrations/       # Supabase integration
```

## 🤖 Context-Aware Analysis System

### How It Works

1. **Context Detection Phase**
   - Analyzes uploaded image to detect interface type (dashboard, landing page, app, etc.)
   - Identifies domain (finance, healthcare, e-commerce, etc.)
   - Infers user role and expertise from natural language input

2. **Dynamic Prompt Generation**
   - Builds custom prompts based on detected context
   - Adapts language complexity to user expertise level
   - Includes domain-specific requirements automatically

3. **Multi-Model Execution**
   - Runs available AI models in parallel
   - Fuses insights from multiple models
   - Calculates confidence scores

4. **Personalized Output**
   - Formats results based on user role (technical vs business language)
   - Prioritizes recommendations by user preference (impact, effort, quick wins)
   - Shows detected context transparently

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

## 🤖 AI Rules of Engagement

### Core Principles for AI Analysis

1. **Context-Aware Analysis**: Always detect and adapt to the interface type and user role before providing insights
2. **No Generic Feedback**: Every analysis must be specifically tailored to the detected context - never use one-size-fits-all responses
3. **Evidence-Based**: Support all recommendations with specific UI elements, established UX principles, and industry standards
4. **Role-Appropriate Language**: Adapt technical level based on user expertise (developer vs business stakeholder vs designer)
5. **Actionable Specificity**: Provide precise, implementable suggestions with clear steps, not vague improvements

### Context Detection Requirements

- **Always Run First**: Context detection must complete before any analysis begins
- **Display Transparently**: Show users what was detected (interface type, domain, user role)
- **Adapt Dynamically**: Use detected context to build custom prompts for each stage
- **Industry Standards**: Automatically include relevant compliance checks (WCAG for all, HIPAA for healthcare, PCI-DSS for finance)

### Analysis Focus by Interface Type

**Dashboards**
- Data visualization effectiveness and cognitive load
- Information hierarchy and decision support
- Real-time data handling and performance

**Landing Pages**
- Conversion optimization and psychological triggers
- Message clarity and value proposition
- Trust signals and social proof

**Mobile Apps**
- Touch target sizing (minimum 44x44px)
- Gesture patterns and thumb reach
- Platform-specific guidelines (iOS HIG, Material Design)

**E-commerce**
- Purchase journey and cart abandonment factors
- Product presentation and comparison features
- Security perception and payment trust

**Forms**
- Field validation and error recovery
- Completion optimization and progress indicators
- Accessibility and keyboard navigation

### Output Adaptation Rules

**For Developers**
- Include component architecture insights
- Provide code-level implementation hints
- Focus on performance implications
- Use technical terminology freely

**For Designers**
- Emphasize visual hierarchy and aesthetics
- Reference design system opportunities
- Focus on emotional design impact
- Include creative alternatives

**For Business Stakeholders**
- Lead with ROI and conversion impact
- Use business metrics and KPIs
- Avoid technical jargon
- Focus on competitive advantages

**For Product Managers**
- Balance user needs with feasibility
- Include roadmap considerations
- Focus on feature adoption
- Provide prioritization frameworks

### Quality Requirements

- **Quantifiable**: Include specific metrics (e.g., "Increase button size to 48px" not "Make button bigger")
- **Prioritized**: Mark issues as Critical, High, Medium, or Low based on user impact
- **Confidence-Rated**: Show confidence levels for AI-generated insights
- **Multi-Model Validated**: When multiple models agree, highlight consensus findings

### Error Handling Principles

- **Specific Errors Only**: Never show generic error messages
- **Actionable Solutions**: Every error must tell users exactly how to fix it
- **No Fallback Content**: If analysis fails, explain why - don't show placeholder data
- **Transparent Limitations**: Be clear about what requires which API keys

## 📊 API Configuration

### Recommended Setup
For best results, configure multiple API keys:
- **OpenAI + Anthropic**: Provides diverse perspectives and highest quality
- **All Three APIs**: Maximum insight coverage and model consensus

### Single API Mode
The system works with just one API key but with reduced capabilities:
- Fewer models means less comprehensive analysis
- Lower confidence scores
- Reduced ability to cross-validate findings

### No API Keys
Without API keys, the system will:
- Show clear error messages explaining what's needed
- Direct users to settings to add API keys
- Never show generic or fallback content

## 🔧 Development Guidelines

### Core Principles

1. **No Fallback Data**: Never show generic responses - only real AI insights
2. **Context First**: Always detect and display context before analysis
3. **Transparent Errors**: Show specific, actionable error messages
4. **Dynamic Everything**: No hardcoded prompts or generic templates
5. **User-Centric**: Adapt to expertise level and goals

### Code Standards

```typescript
// Always use context-aware prompts
const prompt = promptBuilder.buildContextualPrompt(
  stage,
  analysisContext,
  previousData
);

// Never use generic error messages
// ❌ Bad: "Analysis failed. Please try again."
// ✅ Good: "Analysis failed: OpenAI API key not configured. Add it in Settings."

// Always include context in results
return {
  ...analysisResults,
  analysisContext // Required for display
};
```

## 📝 Testing Checklist

### Context Detection Tests
- [ ] Financial dashboard → Finance domain detected
- [ ] "I'm a developer" → Technical language used
- [ ] "Increase conversions" → Business metrics focus
- [ ] Mobile screenshot → Mobile-specific analysis

### Error Handling Tests
- [ ] No API keys → Specific configuration message
- [ ] API failure → Retry option with explanation
- [ ] Partial success → Shows which models succeeded

### Performance Tests
- [ ] Context detection < 2 seconds
- [ ] Full analysis < 30 seconds
- [ ] Progress updates every 5-10%

## 🆘 Troubleshooting

### Common Issues

**"No API keys configured"**
- Add at least one API key in Supabase Edge Functions settings
- Restart the application after adding keys

**"Context detection failed"**
- Ensure OpenAI API key is configured (required for context detection)
- Check if the image URL is accessible

**"Analysis taking too long"**
- Normal analysis takes 15-30 seconds
- Check network connection
- Verify API keys are valid

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for context-aware, personalized UX analysis