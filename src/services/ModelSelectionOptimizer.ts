// PHASE 3: Pipeline Performance Enhancement - Model Selection Optimization

import { pipelineConfig } from '@/config/pipelineConfig';
import { AnalysisContext } from '@/types/contextTypes';

interface ModelPerformanceMetrics {
  model: string;
  averageResponseTime: number;
  successRate: number;
  qualityScore: number;
  lastUsed: number;
  usageCount: number;
}

interface OptimizedModelSelection {
  primaryModels: string[];
  secondaryModels: string[];
  reasoning: string;
  expectedTimeout: number;
}

export class ModelSelectionOptimizer {
  private static instance: ModelSelectionOptimizer;
  private performanceHistory = new Map<string, ModelPerformanceMetrics>();
  private readonly HISTORY_RETENTION = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): ModelSelectionOptimizer {
    if (!ModelSelectionOptimizer.instance) {
      ModelSelectionOptimizer.instance = new ModelSelectionOptimizer();
    }
    return ModelSelectionOptimizer.instance;
  }

  /**
   * Select optimal models based on context and performance history
   */
  selectOptimalModels(
    stage: 'vision' | 'analysis',
    context?: AnalysisContext,
    targetTimeout?: number
  ): OptimizedModelSelection {
    const availableModels = this.getAvailableModels(stage);
    const performanceData = this.getPerformanceData(availableModels);
    
    // Context-aware model selection
    const optimizedSelection = this.optimizeForContext(
      availableModels,
      performanceData,
      context,
      targetTimeout
    );
    
    console.log('[ModelOptimizer] Selected models:', {
      stage,
      primary: optimizedSelection.primaryModels,
      secondary: optimizedSelection.secondaryModels,
      reasoning: optimizedSelection.reasoning,
      expectedTimeout: optimizedSelection.expectedTimeout
    });
    
    return optimizedSelection;
  }

  /**
   * Record model performance for future optimization
   */
  recordPerformance(
    model: string,
    responseTime: number,
    success: boolean,
    qualityScore?: number
  ): void {
    const existing = this.performanceHistory.get(model) || {
      model,
      averageResponseTime: responseTime,
      successRate: success ? 1 : 0,
      qualityScore: qualityScore || 0.5,
      lastUsed: Date.now(),
      usageCount: 0
    };

    // Update metrics using exponential moving average
    const alpha = 0.3; // Learning rate
    existing.averageResponseTime = existing.averageResponseTime * (1 - alpha) + responseTime * alpha;
    existing.successRate = existing.successRate * (1 - alpha) + (success ? 1 : 0) * alpha;
    
    if (qualityScore !== undefined) {
      existing.qualityScore = existing.qualityScore * (1 - alpha) + qualityScore * alpha;
    }
    
    existing.lastUsed = Date.now();
    existing.usageCount++;
    
    this.performanceHistory.set(model, existing);
    
    console.log('[ModelOptimizer] Recorded performance:', {
      model,
      responseTime,
      success,
      qualityScore,
      updatedMetrics: existing
    });
  }

  /**
   * Get performance metrics for a model
   */
  getModelMetrics(model: string): ModelPerformanceMetrics | null {
    return this.performanceHistory.get(model) || null;
  }

  /**
   * Clean up old performance data
   */
  cleanupOldData(): void {
    const cutoff = Date.now() - this.HISTORY_RETENTION;
    const toDelete = [];
    
    for (const [model, metrics] of this.performanceHistory.entries()) {
      if (metrics.lastUsed < cutoff) {
        toDelete.push(model);
      }
    }
    
    toDelete.forEach(model => this.performanceHistory.delete(model));
    
    if (toDelete.length > 0) {
      console.log('[ModelOptimizer] Cleaned up old metrics for models:', toDelete);
    }
  }

  private getAvailableModels(stage: 'vision' | 'analysis'): string[] {
    const config = pipelineConfig.models[stage];
    return [...config.primary, ...config.secondary];
  }

  private getPerformanceData(models: string[]): Map<string, ModelPerformanceMetrics> {
    const data = new Map<string, ModelPerformanceMetrics>();
    
    models.forEach(model => {
      const metrics = this.performanceHistory.get(model);
      if (metrics) {
        data.set(model, metrics);
      } else {
        // Default metrics for new models
        data.set(model, {
          model,
          averageResponseTime: 30000, // Conservative default
          successRate: 0.85, // Assume reasonable success rate
          qualityScore: 0.7, // Moderate quality assumption
          lastUsed: 0,
          usageCount: 0
        });
      }
    });
    
    return data;
  }

  private optimizeForContext(
    availableModels: string[],
    performanceData: Map<string, ModelPerformanceMetrics>,
    context?: AnalysisContext,
    targetTimeout?: number
  ): OptimizedModelSelection {
    // Sort models by performance score
    const sortedModels = availableModels
      .map(model => {
        const metrics = performanceData.get(model)!;
        const score = this.calculateModelScore(metrics, context, targetTimeout);
        return { model, score, metrics };
      })
      .sort((a, b) => b.score - a.score);

    // Select primary models (top performers within timeout)
    const primaryModels = sortedModels
      .filter(({ metrics }) => {
        if (!targetTimeout) return true;
        return metrics.averageResponseTime <= targetTimeout * 0.8; // 80% of target
      })
      .slice(0, 2) // Max 2 primary models
      .map(({ model }) => model);

    // Select secondary models (backup options)
    const secondaryModels = sortedModels
      .filter(({ model }) => !primaryModels.includes(model))
      .slice(0, 1) // Max 1 secondary model
      .map(({ model }) => model);

    // Calculate expected timeout
    const expectedTimeout = this.calculateExpectedTimeout(
      [...primaryModels, ...secondaryModels],
      performanceData
    );

    // Generate reasoning
    const reasoning = this.generateSelectionReasoning(
      sortedModels,
      primaryModels,
      secondaryModels,
      context,
      targetTimeout
    );

    return {
      primaryModels,
      secondaryModels,
      reasoning,
      expectedTimeout
    };
  }

  private calculateModelScore(
    metrics: ModelPerformanceMetrics,
    context?: AnalysisContext,
    targetTimeout?: number
  ): number {
    let score = 0;
    
    // Base performance score (0-100)
    score += metrics.successRate * 40; // Success rate weight: 40%
    score += (1 / (metrics.averageResponseTime / 1000)) * 30; // Speed weight: 30%
    score += metrics.qualityScore * 30; // Quality weight: 30%
    
    // Context-specific bonuses
    if (context) {
      // Bonus for models that work well with specific image types
      if (context.image.primaryType === 'dashboard' && metrics.model.includes('gpt-4o')) {
        score += 10; // GPT-4o is good with structured interfaces
      }
      
      if (context.image.primaryType === 'landing' && metrics.model.includes('claude')) {
        score += 10; // Claude is good with marketing content
      }
      
      // Bonus for models that match user role
      if (context.user.inferredRole === 'developer' && metrics.model.includes('gpt-4o')) {
        score += 5; // GPT-4o is technical
      }
      
      if (context.user.inferredRole === 'designer' && metrics.model.includes('claude')) {
        score += 5; // Claude is creative
      }
    }
    
    // Timeout penalty
    if (targetTimeout && metrics.averageResponseTime > targetTimeout) {
      score -= 20; // Heavy penalty for exceeding target timeout
    }
    
    // Recency bonus
    const daysSinceUsed = (Date.now() - metrics.lastUsed) / (24 * 60 * 60 * 1000);
    if (daysSinceUsed < 1) {
      score += 5; // Recently used models might be more reliable
    }
    
    return Math.max(0, score); // Ensure non-negative score
  }

  private calculateExpectedTimeout(
    selectedModels: string[],
    performanceData: Map<string, ModelPerformanceMetrics>
  ): number {
    if (selectedModels.length === 0) return 30000; // Default timeout
    
    const avgResponseTime = selectedModels.reduce((sum, model) => {
      const metrics = performanceData.get(model);
      return sum + (metrics?.averageResponseTime || 30000);
    }, 0) / selectedModels.length;
    
    // Add buffer for parallel execution and safety margin
    return Math.min(avgResponseTime * 1.5, 120000); // Max 2 minutes
  }

  private generateSelectionReasoning(
    sortedModels: Array<{ model: string; score: number; metrics: ModelPerformanceMetrics }>,
    primaryModels: string[],
    secondaryModels: string[],
    context?: AnalysisContext,
    targetTimeout?: number
  ): string {
    const reasons = [];
    
    if (primaryModels.length > 0) {
      const topModel = sortedModels[0];
      reasons.push(`Selected ${primaryModels[0]} as primary (score: ${topModel.score.toFixed(1)}, avg: ${topModel.metrics.averageResponseTime}ms)`);
    }
    
    if (context) {
      reasons.push(`Optimized for ${context.image.primaryType} interface and ${context.user.inferredRole || 'general'} user`);
    }
    
    if (targetTimeout) {
      reasons.push(`Target timeout: ${targetTimeout}ms`);
    }
    
    if (secondaryModels.length > 0) {
      reasons.push(`Fallback: ${secondaryModels[0]}`);
    }
    
    return reasons.join('; ');
  }
}