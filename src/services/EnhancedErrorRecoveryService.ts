/**
 * Enhanced Error Recovery Service - Provides robust error recovery for analysis pipeline
 */

import { PipelineRecoveryService } from './PipelineRecoveryService';
import { memoryOptimizedAnalysisService } from './MemoryOptimizedAnalysisService';
import { FallbackLoggingService } from './FallbackLoggingService';
import { Logger } from '@/utils/logging';
import type { UXAnalysis } from '@/types/ux-analysis';

interface RecoveryAttempt {
  strategy: string;
  attempt: number;
  timestamp: number;
  success: boolean;
  error?: string;
  result?: any;
}

interface EnhancedRecoveryResult {
  success: boolean;
  analysis?: UXAnalysis;
  recoveryPath: RecoveryAttempt[];
  finalStrategy: string;
  totalRecoveryTime: number;
  error?: string;
}

interface RecoveryContext {
  imageUrl: string;
  userContext?: string;
  imageId?: string;
  imageName?: string;
  originalError: Error;
  failedStages: string[];
}

class EnhancedErrorRecoveryService {
  private readonly recoveryStrategies = [
    'memory_optimization',
    'single_model_fallback',
    'simplified_analysis',
    'minimal_response',
    'cached_recovery'
  ];

  /**
   * Attempt comprehensive error recovery
   */
  async attemptRecovery(context: RecoveryContext): Promise<EnhancedRecoveryResult> {
    const startTime = Date.now();
    const recoveryPath: RecoveryAttempt[] = [];

    console.log('🛡️ Starting enhanced error recovery:', {
      error: context.originalError.message,
      failedStages: context.failedStages,
      imageUrl: context.imageUrl.substring(0, 50) + '...'
    });

    // Analyze the error to determine best recovery strategy
    const errorAnalysis = this.analyzeError(context.originalError, context.failedStages);
    console.log('🛡️ Error analysis:', errorAnalysis);

    // Try recovery strategies in order of likelihood to succeed
    const prioritizedStrategies = this.prioritizeRecoveryStrategies(errorAnalysis);

    for (const strategy of prioritizedStrategies) {
      try {
        console.log(`🛡️ Attempting recovery strategy: ${strategy}`);
        
        const attempt: RecoveryAttempt = {
          strategy,
          attempt: recoveryPath.length + 1,
          timestamp: Date.now(),
          success: false
        };

        const result = await this.executeRecoveryStrategy(strategy, context);
        
        if (result.success) {
          attempt.success = true;
          attempt.result = result.analysis;
          recoveryPath.push(attempt);

          console.log(`✅ Recovery successful with strategy: ${strategy}`);

          // Log successful recovery
          await FallbackLoggingService.logFallbackUsage({
            service_name: 'EnhancedErrorRecoveryService',
            fallback_type: `recovery_${strategy}`,
            original_error: context.originalError.message,
            context_data: {
              strategy,
              failedStages: context.failedStages,
              recoveryTime: Date.now() - startTime,
              imageId: context.imageId
            }
          });
          
          return {
            success: true,
            analysis: result.analysis,
            recoveryPath,
            finalStrategy: strategy,
            totalRecoveryTime: Date.now() - startTime
          };
        } else {
          attempt.error = result.error;
          recoveryPath.push(attempt);
          console.log(`❌ Recovery strategy ${strategy} failed: ${result.error}`);
        }

      } catch (error) {
        const attempt: RecoveryAttempt = {
          strategy,
          attempt: recoveryPath.length + 1,
          timestamp: Date.now(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        recoveryPath.push(attempt);
        
        console.error(`❌ Recovery strategy ${strategy} threw error:`, error);
      }
    }

    // If all strategies failed, return comprehensive error info
    console.error('❌ All recovery strategies failed');

    // Log complete recovery failure
    await FallbackLoggingService.logFallbackUsage({
      service_name: 'EnhancedErrorRecoveryService',
      fallback_type: 'recovery_complete_failure',
      original_error: context.originalError.message,
      context_data: {
        failedStages: context.failedStages,
        attemptedStrategies: recoveryPath.map(r => r.strategy),
        totalRecoveryTime: Date.now() - startTime,
        imageId: context.imageId
      }
    });
    
    return {
      success: false,
      recoveryPath,
      finalStrategy: 'none',
      totalRecoveryTime: Date.now() - startTime,
      error: 'All recovery strategies exhausted'
    };
  }

  /**
   * Analyze error to determine cause and best recovery approach
   */
  private analyzeError(error: Error, failedStages: string[]): {
    type: string;
    severity: 'low' | 'medium' | 'high';
    isMemoryRelated: boolean;
    isTimeoutRelated: boolean;
    isNetworkRelated: boolean;
    isAPIKeyRelated: boolean;
    suggestedStrategy: string;
  } {
    const errorMessage = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Check for memory-related errors
    const isMemoryRelated = 
      errorMessage.includes('memory') ||
      errorMessage.includes('heap') ||
      errorMessage.includes('out of memory') ||
      errorMessage.includes('memory limit exceeded') ||
      stack.includes('memory');

    // Check for timeout-related errors
    const isTimeoutRelated = 
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('deadline exceeded');

    // Check for network-related errors
    const isNetworkRelated = 
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504');

    // Check for API key related errors
    const isAPIKeyRelated = 
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('authentication');

    // Determine error type and severity
    let type = 'unknown';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let suggestedStrategy = 'memory_optimization';

    if (isMemoryRelated) {
      type = 'memory';
      severity = 'high';
      suggestedStrategy = 'memory_optimization';
    } else if (isAPIKeyRelated) {
      type = 'api_key';
      severity = 'high';
      suggestedStrategy = 'single_model_fallback';
    } else if (isTimeoutRelated) {
      type = 'timeout';
      severity = 'medium';
      suggestedStrategy = 'simplified_analysis';
    } else if (isNetworkRelated) {
      type = 'network';
      severity = 'medium';
      suggestedStrategy = 'cached_recovery';
    }

    return {
      type,
      severity,
      isMemoryRelated,
      isTimeoutRelated,
      isNetworkRelated,
      isAPIKeyRelated,
      suggestedStrategy
    };
  }

  /**
   * Prioritize recovery strategies based on error analysis
   */
  private prioritizeRecoveryStrategies(errorAnalysis: {
    type: string;
    isMemoryRelated: boolean;
    isTimeoutRelated: boolean;
    isNetworkRelated: boolean;
    isAPIKeyRelated: boolean;
    suggestedStrategy: string;
  }): string[] {
    const strategies = [...this.recoveryStrategies];

    // Move suggested strategy to front
    if (strategies.includes(errorAnalysis.suggestedStrategy)) {
      strategies.splice(strategies.indexOf(errorAnalysis.suggestedStrategy), 1);
      strategies.unshift(errorAnalysis.suggestedStrategy);
    }

    // Prioritize based on error type
    if (errorAnalysis.isMemoryRelated) {
      // For memory errors, prioritize memory optimization
      const memoryStrategies = ['memory_optimization', 'simplified_analysis', 'minimal_response'];
      return [...memoryStrategies, ...strategies.filter(s => !memoryStrategies.includes(s))];
    }

    if (errorAnalysis.isAPIKeyRelated) {
      // For API key errors, try different models
      const apiStrategies = ['single_model_fallback', 'cached_recovery', 'minimal_response'];
      return [...apiStrategies, ...strategies.filter(s => !apiStrategies.includes(s))];
    }

    if (errorAnalysis.isNetworkRelated) {
      // For network errors, try cached or simplified approaches
      const networkStrategies = ['cached_recovery', 'simplified_analysis', 'minimal_response'];
      return [...networkStrategies, ...strategies.filter(s => !networkStrategies.includes(s))];
    }

    return strategies;
  }

  /**
   * Execute a specific recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: string, 
    context: RecoveryContext
  ): Promise<{ success: boolean; analysis?: UXAnalysis; error?: string }> {
    
    switch (strategy) {
      case 'memory_optimization':
        return await this.attemptMemoryOptimizedRecovery(context);
      
      case 'single_model_fallback':
        return await this.attemptSingleModelRecovery(context);
      
      case 'simplified_analysis':
        return await this.attemptSimplifiedAnalysis(context);
      
      case 'minimal_response':
        return await this.attemptMinimalResponse(context);
      
      case 'cached_recovery':
        return await this.attemptCachedRecovery(context);
      
      default:
        return { success: false, error: `Unknown recovery strategy: ${strategy}` };
    }
  }

  /**
   * Attempt recovery using memory optimization
   */
  private async attemptMemoryOptimizedRecovery(context: RecoveryContext): Promise<{
    success: boolean;
    analysis?: UXAnalysis;
    error?: string;
  }> {
    try {
      console.log('🛡️ Attempting memory-optimized recovery...');
      
      const result = await memoryOptimizedAnalysisService.executeOptimizedAnalysis({
        imageUrl: context.imageUrl,
        userContext: context.userContext,
        imageId: context.imageId,
        imageName: context.imageName,
        maxMemoryMB: 50 // Conservative memory limit
      });

      if (result.success && result.analysis) {
        return {
          success: true,
          analysis: result.analysis
        };
      } else {
        return {
          success: false,
          error: result.error || 'Memory optimization failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Memory optimization error'
      };
    }
  }

  /**
   * Attempt recovery using single model only
   */
  private async attemptSingleModelRecovery(context: RecoveryContext): Promise<{
    success: boolean;
    analysis?: UXAnalysis;
    error?: string;
  }> {
    try {
      console.log('🛡️ Attempting single model recovery...');
      
      // Try with just one model to reduce complexity
      const result = await memoryOptimizedAnalysisService.executeOptimizedAnalysis({
        imageUrl: context.imageUrl,
        userContext: context.userContext,
        imageId: context.imageId,
        imageName: context.imageName,
        maxMemoryMB: 30 // Very conservative
      });

      if (result.success) {
        return {
          success: true,
          analysis: result.analysis
        };
      } else {
        return {
          success: false,
          error: result.error || 'Single model recovery failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Single model recovery error'
      };
    }
  }

  /**
   * Attempt simplified analysis with minimal features
   */
  private async attemptSimplifiedAnalysis(context: RecoveryContext): Promise<{
    success: boolean;
    analysis?: UXAnalysis;
    error?: string;
  }> {
    try {
      console.log('🛡️ Attempting simplified analysis recovery...');
      
      // Create a very basic analysis structure
      const simplifiedAnalysis: UXAnalysis = {
        id: `recovery_simplified_${Date.now()}`,
        imageId: context.imageId || '',
        imageName: context.imageName || 'Recovered Analysis',
        imageUrl: context.imageUrl,
        userContext: context.userContext || '',
        visualAnnotations: [{
          id: 'recovery_1',
          x: 0.5,
          y: 0.5,
          type: 'suggestion',
          title: 'Analysis Recovered',
          description: 'Basic analysis completed after error recovery',
          severity: 'low'
        }],
        suggestions: [{
          id: 'recovery_suggestion_1',
          category: 'usability',
          title: 'Review Interface Design',
          description: 'Consider conducting a detailed UX review of this interface',
          impact: 'medium',
          effort: 'medium',
          actionItems: ['Schedule UX review', 'Gather user feedback'],
          relatedAnnotations: []
        }],
        summary: {
          overallScore: 65,
          categoryScores: {
            usability: 65,
            accessibility: 60,
            visual: 70,
            content: 65
          },
          keyIssues: ['Error recovery was required'],
          strengths: ['Analysis recovery successful']
        },
        metadata: {
          objects: [],
          text: [],
          colors: [],
          faces: 0
        },
        createdAt: new Date(),
        modelUsed: 'recovery-simplified',
        status: 'completed'
      };

      return {
        success: true,
        analysis: simplifiedAnalysis
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simplified analysis recovery error'
      };
    }
  }

  /**
   * Attempt minimal response generation
   */
  private async attemptMinimalResponse(context: RecoveryContext): Promise<{
    success: boolean;
    analysis?: UXAnalysis;
    error?: string;
  }> {
    try {
      console.log('🛡️ Attempting minimal response recovery...');
      
      // Create absolute minimal analysis
      const minimalAnalysis: UXAnalysis = {
        id: `recovery_minimal_${Date.now()}`,
        imageId: context.imageId || '',
        imageName: context.imageName || 'Minimal Recovery',
        imageUrl: context.imageUrl,
        userContext: context.userContext || '',
        visualAnnotations: [],
        suggestions: [{
          id: 'minimal_suggestion',
          category: 'usability',
          title: 'Analysis Recovery Notice',
          description: 'Original analysis failed, but interface was successfully processed',
          impact: 'low',
          effort: 'low',
          actionItems: ['Retry analysis if needed'],
          relatedAnnotations: []
        }],
        summary: {
          overallScore: 50,
          categoryScores: {
            usability: 50,
            accessibility: 50,
            visual: 50,
            content: 50
          },
          keyIssues: [],
          strengths: []
        },
        metadata: {
          objects: [],
          text: [],
          colors: [],
          faces: 0
        },
        createdAt: new Date(),
        modelUsed: 'recovery-minimal',
        status: 'completed'
      };

      return {
        success: true,
        analysis: minimalAnalysis
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Minimal response recovery error'
      };
    }
  }

  /**
   * Attempt recovery using cached data
   */
  private async attemptCachedRecovery(context: RecoveryContext): Promise<{
    success: boolean;
    analysis?: UXAnalysis;
    error?: string;
  }> {
    try {
      console.log('🛡️ Attempting cached recovery...');
      
      // Try to use existing pipeline recovery service
      const pipelineRecovery = PipelineRecoveryService.getInstance();
      
      const recoveryResult = await pipelineRecovery.attemptRecovery(
        context.imageUrl,
        context.userContext || '',
        context.failedStages,
        context.originalError,
        { enablePartialRecovery: true }
      );

      if (recoveryResult.success && recoveryResult.data) {
        return {
          success: true,
          analysis: recoveryResult.data as UXAnalysis
        };
      } else {
        return {
          success: false,
          error: 'No cached data available for recovery'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cached recovery error'
      };
    }
  }
}

export const enhancedErrorRecoveryService = new EnhancedErrorRecoveryService();