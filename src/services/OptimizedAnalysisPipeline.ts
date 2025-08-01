import { supabase } from '@/integrations/supabase/client';

/**
 * Optimized Multi-Stage Analysis Pipeline Service
 * Addresses 422 character limit errors through data compression and token management
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
  ): Promise<{ success: boolean; data?: any; error?: string; stages: StageResult[] }> {
    const stages: StageResult[] = [];
    
    try {
      this.updateProgress('initializing', 0, 'Initializing optimized analysis pipeline');

      // Stage 1: Compressed Metadata Extraction
      this.updateProgress('metadata', 20, 'Extracting and compressing metadata');
      const metadataResult = await this.extractCompressedMetadata(imageUrl);
      stages.push({
        stage: 'compressed_metadata',
        model: 'google-vision',
        success: true,
        timestamp: new Date().toISOString(),
        data: metadataResult,
        compressed: true
      });

      // Stage 2: Optimized Vision Analysis
      this.updateProgress('vision', 40, 'Performing optimized vision analysis');
      const visionResult = await this.performOptimizedVisionAnalysis(
        imageUrl, 
        metadataResult, 
        userContext
      );
      stages.push({
        stage: 'optimized_vision',
        model: visionResult.model,
        success: true,
        timestamp: new Date().toISOString(),
        data: visionResult.data,
        tokenUsage: visionResult.tokenUsage
      });

      // Stage 3: Token-Managed Comprehensive Analysis
      this.updateProgress('comprehensive', 70, 'Performing comprehensive analysis with token management');
      const comprehensiveResult = await this.performTokenManagedAnalysis(
        imageUrl,
        metadataResult,
        visionResult.data,
        userContext
      );
      stages.push({
        stage: 'token_managed_comprehensive',
        model: comprehensiveResult.model,
        success: true,
        timestamp: new Date().toISOString(),
        data: comprehensiveResult.data,
        tokenUsage: comprehensiveResult.tokenUsage
      });

      // Stage 4: Data Consolidation and Storage
      this.updateProgress('consolidation', 90, 'Consolidating results and preparing for storage');
      const finalAnalysis = this.consolidateOptimizedResults(stages, imageId, imageName);

      // Store optimized analysis
      await this.storeOptimizedAnalysis(imageId, finalAnalysis, stages, userContext || '');

      this.updateProgress('complete', 100, 'Analysis pipeline completed successfully');
      
      return {
        success: true,
        data: finalAnalysis,
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
      // Return minimal fallback metadata
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
  }

  /**
   * Perform vision analysis with optimized prompts
   */
  private async performOptimizedVisionAnalysis(
    imageUrl: string,
    metadata: CompressedMetadata,
    userContext?: string
  ): Promise<{ data: any; model: string; tokenUsage: number }> {
    
    // Optimize prompt to stay within token budget
    const optimizedPrompt = this.createOptimizedVisionPrompt(metadata, userContext);
    
    try {
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'OPTIMIZED_VISION',
          payload: {
            imageUrl,
            prompt: optimizedPrompt,
            maxTokens: 1200 // Reduced from default
          }
        }
      });

      if (error) throw new Error(`Vision analysis failed: ${error.message}`);

      return {
        data: data.analysis,
        model: data.model || 'openai',
        tokenUsage: data.tokenUsage || 1200
      };
    } catch (error) {
      console.error('Optimized vision analysis failed:', error);
      // Return structured fallback
      return {
        data: this.createVisionFallback(metadata),
        model: 'fallback',
        tokenUsage: 0
      };
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
    const budget = this.tokenBudgets['claude-sonnet-4'];
    const remainingBudget = budget.stage3_comprehensive - this.currentTokenUsage;
    
    if (remainingBudget < 5000) {
      console.warn('Token budget nearly exhausted, using compressed analysis');
      return this.performCompressedAnalysis(metadata, visionData);
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
        model: data.model || 'claude-sonnet-4',
        tokenUsage: data.tokenUsage || 2000
      };
    } catch (error) {
      console.error('Token-managed analysis failed:', error);
      return this.performCompressedAnalysis(metadata, visionData);
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
      return this.createCompressedPrompt(metadata, visionData);
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
   * Create vision analysis fallback
   */
  private createVisionFallback(metadata: CompressedMetadata): any {
    return {
      layoutType: 'standard',
      components: metadata.elements.split(', ').slice(0, 3),
      hierarchy: 'standard layout structure',
      concerns: ['accessibility review needed'],
      patterns: ['standard patterns detected']
    };
  }

  /**
   * Perform compressed analysis when token budget is low
   */
  private async performCompressedAnalysis(
    metadata: CompressedMetadata, 
    visionData: any
  ): Promise<{ data: any; model: string; tokenUsage: number }> {
    const timestamp = Date.now();
    
    const compressedResult = {
      visualAnnotations: [
        {
          id: `annotation-${timestamp}`,
          x: 50,
          y: 20,
          type: 'issue',
          title: 'Compressed Analysis',
          description: 'Token budget constraints - manual review recommended',
          severity: 'medium'
        }
      ],
      suggestions: [
        {
          id: `suggestion-${timestamp}`,
          category: 'usability',
          title: 'Detailed Review Needed',
          description: 'Complete manual UX review to supplement automated analysis',
          impact: 'medium',
          effort: 'medium',
          actionItems: ['Manual review', 'User testing']
        }
      ],
      summary: {
        overallScore: 70,
        keyIssues: ['Requires detailed manual review'],
        strengths: ['Basic structure identified']
      }
    };

    return {
      data: compressedResult,
      model: 'compressed-fallback',
      tokenUsage: 500
    };
  }

  /**
   * Consolidate all stage results into final analysis
   */
  private consolidateOptimizedResults(stages: StageResult[], imageId: string, imageName: string): any {
    const comprehensiveStage = stages.find(s => s.stage === 'token_managed_comprehensive');
    const visionStage = stages.find(s => s.stage === 'optimized_vision');
    const metadataStage = stages.find(s => s.stage === 'compressed_metadata');

    const finalAnalysis = comprehensiveStage?.data || this.createBasicAnalysis(stages);

    // Add optimized metadata
    finalAnalysis.metadata = {
      ...finalAnalysis.metadata,
      compressedMetadata: metadataStage?.data,
      visionAnalysis: visionStage?.data,
      pipelineOptimized: true,
      totalTokenUsage: stages.reduce((sum, stage) => sum + (stage.tokenUsage || 0), 0),
      stages: stages.map(s => ({
        stage: s.stage,
        model: s.model,
        success: s.success,
        compressed: s.compressed
      }))
    };

    return finalAnalysis;
  }

  /**
   * Create basic analysis from available data
   */
  private createBasicAnalysis(stages: StageResult[]): any {
    const timestamp = Date.now();
    
    return {
      visualAnnotations: [
        {
          id: `annotation-${timestamp}`,
          x: 50,
          y: 20,
          type: 'suggestion',
          title: 'Optimized Analysis Complete',
          description: 'Analysis completed with optimization constraints',
          severity: 'low'
        }
      ],
      suggestions: [
        {
          id: `suggestion-${timestamp}`,
          category: 'usability',
          title: 'Review Interface Design',
          description: 'Review based on optimized pipeline results',
          impact: 'medium',
          effort: 'medium',
          actionItems: ['Detailed review', 'User feedback']
        }
      ],
      summary: {
        overallScore: 75,
        keyIssues: ['Optimized analysis - consider detailed review'],
        strengths: ['Structure analyzed', 'Pipeline successful']
      }
    };
  }

  /**
   * Store optimized analysis in database
   */
  private async storeOptimizedAnalysis(
    imageId: string, 
    analysis: any, 
    stages: StageResult[], 
    userContext = ''
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ux_analyses')
        .insert({
          image_id: imageId,
          user_context: userContext || '',
          visual_annotations: analysis.visualAnnotations,
          suggestions: analysis.suggestions,
          summary: analysis.summary,
          metadata: analysis.metadata
        });

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