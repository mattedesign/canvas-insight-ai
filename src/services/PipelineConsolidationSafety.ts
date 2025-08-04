/**
 * Phase 4: Pipeline Consolidation Safety
 * Enhanced safety for stage processing and result consolidation
 */

import { ArrayNumericSafety } from '@/utils/ArrayNumericSafety';
import { ValidationService } from '@/services/ValidationService';

export interface StageResult {
  stage: string;
  success: boolean;
  data?: any;
  error?: Error;
  metrics?: {
    startTime: number;
    endTime: number;
    tokensUsed?: number;
  };
  model?: string;
  timestamp?: string;
  tokenUsage?: number;
  compressed?: boolean;
}

export interface ConsolidationConfig {
  requireMinimumStages: boolean;
  allowPartialResults: boolean;
  enforceStageOrder: boolean;
  logMissingStages: boolean;
}

export interface ConsolidationResult {
  success: boolean;
  data?: any;
  warnings: string[];
  errors: string[];
  usedStages: string[];
  fallbacksApplied: string[];
}

export class PipelineConsolidationSafety {
  private static instance: PipelineConsolidationSafety;
  private arraySafety: ArrayNumericSafety;
  private validationService: ValidationService;
  
  private defaultConfig: ConsolidationConfig = {
    requireMinimumStages: true,
    allowPartialResults: true,
    enforceStageOrder: false,
    logMissingStages: process.env.NODE_ENV === 'development'
  };

  private constructor() {
    this.arraySafety = ArrayNumericSafety.getInstance();
    this.validationService = ValidationService.getInstance();
  }

  static getInstance(): PipelineConsolidationSafety {
    if (!PipelineConsolidationSafety.instance) {
      PipelineConsolidationSafety.instance = new PipelineConsolidationSafety();
    }
    return PipelineConsolidationSafety.instance;
  }

  /**
   * Phase 4: Safe Stage Result Processing
   */
  safeConsolidateResults(
    stages: any,
    imageId: string,
    imageName: string,
    config: Partial<ConsolidationConfig> = {}
  ): ConsolidationResult {
    const finalConfig = { ...this.defaultConfig, ...config };
    const warnings: string[] = [];
    const errors: string[] = [];
    const usedStages: string[] = [];
    const fallbacksApplied: string[] = [];

    try {
      // Phase 4: Validate stages input
      if (!this.arraySafety.isValidArray(stages, 'consolidateResults')) {
        errors.push('Invalid stages input - expected array');
        return this.createFailureResult(errors, warnings, usedStages, fallbacksApplied);
      }

      if (stages.length === 0) {
        errors.push('No stages provided for consolidation');
        return this.createFailureResult(errors, warnings, usedStages, fallbacksApplied);
      }

      // Phase 4: Safe stage extraction with fallbacks
      const stageData = this.extractStageData(stages, warnings, errors, usedStages, fallbacksApplied);
      
      // Phase 4: Build final analysis with safe property access
      const finalAnalysis = this.buildFinalAnalysis(stageData, imageId, imageName, warnings, fallbacksApplied);

      // Phase 4: Validate final result
      // Skip validation if this is a natural analysis result (already validated by edge function)
      const validation = this.validationService.validateAnalysisResult(finalAnalysis);
      if (!validation.isValid) {
        warnings.push(`Final analysis validation warnings: ${validation.warnings.map(w => w.message).join(', ')}`);
        
        if (validation.fixedData) {
          warnings.push('Applied validation fixes to final analysis');
          return {
            success: true,
            data: validation.fixedData,
            warnings,
            errors,
            usedStages,
            fallbacksApplied
          };
        }
      }

      return {
        success: true,
        data: finalAnalysis,
        warnings,
        errors,
        usedStages,
        fallbacksApplied
      };

    } catch (error) {
      errors.push(`Consolidation failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.createFailureResult(errors, warnings, usedStages, fallbacksApplied);
    }
  }

  /**
   * Phase 4: Safe Stage Data Extraction
   */
  private extractStageData(
    stages: StageResult[],
    warnings: string[],
    errors: string[],
    usedStages: string[],
    fallbacksApplied: string[]
  ): {
    claude?: any;
    openai?: any;
    metadata?: any;
    vision?: any;
    synthesis?: any;
  } {
    const stageData: any = {};

    // Phase 4: Safe stage finding with null checks
    const claudeStage = this.arraySafety.safeFind(
      stages,
      (s: StageResult) => s.stage === 'claude_synthesis' || s.stage === 'synthesis',
      null,
      'claude-stage-search'
    );

    const openaiStage = this.arraySafety.safeFind(
      stages,
      (s: StageResult) => s.stage === 'openai_ux_analysis' || s.stage === 'analysis',
      null,
      'openai-stage-search'
    );

    const metadataStage = this.arraySafety.safeFind(
      stages,
      (s: StageResult) => s.stage === 'google_vision_metadata' || s.stage === 'vision',
      null,
      'metadata-stage-search'
    );

    // Phase 4: Extract data with comprehensive null checks
    if (claudeStage && this.isValidStageResult(claudeStage)) {
      stageData.claude = this.safeExtractStageData(claudeStage, 'claude');
      usedStages.push('claude_synthesis');
    } else {
      warnings.push('Claude synthesis stage missing or invalid');
      fallbacksApplied.push('Claude synthesis fallback');
    }

    if (openaiStage && this.isValidStageResult(openaiStage)) {
      stageData.openai = this.safeExtractStageData(openaiStage, 'openai');
      usedStages.push('openai_analysis');
    } else {
      warnings.push('OpenAI analysis stage missing or invalid');
      fallbacksApplied.push('OpenAI analysis fallback');
    }

    if (metadataStage && this.isValidStageResult(metadataStage)) {
      stageData.metadata = this.safeExtractStageData(metadataStage, 'metadata');
      usedStages.push('google_vision_metadata');
    } else {
      warnings.push('Google Vision metadata stage missing or invalid');
      fallbacksApplied.push('Metadata fallback');
    }

    return stageData;
  }

  /**
   * Phase 4: Safe Stage Result Validation
   */
  private isValidStageResult(stage: any): stage is StageResult {
    if (!stage || typeof stage !== 'object') {
      return false;
    }

    if (!stage.success) {
      return false;
    }

    if (!stage.data || typeof stage.data !== 'object') {
      return false;
    }

    return true;
  }

  /**
   * Phase 4: Safe Stage Data Extraction
   */
  private safeExtractStageData(stage: StageResult, context: string): any {
    if (!stage.data) {
      this.validationService.debugLog(`No data in ${context} stage`);
      return {};
    }

    try {
      // Create a safe copy of the data
      return JSON.parse(JSON.stringify(stage.data));
    } catch (error) {
      this.validationService.debugLog(`Failed to copy ${context} stage data:`, error);
      return stage.data; // Return original if copy fails
    }
  }

  /**
   * Phase 4: Safe Final Analysis Construction
   */
  private buildFinalAnalysis(
    stageData: any,
    imageId: string,
    imageName: string,
    warnings: string[],
    fallbacksApplied: string[]
  ): any {
    // Phase 4: Use primary stage data (Claude) as base, with fallbacks
    let baseAnalysis = stageData.claude;
    
    if (!baseAnalysis || Object.keys(baseAnalysis).length === 0) {
      baseAnalysis = stageData.openai;
      fallbacksApplied.push('Used OpenAI analysis as primary source');
    }

    if (!baseAnalysis || Object.keys(baseAnalysis).length === 0) {
      throw new Error('No valid analysis data available from any pipeline stage');
    }

    // Phase 4: Safe property merging
    const finalAnalysis = {
      ...baseAnalysis,
      imageId,
      imageName,
      metadata: this.buildSafeMetadata(stageData, baseAnalysis.metadata, warnings, fallbacksApplied)
    };

    // Phase 4: Ensure required properties exist (throw errors for missing data)
    if (!finalAnalysis.summary) {
      throw new Error('Analysis summary is missing and cannot be generated');
    }
    if (!this.arraySafety.isValidArray(finalAnalysis.suggestions)) {
      throw new Error('Analysis suggestions are missing and cannot be generated');
    }
    finalAnalysis.visualAnnotations = this.arraySafety.isValidArray(finalAnalysis.visualAnnotations)
      ? finalAnalysis.visualAnnotations
      : [];

    return finalAnalysis;
  }

  /**
   * Phase 4: Safe Metadata Construction
   */
  private buildSafeMetadata(
    stageData: any,
    existingMetadata: any,
    warnings: string[],
    fallbacksApplied: string[]
  ): any {
    const metadata = {
      ...existingMetadata,
      // Phase 4: Safe property access for stage data
      googleVisionData: this.arraySafety.safeGetProperty(stageData, 'metadata', {}, 'google-vision-metadata'),
      openaiAnalysis: this.arraySafety.safeGetProperty(stageData, 'openai', {}, 'openai-analysis'),
      claudeSynthesis: this.arraySafety.safeGetProperty(stageData, 'claude', {}, 'claude-synthesis'),
      
      // Pipeline information with safe defaults
      pipelineOptimized: true,
      pipelineModel: 'Google Vision → GPT 4o → Claude Opus 4',
      consolidationWarnings: warnings.length > 0 ? warnings : undefined,
      fallbacksApplied: fallbacksApplied.length > 0 ? fallbacksApplied : undefined,
      
      // Safe extraction of existing metadata properties
      modelsUsed: this.extractModelsUsed(stageData),
      totalTokenUsage: this.calculateTotalTokenUsage(stageData),
      stagesCompleted: Object.keys(stageData),
      
      // Safe defaults for common properties
      objects: this.arraySafety.safeGetProperty(existingMetadata, 'objects', [], 'metadata-objects'),
      text: this.arraySafety.safeGetProperty(existingMetadata, 'text', [], 'metadata-text'),
      colors: this.arraySafety.safeGetProperty(existingMetadata, 'colors', [], 'metadata-colors'),
      faces: this.arraySafety.safeGetProperty(existingMetadata, 'faces', 0, 'metadata-faces')
    };

    return metadata;
  }

  /**
   * Phase 4: Safe Property Extraction Helpers
   */
  private extractModelsUsed(stageData: any): string[] {
    const models: string[] = [];
    
    if (stageData.metadata) models.push('Google Vision');
    if (stageData.openai) models.push('GPT-4o');
    if (stageData.claude) models.push('Claude Opus');
    
    return models.length > 0 ? models : ['Unknown'];
  }

  private calculateTotalTokenUsage(stageData: any): number {
    let total = 0;
    
    Object.values(stageData).forEach((stage: any) => {
      if (stage && typeof stage === 'object') {
        const tokenUsage = this.arraySafety.safeGetProperty(stage, 'tokenUsage', 0, 'token-usage');
        if (typeof tokenUsage === 'number' && !isNaN(tokenUsage)) {
          total += tokenUsage;
        }
      }
    });
    
    return total;
  }

  private createFailureResult(
    errors: string[],
    warnings: string[],
    usedStages: string[],
    fallbacksApplied: string[]
  ): ConsolidationResult {
    return {
      success: false,
      warnings,
      errors,
      usedStages,
      fallbacksApplied
    };
  }

  /**
   * Phase 4: Deep Property Access Safety
   */
  safeGetNestedProperty(
    obj: any,
    path: string,
    defaultValue: any = null,
    context = 'unknown'
  ): any {
    return this.arraySafety.safeGetProperty(obj, path, defaultValue, context);
  }
}