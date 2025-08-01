import { supabase } from '@/integrations/supabase/client';

/**
 * Resilient Multi-Stage Analysis Pipeline
 * Continues processing even if individual stages fail
 * Provides meaningful partial results and comprehensive error recovery
 */

interface TokenBudget {
  stage1_metadata: number;
  stage2_vision: number;
  stage3_comprehensive: number;
  buffer: number;
}

interface CompressedMetadata {
  elements: string;
  textSummary: string;
  colorPalette: string;
  labelsSummary: string;
  objectCount: number;
  textCount: number;
  faceCount: number;
}

interface StageResult {
  stage: string;
  model: string;
  success: boolean;
  timestamp: string;
  tokenUsage?: number;
  data: any;
  compressed?: boolean;
  error?: string;
  retryCount?: number;
}

interface PipelineProgress {
  stage: string;
  progress: number;
  message: string;
  tokenBudget?: { used: number; remaining: number };
  successfulStages: number;
  totalStages: number;
  qualityScore: number;
}

interface PipelineResult {
  success: boolean;
  data?: any;
  error?: string;
  stages: StageResult[];
  qualityMetrics: {
    completeness: number;
    dataRichness: number;
    analysisDepth: number;
    overallQuality: number;
  };
  partialResult: boolean;
}

export class ResilientAnalysisPipeline {
  private tokenBudgets: Record<string, TokenBudget> = {
    'claude-sonnet-4': {
      stage1_metadata: 2000,
      stage2_vision: 8000,
      stage3_comprehensive: 15000,
      buffer: 5000
    },
    'gpt-4.1': {
      stage1_metadata: 3000,
      stage2_vision: 10000,
      stage3_comprehensive: 20000,
      buffer: 7000
    }
  };

  private currentTokenUsage = 0;
  private progressCallback?: (progress: PipelineProgress) => void;
  private circuitBreakers: Map<string, { failures: number; lastFailure: number }> = new Map();

  constructor(onProgress?: (progress: PipelineProgress) => void) {
    this.progressCallback = onProgress;
  }

  /**
   * Execute resilient multi-stage analysis pipeline
   * Continues processing even if individual stages fail
   */
  async executeResilientPipeline(
    imageUrl: string,
    imageName: string,
    imageId: string,
    userContext?: string
  ): Promise<PipelineResult> {
    const stages: StageResult[] = [];
    let successfulStages = 0;
    const totalStages = 3;
    
    try {
      this.updateProgress('initializing', 0, 'Initializing resilient analysis pipeline', successfulStages, totalStages, 0);

      // Stage 1: Google Vision - Extract Metadata (Critical)
      const metadataResult = await this.executeStageWithRecovery(
        'google_vision_metadata',
        'google-vision',
        () => this.extractCompressedMetadata(imageUrl),
        'Google Vision: Extracting visual metadata',
        15
      );
      
      stages.push(metadataResult);
      if (metadataResult.success) successfulStages++;

      // Continue with fallback metadata if stage 1 fails
      const metadata = metadataResult.success ? metadataResult.data : this.createFallbackMetadata();

      // Stage 2: Vision Analysis (Important but not critical)
      const visionResult = await this.executeStageWithRecovery(
        'vision_analysis',
        'openai-gpt-4.1',
        () => this.performOpenAIAnalysis(imageUrl, metadata, userContext),
        'Vision Analysis: Performing initial UX analysis',
        45
      );
      
      stages.push(visionResult);
      if (visionResult.success) successfulStages++;

      // Stage 3: Claude Synthesis (Valuable but optional)
      const claudeResult = await this.executeStageWithRecovery(
        'claude_synthesis',
        'claude-sonnet-4',
        () => this.performClaudeSynthesis(imageUrl, metadata, visionResult.data, userContext),
        'Claude: Synthesizing comprehensive insights',
        75
      );
      
      stages.push(claudeResult);
      if (claudeResult.success) successfulStages++;

      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(stages, successfulStages);

      // Generate results based on successful stages
      const finalAnalysis = this.consolidateResilientResults(stages, imageId, imageName);

      // Store analysis with pipeline metadata
      await this.storeResilientAnalysis(imageId, finalAnalysis, stages, userContext || '');

      const isPartialResult = successfulStages < totalStages;
      
      this.updateProgress(
        'complete', 
        100, 
        `Analysis completed - ${successfulStages}/${totalStages} stages successful`, 
        successfulStages, 
        totalStages, 
        qualityMetrics.overallQuality
      );
      
      return {
        success: successfulStages > 0, // Success if at least one stage works
        data: finalAnalysis,
        stages,
        qualityMetrics,
        partialResult: isPartialResult
      };

    } catch (error) {
      console.error('Pipeline initialization failed:', error);
      
      stages.push({
        stage: 'pipeline_error',
        model: 'system',
        success: false,
        timestamp: new Date().toISOString(),
        data: { error: error.message },
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        stages,
        qualityMetrics: { completeness: 0, dataRichness: 0, analysisDepth: 0, overallQuality: 0 },
        partialResult: false
      };
    }
  }

  /**
   * Execute a stage with built-in recovery and circuit breaker logic
   */
  private async executeStageWithRecovery<T>(
    stageName: string,
    model: string,
    stageFunction: () => Promise<T>,
    progressMessage: string,
    progressValue: number
  ): Promise<StageResult> {
    const maxRetries = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(stageName)) {
      console.warn(`Circuit breaker open for ${stageName}, skipping stage`);
      return {
        stage: stageName,
        model: model,
        success: false,
        timestamp: new Date().toISOString(),
        data: null,
        error: 'Circuit breaker open - too many recent failures',
        retryCount: 0
      };
    }

    this.updateProgress(stageName, progressValue, progressMessage, 0, 3, 0);

    while (retryCount <= maxRetries) {
      try {
        console.log(`Executing ${stageName} (attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        const result = await stageFunction();
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(stageName);
        
        return {
          stage: stageName,
          model: model,
          success: true,
          timestamp: new Date().toISOString(),
          data: result,
          retryCount
        };

      } catch (error) {
        lastError = error;
        console.error(`${stageName} failed (attempt ${retryCount + 1}):`, error.message);
        
        // Implement exponential backoff for retries
        if (retryCount < maxRetries) {
          const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`Retrying ${stageName} in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
        
        retryCount++;
      }
    }

    // All retries failed - update circuit breaker
    this.updateCircuitBreaker(stageName);
    
    console.error(`${stageName} failed after all retries`);
    return {
      stage: stageName,
      model: model,
      success: false,
      timestamp: new Date().toISOString(),
      data: this.createFallbackData(stageName),
      error: lastError?.message || 'Stage failed after retries',
      retryCount: maxRetries
    };
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitBreakerOpen(stageName: string): boolean {
    const breaker = this.circuitBreakers.get(stageName);
    if (!breaker) return false;
    
    const now = Date.now();
    const timeSinceLastFailure = now - breaker.lastFailure;
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    
    // Reset if cooldown period has passed
    if (timeSinceLastFailure > cooldownPeriod) {
      this.circuitBreakers.delete(stageName);
      return false;
    }
    
    return breaker.failures >= 3;
  }

  private updateCircuitBreaker(stageName: string): void {
    const breaker = this.circuitBreakers.get(stageName) || { failures: 0, lastFailure: 0 };
    breaker.failures++;
    breaker.lastFailure = Date.now();
    this.circuitBreakers.set(stageName, breaker);
  }

  private resetCircuitBreaker(stageName: string): void {
    this.circuitBreakers.delete(stageName);
  }

  /**
   * Calculate quality metrics based on successful stages
   */
  private calculateQualityMetrics(stages: StageResult[], successfulStages: number): {
    completeness: number;
    dataRichness: number;
    analysisDepth: number;
    overallQuality: number;
  } {
    const completeness = (successfulStages / stages.length) * 100;
    
    // Calculate data richness based on what data we have
    let dataRichness = 0;
    stages.forEach(stage => {
      if (stage.success && stage.data) {
        switch (stage.stage) {
          case 'google_vision_metadata':
            dataRichness += 30; // Base metadata
            break;
          case 'vision_analysis':
            dataRichness += 40; // Rich analysis
            break;
          case 'claude_synthesis':
            dataRichness += 30; // Synthesis and insights
            break;
        }
      }
    });

    // Analysis depth based on successful stages
    const analysisDepth = successfulStages >= 2 ? 80 : successfulStages >= 1 ? 50 : 20;
    
    const overallQuality = Math.round((completeness + dataRichness + analysisDepth) / 3);

    return {
      completeness: Math.round(completeness),
      dataRichness: Math.round(dataRichness),
      analysisDepth,
      overallQuality
    };
  }

  /**
   * Create fallback data for failed stages
   */
  private createFallbackData(stageName: string): any {
    switch (stageName) {
      case 'google_vision_metadata':
        return this.createFallbackMetadata();
      case 'vision_analysis':
        return this.createFallbackVisionAnalysis();
      case 'claude_synthesis':
        return this.createFallbackSynthesis();
      default:
        return null;
    }
  }

  private createFallbackMetadata(): CompressedMetadata {
    return {
      elements: 'interface components',
      textSummary: 'UI text content',
      colorPalette: 'standard colors',
      labelsSummary: 'UI elements',
      objectCount: 0,
      textCount: 0,
      faceCount: 0
    };
  }

  private createFallbackVisionAnalysis(): any {
    return {
      layoutAnalysis: {
        type: 'standard',
        hierarchy: 'requires analysis',
        components: ['interface elements'],
        patterns: ['standard patterns']
      },
      usabilityFindings: {
        issues: [{ type: 'analysis', description: 'Detailed analysis pending', severity: 'medium' }],
        strengths: ['functional interface']
      },
      accessibilityReview: {
        concerns: ['requires accessibility audit'],
        recommendations: ['comprehensive review needed']
      }
    };
  }

  private createFallbackSynthesis(): any {
    return {
      insights: 'Analysis based on available data',
      recommendations: ['Review interface accessibility', 'Validate user workflows'],
      priority: 'medium',
      confidence: 'partial'
    };
  }

  /**
   * Extract and compress metadata to reduce payload size
   */
  private async extractCompressedMetadata(imageUrl: string): Promise<CompressedMetadata> {
    try {
      const { data, error } = await supabase.functions.invoke('google-vision-metadata', {
        body: { imageUrl }
      });

      if (error) throw new Error(`Metadata extraction failed: ${error.message}`);

      const metadata = data.metadata;
      
      const compressed: CompressedMetadata = {
        elements: metadata.objects
          ?.slice(0, 8)
          .map((obj: any) => obj.name)
          .join(', ') || 'interface elements',
        textSummary: this.compressTextData(metadata.text || []),
        colorPalette: metadata.colors
          ?.slice(0, 3)
          .map((c: any) => c.color)
          .join(', ') || 'standard colors',
        labelsSummary: metadata.labels
          ?.slice(0, 5)
          .map((l: any) => l.name)
          .join(', ') || 'UI components',
        objectCount: metadata.objects?.length || 0,
        textCount: metadata.text?.length || 0,
        faceCount: metadata.faces || 0
      };

      console.log('Metadata compressed successfully');
      return compressed;
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      throw error;
    }
  }

  /**
   * Stage 2: OpenAI Analysis with enhanced error handling
   */
  private async performOpenAIAnalysis(
    imageUrl: string,
    metadata: CompressedMetadata,
    userContext?: string
  ): Promise<{ data: any; model: string; tokenUsage: number }> {
    
    const openaiPrompt = this.createOpenAIPrompt(metadata, userContext);
    
    try {
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'OPENAI_UX_ANALYSIS',
          payload: {
            imageUrl,
            prompt: openaiPrompt,
            model: 'gpt-4o',
            maxTokens: 1500,
            temperature: 0.7
          }
        }
      });

      if (error) throw new Error(`OpenAI analysis failed: ${error.message}`);

      this.currentTokenUsage += data.tokenUsage || 1500;

      return {
        data: data.analysis,
        model: 'openai-gpt-4.1',
        tokenUsage: data.tokenUsage || 1500
      };
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      throw error;
    }
  }

  /**
   * Stage 3: Claude Synthesis with comprehensive authentication logging
   */
  private async performClaudeSynthesis(
    imageUrl: string,
    metadata: CompressedMetadata,
    openaiData: any,
    userContext?: string
  ): Promise<{ data: any; model: string; tokenUsage: number }> {
    
    console.log('=== CLAUDE AUTHENTICATION DEBUG ===');
    console.log('Claude synthesis stage starting...');
    console.log('Will check authentication in edge function...');
    
    const budget = this.tokenBudgets['claude-sonnet-4'];
    const remainingBudget = budget.stage3_comprehensive - this.currentTokenUsage;
    
    if (remainingBudget < 3000) {
      console.warn('Token budget low for Claude synthesis');
      throw new Error('Insufficient token budget for Claude synthesis');
    }

    const claudePrompt = this.createClaudePrompt(metadata, openaiData, userContext);
    console.log('Claude prompt length:', claudePrompt.length);
    
    try {
      console.log('Invoking ux-analysis edge function for Claude synthesis...');
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'CLAUDE_SYNTHESIS',
          payload: {
            imageUrl,
            prompt: claudePrompt,
            model: 'claude-opus-4-20250514',
            maxTokens: Math.min(remainingBudget - 500, 2000),
            temperature: 0.4
          }
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Claude synthesis edge function error:', error);
        throw new Error(`Claude synthesis failed: ${JSON.stringify(error)}`);
      }

      this.currentTokenUsage += data.tokenUsage || 2000;

      return {
        data: data.analysis,
        model: 'claude-sonnet-4',
        tokenUsage: data.tokenUsage || 2000
      };
    } catch (error) {
      console.error('=== CLAUDE SYNTHESIS ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Consolidate results from successful stages
   */
  private consolidateResilientResults(stages: StageResult[], imageId: string, imageName: string): any {
    const successfulStages = stages.filter(s => s.success);
    const metadata = successfulStages.find(s => s.stage === 'google_vision_metadata')?.data;
    const visionAnalysis = successfulStages.find(s => s.stage === 'vision_analysis')?.data;
    const claudeSynthesis = successfulStages.find(s => s.stage === 'claude_synthesis')?.data;

    // Build analysis based on available data with proper typing
    const baseAnalysis: any = {
      id: imageId,
      imageName,
      analysisType: 'resilient-pipeline',
      timestamp: new Date().toISOString(),
      stages: stages.map(s => ({
        stage: s.stage,
        model: s.model,
        success: s.success,
        timestamp: s.timestamp,
        error: s.error
      })),
      visualAnnotations: [],
      suggestions: [],
      summary: {}
    };

    // Progressive enhancement based on successful stages
    if (metadata) {
      Object.assign(baseAnalysis, {
        detectedElements: metadata.elements,
        textContent: metadata.textSummary,
        colorPalette: metadata.colorPalette,
        elementCounts: {
          objects: metadata.objectCount,
          text: metadata.textCount,
          faces: metadata.faceCount
        }
      });
    }

    if (visionAnalysis) {
      Object.assign(baseAnalysis, {
        layoutAnalysis: visionAnalysis.layoutAnalysis,
        usabilityFindings: visionAnalysis.usabilityFindings,
        accessibilityReview: visionAnalysis.accessibilityReview
      });
      
      baseAnalysis.visualAnnotations = this.generateAnnotationsFromAnalysis(visionAnalysis);
      baseAnalysis.suggestions = this.generateSuggestionsFromAnalysis(visionAnalysis);
    }

    if (claudeSynthesis) {
      // Merge Claude insights if available
      if (claudeSynthesis.visualAnnotations) {
        baseAnalysis.visualAnnotations = claudeSynthesis.visualAnnotations;
      }
      if (claudeSynthesis.suggestions) {
        baseAnalysis.suggestions = claudeSynthesis.suggestions;
      }
      if (claudeSynthesis.summary) {
        baseAnalysis.summary = claudeSynthesis.summary;
      }
    }

    // Ensure we always have basic structure
    if (!baseAnalysis.visualAnnotations || baseAnalysis.visualAnnotations.length === 0) {
      baseAnalysis.visualAnnotations = this.generateFallbackAnnotations();
    }
    if (!baseAnalysis.suggestions || baseAnalysis.suggestions.length === 0) {
      baseAnalysis.suggestions = this.generateFallbackSuggestions();
    }
    if (!baseAnalysis.summary || Object.keys(baseAnalysis.summary).length === 0) {
      baseAnalysis.summary = this.generateFallbackSummary(successfulStages.length);
    }

    return baseAnalysis;
  }

  private generateAnnotationsFromAnalysis(analysis: any): any[] {
    const annotations = [];
    if (analysis.usabilityFindings?.issues) {
      analysis.usabilityFindings.issues.forEach((issue: any, index: number) => {
        annotations.push({
          id: `issue_${index}`,
          x: 25 + (index * 15),
          y: 20 + (index * 10),
          type: 'issue',
          title: issue.type || 'Usability Issue',
          description: issue.description || 'Requires review',
          severity: issue.severity || 'medium'
        });
      });
    }
    return annotations;
  }

  private generateSuggestionsFromAnalysis(analysis: any): any[] {
    const suggestions = [];
    if (analysis.accessibilityReview?.recommendations) {
      analysis.accessibilityReview.recommendations.forEach((rec: string, index: number) => {
        suggestions.push({
          id: `suggestion_${index}`,
          category: 'accessibility',
          title: 'Accessibility Improvement',
          description: rec,
          impact: 'medium',
          effort: 'low',
          actionItems: [rec]
        });
      });
    }
    return suggestions;
  }

  private generateFallbackAnnotations(): any[] {
    return [{
      id: 'fallback_1',
      x: 50,
      y: 30,
      type: 'info',
      title: 'Analysis Incomplete',
      description: 'Some analysis stages failed. Manual review recommended.',
      severity: 'medium'
    }];
  }

  private generateFallbackSuggestions(): any[] {
    return [{
      id: 'fallback_suggestion',
      category: 'general',
      title: 'Complete Analysis',
      description: 'Re-run analysis when services are available for comprehensive insights.',
      impact: 'high',
      effort: 'low',
      actionItems: ['Retry analysis', 'Manual review']
    }];
  }

  private generateFallbackSummary(successfulStages: number): any {
    return {
      overallScore: successfulStages >= 2 ? 65 : successfulStages >= 1 ? 45 : 25,
      keyIssues: ['Incomplete analysis', 'Service limitations'],
      strengths: successfulStages > 0 ? ['Partial data available'] : ['Interface detected'],
      confidence: successfulStages >= 2 ? 'medium' : 'low',
      completeness: `${successfulStages}/3 stages completed`
    };
  }

  /**
   * Store resilient analysis with quality indicators
   */
  private async storeResilientAnalysis(
    imageId: string, 
    analysis: any, 
    stages: StageResult[], 
    userContext: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ux_analyses')
        .insert({
          image_id: imageId,
          user_context: userContext,
          visual_annotations: analysis.visualAnnotations || [],
          suggestions: analysis.suggestions || [],
          summary: analysis.summary || {},
          metadata: {
            ...analysis,
            pipeline_type: 'resilient',
            pipeline_stages: stages,
            successful_stages: stages.filter(s => s.success).length,
            total_stages: stages.length,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Failed to store analysis:', error);
        throw error;
      }

      console.log('Resilient analysis stored successfully');
    } catch (error) {
      console.error('Storage failed:', error);
      // Don't throw - analysis was successful even if storage failed
    }
  }

  // Helper methods
  private compressTextData(textArray: string[]): string {
    if (!textArray || textArray.length === 0) return 'no text detected';
    
    const significantText = textArray
      .slice(0, 5)
      .filter(text => text.length > 2)
      .map(text => text.slice(0, 20))
      .join(', ');
    
    return significantText || 'minimal text content';
  }

  private createOpenAIPrompt(metadata: CompressedMetadata, userContext?: string): string {
    const contextSummary = userContext ? 
      userContext.slice(0, 300) + (userContext.length > 300 ? '...' : '') : '';

    return `Analyze this UI/UX design based on the visual metadata.

Visual Elements: ${metadata.elements}
Text Content: ${metadata.textSummary}
Color Palette: ${metadata.colorPalette}
UI Components: ${metadata.labelsSummary}
${contextSummary ? `User Focus: ${contextSummary}` : ''}

Provide structured JSON analysis:
{
  "layoutAnalysis": {
    "type": "grid|flex|absolute|responsive",
    "hierarchy": "description of visual hierarchy",
    "components": ["component1", "component2"],
    "patterns": ["pattern1", "pattern2"]
  },
  "usabilityFindings": {
    "issues": [{"type": "navigation|contrast|sizing", "description": "issue", "severity": "low|medium|high"}],
    "strengths": ["strength1", "strength2"]
  },
  "accessibilityReview": {
    "concerns": ["concern1", "concern2"],
    "recommendations": ["rec1", "rec2"]
  }
}`;
  }

  private createClaudePrompt(metadata: CompressedMetadata, openaiData: any, userContext?: string): string {
    const contextSummary = userContext ? 
      userContext.slice(0, 200) + (userContext.length > 200 ? '...' : '') : '';

    return `Final synthesis stage of resilient UX analysis pipeline.

CONTEXT:
- Elements: ${metadata.elements}
- OpenAI found: ${openaiData?.layoutAnalysis?.type || 'standard'} layout
- Issues: ${JSON.stringify(openaiData?.usabilityFindings?.issues || []).slice(0, 200)}
${contextSummary ? `User Focus: ${contextSummary}` : ''}

Provide final analysis JSON:
{
  "visualAnnotations": [
    {
      "id": "unique_id",
      "x": 50,
      "y": 30,
      "type": "issue|suggestion|success",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "low|medium|high"
    }
  ],
  "suggestions": [
    {
      "id": "unique_id",
      "category": "usability|accessibility|design",
      "title": "Suggestion title",
      "description": "Detailed recommendation",
      "impact": "low|medium|high",
      "effort": "low|medium|high",
      "actionItems": ["actionable step"]
    }
  ],
  "summary": {
    "overallScore": 75,
    "keyIssues": ["issue1", "issue2"],
    "strengths": ["strength1", "strength2"],
    "recommendations": ["rec1", "rec2"]
  }
}`;
  }

  private updateProgress(
    stage: string, 
    progress: number, 
    message: string, 
    successfulStages: number, 
    totalStages: number, 
    qualityScore: number
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress,
        message,
        successfulStages,
        totalStages,
        qualityScore,
        tokenBudget: {
          used: this.currentTokenUsage,
          remaining: 30000 - this.currentTokenUsage
        }
      });
    }
  }

  reset(): void {
    this.currentTokenUsage = 0;
    this.circuitBreakers.clear();
  }

  getTokenStats(): { used: number; budget: number; efficiency: number } {
    const budget = 30000;
    return {
      used: this.currentTokenUsage,
      budget,
      efficiency: Math.round((1 - this.currentTokenUsage / budget) * 100)
    };
  }
}

// Export singleton instance
export const resilientPipeline = new ResilientAnalysisPipeline();
