# UX Analysis AI Platform

A modern web application that leverages AI to provide comprehensive UX/UI analysis and insights for images and design compositions.

## 🚀 Features

- **AI-Powered Analysis**: Integration with Claude and OpenAI for intelligent UX/UI feedback
- **Image Upload & Management**: Drag-and-drop interface for uploading and organizing images
- **Interactive Canvas**: Visual workspace for arranging and analyzing design elements
- **Project Management**: Create, organize, and manage multiple analysis projects
- **Real-time Collaboration**: Live updates and collaborative analysis features
- **Subscription Management**: Integrated billing and subscription handling
- **Responsive Design**: Optimized for desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **State Management**: React Context + useReducer
- **Routing**: React Router Dom
- **AI Integration**: OpenAI GPT & Claude via Supabase Edge Functions
- **File Upload**: React Dropzone
- **Charts**: Recharts for analytics
- **Notifications**: Sonner for toast messages

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend services)

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

4. Configure Supabase:
   - Create a new Supabase project
   - Update environment variables with your Supabase credentials
   - Run database migrations (if any)

5. Start the development server:
```bash
npm run dev
```

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── pages/              # Route components
├── services/           # Business logic and API services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── integrations/       # External service integrations
```

## 🤖 AI Rules of Engagement

### General Guidelines

1. **Be Specific**: Provide clear, actionable feedback rather than vague suggestions
2. **Context Aware**: Consider the target audience and use case when analyzing designs
3. **Evidence-Based**: Support recommendations with UX principles and best practices
4. **Prioritized**: Focus on high-impact issues that affect user experience most
5. **Constructive**: Frame feedback positively with specific improvement suggestions

### Analysis Focus Areas

- **Usability**: Navigation, accessibility, and user flow
- **Visual Hierarchy**: Information organization and emphasis
- **Content Strategy**: Clarity, readability, and information architecture
- **Interaction Design**: User interface patterns and micro-interactions
- **Responsive Design**: Cross-device compatibility and mobile optimization

## 🔧 Development Guidelines

### Code Standards

- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Implement responsive design with Tailwind CSS
- Use semantic HTML and ensure accessibility
- Write self-documenting code with clear naming

### State Management

- Use React Context for global state
- Implement useReducer for complex state logic
- Keep state updates predictable and traceable
- Avoid prop drilling with proper context organization

### Performance

- Implement code splitting and lazy loading
- Optimize images and assets
- Use React.memo for expensive components
- Monitor bundle size and performance metrics

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing discussions

---

## 🏗️ Complete Architecture Rebuild Guide

### 100% Guaranteed Fix Plan - Complete State Management Overhaul

This comprehensive guide provides step-by-step instructions for rebuilding the application architecture to eliminate circular dependencies, infinite re-renders, and performance issues.

#### Phase 1: Eliminate Circular Dependencies (Days 1-2)
**Goal**: Stop the infinite re-render death spiral

**1.1 Fix AppContext Circular Dependencies**
- Remove loadDataFromDatabase from useEffect dependencies
- Create a stable reference using useRef for the load function
- Separate data loading logic from render cycle

**1.2 Simplify Actions Object**
- Make actions object truly stable using useRef + useCallback pattern
- Remove action dependencies from context value computation
- Use direct dispatch calls instead of action creators where appropriate

**1.3 Fix Analysis Realtime Hook**
- Remove function dependencies from useEffect that cause re-subscriptions
- Use useRef for stable function references
- Implement proper cleanup that doesn't depend on changing functions

#### Phase 2: Consolidate State Management (Days 3-4)
**Goal**: Single source of truth with predictable updates

**2.1 Eliminate Competing Patterns**
- Remove the hybrid AppContext + service layer approach
- Convert to pure reducer pattern with stable action dispatch
- Remove all action creator abstractions that cause dependency issues

**2.2 Simplify Context Value**
- Reduce context value to: { state, dispatch, stableHelpers }
- Move all computed values to custom hooks that use selectors
- Remove backward compatibility properties from context

**2.3 Create Stable Helper Functions**
- Create a useStableHelpers hook with useCallback and empty dependencies
- Move all business logic to these stable helpers
- Ensure helpers only depend on dispatch, never on state or other changing values

#### Phase 3: Optimize Data Loading (Day 5)
**Goal**: Predictable data loading without render loops

**3.1 Implement Loading State Machine**
- Create explicit loading states: idle, loading, success, error
- Use reducer actions to manage loading state transitions
- Remove loading logic from useEffect dependencies

**3.2 Separate Initialization from Re-renders**
- Move initial data loading to a one-time effect with empty dependencies
- Use event-driven updates for subsequent data changes
- Implement proper error boundaries for failed data loads

#### Phase 4: Type Safety & Performance (Day 6)
**Goal**: Prevent future regression with TypeScript

**4.1 Strict TypeScript Configuration**
- Enable strict mode and no implicit any
- Add explicit return types to all functions
- Create strict interfaces for all state and actions

**4.2 Performance Optimizations**
- Add React.memo to all major components
- Use proper dependency arrays in all hooks
- Implement virtualization for large lists

#### Phase 5: Testing & Validation (Day 7)
**Goal**: Verify the fix is permanent

**5.1 Add Re-render Detection**
- Implement useWhyDidYouUpdate hook for debugging
- Add console warnings for unexpected re-renders
- Create automated tests for state stability

**5.2 Load Testing**
- Test with 100+ images to verify performance
- Stress test state updates and real-time subscriptions
- Validate memory usage doesn't grow over time

#### Success Metrics
- Zero infinite re-renders (console log count < 10 per user action)
- Fast loading (dashboard loads in < 2 seconds)
- Stable state (no memory leaks after 1 hour of use)
- Predictable behavior (same action always produces same result)

#### Implementation Strategy
1. **Stop the bleeding first**: Fix circular dependencies immediately
2. **Simplify ruthlessly**: Remove all unnecessary abstractions
3. **Test continuously**: Add logging to verify each fix
4. **No feature additions**: Only fix existing functionality
5. **Backward compatibility**: Maintain exact same UI/UX behavior

### AI Assistant Instructions for Architecture Rebuild

When working on this codebase, AI assistants should:

1. **Prioritize Stability**: Always check for circular dependencies in useEffect hooks
2. **Use Stable References**: Prefer useRef and useCallback with empty dependency arrays
3. **Simplify State**: Avoid complex action creators that cause re-render chains
4. **Monitor Performance**: Add logging to track re-render counts during development
5. **Test Incrementally**: Verify each change doesn't introduce new render loops

### Database Schema Updates Required

```sql
-- Add performance monitoring table
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance queries
CREATE INDEX idx_performance_metrics_session ON performance_metrics(session_id);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
```

### Service Layer Simplification

**Before**: Multiple competing state management patterns
```typescript
// Remove: Complex action creators
// Remove: Service layer state
// Remove: Hybrid context patterns
```

**After**: Single source of truth
```typescript
// Keep: Pure reducer pattern
// Keep: Stable dispatch functions
// Keep: Simple context values
```

### Component Update Checklist

- [ ] Remove all useEffect dependencies on functions
- [ ] Convert action creators to direct dispatch calls
- [ ] Add React.memo to expensive components
- [ ] Use useCallback only with empty dependencies
- [ ] Add performance monitoring to critical paths

### Testing Strategy

1. **Render Count Tests**: Verify components don't re-render unnecessarily
2. **Memory Leak Tests**: Check for growing memory usage over time
3. **Performance Tests**: Measure loading times and interaction responsiveness
4. **Stability Tests**: Ensure state updates are predictable

### Deployment Considerations

- **Backward Compatibility**: All existing functionality must work identically
- **Gradual Rollout**: Deploy changes incrementally to minimize risk
- **Monitoring**: Add alerts for performance regressions
- **Rollback Plan**: Maintain ability to revert to previous stable state

### Troubleshooting Guide

**Infinite Re-renders**:
1. Check useEffect dependency arrays
2. Look for functions in context values
3. Verify action creators don't recreate on every render

**Memory Leaks**:
1. Check for uncleaned subscriptions
2. Verify refs are properly cleared
3. Look for circular references in state

**Performance Issues**:
1. Profile component render counts
2. Check for unnecessary state updates
3. Verify memoization is working correctly

This plan guarantees success because it eliminates the root causes (circular dependencies) and simplifies the architecture to match React's intended patterns, rather than fighting against them.

---

Built with ❤️ using React, TypeScript, and Supabase