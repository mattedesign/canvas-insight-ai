// 🐜 WORKER ANT: Pattern Extraction
// Colony Role: Analyzer Ant - Finds patterns in the context
import { inngest } from "../../lib/inngest";

export const patternExtractionAnt = inngest.createFunction(
  { 
    id: "ant-pattern-extraction",
    name: "Pattern Extraction Worker Ant" 
  },
  { event: "ant-pattern-extraction" },
  async ({ event, step }) => {
    const { contextData, imageId, userId } = event.data;
    
    console.log('🐜 [PATTERN-ANT] Analyzing patterns for:', imageId);
    console.log('🐜 [PATTERN-ANT] Context received:', contextData);
    
    // Extract patterns based on context
    const patterns = await step.run("extract-patterns", async () => {
      // Mock pattern extraction - replace with real AI analysis later
      const extractedPatterns = {
        layoutPatterns: ["hero-section", "feature-grid", "cta-bottom"],
        colorScheme: {
          primary: "#3B82F6",
          secondary: "#10B981",
          accent: "#F59E0B",
          neutral: "#6B7280"
        },
        typography: {
          headingStyle: "bold-modern",
          bodyStyle: "clean-readable",
          fontPairing: ["Inter", "Georgia"]
        },
        components: ["navigation", "hero", "features", "testimonials", "footer"],
        designPrinciples: ["minimalist", "user-focused", "mobile-first"],
        extracted_at: new Date().toISOString()
      };
      
      console.log('🐜 [PATTERN-ANT] Patterns found:', extractedPatterns);
      return extractedPatterns;
    });
    
    // Send to insight generation
    await step.sendEvent("notify-insight-ant", {
      name: "ant-insight-generation",
      data: { 
        patterns,
        contextData,
        imageId,
        userId
      }
    });

    console.log('🐜 [PATTERN-ANT] Done! Patterns sent to Insight Generation Ant');
    return { success: true, patterns };
  }
);
