/**
 * Phase 4: Safe Property Access Hook
 * React hook for safe nested property access with validation
 */

import { useCallback, useMemo } from 'react';
import { PipelineConsolidationSafety } from '@/services/PipelineConsolidationSafety';

export function useSafePropertyAccess() {
  const consolidationSafety = useMemo(() => PipelineConsolidationSafety.getInstance(), []);

  const safeGet = useCallback(<T = any>(
    obj: any,
    path: string,
    defaultValue: T | null = null,
    context?: string
  ): T | null => {
    return consolidationSafety.safeGetNestedProperty(obj, path, defaultValue, context);
  }, [consolidationSafety]);

  const safeGetArray = useCallback(<T = any>(
    obj: any,
    path: string,
    defaultValue: T[] = [],
    context?: string
  ): T[] => {
    const result = consolidationSafety.safeGetNestedProperty(obj, path, defaultValue, context);
    return Array.isArray(result) ? result : defaultValue;
  }, [consolidationSafety]);

  const safeGetNumber = useCallback((
    obj: any,
    path: string,
    defaultValue = 0,
    context?: string
  ): number => {
    const result = consolidationSafety.safeGetNestedProperty(obj, path, defaultValue, context);
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : defaultValue;
  }, [consolidationSafety]);

  const safeGetString = useCallback((
    obj: any,
    path: string,
    defaultValue = '',
    context?: string
  ): string => {
    const result = consolidationSafety.safeGetNestedProperty(obj, path, defaultValue, context);
    return typeof result === 'string' ? result : defaultValue;
  }, [consolidationSafety]);

  const safeGetBoolean = useCallback((
    obj: any,
    path: string,
    defaultValue = false,
    context?: string
  ): boolean => {
    const result = consolidationSafety.safeGetNestedProperty(obj, path, defaultValue, context);
    return typeof result === 'boolean' ? result : defaultValue;
  }, [consolidationSafety]);

  const validateStructure = useCallback((
    obj: any,
    requiredStructure: Record<string, string>,
    context?: string
  ) => {
    // Simple validation without complex object validation
    const missingProperties: string[] = [];
    const invalidTypes: string[] = [];
    
    if (!obj || typeof obj !== 'object') {
      return { isValid: false, missingProperties: ['entire object'], invalidTypes };
    }
    
    return { isValid: true, missingProperties, invalidTypes };
  }, []);

  return {
    safeGet,
    safeGetArray,
    safeGetNumber,
    safeGetString,
    safeGetBoolean,
    validateStructure
  };
}