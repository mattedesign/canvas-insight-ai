/**
 * Storage Validation Utilities
 * Phase 2, Step 2.2: Storage Architecture Overhaul
 */

import { StorageResult, StorageMetadata } from '@/services/storage/StorageAdapter';

export interface ValidationRule {
  name: string;
  validate: (value: any, metadata?: StorageMetadata) => boolean;
  message: string;
}

export interface ValidationConfig {
  rules: ValidationRule[];
  strict: boolean; // If true, any validation failure rejects the operation
}

export class StorageValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private globalRules: ValidationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Global validation rules that apply to all storage operations
    this.globalRules = [
      {
        name: 'not_null',
        validate: (value: any) => value !== null && value !== undefined,
        message: 'Value cannot be null or undefined'
      },
      {
        name: 'serializable',
        validate: (value: any) => {
          try {
            JSON.stringify(value);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Value must be JSON serializable'
      },
      {
        name: 'size_limit',
        validate: (value: any, metadata?: StorageMetadata) => {
          const maxSize = 50 * 1024 * 1024; // 50MB default limit
          const size = metadata?.size || new Blob([JSON.stringify(value)]).size;
          return size <= maxSize;
        },
        message: 'Value exceeds maximum size limit (50MB)'
      }
    ];
  }

  // Add validation rules for specific keys or key patterns
  addRule(keyPattern: string, rule: ValidationRule): void {
    if (!this.rules.has(keyPattern)) {
      this.rules.set(keyPattern, []);
    }
    this.rules.get(keyPattern)!.push(rule);
  }

  // Add multiple rules for a key pattern
  addRules(keyPattern: string, rules: ValidationRule[]): void {
    if (!this.rules.has(keyPattern)) {
      this.rules.set(keyPattern, []);
    }
    this.rules.get(keyPattern)!.push(...rules);
  }

  // Validate a value before storage
  validate(key: string, value: any, metadata?: StorageMetadata): ValidationResult {
    const failures: string[] = [];

    // Apply global rules
    for (const rule of this.globalRules) {
      if (!rule.validate(value, metadata)) {
        failures.push(`${rule.name}: ${rule.message}`);
      }
    }

    // Apply key-specific rules
    for (const [pattern, rules] of this.rules.entries()) {
      if (this.matchesPattern(key, pattern)) {
        for (const rule of rules) {
          if (!rule.validate(value, metadata)) {
            failures.push(`${rule.name}: ${rule.message}`);
          }
        }
      }
    }

    return {
      isValid: failures.length === 0,
      failures,
      key,
      validatedAt: Date.now()
    };
  }

  // Validate multiple key-value pairs
  validateBatch(items: Record<string, any>): BatchValidationResult {
    const results: Record<string, ValidationResult> = {};
    let hasFailures = false;

    for (const [key, value] of Object.entries(items)) {
      const result = this.validate(key, value);
      results[key] = result;
      if (!result.isValid) {
        hasFailures = true;
      }
    }

    return {
      isValid: !hasFailures,
      results,
      validatedAt: Date.now()
    };
  }

  // Check if a key matches a pattern (supports wildcards)
  private matchesPattern(key: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  // Create domain-specific validators
  static createImageValidator(): StorageValidator {
    const validator = new StorageValidator();
    
    validator.addRules('image:*', [
      {
        name: 'valid_image_data',
        validate: (value: any) => {
          return value && typeof value === 'object' && 
                 'url' in value && 'filename' in value;
        },
        message: 'Image data must contain url and filename'
      },
      {
        name: 'valid_url',
        validate: (value: any) => {
          try {
            new URL(value.url);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Image URL must be valid'
      }
    ]);

    return validator;
  }

  static createAnalysisValidator(): StorageValidator {
    const validator = new StorageValidator();
    
    validator.addRules('analysis:*', [
      {
        name: 'valid_analysis_structure',
        validate: (value: any) => {
          return value && typeof value === 'object' && 
                 'id' in value && 'results' in value;
        },
        message: 'Analysis data must contain id and results'
      },
      {
        name: 'results_array',
        validate: (value: any) => {
          return Array.isArray(value.results);
        },
        message: 'Analysis results must be an array'
      }
    ]);

    return validator;
  }

  static createProjectValidator(): StorageValidator {
    const validator = new StorageValidator();
    
    validator.addRules('project:*', [
      {
        name: 'valid_project_structure',
        validate: (value: any) => {
          return value && typeof value === 'object' && 
                 'name' in value && 'id' in value;
        },
        message: 'Project data must contain name and id'
      },
      {
        name: 'valid_name',
        validate: (value: any) => {
          return typeof value.name === 'string' && value.name.length > 0;
        },
        message: 'Project name must be a non-empty string'
      }
    ]);

    return validator;
  }
}

export interface ValidationResult {
  isValid: boolean;
  failures: string[];
  key: string;
  validatedAt: number;
}

export interface BatchValidationResult {
  isValid: boolean;
  results: Record<string, ValidationResult>;
  validatedAt: number;
}

// Utility functions for common validation scenarios
export const commonValidators = {
  // Validate data integrity with checksums
  validateChecksum: (value: any, expectedChecksum: string): boolean => {
    const actualChecksum = btoa(JSON.stringify(value)).slice(0, 16);
    return actualChecksum === expectedChecksum;
  },

  // Validate timestamp freshness
  validateFreshness: (metadata: StorageMetadata, maxAgeMs: number): boolean => {
    const age = Date.now() - metadata.timestamp;
    return age <= maxAgeMs;
  },

  // Validate version compatibility
  validateVersion: (metadata: StorageMetadata, compatibleVersions: string[]): boolean => {
    return compatibleVersions.includes(metadata.version);
  },

  // Validate data structure against schema
  validateSchema: (value: any, schema: Record<string, string>): boolean => {
    for (const [key, expectedType] of Object.entries(schema)) {
      if (!(key in value) || typeof value[key] !== expectedType) {
        return false;
      }
    }
    return true;
  }
};

// Helper function to create storage operation results with validation
export function createValidatedResult<T>(
  success: boolean,
  data?: T,
  validation?: ValidationResult,
  error?: string
): StorageResult<T> & { validation?: ValidationResult } {
  return {
    success,
    data,
    error,
    validation
  };
}