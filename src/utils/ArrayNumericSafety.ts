/**
 * Phase 3: Array & Numeric Safety Utilities
 * Comprehensive safety utilities for array operations and numeric calculations
 */

export interface ArraySafetyConfig {
  logWarnings: boolean;
  throwOnCriticalErrors: boolean;
  maxArraySize: number;
}

export interface NumericSafetyConfig {
  allowNegative: boolean;
  allowZero: boolean;
  maxValue: number;
  minValue: number;
  decimalPlaces: number;
}

export class ArrayNumericSafety {
  private static instance: ArrayNumericSafety;
  private config: ArraySafetyConfig = {
    logWarnings: process.env.NODE_ENV === 'development',
    throwOnCriticalErrors: false,
    maxArraySize: 10000
  };

  private constructor() {}

  static getInstance(): ArrayNumericSafety {
    if (!ArrayNumericSafety.instance) {
      ArrayNumericSafety.instance = new ArrayNumericSafety();
    }
    return ArrayNumericSafety.instance;
  }

  /**
   * Phase 3: Safe Array Operations with comprehensive validation
   */
  safeMap<T, R>(
    input: any,
    mapper: (item: T, index: number, array: T[]) => R,
    defaultValue: R[] = [],
    context = 'unknown'
  ): R[] {
    if (!this.isValidArray(input, context)) {
      return defaultValue;
    }

    if (input.length > this.config.maxArraySize) {
      this.warn(`Array too large (${input.length}), truncating to ${this.config.maxArraySize}`, context);
      input = input.slice(0, this.config.maxArraySize);
    }

    try {
      const validItems = input.filter(this.isValidArrayItem);
      return validItems.map((item, index) => {
        try {
          return mapper(item, index, validItems);
        } catch (error) {
          this.warn(`Mapper failed for item at index ${index}:`, error, context);
          return null;
        }
      }).filter(result => result !== null);
    } catch (error) {
      this.warn('Array map operation failed:', error, context);
      return defaultValue;
    }
  }

  safeFilter<T>(
    input: any,
    predicate: (item: T, index: number, array: T[]) => boolean,
    defaultValue: T[] = [],
    context = 'unknown'
  ): T[] {
    if (!this.isValidArray(input, context)) {
      return defaultValue;
    }

    try {
      const validItems = input.filter(this.isValidArrayItem);
      return validItems.filter((item, index) => {
        try {
          return predicate(item, index, validItems);
        } catch (error) {
          this.warn(`Filter predicate failed for item at index ${index}:`, error, context);
          return false;
        }
      });
    } catch (error) {
      this.warn('Array filter operation failed:', error, context);
      return defaultValue;
    }
  }

  safeReduce<T, R>(
    input: any,
    reducer: (accumulator: R, currentValue: T, currentIndex: number, array: T[]) => R,
    initialValue: R,
    context = 'unknown'
  ): R {
    if (!this.isValidArray(input, context)) {
      return initialValue;
    }

    try {
      const validItems = input.filter(this.isValidArrayItem);
      return validItems.reduce((acc, item, index) => {
        try {
          return reducer(acc, item, index, validItems);
        } catch (error) {
          this.warn(`Reducer failed for item at index ${index}:`, error, context);
          return acc;
        }
      }, initialValue);
    } catch (error) {
      this.warn('Array reduce operation failed:', error, context);
      return initialValue;
    }
  }

  safeFlatMap<T, R>(
    input: any,
    mapper: (item: T, index: number, array: T[]) => R[],
    defaultValue: R[] = [],
    context = 'unknown'
  ): R[] {
    if (!this.isValidArray(input, context)) {
      return defaultValue;
    }

    try {
      const mapped = this.safeMap(input, mapper, [], context);
      return (mapped as R[][]).flat().filter(this.isValidArrayItem);
    } catch (error) {
      this.warn('Array flatMap operation failed:', error, context);
      return defaultValue;
    }
  }

  safeFind<T>(
    input: any,
    predicate: (item: T, index: number, array: T[]) => boolean,
    defaultValue: T | null = null,
    context = 'unknown'
  ): T | null {
    if (!this.isValidArray(input, context)) {
      return defaultValue;
    }

    try {
      const validItems = input.filter(this.isValidArrayItem);
      return validItems.find((item, index) => {
        try {
          return predicate(item, index, validItems);
        } catch (error) {
          this.warn(`Find predicate failed for item at index ${index}:`, error, context);
          return false;
        }
      }) || defaultValue;
    } catch (error) {
      this.warn('Array find operation failed:', error, context);
      return defaultValue;
    }
  }

  /**
   * Phase 3: Safe Array Merging for fusion operations
   */
  safeMergeArrays<T>(
    arrays: any[],
    deduplicationKey?: string | ((item: T) => string),
    context = 'unknown'
  ): T[] {
    if (!Array.isArray(arrays)) {
      this.warn('Input is not an array of arrays', context);
      return [];
    }

    const validArrays = arrays.filter(arr => this.isValidArray(arr, context));
    if (validArrays.length === 0) {
      return [];
    }

    try {
      let merged = validArrays.flat().filter(this.isValidArrayItem);

      // Apply deduplication if key provided
      if (deduplicationKey) {
        const seen = new Set<string>();
        merged = merged.filter(item => {
          try {
            const key = typeof deduplicationKey === 'function' 
              ? deduplicationKey(item)
              : item[deduplicationKey];
            
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          } catch (error) {
            this.warn('Deduplication key extraction failed:', error, context);
            return true; // Include item if key extraction fails
          }
        });
      }

      return merged;
    } catch (error) {
      this.warn('Array merge operation failed:', error, context);
      return [];
    }
  }

  /**
   * Phase 3: Safe Numeric Operations
   */
  safeAdd(a: any, b: any, defaultValue = 0): number {
    const numA = this.sanitizeNumber(a, 0);
    const numB = this.sanitizeNumber(b, 0);
    
    const result = numA + numB;
    return this.isValidNumber(result) ? result : defaultValue;
  }

  safeDivide(
    numerator: any, 
    denominator: any, 
    defaultValue = 0,
    config: Partial<NumericSafetyConfig> = {}
  ): number {
    const num = this.sanitizeNumber(numerator, 0);
    const den = this.sanitizeNumber(denominator, 1);
    
    // Check for division by zero
    if (den === 0) {
      this.warn('Division by zero attempted');
      return defaultValue;
    }

    const result = num / den;
    
    if (!this.isValidNumber(result)) {
      this.warn(`Division resulted in invalid number: ${num} / ${den} = ${result}`);
      return defaultValue;
    }

    // Apply range validation
    const finalConfig = { minValue: -Infinity, maxValue: Infinity, ...config };
    if (result < finalConfig.minValue || result > finalConfig.maxValue) {
      this.warn(`Division result ${result} outside valid range [${finalConfig.minValue}, ${finalConfig.maxValue}]`);
      return Math.max(finalConfig.minValue, Math.min(finalConfig.maxValue, result));
    }

    return result;
  }

  safeAverage(
    values: any,
    defaultValue = 0,
    config: Partial<NumericSafetyConfig> = {}
  ): number {
    if (!this.isValidArray(values, 'safeAverage')) {
      return defaultValue;
    }

    const validNumbers = values
      .map(v => this.sanitizeNumber(v, null))
      .filter(v => v !== null);

    if (validNumbers.length === 0) {
      this.warn('No valid numbers found for average calculation');
      return defaultValue;
    }

    const sum = validNumbers.reduce((acc, val) => this.safeAdd(acc, val, acc), 0);
    return this.safeDivide(sum, validNumbers.length, defaultValue, config);
  }

  safePercentage(
    value: any,
    total: any,
    defaultValue = 0,
    precision = 2
  ): number {
    const percentage = this.safeDivide(value, total, 0) * 100;
    
    if (!this.isValidNumber(percentage)) {
      return defaultValue;
    }

    return Math.round(percentage * Math.pow(10, precision)) / Math.pow(10, precision);
  }

  /**
   * Phase 3: Safe Object Property Access
   */
  safeGetProperty(
    obj: any,
    path: string,
    defaultValue: any = null,
    context = 'unknown'
  ): any {
    if (!obj || typeof obj !== 'object') {
      this.warn(`Invalid object for property access: ${path}`, context);
      return defaultValue;
    }

    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      
      if (current === null || current === undefined) {
        this.warn(`Null/undefined encountered at ${keys.slice(0, i + 1).join('.')} in path ${path}`, context);
        return defaultValue;
      }

      if (!(key in current)) {
        this.warn(`Property ${key} not found in path ${path} at ${keys.slice(0, i + 1).join('.')}`, context);
        return defaultValue;
      }

      current = current[key];
    }

    return current !== null && current !== undefined ? current : defaultValue;
  }

  /**
   * Phase 3: Array Length Safety
   */
  safeLength(input: any, defaultValue = 0): number {
    if (Array.isArray(input)) {
      return input.length;
    }
    
    if (typeof input === 'string') {
      return input.length;
    }
    
    if (input && typeof input === 'object' && 'length' in input) {
      const length = input.length;
      return typeof length === 'number' && !isNaN(length) && length >= 0 ? length : defaultValue;
    }
    
    return defaultValue;
  }

  /**
   * Phase 3: Public validation helper for external use
   */
  isValidArray(input: any, context?: string): input is any[] {
    if (input === null || input === undefined) {
      this.warn('Array is null or undefined', context);
      return false;
    }

    if (!Array.isArray(input)) {
      this.warn(`Expected array but got ${typeof input}`, context);
      return false;
    }

    return true;
  }

  /**
   * Phase 3: Validation Helpers (private)
   */
  private isValidArrayInternal(input: any, context?: string): input is any[] {
    return this.isValidArray(input, context);
  }

  private isValidArrayItem(item: any): boolean {
    return item !== null && item !== undefined;
  }

  private isValidNumber(value: any): value is number {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value);
  }

  private sanitizeNumber(value: any, defaultValue: number | null): number | null {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    if (typeof value === 'number') {
      return this.isValidNumber(value) ? value : defaultValue;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return this.isValidNumber(parsed) ? parsed : defaultValue;
    }

    return defaultValue;
  }

  private warn(message: string, error?: any, context?: string): void {
    if (this.config.logWarnings) {
      const contextStr = context ? `[${context}]` : '';
      console.warn(`[ArrayNumericSafety]${contextStr} ${message}`, error);
    }
  }

  /**
   * Configuration methods
   */
  configure(config: Partial<ArraySafetyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getStats(): {
    operationsPerformed: number;
    warningsLogged: number;
    errorsHandled: number;
  } {
    // In a real implementation, these would be tracked
    return {
      operationsPerformed: 0,
      warningsLogged: 0,
      errorsHandled: 0
    };
  }
}