// 🐜 WORKER ANT: Context Detection
// Colony Role: Scout Ant - First to explore new images
// This ant ONLY detects what type of image we're looking at

import { inngest } from "../../lib/inngest";
import { ContextDetectionService } from "../../services/contextDetection";

export const contextDetectionAnt = inngest.createFunction(
  { 
    id: "ant-context-detection",
    name: "Context Detection Worker Ant" 
  },
  { event: "ant-context-detection" },
  async ({ event, step }) => {
    const { imageUrl, imageId, userId } = event.data;
    
    console.log('🐜 [CONTEXT-ANT] Starting AI analysis for:', imageId);
    
    // Use REAL AI context detection
    const context = await step.run("detect-context", async () => {
      const detector = new ContextDetectionService();
      const result = await detector.detectImageContext(imageUrl);
      
      return {
        ...result,
        detected_at: new Date().toISOString()
      };
    });
    
    console.log('🐜 [CONTEXT-ANT] AI detected context:', context);
    
    // Send to pattern extraction
    await step.sendEvent("notify-pattern-ant", {
      name: "ant-pattern-extraction",
      data: { 
        contextData: context,
        imageId,
        userId
      }
    });

    console.log('🐜 [CONTEXT-ANT] Done! Found context:', context);
    return { success: true, context };
  }
);