# Contextual Analysis Integration Testing Guide

## Phase 2: Complete Flow Testing (30 minutes)

### Test 1: Ambiguous Interface Detection
1. **Upload an ambiguous screenshot** (e.g., a wireframe, sketch, or unclear interface)
2. **Expected Behavior:**
   - Context detection should run automatically
   - Confidence score should be < 70%
   - Clarification questions should appear
   - Should ask about interface type, user role, or goals
3. **Verification:**
   - Check browser console for context detection logs
   - Verify `AnalysisContext` object has `clarificationNeeded: true`
   - Confirm clarification questions are relevant to the image

### Test 2: Clarification Submission
1. **Continue from Test 1**
2. **Answer clarification questions:**
   - Select your role (Designer/Developer/Business/Product)
   - Specify interface type if asked
   - Provide goals/focus areas
3. **Expected Behavior:**
   - Analysis should resume automatically
   - Enhanced context should be used for analysis
   - Final results should include context display
4. **Verification:**
   - Check that `enhancedConfidence` > 0.8
   - Verify analysis prompts are contextually relevant
   - Confirm `AnalysisContextDisplay` appears in results

### Test 3: Clear Interface (No Clarification)
1. **Upload a clear interface** (e.g., obvious dashboard, landing page)
2. **Add specific user context:** "I'm a designer focused on conversion optimization"
3. **Expected Behavior:**
   - Context detection should complete quickly
   - No clarification questions should appear
   - Analysis should proceed directly
4. **Verification:**
   - Confidence score should be > 70%
   - `clarificationNeeded` should be false
   - Context should be displayed in results

### Test 4: API Key Error Handling
1. **Temporarily remove all API keys** from Supabase Edge Functions
2. **Attempt analysis**
3. **Expected Behavior:**
   - Specific error message about API configuration
   - Clear instructions on how to fix
   - No generic "analysis failed" messages
4. **Verification:**
   - Error should mention "API key not configured"
   - Should specify which API keys are needed
   - Quick fix guidance should appear

## Phase 3: Load Testing & Performance (1 hour)

### Test 5: Multiple Interface Types
Test with each interface type to verify context adaptation:

**Dashboard Interface:**
- Upload financial/analytics dashboard
- User context: "I'm a business analyst"
- Verify: Prompts focus on data visualization, KPIs

**Landing Page:**
- Upload marketing landing page
- User context: "I need to improve conversions"
- Verify: Prompts focus on CTAs, persuasion elements

**Mobile App:**
- Upload mobile app screenshot
- User context: "I'm a developer concerned about accessibility"
- Verify: Prompts focus on touch targets, mobile patterns

**E-commerce:**
- Upload product page/checkout
- User context: "I want to reduce cart abandonment"
- Verify: Prompts focus on purchase flow, trust signals

### Test 6: Different User Contexts
Test role adaptation with same interface:

**Designer Context:**
- Input: "I'm a designer focused on visual hierarchy"
- Verify: Analysis includes design system feedback, typography

**Developer Context:**
- Input: "I'm a developer implementing this interface"
- Verify: Analysis includes component architecture, performance

**Business Context:**
- Input: "I'm a business owner focused on ROI"
- Verify: Analysis includes conversion metrics, revenue impact

**Product Context:**
- Input: "I'm a PM planning our roadmap"
- Verify: Analysis includes feature prioritization, user journey

### Test 7: Model Failover Testing
Configure API keys in different combinations:

**OpenAI Only:**
- Expected: Context detection works, analysis proceeds
- Verify: Single model results, reasonable quality

**Anthropic Only:**
- Expected: Analysis works but no context detection
- Verify: Fallback to user input parsing

**Multiple APIs:**
- Expected: Best results, model consensus
- Verify: Fused results from multiple models

**Google Vision Only:**
- Expected: Limited functionality
- Verify: Graceful degradation

### Test 8: Pipeline Stability
1. **Run 5+ analyses consecutively**
2. **Vary image types and user contexts**
3. **Monitor performance:**
   - Each analysis should complete in 15-30 seconds
   - Memory usage should remain stable
   - No context bleeding between analyses
4. **Verification:**
   - Check browser memory usage
   - Verify each analysis gets fresh context
   - Confirm no race conditions

## Phase 4 Verification: UI Polish

### Test 9: Loading States
1. **Start analysis and observe loading states:**
   - Context detection should show spinner
   - Stage progress should update appropriately
   - Token usage should display when available
2. **Verification:**
   - Loading indicators are contextually appropriate
   - No layout shifts during state changes
   - Clear progress communication

### Test 10: Context Display During Clarification
1. **Trigger clarification flow**
2. **Verify detected context is shown:**
   - Partial context should be visible
   - Confidence level should be displayed
   - Interface type and domain should show
3. **Verification:**
   - Context display appears above clarification questions
   - Information is accurate and helpful
   - Visual hierarchy is clear

### Test 11: Enhanced Error Messages
1. **Test various error scenarios:**
   - Network disconnection
   - Invalid API keys
   - Rate limiting
   - Image upload failures
2. **Verification:**
   - Errors are specific and actionable
   - Quick fix guidance appears when relevant
   - No generic error messages

### Test 12: Complete User Journey
1. **Full end-to-end test:**
   - Upload ambiguous interface
   - Complete clarification flow
   - Review analysis with context
   - Export/share results
2. **Verification:**
   - Smooth user experience throughout
   - Context is preserved across all steps
   - Results include comprehensive context information

## Performance Benchmarks

### Expected Timings:
- Context Detection: < 5 seconds
- Clarification (if needed): User-dependent
- Full Analysis: 15-30 seconds
- Total Flow: < 60 seconds

### Quality Metrics:
- Context confidence > 70% for clear interfaces
- Clarification questions relevant and helpful
- Analysis results contextually appropriate
- No false positive clarification triggers

## Troubleshooting Common Issues

### Context Detection Fails:
- Check OpenAI API key configuration
- Verify image URL is accessible
- Check network connectivity

### Clarification Questions Don't Appear:
- Verify confidence calculation logic
- Check that threshold is set to 0.7
- Ensure `clarificationNeeded` flag is set

### Analysis Results Lack Context:
- Verify `analysisContext` is passed to results
- Check `AnalysisContextDisplay` component rendering
- Ensure context data is not lost in pipeline

### Performance Issues:
- Monitor token usage and API rate limits
- Check for memory leaks in React components
- Verify proper cleanup of analysis requests

## Success Criteria

✅ **Context Detection Works:** Every analysis starts with context detection
✅ **Clarification Flow:** Low confidence triggers appropriate questions  
✅ **Context-Aware Analysis:** Prompts adapt to detected context
✅ **Proper Error Handling:** Specific, actionable error messages
✅ **Performance:** Stable performance across multiple analyses
✅ **UI Polish:** Loading states, context display, enhanced errors
✅ **User Experience:** Smooth flow from upload to results

## Next Steps After Testing

1. **Address any identified issues**
2. **Fine-tune confidence thresholds** based on testing
3. **Optimize prompt templates** for better context adaptation
4. **Add analytics** to track context detection accuracy
5. **Consider A/B testing** different clarification question formats