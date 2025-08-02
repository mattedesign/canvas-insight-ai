/**
 * Phase 5: Pipeline Recovery Service
 * Handles partial result recovery and degraded mode analysis
 */

import { ValidationService } from './ValidationService';
import { SummaryGenerator } from './SummaryGenerator';
import { ArrayNumericSafety } from '@/utils/ArrayNumericSafety';

export interface RecoveryConfig {
  enablePartialRecovery: boolean;
  maxRetryAttempts: number;
  retryDelayMs: number;
  enableDegradedMode: boolean;
  logRecoveryAttempts: boolean;
}

export interface RecoveryResult {
  success: boolean;
  mode: 'full' | 'partial' | 'degraded' | 'failed';
  data?: any;
  warnings: string[];
  errors: string[];
  recoverySteps: string[];
  retryCount: number;
}

export interface StageRecoveryData {
  stage: string;
  success: boolean;
  data?: any;
  fallbackApplied: boolean;
  errorMessage?: string;
}

export class PipelineRecoveryService {
  private static instance: PipelineRecoveryService;
  private validationService: ValidationService;
  private summaryGenerator: SummaryGenerator;
  private arraySafety: ArrayNumericSafety;
  
  private defaultConfig: RecoveryConfig = {
    enablePartialRecovery: true,
    maxRetryAttempts: 3,
    retryDelayMs: 1000,
    enableDegradedMode: true,
    logRecoveryAttempts: process.env.NODE_ENV === 'development'
  };

  private constructor() {
    this.validationService = ValidationService.getInstance();
    this.summaryGenerator = SummaryGenerator.getInstance();
    this.arraySafety = ArrayNumericSafety.getInstance();
  }

  static getInstance(): PipelineRecoveryService {
    if (!PipelineRecoveryService.instance) {
      PipelineRecoveryService.instance = new PipelineRecoveryService();
    }
    return PipelineRecoveryService.instance;
  }

  /**
   * Phase 5: Attempt to recover from pipeline failure
   */
  async attemptRecovery(
    imageUrl: string,
    userContext: string,
    failedStages: any[],
    originalError: Error,
    config: Partial<RecoveryConfig> = {}
  ): Promise<RecoveryResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const warnings: string[] = [];
    const errors: string[] = [];
    const recoverySteps: string[] = [];

    if (finalConfig.logRecoveryAttempts) {
      console.log('[PipelineRecoveryService] Starting recovery process:', {
        imageUrl: imageUrl ? 'provided' : 'missing',
        userContext: userContext ? 'provided' : 'empty',
        failedStages: failedStages.length,
        originalError: originalError.message
      });
    }

    try {
      // Phase 5: Analyze failure types and determine recovery strategy
      const failureAnalysis = this.analyzeFailures(failedStages, originalError);
      recoverySteps.push(`Analyzed ${failureAnalysis.failureTypes.length} failure types`);

      // Phase 5: Attempt partial recovery if enabled
      if (finalConfig.enablePartialRecovery && failureAnalysis.hasPartialData) {
        const partialResult = await this.attemptPartialRecovery(
          failedStages,
          imageUrl,
          userContext,
          finalConfig,
          warnings,
          recoverySteps
        );

        if (partialResult.success) {
          return {
            success: true,
            mode: 'partial',
            data: partialResult.data,
            warnings,
            errors,
            recoverySteps,
            retryCount: 0
          };
        }
      }

      // Phase 5: Attempt degraded mode if enabled
      if (finalConfig.enableDegradedMode) {
        const degradedResult = this.createDegradedModeAnalysis(
          imageUrl,
          userContext,
          failureAnalysis,
          warnings,
          recoverySteps
        );

        return {
          success: true,
          mode: 'degraded',
          data: degradedResult,
          warnings,
          errors,
          recoverySteps,
          retryCount: 0
        };
      }

      // Phase 5: Recovery not possible
      errors.push('All recovery attempts exhausted');
      return {
        success: false,
        mode: 'failed',
        warnings,
        errors,
        recoverySteps,
        retryCount: 0
      };

    } catch (recoveryError) {
      errors.push(`Recovery process failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
      
      return {
        success: false,
        mode: 'failed',
        warnings,
        errors,
        recoverySteps,
        retryCount: 0
      };
    }
  }

  /**
   * Phase 5: Retry mechanism for transient failures
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
    context: string = 'unknown'
  ): Promise<{ success: boolean; result?: T; attempts: number; errors: Error[] }> {
    const errors: Error[] = [];
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (this.defaultConfig.logRecoveryAttempts) {
          console.log(`[PipelineRecoveryService] ${context} succeeded on attempt ${attempt}`);
        }
        
        return {
          success: true,
          result,
          attempts: attempt,
          errors
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        
        if (this.defaultConfig.logRecoveryAttempts) {
          console.warn(`[PipelineRecoveryService] ${context} attempt ${attempt}/${maxAttempts} failed:`, err.message);
        }
        
        // Don't delay after the last attempt
        if (attempt < maxAttempts) {
          const backoffDelay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    
    return {
      success: false,
      attempts: maxAttempts,
      errors
    };
  }

  /**
   * Phase 5: Analyze pipeline failure patterns
   */
  private analyzeFailures(
    failedStages: any[],
    originalError: Error
  ): {
    failureTypes: string[];
    hasPartialData: boolean;
    isTransientFailure: boolean;
    criticalStagesFailed: boolean;
  } {
    const failureTypes: string[] = [];
    let hasPartialData = false;
    let isTransientFailure = false;
    let criticalStagesFailed = false;

    // Analyze error types
    const errorMessage = originalError.message.toLowerCase();
    
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      failureTypes.push('network');
      isTransientFailure = true;
    }
    
    if (errorMessage.includes('api') || errorMessage.includes('401') || errorMessage.includes('403')) {
      failureTypes.push('authentication');
    }
    
    if (errorMessage.includes('parse') || errorMessage.includes('json')) {
      failureTypes.push('parsing');
    }
    
    if (errorMessage.includes('validation')) {
      failureTypes.push('validation');
    }

    // Analyze stage data
    if (this.arraySafety.isValidArray(failedStages)) {
      const stagesWithData = failedStages.filter(stage => 
        stage && stage.data && Object.keys(stage.data).length > 0
      );
      
      hasPartialData = stagesWithData.length > 0;
      
      // Check if critical stages (synthesis, analysis) failed
      const criticalStages = ['synthesis', 'claude_synthesis', 'analysis', 'openai_ux_analysis'];
      criticalStagesFailed = failedStages.some(stage => 
        stage && criticalStages.includes(stage.stage) && !stage.success
      );
    }

    return {
      failureTypes,
      hasPartialData,
      isTransientFailure,
      criticalStagesFailed
    };
  }

  /**
   * Phase 5: Attempt partial recovery from available data
   */
  private async attemptPartialRecovery(
    failedStages: any[],
    imageUrl: string,
    userContext: string,
    config: RecoveryConfig,
    warnings: string[],
    recoverySteps: string[]
  ): Promise<{ success: boolean; data?: any }> {
    try {
      // Extract any usable data from failed stages
      const usableData = this.extractUsableData(failedStages);
      recoverySteps.push(`Extracted data from ${Object.keys(usableData).length} stages`);

      if (Object.keys(usableData).length === 0) {
        warnings.push('No usable data found in failed stages');
        return { success: false };
      }

      // Build partial analysis
      const partialAnalysis = this.buildPartialAnalysis(
        usableData,
        imageUrl,
        userContext,
        warnings,
        recoverySteps
      );

      // Validate the partial analysis
      const validation = this.validationService.validateAnalysisResult(partialAnalysis);
      if (!validation.isValid) {
        warnings.push(`Partial analysis validation warnings: ${validation.warnings?.map(w => w.message).join(', ')}`);
        
        if (validation.fixedData) {
          recoverySteps.push('Applied validation fixes to partial analysis');
          return { success: true, data: validation.fixedData };
        }
      }

      recoverySteps.push('Partial recovery completed successfully');
      return { success: true, data: partialAnalysis };

    } catch (error) {
      warnings.push(`Partial recovery failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false };
    }
  }

  /**
   * Phase 5: Create degraded mode analysis
   */
  private createDegradedModeAnalysis(
    imageUrl: string,
    userContext: string,
    failureAnalysis: any,
    warnings: string[],
    recoverySteps: string[]
  ): any {
    recoverySteps.push('Creating degraded mode analysis');

    // Generate minimal but valid analysis structure
    const degradedAnalysis = {
      imageUrl,
      userContext,
      mode: 'degraded',
      summary: this.summaryGenerator.generateValidSummary({}, {
        reason: 'Pipeline failure recovery',
        failureTypes: failureAnalysis.failureTypes
      }),
      suggestions: this.createDegradedSuggestions(failureAnalysis),
      visualAnnotations: [],
      metadata: {
        recoveryMode: 'degraded',
        originalFailure: failureAnalysis.failureTypes.join(', '),
        generatedAt: new Date().toISOString(),
        limitations: [
          'This analysis was generated in degraded mode due to pipeline failures',
          'Results may be limited compared to full analysis',
          'Consider re-running the analysis when issues are resolved'
        ]
      },
      createdAt: new Date().toISOString()
    };

    warnings.push('Analysis generated in degraded mode - results may be limited');
    recoverySteps.push('Degraded mode analysis created successfully');

    return degradedAnalysis;
  }

  /**
   * Phase 5: Extract usable data from failed stages
   */
  private extractUsableData(failedStages: any[]): Record<string, any> {
    const usableData: Record<string, any> = {};

    this.arraySafety.safeMap(
      failedStages,
      (stage: any) => {
        if (stage && stage.data && Object.keys(stage.data).length > 0) {
          usableData[stage.stage] = stage.data;
        }
        return stage;
      },
      [],
      'extract-usable-data'
    );

    return usableData;
  }

  /**
   * Phase 5: Build partial analysis from available data
   */
  private buildPartialAnalysis(
    usableData: Record<string, any>,
    imageUrl: string,
    userContext: string,
    warnings: string[],
    recoverySteps: string[]
  ): any {
    const stages = Object.keys(usableData);
    const primaryData = usableData[stages[0]] || {};

    const partialAnalysis = {
      ...primaryData,
      imageUrl,
      userContext,
      mode: 'partial',
      summary: this.summaryGenerator.generateValidSummary(
        primaryData.summary || {},
        { availableStages: stages }
      ),
      suggestions: this.arraySafety.safeGetProperty(primaryData, 'suggestions', [], 'partial-suggestions'),
      visualAnnotations: this.arraySafety.safeGetProperty(primaryData, 'visualAnnotations', [], 'partial-annotations'),
      metadata: {
        ...primaryData.metadata,
        recoveryMode: 'partial',
        availableStages: stages,
        missingStages: this.identifyMissingStages(stages),
        generatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    warnings.push(`Partial analysis created from ${stages.length} available stages`);
    recoverySteps.push(`Built partial analysis from stages: ${stages.join(', ')}`);

    return partialAnalysis;
  }

  /**
   * Phase 5: Create degraded mode suggestions
   */
  private createDegradedSuggestions(failureAnalysis: any): any[] {
    const suggestions = [
      {
        id: 'degraded-mode-notice',
        title: 'Analysis Generated in Recovery Mode',
        description: 'This analysis was created using fallback methods due to processing issues. Results may be limited.',
        category: 'system',
        priority: 'high',
        impact: 'medium',
        effort: 'low',
        actionItems: [
          'Review the analysis limitations noted below',
          'Consider re-running the analysis when system issues are resolved',
          'Contact support if issues persist'
        ]
      }
    ];

    if (failureAnalysis.failureTypes.includes('network')) {
      suggestions.push({
        id: 'network-issue',
        title: 'Network Connectivity Issue Detected',
        description: 'The analysis encountered network problems. This may affect result quality.',
        category: 'technical',
        priority: 'medium',
        impact: 'medium',
        effort: 'low',
        actionItems: [
          'Check your internet connection',
          'Try the analysis again in a few minutes',
          'Contact support if network issues persist'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Phase 5: Identify missing stages for partial recovery
   */
  private identifyMissingStages(availableStages: string[]): string[] {
    const expectedStages = ['vision', 'analysis', 'synthesis', 'metadata'];
    return expectedStages.filter(stage => !availableStages.includes(stage));
  }

  /**
   * Phase 5: Check if error is transient and retryable
   */
  isTransientError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const transientKeywords = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      'server error',
      '500',
      '502',
      '503',
      '504'
    ];

    return transientKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Phase 5: Get recovery statistics
   */
  getRecoveryStats(): {
    totalRecoveryAttempts: number;
    successfulRecoveries: number;
    partialRecoveries: number;
    degradedModeActivations: number;
  } {
    // In a real implementation, these would be tracked
    return {
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      partialRecoveries: 0,
      degradedModeActivations: 0
    };
  }
}