// PHASE 1: Adaptive Timeout Configuration

export interface AdaptiveTimeoutConfig {
  base: {
    vision: number;
    analysis: number;
    synthesis: number;
  };
  multipliers: {
    imageComplexity: {
      simple: number;
      moderate: number;
      complex: number;
    };
    modelLoad: {
      light: number;
      moderate: number;
      heavy: number;
    };
  };
  warnings: {
    threshold: number; // Percentage of timeout when to show warning
  };
  limits: {
    maximum: number; // Absolute maximum timeout
    minimum: number; // Minimum timeout to prevent too-fast failures
  };
}

export const adaptiveTimeoutConfig: AdaptiveTimeoutConfig = {
  base: {
    vision: 30000,      // 30 seconds base
    analysis: 60000,    // 60 seconds base
    synthesis: 45000    // 45 seconds base
  },
  multipliers: {
    imageComplexity: {
      simple: 1.0,      // No multiplier
      moderate: 1.5,    // 50% longer
      complex: 2.0      // 100% longer (double)
    },
    modelLoad: {
      light: 1.0,       // Single model
      moderate: 1.3,    // 2-3 models
      heavy: 1.6        // 4+ models
    }
  },
  warnings: {
    threshold: 0.8      // Show warning at 80% of timeout
  },
  limits: {
    maximum: 180000,    // 3 minutes absolute max
    minimum: 15000      // 15 seconds minimum
  }
};

export type ImageComplexity = keyof AdaptiveTimeoutConfig['multipliers']['imageComplexity'];
export type ModelLoad = keyof AdaptiveTimeoutConfig['multipliers']['modelLoad'];

export class AdaptiveTimeoutCalculator {
  static calculateTimeout(
    stage: keyof AdaptiveTimeoutConfig['base'],
    imageComplexity: ImageComplexity = 'moderate',
    modelCount: number = 1
  ): number {
    const baseTimeout = adaptiveTimeoutConfig.base[stage];
    
    // Determine model load category
    const modelLoad: ModelLoad = modelCount === 1 ? 'light' : 
                                 modelCount <= 3 ? 'moderate' : 'heavy';
    
    // Calculate adaptive timeout
    const complexityMultiplier = adaptiveTimeoutConfig.multipliers.imageComplexity[imageComplexity];
    const modelLoadMultiplier = adaptiveTimeoutConfig.multipliers.modelLoad[modelLoad];
    
    const calculatedTimeout = baseTimeout * complexityMultiplier * modelLoadMultiplier;
    
    // Apply limits
    const timeout = Math.max(
      adaptiveTimeoutConfig.limits.minimum,
      Math.min(adaptiveTimeoutConfig.limits.maximum, calculatedTimeout)
    );
    
    console.log('[AdaptiveTimeout] Calculated timeout:', {
      stage,
      baseTimeout,
      imageComplexity,
      modelCount,
      modelLoad,
      complexityMultiplier,
      modelLoadMultiplier,
      calculatedTimeout,
      finalTimeout: timeout
    });
    
    return timeout;
  }
  
  static getWarningThreshold(timeout: number): number {
    return timeout * adaptiveTimeoutConfig.warnings.threshold;
  }
  
  static detectImageComplexity(visionData?: any): ImageComplexity {
    if (!visionData) return 'moderate';
    
    // Simple heuristics for complexity detection
    const elementCount = Object.keys(visionData.elements || {}).length;
    const hasComplexLayout = visionData.layout?.grid?.complexity === 'complex';
    const colorCount = visionData.colors?.palette?.length || 0;
    
    if (elementCount > 20 || hasComplexLayout || colorCount > 10) {
      return 'complex';
    } else if (elementCount > 8 || colorCount > 5) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }
}