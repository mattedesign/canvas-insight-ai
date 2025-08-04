// ============================================
// 🐜 ELITE GUARDS SERVICE
// Phase 4: Strategic Analysis Orchestration
// ============================================

import { personaAnalysisAnt } from '../workers/strategic/personaWorker';
import { marketResearchAnt } from '../workers/strategic/marketResearchWorker';
import { goalGapAnalysisAnt } from '../workers/strategic/goalGapAnalysisWorker';
import { FeatureFlagService } from './FeatureFlagService';

export class EliteGuardsService {
  private static instance: EliteGuardsService;

  static getInstance(): EliteGuardsService {
    if (!this.instance) {
      this.instance = new EliteGuardsService();
    }
    return this.instance;
  }

  /**
   * Deploy Elite Guards for strategic analysis
   */
  async deployEliteGuards(
    jobId: string,
    synthesisResult: any,
    contextData: any
  ): Promise<{
    success: boolean;
    personas?: any[];
    marketInsights?: any[];
    gapAnalysis?: any[];
    error?: any;
  }> {
    // Check if Elite Guards are enabled
    if (!FeatureFlagService.isEnabled('STRATEGIC_SCOUTS')) {
      console.log('🐜 [ELITE-GUARDS] Strategic scouts not enabled');
      return { success: false, error: 'Elite Guards not enabled' };
    }

    console.log('🐜 [ELITE-GUARDS] Deploying strategic analysis ants...');

    try {
      // Step 1: Persona Analysis
      console.log('🐜 [ELITE-GUARDS] Deploying Persona Analysis Ant...');
      const personaResult = await personaAnalysisAnt.execute(
        jobId,
        synthesisResult,
        contextData
      );
      
      if (!personaResult.success) {
        throw new Error('Persona analysis failed');
      }

      // Step 2: Market Research
      console.log('🐜 [ELITE-GUARDS] Deploying Market Research Ant...');
      const marketResult = await marketResearchAnt.execute(
        jobId,
        personaResult.personas,
        synthesisResult,
        contextData
      );
      
      if (!marketResult.success) {
        throw new Error('Market research failed');
      }

      // Step 3: Goal-Gap Analysis
      console.log('🐜 [ELITE-GUARDS] Deploying Goal-Gap Analysis Ant...');
      const gapResult = await goalGapAnalysisAnt.execute(
        jobId,
        marketResult.marketInsights,
        personaResult.personas,
        synthesisResult
      );
      
      if (!gapResult.success) {
        throw new Error('Goal-gap analysis failed');
      }

      console.log('🐜 [ELITE-GUARDS] All strategic analysis complete!');
      
      return {
        success: true,
        personas: personaResult.personas,
        marketInsights: marketResult.marketInsights,
        gapAnalysis: gapResult.gapAnalysis
      };
      
    } catch (error) {
      console.error('🐜 [ELITE-GUARDS] Deployment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Elite Guards deployment failed'
      };
    }
  }

  /**
   * Check if Elite Guards are enabled
   */
  isEnabled(): boolean {
    return FeatureFlagService.isEnabled('STRATEGIC_SCOUTS');
  }
}
