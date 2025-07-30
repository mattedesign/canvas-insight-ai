/**
 * Phase 4: Strict Type Validation Hook
 * Runtime type validation for state management
 */

import { useCallback, useRef } from 'react';
import { 
  StrictAppState, 
  StrictAppAction, 
  isStrictUploadedImage, 
  isStrictUXAnalysis, 
  isStrictAppAction 
} from '@/types/strict-interfaces';

interface ValidationError {
  readonly type: 'state' | 'action' | 'prop';
  readonly message: string;
  readonly timestamp: Date;
  readonly componentName?: string;
}

export function useStrictTypeValidation(componentName: string) {
  const validationErrors = useRef<ValidationError[]>([]);
  const maxErrors = 50; // Prevent memory leaks

  const logValidationError = useCallback((error: ValidationError) => {
    validationErrors.current.push(error);
    
    // Keep only the most recent errors
    if (validationErrors.current.length > maxErrors) {
      validationErrors.current = validationErrors.current.slice(-maxErrors);
    }
    
    console.error(`[${componentName}] Type Validation Error:`, error);
  }, [componentName]);

  const validateState = useCallback((state: unknown): state is StrictAppState => {
    if (!state || typeof state !== 'object') {
      logValidationError({
        type: 'state',
        message: 'State is not an object',
        timestamp: new Date(),
        componentName
      });
      return false;
    }

    const stateObj = state as any;
    
    // Validate required properties
    const requiredProps = ['images', 'analyses', 'groups', 'selectedImageId', 'selectedGroupId', 'isLoading', 'isInitialized', 'error', 'lastSync'];
    for (const prop of requiredProps) {
      if (!(prop in stateObj)) {
        logValidationError({
          type: 'state',
          message: `Missing required property: ${prop}`,
          timestamp: new Date(),
          componentName
        });
        return false;
      }
    }

    // Validate array properties
    if (!Array.isArray(stateObj.images)) {
      logValidationError({
        type: 'state',
        message: 'images is not an array',
        timestamp: new Date(),
        componentName
      });
      return false;
    }

    // Validate images array elements
    for (let i = 0; i < stateObj.images.length; i++) {
      if (!isStrictUploadedImage(stateObj.images[i])) {
        logValidationError({
          type: 'state',
          message: `Invalid image at index ${i}`,
          timestamp: new Date(),
          componentName
        });
        return false;
      }
    }

    // Validate analyses array elements
    if (!Array.isArray(stateObj.analyses)) {
      logValidationError({
        type: 'state',
        message: 'analyses is not an array',
        timestamp: new Date(),
        componentName
      });
      return false;
    }

    for (let i = 0; i < stateObj.analyses.length; i++) {
      if (!isStrictUXAnalysis(stateObj.analyses[i])) {
        logValidationError({
          type: 'state',
          message: `Invalid analysis at index ${i}`,
          timestamp: new Date(),
          componentName
        });
        return false;
      }
    }

    return true;
  }, [logValidationError, componentName]);

  const validateAction = useCallback((action: unknown): action is StrictAppAction => {
    if (!isStrictAppAction(action)) {
      logValidationError({
        type: 'action',
        message: 'Invalid action format',
        timestamp: new Date(),
        componentName
      });
      return false;
    }

    return true;
  }, [logValidationError, componentName]);

  const validateProps = useCallback(<T extends Record<string, unknown>>(
    props: T,
    expectedProps: (keyof T)[]
  ): boolean => {
    for (const prop of expectedProps) {
      if (!(prop in props)) {
        logValidationError({
          type: 'prop',
          message: `Missing required prop: ${String(prop)}`,
          timestamp: new Date(),
          componentName
        });
        return false;
      }
    }
    return true;
  }, [logValidationError, componentName]);

  const getValidationErrors = useCallback(() => {
    return [...validationErrors.current];
  }, []);

  const clearValidationErrors = useCallback(() => {
    validationErrors.current = [];
  }, []);

  const getValidationStats = useCallback(() => {
    const errors = validationErrors.current;
    const now = new Date();
    const recentErrors = errors.filter(error => 
      now.getTime() - error.timestamp.getTime() < 60000 // Last minute
    );

    return {
      totalErrors: errors.length,
      recentErrors: recentErrors.length,
      errorsByType: {
        state: errors.filter(e => e.type === 'state').length,
        action: errors.filter(e => e.type === 'action').length,
        prop: errors.filter(e => e.type === 'prop').length
      },
      lastError: errors[errors.length - 1] || null
    };
  }, []);

  return {
    validateState,
    validateAction,
    validateProps,
    getValidationErrors,
    clearValidationErrors,
    getValidationStats
  };
}

// Performance-aware validation wrapper
export function useOptimizedValidation(componentName: string, enableInProduction = false) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shouldValidate = isDevelopment || enableInProduction;
  
  const validation = useStrictTypeValidation(componentName);
  
  // Return no-op functions in production unless explicitly enabled
  if (!shouldValidate) {
    return {
      validateState: () => true,
      validateAction: () => true,
      validateProps: () => true,
      getValidationErrors: () => [],
      clearValidationErrors: () => {},
      getValidationStats: () => ({
        totalErrors: 0,
        recentErrors: 0,
        errorsByType: { state: 0, action: 0, prop: 0 },
        lastError: null
      })
    };
  }
  
  return validation;
}
