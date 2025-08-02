/**
 * ✅ PHASE 3.2: DATA VALIDATION UTILITIES
 * Validation schemas and functions for data transformation boundaries
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationSchema {
  required?: string[];
  optional?: string[];
  types?: Record<string, string>;
  constraints?: Record<string, (value: any) => boolean>;
  nested?: Record<string, ValidationSchema>;
}

/**
 * ✅ PHASE 3.2: Validation schemas for different data types
 */
const VALIDATION_SCHEMAS: Record<string, ValidationSchema> = {
  image_data: {
    required: ['id'],
    optional: ['filename', 'url', 'storage_path', 'metadata', 'project_id', 'file_size', 'file_type', 'dimensions'],
    types: {
      id: 'string',
      filename: 'string',
      url: 'string',
      storage_path: 'string',
      metadata: 'object',
      project_id: 'string',
      file_size: 'number',
      file_type: 'string',
      dimensions: 'object'
    },
    constraints: {
      id: (value) => typeof value === 'string' && value.length > 0,
      file_size: (value) => typeof value === 'number' && value > 0,
      file_type: (value) => typeof value === 'string' && /^image\//.test(value)
    },
    nested: {
      dimensions: {
        optional: ['width', 'height'],
        types: {
          width: 'number',
          height: 'number'
        }
      }
    }
  },

  analysis_data: {
    required: ['id'],
    optional: ['image_id', 'project_id', 'results', 'summary', 'suggestions', 'visual_annotations', 'metadata', 'status', 'analysis_type'],
    types: {
      id: 'string',
      image_id: 'string',
      project_id: 'string',
      results: 'object',
      summary: 'object',
      suggestions: 'object',
      visual_annotations: 'object',
      metadata: 'object',
      status: 'string',
      analysis_type: 'string'
    },
    constraints: {
      id: (value) => typeof value === 'string' && value.length > 0,
      status: (value) => ['pending', 'completed', 'failed', 'cancelled'].includes(value),
      suggestions: (value) => Array.isArray(value) || typeof value === 'object',
      visual_annotations: (value) => Array.isArray(value) || typeof value === 'object'
    }
  },

  group_data: {
    required: ['id', 'name'],
    optional: ['description', 'color', 'position', 'project_id', 'imageIds', 'metadata'],
    types: {
      id: 'string',
      name: 'string',
      description: 'string',
      color: 'string',
      position: 'object',
      project_id: 'string',
      imageIds: 'object',
      metadata: 'object'
    },
    constraints: {
      id: (value) => typeof value === 'string' && value.length > 0,
      name: (value) => typeof value === 'string' && value.trim().length > 0,
      color: (value) => typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value),
      imageIds: (value) => Array.isArray(value)
    }
  },

  project_data: {
    required: ['id', 'name'],
    optional: ['description', 'slug', 'user_id', 'metadata', 'created_at', 'updated_at'],
    types: {
      id: 'string',
      name: 'string',
      description: 'string',
      slug: 'string',
      user_id: 'string',
      metadata: 'object'
    },
    constraints: {
      id: (value) => typeof value === 'string' && value.length > 0,
      name: (value) => typeof value === 'string' && value.trim().length > 0,
      slug: (value) => typeof value === 'string' && /^[a-z0-9-]+$/.test(value)
    }
  }
};

/**
 * ✅ PHASE 3.2: Validate transformation input data
 */
export function validateTransformationInput(type: string, data: any): ValidationResult {
  const startTime = Date.now();
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // Check if validation schema exists
    const schema = VALIDATION_SCHEMAS[type];
    if (!schema) {
      result.warnings.push(`No validation schema found for type: ${type}`);
      return result;
    }

    // Validate data is an object
    if (!data || typeof data !== 'object') {
      result.valid = false;
      result.errors.push('Input data must be an object');
      return result;
    }

    // Validate required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data) || data[field] === null || data[field] === undefined) {
          result.valid = false;
          result.errors.push(`Required field missing: ${field}`);
        }
      }
    }

    // Validate field types
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (field in data && data[field] !== null && data[field] !== undefined) {
          const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
          const normalizedExpectedType = expectedType === 'object' && Array.isArray(data[field]) ? 'array' : expectedType;
          
          if (actualType !== normalizedExpectedType) {
            result.valid = false;
            result.errors.push(`Field ${field} should be ${expectedType}, got ${actualType}`);
          }
        }
      }
    }

    // Validate constraints
    if (schema.constraints) {
      for (const [field, constraint] of Object.entries(schema.constraints)) {
        if (field in data && data[field] !== null && data[field] !== undefined) {
          try {
            if (!constraint(data[field])) {
              result.valid = false;
              result.errors.push(`Field ${field} failed constraint validation`);
            }
          } catch (error) {
            result.valid = false;
            result.errors.push(`Error validating constraint for ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Validate nested objects
    if (schema.nested) {
      for (const [field, nestedSchema] of Object.entries(schema.nested)) {
        if (field in data && data[field] && typeof data[field] === 'object') {
          const nestedResult = validateNestedObject(data[field], nestedSchema);
          if (!nestedResult.valid) {
            result.valid = false;
            result.errors.push(...nestedResult.errors.map(err => `${field}.${err}`));
          }
          result.warnings.push(...nestedResult.warnings.map(warn => `${field}.${warn}`));
        }
      }
    }

    const duration = Date.now() - startTime;
    if (duration > 100) {
      result.warnings.push(`Validation took ${duration}ms (performance warning)`);
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * ✅ PHASE 3.2: Validate transformation output data
 */
export function validateTransformationOutput(type: string, data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // Basic output validation
    if (data === null || data === undefined) {
      result.valid = false;
      result.errors.push('Output data cannot be null or undefined');
      return result;
    }

    // Type-specific output validation
    switch (type) {
      case 'image_data':
        return validateImageDataOutput(data);
      case 'analysis_data':
        return validateAnalysisDataOutput(data);
      case 'group_data':
        return validateGroupDataOutput(data);
      case 'project_data':
        return validateProjectDataOutput(data);
      default:
        result.warnings.push(`No specific output validation for type: ${type}`);
        break;
    }

    // Generic output validation
    if (typeof data === 'object' && !Array.isArray(data)) {
      // Check for common required fields in transformed output
      if (!data.id) {
        result.valid = false;
        result.errors.push('Transformed output must have an id field');
      }

      // Check for originalData preservation
      if (!data.originalData) {
        result.warnings.push('Original data not preserved in transformation output');
      }
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Output validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * ✅ PHASE 3.2: Validate nested object structure
 */
function validateNestedObject(data: any, schema: ValidationSchema): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Validate required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        result.valid = false;
        result.errors.push(`Required field missing: ${field}`);
      }
    }
  }

  // Validate field types
  if (schema.types) {
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in data && data[field] !== null && data[field] !== undefined) {
        const actualType = typeof data[field];
        if (actualType !== expectedType) {
          result.valid = false;
          result.errors.push(`Field ${field} should be ${expectedType}, got ${actualType}`);
        }
      }
    }
  }

  return result;
}

/**
 * ✅ PHASE 3.2: Validate image data output
 */
function validateImageDataOutput(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const requiredFields = ['id', 'filename', 'url'];
  for (const field of requiredFields) {
    if (!data[field]) {
      result.valid = false;
      result.errors.push(`Image output missing required field: ${field}`);
    }
  }

  if (data.metadata && typeof data.metadata !== 'object') {
    result.valid = false;
    result.errors.push('Image metadata must be an object');
  }

  return result;
}

/**
 * ✅ PHASE 3.2: Validate analysis data output
 */
function validateAnalysisDataOutput(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const requiredFields = ['id'];
  for (const field of requiredFields) {
    if (!data[field]) {
      result.valid = false;
      result.errors.push(`Analysis output missing required field: ${field}`);
    }
  }

  if (data.suggestions && !Array.isArray(data.suggestions)) {
    result.valid = false;
    result.errors.push('Analysis suggestions must be an array');
  }

  if (data.visualAnnotations && !Array.isArray(data.visualAnnotations)) {
    result.valid = false;
    result.errors.push('Analysis visual annotations must be an array');
  }

  return result;
}

/**
 * ✅ PHASE 3.2: Validate group data output
 */
function validateGroupDataOutput(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const requiredFields = ['id', 'name'];
  for (const field of requiredFields) {
    if (!data[field]) {
      result.valid = false;
      result.errors.push(`Group output missing required field: ${field}`);
    }
  }

  if (data.imageIds && !Array.isArray(data.imageIds)) {
    result.valid = false;
    result.errors.push('Group imageIds must be an array');
  }

  return result;
}

/**
 * ✅ PHASE 3.2: Validate project data output
 */
function validateProjectDataOutput(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const requiredFields = ['id', 'name'];
  for (const field of requiredFields) {
    if (!data[field]) {
      result.valid = false;
      result.errors.push(`Project output missing required field: ${field}`);
    }
  }

  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    result.valid = false;
    result.errors.push('Project slug must contain only lowercase letters, numbers, and hyphens');
  }

  return result;
}

/**
 * ✅ PHASE 3.2: Batch validation for multiple items
 */
export function validateBatch<T>(
  type: string,
  items: T[],
  validator: (type: string, item: T) => ValidationResult
): {
  overallValid: boolean;
  results: Array<ValidationResult & { index: number }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    totalErrors: number;
    totalWarnings: number;
  };
} {
  const results = items.map((item, index) => ({
    ...validator(type, item),
    index
  }));

  const summary = {
    total: items.length,
    valid: results.filter(r => r.valid).length,
    invalid: results.filter(r => !r.valid).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
  };

  return {
    overallValid: summary.invalid === 0,
    results,
    summary
  };
}

/**
 * ✅ PHASE 3.2: Sanitize data for transformation
 */
export function sanitizeTransformationData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeTransformationData);
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Remove null/undefined values
      if (value !== null && value !== undefined) {
        // Remove empty strings unless they're explicitly allowed
        if (typeof value === 'string' && value.trim() === '' && key !== 'description') {
          continue;
        }
        sanitized[key] = sanitizeTransformationData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * ✅ PHASE 3.2: Get validation schema for a type
 */
export function getValidationSchema(type: string): ValidationSchema | null {
  return VALIDATION_SCHEMAS[type] || null;
}

/**
 * ✅ PHASE 3.2: Register custom validation schema
 */
export function registerValidationSchema(type: string, schema: ValidationSchema): void {
  VALIDATION_SCHEMAS[type] = schema;
  console.log(`[DataValidation] Registered validation schema for type: ${type}`);
}