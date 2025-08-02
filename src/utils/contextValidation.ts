/**
 * Phase 6.1: Context Validation System
 * Provides comprehensive validation for all context data structures
 */

import type { AppState } from '@/context/AppStateTypes';
import type { StrictAppContextValue, StrictStableHelpers } from '@/types/strict-types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    validationTime: number;
    dataSize: number;
  };
}

export interface ContextValidationConfig {
  enablePerformanceMonitoring: boolean;
  enableWarnings: boolean;
  maxValidationTime: number;
  enableDebugLogging: boolean;
}

const DEFAULT_CONFIG: ContextValidationConfig = {
  enablePerformanceMonitoring: true,
  enableWarnings: true,
  maxValidationTime: 10, // milliseconds
  enableDebugLogging: process.env.NODE_ENV === 'development',
};

/**
 * Validates AppState structure and data integrity
 */
export const validateAppState = (
  state: unknown,
  config: Partial<ContextValidationConfig> = {}
): ValidationResult => {
  const startTime = performance.now();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Type guard for AppState
    if (!isValidAppState(state)) {
      errors.push('Invalid AppState structure');
      return createValidationResult(false, errors, warnings, startTime, state);
    }

    // Validate uploadedImages array
    if (!Array.isArray(state.uploadedImages)) {
      errors.push('UploadedImages must be an array');
    } else {
      state.uploadedImages.forEach((image, index) => {
        if (!image?.id || typeof image.id !== 'string') {
          errors.push(`Image at index ${index} missing valid id`);
        }
        if (!image?.url || typeof image.url !== 'string') {
          errors.push(`Image at index ${index} missing valid url`);
        }
      });
    }

    // Validate analyses array
    if (!Array.isArray(state.analyses)) {
      errors.push('Analyses must be an array');
    }

    // Validate imageGroups array
    if (!Array.isArray(state.imageGroups)) {
      errors.push('ImageGroups must be an array');
    }

    // Validate loading states
    if (typeof state.isLoading !== 'boolean') {
      warnings.push('isLoading should be boolean');
    }

    // Validate error state
    if (state.error !== null && typeof state.error !== 'string') {
      warnings.push('error should be null or string');
    }

    // Performance warning
    const validationTime = performance.now() - startTime;
    if (fullConfig.enablePerformanceMonitoring && validationTime > fullConfig.maxValidationTime) {
      warnings.push(`Validation took ${validationTime.toFixed(2)}ms (> ${fullConfig.maxValidationTime}ms)`);
    }

    return createValidationResult(errors.length === 0, errors, warnings, startTime, state);

  } catch (error) {
    errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return createValidationResult(false, errors, warnings, startTime, state);
  }
};

/**
 * Validates StrictAppContextValue structure
 */
export const validateContextValue = (
  value: unknown,
  config: Partial<ContextValidationConfig> = {}
): ValidationResult => {
  const startTime = performance.now();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!value || typeof value !== 'object') {
      errors.push('Context value must be an object');
      return createValidationResult(false, errors, warnings, startTime, value);
    }

    const contextValue = value as Record<string, unknown>;

    // Validate required properties
    if (!contextValue.state) {
      errors.push('Context missing state property');
    } else {
      const stateValidation = validateAppState(contextValue.state, config);
      errors.push(...stateValidation.errors);
      warnings.push(...stateValidation.warnings);
    }

    if (!contextValue.dispatch || typeof contextValue.dispatch !== 'function') {
      errors.push('Context missing valid dispatch function');
    }

    if (!contextValue.stableHelpers || typeof contextValue.stableHelpers !== 'object') {
      errors.push('Context missing stableHelpers object');
    } else {
      const helpersValidation = validateStableHelpers(contextValue.stableHelpers);
      errors.push(...helpersValidation.errors);
      warnings.push(...helpersValidation.warnings);
    }

    return createValidationResult(errors.length === 0, errors, warnings, startTime, value);

  } catch (error) {
    errors.push(`Context validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return createValidationResult(false, errors, warnings, startTime, value);
  }
};

/**
 * Validates StableHelpers structure
 */
export const validateStableHelpers = (
  helpers: unknown,
  config: Partial<ContextValidationConfig> = {}
): ValidationResult => {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!helpers || typeof helpers !== 'object') {
      errors.push('StableHelpers must be an object');
      return createValidationResult(false, errors, warnings, startTime, helpers);
    }

    const helpersObj = helpers as Record<string, unknown>;

    // Check for required helper functions
    const requiredFunctions = [
      'addImage', 'removeImage', 'updateImage', 'clearImages',
      'addProject', 'removeProject', 'updateProject',
      'setCurrentProject', 'resetAll'
    ];

    requiredFunctions.forEach(funcName => {
      if (typeof helpersObj[funcName] !== 'function') {
        errors.push(`StableHelpers missing function: ${funcName}`);
      }
    });

    return createValidationResult(errors.length === 0, errors, warnings, startTime, helpers);

  } catch (error) {
    errors.push(`StableHelpers validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return createValidationResult(false, errors, warnings, startTime, helpers);
  }
};

/**
 * Validates Auth context data
 */
export const validateAuthContext = (
  authValue: unknown,
  config: Partial<ContextValidationConfig> = {}
): ValidationResult => {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!authValue || typeof authValue !== 'object') {
      errors.push('Auth context must be an object');
      return createValidationResult(false, errors, warnings, startTime, authValue);
    }

    const auth = authValue as Record<string, unknown>;

    // Validate user property (can be null)
    if (auth.user !== null && auth.user !== undefined) {
      if (typeof auth.user !== 'object') {
        errors.push('Auth user must be object or null');
      } else {
        const user = auth.user as Record<string, unknown>;
        if (!user.id || typeof user.id !== 'string') {
          errors.push('Auth user missing valid id');
        }
      }
    }

    // Validate loading state
    if (typeof auth.loading !== 'boolean') {
      warnings.push('Auth loading should be boolean');
    }

    // Validate required functions
    const requiredFunctions = ['signIn', 'signOut', 'signUp'];
    requiredFunctions.forEach(funcName => {
      if (typeof auth[funcName] !== 'function') {
        errors.push(`Auth context missing function: ${funcName}`);
      }
    });

    return createValidationResult(errors.length === 0, errors, warnings, startTime, authValue);

  } catch (error) {
    errors.push(`Auth validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return createValidationResult(false, errors, warnings, startTime, authValue);
  }
};

/**
 * Type guard for AppState
 */
function isValidAppState(state: unknown): state is AppState {
  return (
    state !== null &&
    typeof state === 'object' &&
    'uploadedImages' in state &&
    'analyses' in state &&
    'selectedImageId' in state &&
    'imageGroups' in state &&
    'isLoading' in state &&
    'error' in state
  );
}

/**
 * Creates standardized validation result
 */
function createValidationResult(
  isValid: boolean,
  errors: string[],
  warnings: string[],
  startTime: number,
  data: unknown
): ValidationResult {
  const validationTime = performance.now() - startTime;
  const dataSize = JSON.stringify(data).length;

  return {
    isValid,
    errors,
    warnings,
    performance: {
      validationTime,
      dataSize,
    },
  };
}

/**
 * Utility to log validation results in development
 */
export const logValidationResult = (
  contextName: string,
  result: ValidationResult,
  config: Partial<ContextValidationConfig> = {}
): void => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!fullConfig.enableDebugLogging) return;

  const { isValid, errors, warnings, performance } = result;
  
  if (!isValid) {
    console.error(`[${contextName}] Validation failed:`, {
      errors,
      warnings,
      performance,
    });
  } else if (warnings.length > 0) {
    console.warn(`[${contextName}] Validation warnings:`, {
      warnings,
      performance,
    });
  } else {
    console.log(`[${contextName}] Validation passed (${performance.validationTime.toFixed(2)}ms)`);
  }
};

/**
 * Create validation configuration for different environments
 */
export const createValidationConfig = (
  environment: 'development' | 'production' | 'testing'
): ContextValidationConfig => {
  switch (environment) {
    case 'development':
      return {
        enablePerformanceMonitoring: true,
        enableWarnings: true,
        maxValidationTime: 20,
        enableDebugLogging: true,
      };
    case 'production':
      return {
        enablePerformanceMonitoring: true,
        enableWarnings: false,
        maxValidationTime: 5,
        enableDebugLogging: false,
      };
    case 'testing':
      return {
        enablePerformanceMonitoring: false,
        enableWarnings: true,
        maxValidationTime: 50,
        enableDebugLogging: false,
      };
    default:
      return DEFAULT_CONFIG;
  }
};