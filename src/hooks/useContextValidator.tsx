/**
 * Phase 6.1: Context Validator Hook
 * Provides runtime validation and monitoring for React contexts
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  validateContextValue, 
  validateAppState, 
  validateAuthContext,
  logValidationResult,
  createValidationConfig,
  type ValidationResult,
  type ContextValidationConfig 
} from '@/utils/contextValidation';

export interface ContextValidatorOptions {
  contextName: string;
  enableRealTimeValidation?: boolean;
  validationInterval?: number;
  onValidationError?: (errors: string[]) => void;
  onValidationWarning?: (warnings: string[]) => void;
  config?: Partial<ContextValidationConfig>;
}

export interface ContextValidatorState {
  isValid: boolean;
  lastValidation: ValidationResult | null;
  validationCount: number;
  errorCount: number;
  warningCount: number;
  averageValidationTime: number;
}

export interface ContextValidatorActions {
  validateNow: (data: unknown) => ValidationResult;
  resetStats: () => void;
  enableRealTimeValidation: () => void;
  disableRealTimeValidation: () => void;
}

/**
 * Hook for validating and monitoring React context data
 */
export const useContextValidator = (
  options: ContextValidatorOptions
): ContextValidatorState & ContextValidatorActions => {
  const {
    contextName,
    enableRealTimeValidation: enableRealTime = true,
    validationInterval = 5000, // 5 seconds
    onValidationError,
    onValidationWarning,
    config = {},
  } = options;

  // State
  const [state, setState] = useState<ContextValidatorState>({
    isValid: true,
    lastValidation: null,
    validationCount: 0,
    errorCount: 0,
    warningCount: 0,
    averageValidationTime: 0,
  });

  // Refs for stable references
  const validationTimesRef = useRef<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRealTimeEnabledRef = useRef(enableRealTime);

  // Configuration
  const validationConfig = createValidationConfig(
    process.env.NODE_ENV as 'development' | 'production' | 'testing'
  );
  const fullConfig = { ...validationConfig, ...config };

  /**
   * Perform validation and update state
   */
  const validateNow = useCallback((data: unknown): ValidationResult => {
    try {
      let result: ValidationResult;

      // Choose appropriate validator based on context name
      switch (contextName.toLowerCase()) {
        case 'app':
        case 'appcontext':
          result = validateContextValue(data, fullConfig);
          break;
        case 'auth':
        case 'authcontext':
          result = validateAuthContext(data, fullConfig);
          break;
        case 'appstate':
          result = validateAppState(data, fullConfig);
          break;
        default:
          result = validateContextValue(data, fullConfig);
      }

      // Update statistics
      setState(prev => {
        const newValidationCount = prev.validationCount + 1;
        const newErrorCount = result.errors.length > 0 ? prev.errorCount + 1 : prev.errorCount;
        const newWarningCount = result.warnings.length > 0 ? prev.warningCount + 1 : prev.warningCount;

        // Track validation times for average calculation
        validationTimesRef.current.push(result.performance.validationTime);
        if (validationTimesRef.current.length > 100) {
          validationTimesRef.current = validationTimesRef.current.slice(-50);
        }

        const averageValidationTime = validationTimesRef.current.reduce((a, b) => a + b, 0) / 
          validationTimesRef.current.length;

        return {
          isValid: result.isValid,
          lastValidation: result,
          validationCount: newValidationCount,
          errorCount: newErrorCount,
          warningCount: newWarningCount,
          averageValidationTime,
        };
      });

      // Log validation result
      logValidationResult(contextName, result, fullConfig);

      // Call error/warning callbacks
      if (result.errors.length > 0 && onValidationError) {
        onValidationError(result.errors);
      }
      if (result.warnings.length > 0 && onValidationWarning) {
        onValidationWarning(result.warnings);
      }

      return result;

    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [`Validation hook error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        performance: { validationTime: 0, dataSize: 0 },
      };

      setState(prev => ({
        ...prev,
        isValid: false,
        lastValidation: errorResult,
        errorCount: prev.errorCount + 1,
      }));

      return errorResult;
    }
  }, [contextName, fullConfig, onValidationError, onValidationWarning]);

  /**
   * Reset validation statistics
   */
  const resetStats = useCallback(() => {
    setState({
      isValid: true,
      lastValidation: null,
      validationCount: 0,
      errorCount: 0,
      warningCount: 0,
      averageValidationTime: 0,
    });
    validationTimesRef.current = [];
  }, []);

  /**
   * Enable real-time validation
   */
  const enableRealTimeValidation = useCallback(() => {
    isRealTimeEnabledRef.current = true;
    if (fullConfig.enableDebugLogging) {
      console.log(`[${contextName}] Real-time validation enabled`);
    }
  }, [contextName, fullConfig.enableDebugLogging]);

  /**
   * Disable real-time validation
   */
  const disableRealTimeValidation = useCallback(() => {
    isRealTimeEnabledRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (fullConfig.enableDebugLogging) {
      console.log(`[${contextName}] Real-time validation disabled`);
    }
  }, [contextName, fullConfig.enableDebugLogging]);

  /**
   * Setup real-time validation interval
   */
  useEffect(() => {
    if (isRealTimeEnabledRef.current && validationInterval > 0) {
      intervalRef.current = setInterval(() => {
        // Note: This would need actual context data passed in from the component
        // For now, we just log that real-time validation is active
        if (fullConfig.enableDebugLogging) {
          console.log(`[${contextName}] Real-time validation tick (${validationInterval}ms interval)`);
        }
      }, validationInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [validationInterval, contextName, fullConfig.enableDebugLogging]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    validateNow,
    resetStats,
    enableRealTimeValidation,
    disableRealTimeValidation,
  };
};

/**
 * Specialized hook for App Context validation
 */
export const useAppContextValidator = (
  options?: Partial<ContextValidatorOptions>
) => {
  return useContextValidator({
    contextName: 'AppContext',
    enableRealTimeValidation: true,
    validationInterval: 10000, // 10 seconds for app context
    ...options,
  });
};

/**
 * Specialized hook for Auth Context validation
 */
export const useAuthContextValidator = (
  options?: Partial<ContextValidatorOptions>
) => {
  return useContextValidator({
    contextName: 'AuthContext',
    enableRealTimeValidation: false, // Auth changes less frequently
    validationInterval: 30000, // 30 seconds for auth context
    ...options,
  });
};

/**
 * Development-only hook for context debugging
 */
export const useContextDebugger = (
  contextName: string,
  contextData: unknown,
  enabled: boolean = process.env.NODE_ENV === 'development'
) => {
  const validator = useContextValidator({
    contextName: `${contextName}Debug`,
    enableRealTimeValidation: enabled,
    validationInterval: 2000, // Quick validation for debugging
    onValidationError: enabled ? (errors) => {
      console.error(`[${contextName}] Context validation errors:`, errors);
    } : undefined,
    onValidationWarning: enabled ? (warnings) => {
      console.warn(`[${contextName}] Context validation warnings:`, warnings);
    } : undefined,
  });

  // Validate whenever context data changes
  useEffect(() => {
    if (enabled && contextData) {
      validator.validateNow(contextData);
    }
  }, [contextData, enabled, validator]);

  return enabled ? validator : null;
};

/**
 * Performance monitoring hook for context operations
 */
export const useContextPerformanceMonitor = (
  contextName: string,
  enabled: boolean = true
) => {
  const [performanceStats, setPerformanceStats] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });

  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number>(0);

  const startRenderTracking = useCallback(() => {
    if (enabled) {
      lastRenderStartRef.current = performance.now();
    }
  }, [enabled]);

  const endRenderTracking = useCallback(() => {
    if (enabled && lastRenderStartRef.current > 0) {
      const renderTime = performance.now() - lastRenderStartRef.current;
      
      renderTimesRef.current.push(renderTime);
      if (renderTimesRef.current.length > 50) {
        renderTimesRef.current = renderTimesRef.current.slice(-25);
      }

      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / 
        renderTimesRef.current.length;

      setPerformanceStats(prev => ({
        renderCount: prev.renderCount + 1,
        averageRenderTime,
        lastRenderTime: renderTime,
      }));

      if (renderTime > 16.67) { // > 1 frame at 60fps
        console.warn(`[${contextName}] Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
    }
  }, [enabled, contextName]);

  return {
    performanceStats,
    startRenderTracking,
    endRenderTracking,
  };
};