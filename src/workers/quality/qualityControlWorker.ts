// 🐜 WORKER ANT: Quality Control
// Colony Role: Inspector Ant - Ensures quality and saves results
import { inngest } from "../../lib/inngest";
import { supabase } from "../../lib/supabase";
import { WorkerAntProgressService } from "../../services/workerAntProgress";

export const qualityControlAnt = inngest.createFunction(
  { 
    id: "ant-quality-control",
    name: "Quality Control Worker Ant" 
  },
  { event: "ant-quality-control" },
  async ({ event, step }) => {
    const { insights, imageId, userId, jobId } = event.data;
    
    console.log('🐜 [QC-ANT] Quality checking insights for:', imageId);
    
    // Update progress to 90% (quality control phase)
    if (jobId) {
      await WorkerAntProgressService.updateProgress(jobId, 90, 'quality');
    }
    
    // Validate and enhance insights
    const validatedInsights = await step.run("validate-insights", async () => {
      // Check if insights meet quality standards
      const qualityChecks = {
        hasValidSummary: insights.summary && insights.summary.length > 20,
        hasStrengths: insights.strengths && insights.strengths.length > 0,
        hasImprovements: insights.improvements && insights.improvements.length > 0,
        hasScores: insights.designScore && insights.designScore.overall > 0,
        hasActionableSteps: insights.actionableSteps && insights.actionableSteps.length > 0
      };
      
      const passedChecks = Object.values(qualityChecks).filter(Boolean).length;
      const totalChecks = Object.keys(qualityChecks).length;
      const qualityScore = Math.round((passedChecks / totalChecks) * 100);
      
      console.log('🐜 [QC-ANT] Quality score:', qualityScore, '%');
      console.log('🐜 [QC-ANT] Quality checks:', qualityChecks);
      
      return {
        ...insights,
        qualityScore,
        qualityChecks,
        validated: qualityScore >= 80
      };
    });
    
    // Save to database if quality is good
    if (validatedInsights.validated) {
      await step.run("save-to-database", async () => {
        try {
          // Save to analysis_insights table
          const { data, error } = await supabase
            .from('analysis_insights')
            .insert({
              job_id: jobId,
              user_id: userId,
              image_id: imageId,
              insights: validatedInsights,
              quality_score: validatedInsights.qualityScore
            })
            .select()
            .single();
          
          if (error) {
            console.error('🐜 [QC-ANT] Database error:', error);
            throw error;
          }
          
          console.log('🐜 [QC-ANT] Saved to database:', data?.id);
          return data;
        } catch (error) {
          console.error('🐜 [QC-ANT] Failed to save:', error);
          if (jobId) {
            await WorkerAntProgressService.updateJobError(jobId, 'Failed to save insights');
          }
          throw error;
        }
      });
    }
    
    // Update job to 100% complete
    if (jobId) {
      await step.run("complete-job", async () => {
        await WorkerAntProgressService.updateProgress(jobId, 100);
        console.log('🐜 [QC-ANT] Job completed!');
      });
    }
    
    // Send completion notification (future: webhook, email, etc.)
    await step.run("notify-completion", async () => {
      console.log('🐜 [QC-ANT] Analysis complete for image:', imageId);
      // Future: Send webhook, email, or real-time notification
      return { notified: true };
    });

    console.log('🐜 [QC-ANT] Colony work complete! 🎉');
    return { 
      success: true, 
      validated: validatedInsights.validated,
      qualityScore: validatedInsights.qualityScore,
      insights: validatedInsights
    };
  }
);
