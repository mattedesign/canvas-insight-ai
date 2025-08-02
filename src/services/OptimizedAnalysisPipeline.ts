import { supabase } from '@/integrations/supabase/client';
import { ArrayNumericSafety } from '@/utils/ArrayNumericSafety';
import { PipelineConsolidationSafety } from '@/services/PipelineConsolidationSafety';

/**
 * Optimized Multi-Stage Analysis Pipeline Service
 * Sequential Model Processing: Google Vision → OpenAI → Claude
 * Each stage builds upon previous outputs for compounded insights
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
}

interface PipelineProgress {
  stage: string;
  progress: number;
  message: string;
  tokenBudget?: { used: number; remaining: number };
}

export class OptimizedAnalysisPipeline {
  private tokenBudgets: Record<string, TokenBudget> = {
    'claude-opus-4-20250514': {
      stage1_metadata: 2000,
      stage2_vision: 8000,
      stage3_comprehensive: 15000,
      buffer: 5000
    },
    'gpt-4o': {
      stage1_metadata: 3000,
      stage2_vision: 10000,
      stage3_comprehensive: 20000,
      buffer: 7000
    }
  };

  private currentTokenUsage = 0;
  private progressCallback?: (progress: PipelineProgress) => void;
  private arraySafety = ArrayNumericSafety.getInstance();
  private consolidationSafety = PipelineConsolidationSafety.getInstance();

  constructor(onProgress?: (progress: PipelineProgress) => void) {
    this.progressCallback = onProgress;
  }

  /**
   * Execute optimized multi-stage analysis pipeline
   */
  async executeOptimizedPipeline(
    imageUrl: string,
    imageName: string,
    imageId: string,
    userContext?: string
  ): Promise<{ success: boolean; data?: any; error?: string; stages: StageResult[]; warnings?: string[]; fallbacksApplied?: string[] }> {
    const stages: StageResult[] = [];
    
    try {
      this.updateProgress('initializing', 0, 'Initializing optimized analysis pipeline');

      // Stage 1: Google Vision - Extract Metadata
      this.updateProgress('google-vision', 15, 'Google Vision: Extracting visual metadata');
      const metadataResult = await this.extractCompressedMetadata(imageUrl);
      stages.push({
        stage: 'google_vision_metadata',
        model: 'google-vision',
        success: true,
        timestamp: new Date().toISOString(),
        data: metadataResult,
        compressed: true
      });

      // Stage 2: OpenAI - Initial UX Analysis
      this.updateProgress('openai-analysis', 40, 'OpenAI: Performing initial UX analysis');
      const openaiResult = await this.performOpenAIAnalysis(
        imageUrl, 
        metadataResult, 
        userContext
      );
      stages.push({
        stage: 'openai_ux_analysis',
        model: 'gpt-4o',
        success: true,
        timestamp: new Date().toISOString(),
        data: openaiResult.data,
        tokenUsage: openaiResult.tokenUsage
      });

      // Stage 3: Claude - Synthesis & Final Analysis
      this.updateProgress('claude-synthesis', 70, 'Claude: Synthesizing comprehensive insights');
      const claudeResult = await this.performClaudeSynthesis(
        imageUrl,
        metadataResult,
        openaiResult.data,
        userContext
      );
      stages.push({
        stage: 'claude_synthesis',
        model: 'claude-opus-4-20250514',
        success: true,
        timestamp: new Date().toISOString(),
        data: claudeResult.data,
        tokenUsage: claudeResult.tokenUsage
      });

      // Stage 4: Enhanced Data Consolidation with Safety
      this.updateProgress('consolidation', 90, 'Safely consolidating results and preparing for storage');
      const consolidationResult = this.consolidationSafety.safeConsolidateResults(stages, imageId, imageName);

      if (!consolidationResult.success) {
        throw new Error(`Consolidation failed: ${consolidationResult.errors.join(', ')}`);
      }

      const finalAnalysis = consolidationResult.data;

      // Log consolidation warnings and fallbacks
      if (consolidationResult.warnings.length > 0) {
        console.warn('[OptimizedAnalysisPipeline] Consolidation warnings:', consolidationResult.warnings);
      }
      
      if (consolidationResult.fallbacksApplied.length > 0) {
        console.warn('[OptimizedAnalysisPipeline] Fallbacks applied:', consolidationResult.fallbacksApplied);
      }

      // Store optimized analysis with enhanced safety
      await this.storeOptimizedAnalysis(imageId, finalAnalysis, stages, userContext || '');

      this.updateProgress('complete', 100, 'Analysis pipeline completed successfully');
      
      return {
        success: true,
        data: finalAnalysis,
        warnings: consolidationResult.warnings,
        fallbacksApplied: consolidationResult.fallbacksApplied,
        stages
      };

    } catch (error) {
      console.error('Optimized pipeline failed:', error);
      
      // Add error stage
      stages.push({
        stage: 'error',
        model: 'pipeline',
        success: false,
        timestamp: new Date().toISOString(),
        data: { error: error.message }
      });

      return {
        success: false,
        error: error.message,
        stages
      };
    }
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
      
      // Compress metadata to essential information only
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

      console.log('Metadata compressed from', JSON.stringify(metadata).length, 'to', JSON.stringify(compressed).length, 'characters');
      
      return compressed;
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      throw new Error(`Metadata extraction failed: ${error.message}. Ensure Google Vision API key is configured.`);
    }
  }

  /**
   * Stage 2: OpenAI Analysis - Initial UX Analysis with Vision Context
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
        model: 'gpt-4o',
        tokenUsage: data.tokenUsage || 1500
      };
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      throw new Error(`OpenAI analysis failed: ${error.message}. Ensure OpenAI API key is configured.`);
    }
  }

  /**
   * Stage 3: Claude Synthesis - Final Analysis with Previous Context
   */
  private async performClaudeSynthesis(
    imageUrl: string,
    metadata: CompressedMetadata,
    openaiData: any,
    userContext?: string
  ): Promise<{ data: any; model: string; tokenUsage: number }> {
    
    const budget = this.tokenBudgets['claude-opus-4-20250514'];
    const remainingBudget = budget.stage3_comprehensive - this.currentTokenUsage;
    
    if (remainingBudget < 3000) {
      throw new Error('Token budget insufficient for Claude synthesis. Increase token allocation or reduce earlier stage usage.');
    }

    const claudePrompt = this.createClaudePrompt(metadata, openaiData, userContext);
    
    try {
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

      if (error) throw new Error(`Claude synthesis failed: ${error.message}`);

      this.currentTokenUsage += data.tokenUsage || 2000;

      return {
        data: data.analysis,
        model: 'claude-opus-4-20250514',
        tokenUsage: data.tokenUsage || 2000
      };
    } catch (error) {
      console.error('Claude synthesis failed:', error);
      throw new Error(`Claude synthesis failed: ${error.message}. Ensure Claude API key is configured.`);
    }
  }

  /**
   * Perform comprehensive analysis with strict token management
   */
  private async performTokenManagedAnalysis(
    imageUrl: string,
    metadata: CompressedMetadata,
    visionData: any,
    userContext?: string
  ): Promise<{ data: any; model: string; tokenUsage: number }> {
    
    // Calculate remaining token budget
    const budget = this.tokenBudgets['claude-opus-4-20250514'];
    const remainingBudget = budget.stage3_comprehensive - this.currentTokenUsage;
    
    if (remainingBudget < 5000) {
      throw new Error('Token budget insufficient for comprehensive analysis. Increase token allocation.');
    }

    // Create token-optimized prompt
    const optimizedPrompt = this.createTokenOptimizedPrompt(metadata, visionData, remainingBudget, userContext);
    
    try {
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'TOKEN_MANAGED_COMPREHENSIVE',
          payload: {
            imageUrl,
            prompt: optimizedPrompt,
            maxTokens: Math.min(remainingBudget - 1000, 2000), // Leave buffer
            temperature: 0.3 // More focused responses
          }
        }
      });

      if (error) throw new Error(`Comprehensive analysis failed: ${error.message}`);

      return {
        data: data.analysis,
        model: data.model || 'claude-opus-4-20250514',
        tokenUsage: data.tokenUsage || 2000
      };
    } catch (error) {
      console.error('Token-managed analysis failed:', error);
      throw new Error(`Token-managed analysis failed: ${error.message}`);
    }
  }

  /**
   * Create optimized vision prompt that stays within token limits
   */
  private createOptimizedVisionPrompt(metadata: CompressedMetadata, userContext?: string): string {
    const contextSummary = userContext ? 
      userContext.slice(0, 200) + (userContext.length > 200 ? '...' : '') : '';

    return `Analyze this UI interface focusing on layout and components.

Context: ${metadata.elements} | ${metadata.textSummary} | ${metadata.colorPalette}
${contextSummary ? `User Focus: ${contextSummary}` : ''}

Return JSON:
{
  "layoutType": "grid|flex|absolute",
  "components": ["nav", "content", "sidebar"],
  "hierarchy": "header > main > footer",
  "concerns": ["contrast", "navigation"],
  "patterns": ["responsive", "accessible"]
}`;
  }

  /**
   * Create token-optimized comprehensive prompt
   */
  private createTokenOptimizedPrompt(
    metadata: CompressedMetadata, 
    visionData: any, 
    tokenBudget: number,
    userContext?: string
  ): string {
    const isLowBudget = tokenBudget < 8000;
    
    if (isLowBudget) {
      throw new Error('Token budget too low for meaningful analysis. Increase allocation.');
    }

    return `UX Analysis for ${visionData.layoutType || 'interface'} layout.

Elements: ${metadata.elements}
Layout: ${visionData.hierarchy || 'standard'}
Concerns: ${Array.isArray(visionData.concerns) ? visionData.concerns.join(', ') : 'general review'}

Provide UX analysis JSON:
{
  "visualAnnotations": [{"id": "a1", "x": 50, "y": 20, "type": "issue", "title": "Issue", "description": "Detail", "severity": "medium"}],
  "suggestions": [{"id": "s1", "category": "usability", "title": "Improve", "description": "Detail", "impact": "high", "effort": "low", "actionItems": ["action"]}],
  "summary": {"overallScore": 75, "keyIssues": ["issue"], "strengths": ["strength"]}
}`;
  }

  /**
   * Create compressed prompt for low token budgets
   */
  private createCompressedPrompt(metadata: CompressedMetadata, visionData: any): string {
    return `Analyze ${visionData.layoutType || 'interface'}: ${metadata.elements}

JSON format:
{
  "visualAnnotations": [{"id": "a1", "x": 50, "y": 20, "type": "issue", "title": "Review needed", "severity": "medium"}],
  "suggestions": [{"id": "s1", "category": "usability", "title": "Improve usability", "impact": "medium", "effort": "low"}],
  "summary": {"overallScore": 75, "keyIssues": ["needs review"], "strengths": ["functional"]}
}`;
  }

  /**
   * Compress text data to essential information
   */
  private compressTextData(textArray: string[]): string {
    if (!textArray || textArray.length === 0) return 'no text detected';
    
    // Take first few text elements and summarize
    const significantText = textArray
      .slice(0, 5)
      .filter(text => text.length > 2)
      .map(text => text.slice(0, 20))
      .join(', ');
    
    return significantText || 'minimal text content';
  }

  /**
   * Create OpenAI analysis prompt
   */
  private createOpenAIPrompt(metadata: CompressedMetadata, userContext?: string): string {
    const contextSummary = userContext ? 
      userContext.slice(0, 300) + (userContext.length > 300 ? '...' : '') : '';

    return `Analyze this UI/UX design based on the visual metadata extracted by Google Vision.

Visual Elements Detected: ${metadata.elements}
Text Content: ${metadata.textSummary}
Color Palette: ${metadata.colorPalette}
UI Components: ${metadata.labelsSummary}
${contextSummary ? `User Focus: ${contextSummary}` : ''}

Please provide a comprehensive UX analysis identifying:
1. Visual hierarchy and layout patterns
2. Usability issues and accessibility concerns  
3. Design consistency and component relationships
4. User flow and interaction points

Return structured JSON with:
{
  "layoutAnalysis": {
    "type": "grid|flex|absolute|responsive",
    "hierarchy": "description of visual hierarchy",
    "components": ["component1", "component2"],
    "patterns": ["pattern1", "pattern2"]
  },
  "usabilityFindings": {
    "issues": [{"type": "navigation|contrast|sizing", "description": "issue description", "severity": "low|medium|high"}],
    "strengths": ["strength1", "strength2"]
  },
  "accessibilityReview": {
    "concerns": ["concern1", "concern2"],
    "recommendations": ["rec1", "rec2"]
  }
}`;
  }

  /**
   * Create Claude synthesis prompt that builds on OpenAI analysis
   */
  private createClaudePrompt(metadata: CompressedMetadata, openaiData: any, userContext?: string): string {
    const contextSummary = userContext ? 
      userContext.slice(0, 200) + (userContext.length > 200 ? '...' : '') : '';

    return `You are conducting the final synthesis stage of a multi-model UX analysis pipeline.

CONTEXT:
- Google Vision provided: ${metadata.elements} | ${metadata.textSummary} | ${metadata.colorPalette}
- OpenAI Analysis identified: 
  Layout: ${openaiData.layoutAnalysis?.type || 'standard'} with ${openaiData.layoutAnalysis?.hierarchy || 'standard hierarchy'}
  Key Issues: ${JSON.stringify(openaiData.usabilityFindings?.issues || []).slice(0, 200)}
  Strengths: ${JSON.stringify(openaiData.usabilityFindings?.strengths || []).slice(0, 150)}
${contextSummary ? `User Focus: ${contextSummary}` : ''}

SYNTHESIS TASK:
Integrate the previous analysis into actionable UX recommendations. Provide the final analysis in this exact JSON format:

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
      "category": "usability|accessibility|visual|content|performance",
      "title": "Suggestion title",
      "description": "Detailed description",
      "impact": "low|medium|high",
      "effort": "low|medium|high",
      "actionItems": ["specific action 1", "specific action 2"]
    }
  ],
  "summary": {
    "overallScore": 85,
    "categoryScores": {
      "usability": 80,
      "accessibility": 75,
      "visual": 90,
      "content": 85
    },
    "keyIssues": ["issue 1", "issue 2"],
    "strengths": ["strength 1", "strength 2"]
  }
}`;
  }


  /**
   * Consolidate all stage results into final analysis
   */
  private consolidateOptimizedResults(stages: StageResult[], imageId: string, imageName: string): any {
    // Claude synthesis is the primary result (final stage)
    const claudeStage = stages.find(s => s.stage === 'claude_synthesis');
    const openaiStage = stages.find(s => s.stage === 'openai_ux_analysis');
    const metadataStage = stages.find(s => s.stage === 'google_vision_metadata');

    // Use Claude's synthesis as the primary result
    if (!claudeStage?.data) {
      throw new Error('Claude synthesis stage failed - no valid analysis data available');
    }
    const finalAnalysis = claudeStage.data;

    // Add comprehensive metadata showing the full pipeline journey
    finalAnalysis.metadata = {
      ...finalAnalysis.metadata,
      // Google Vision metadata
      googleVisionData: metadataStage?.data,
      // OpenAI analysis
      openaiAnalysis: openaiStage?.data,
      // Claude synthesis (final result)
      claudeSynthesis: claudeStage?.data,
      // Pipeline information
      pipelineOptimized: true,
      pipelineModel: 'Google Vision → GPT 4o → Claude Opus 4',
      totalTokenUsage: stages.reduce((sum, stage) => sum + (stage.tokenUsage || 0), 0),
      stages: stages.map(s => ({
        stage: s.stage,
        model: s.model,
        success: s.success,
        compressed: s.compressed,
        timestamp: s.timestamp
      }))
    };

    return finalAnalysis;
  }


  /**
   * Phase 4: Enhanced Storage with Safe Property Access
   */
  private async storeOptimizedAnalysis(
    imageId: string, 
    analysis: any, 
    stages: StageResult[], 
    userContext = ''
  ): Promise<void> {
    try {
      // Phase 4: Safe property extraction for storage
      const storageData = {
        image_id: imageId,
        user_context: userContext || '',
        visual_annotations: this.arraySafety.safeGetProperty(analysis, 'visualAnnotations', [], 'storage-annotations'),
        suggestions: this.arraySafety.safeGetProperty(analysis, 'suggestions', [], 'storage-suggestions'),
        summary: this.arraySafety.safeGetProperty(analysis, 'summary', {}, 'storage-summary'),
        metadata: this.arraySafety.safeGetProperty(analysis, 'metadata', {}, 'storage-metadata')
      };

      const { error } = await supabase
        .from('ux_analyses')
        .insert(storageData);

      if (error) throw error;
      
      console.log('Optimized analysis stored successfully');
    } catch (error) {
      console.error('Failed to store optimized analysis:', error);
      throw error;
    }
  }

  /**
   * Update progress callback
   */
  private updateProgress(stage: string, progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress,
        message,
        tokenBudget: {
          used: this.currentTokenUsage,
          remaining: 30000 - this.currentTokenUsage
        }
      });
    }
  }

  /**
   * Reset pipeline state for new analysis
   */
  public reset(): void {
    this.currentTokenUsage = 0;
  }

  /**
   * Get token usage statistics
   */
  public getTokenStats(): { used: number; budget: number; efficiency: number } {
    const budget = 30000; // Standard budget
    return {
      used: this.currentTokenUsage,
      budget,
      efficiency: Math.round(((budget - this.currentTokenUsage) / budget) * 100)
    };
  }
}

export const optimizedPipeline = new OptimizedAnalysisPipeline();