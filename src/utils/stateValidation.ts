/**
 * State Validation - Phase 2, Step 2.1: Atomic State Operations
 * Provides state validation for all reducers to prevent circular dependencies
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checkedProperties: string[];
}

interface StateSchema {
  uploadedImages: 'array';
  selectedImageId: 'string|null';
  analyses: 'array';
  imageGroups: 'array';
  generatedConcepts: 'array';
  isLoading: 'boolean';
  isSyncing: 'boolean';
  errors: 'array';
  lastError: 'string|null';
  annotationsVisible: 'boolean';
  galleryTool: 'string';
  groupDisplayMode: 'string';
}

const REQUIRED_STATE_SCHEMA: StateSchema = {
  uploadedImages: 'array',
  selectedImageId: 'string|null',
  analyses: 'array',
  imageGroups: 'array',
  generatedConcepts: 'array',
  isLoading: 'boolean',
  isSyncing: 'boolean',
  errors: 'array',
  lastError: 'string|null',
  annotationsVisible: 'boolean',
  galleryTool: 'string',
  groupDisplayMode: 'string'
};

/**
 * Main state validation function
 */
export function validateState(state: any, context = 'unknown'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checkedProperties: string[] = [];

  try {
    // Phase 1: Basic structure validation
    if (!state || typeof state !== 'object') {
      errors.push('State must be a valid object');
      return { isValid: false, errors, warnings, checkedProperties };
    }

    // Phase 2: Required properties validation
    for (const [property, expectedType] of Object.entries(REQUIRED_STATE_SCHEMA)) {
      checkedProperties.push(property);
      
      if (!(property in state)) {
        errors.push(`Missing required property: ${property}`);
        continue;
      }

      const value = state[property];
      const validationResult = validatePropertyType(value, expectedType, property);
      
      if (!validationResult.isValid) {
        errors.push(...validationResult.errors);
      }
      warnings.push(...validationResult.warnings);
    }

    // Phase 3: Circular reference detection
    const circularCheck = detectCircularReferences(state);
    if (!circularCheck.isValid) {
      errors.push(...circularCheck.errors);
    }

    // Phase 4: State consistency validation
    const consistencyCheck = validateStateConsistency(state);
    if (!consistencyCheck.isValid) {
      errors.push(...consistencyCheck.errors);
    }
    warnings.push(...consistencyCheck.warnings);

    // Phase 5: Performance validation
    const performanceCheck = validateStatePerformance(state);
    warnings.push(...performanceCheck.warnings);

    const isValid = errors.length === 0;
    
    if (!isValid && context !== 'unknown') {
      console.warn(`[StateValidation] Validation failed for context: ${context}`, {
        errors,
        warnings,
        checkedProperties
      });
    }

    return { isValid, errors, warnings, checkedProperties };

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return { isValid: false, errors, warnings, checkedProperties };
  }
}

/**
 * Validate individual property types
 */
function validatePropertyType(value: any, expectedType: string, propertyName: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle union types (e.g., 'string|null')
  const types = expectedType.split('|');
  let isValidType = false;

  for (const type of types) {
    const trimmedType = type.trim();
    
    if (trimmedType === 'null' && value === null) {
      isValidType = true;
      break;
    }
    
    if (trimmedType === 'array' && Array.isArray(value)) {
      isValidType = true;
      
      // Additional array validation
      if (value.length > 1000) {
        warnings.push(`Large array detected in ${propertyName}: ${value.length} items`);
      }
      break;
    }
    
    if (typeof value === trimmedType) {
      isValidType = true;
      break;
    }
  }

  if (!isValidType) {
    errors.push(`Property ${propertyName} has invalid type. Expected: ${expectedType}, got: ${typeof value}`);
  }

  return { isValid: errors.length === 0, errors, warnings, checkedProperties: [propertyName] };
}

/**
 * Detect circular references in state
 */
function detectCircularReferences(obj: any, visited = new WeakSet()): ValidationResult {
  const errors: string[] = [];
  
  try {
    if (obj && typeof obj === 'object') {
      if (visited.has(obj)) {
        errors.push('Circular reference detected in state');
        return { isValid: false, errors, warnings: [], checkedProperties: [] };
      }
      
      visited.add(obj);
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const result = detectCircularReferences(obj[key], visited);
          if (!result.isValid) {
            errors.push(...result.errors);
          }
        }
      }
    }
  } catch (error) {
    errors.push('Error during circular reference detection');
  }

  return { isValid: errors.length === 0, errors, warnings: [], checkedProperties: [] };
}

/**
 * Validate state consistency and relationships
 */
function validateStateConsistency(state: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check 1: Selected image exists in uploaded images
    if (state.selectedImageId && state.uploadedImages) {
      const imageExists = state.uploadedImages.some((img: any) => img.id === state.selectedImageId);
      if (!imageExists) {
        errors.push('Selected image ID does not exist in uploaded images');
      }
    }

    // Check 2: All analyses reference valid images
    if (state.analyses && state.uploadedImages) {
      for (const analysis of state.analyses) {
        if (analysis.imageId) {
          const imageExists = state.uploadedImages.some((img: any) => img.id === analysis.imageId);
          if (!imageExists) {
            warnings.push(`Analysis ${analysis.id} references non-existent image ${analysis.imageId}`);
          }
        }
      }
    }

    // Check 3: Image groups contain valid image references
    if (state.imageGroups && state.uploadedImages) {
      for (const group of state.imageGroups) {
        if (group.imageIds) {
          for (const imageId of group.imageIds) {
            const imageExists = state.uploadedImages.some((img: any) => img.id === imageId);
            if (!imageExists) {
              warnings.push(`Group ${group.id} references non-existent image ${imageId}`);
            }
          }
        }
      }
    }

    // Check 4: No duplicate IDs in arrays
    const duplicateCheck = checkForDuplicateIds(state);
    errors.push(...duplicateCheck.errors);
    warnings.push(...duplicateCheck.warnings);

  } catch (error) {
    errors.push(`Consistency validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { isValid: errors.length === 0, errors, warnings, checkedProperties: [] };
}

/**
 * Check for duplicate IDs in state arrays
 */
function checkForDuplicateIds(state: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const arrayProperties = ['uploadedImages', 'analyses', 'imageGroups', 'generatedConcepts'];

  for (const property of arrayProperties) {
    if (state[property] && Array.isArray(state[property])) {
      const ids = state[property]
        .map((item: any) => item.id)
        .filter((id: any) => id !== undefined && id !== null);
      
      const uniqueIds = new Set(ids);
      
      if (ids.length !== uniqueIds.size) {
        errors.push(`Duplicate IDs found in ${property}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings, checkedProperties: [] };
}

/**
 * Validate state performance characteristics
 */
function validateStatePerformance(state: any): ValidationResult {
  const warnings: string[] = [];

  try {
    // Check state size
    const stateString = JSON.stringify(state);
    const stateSizeKB = stateString.length / 1024;
    
    if (stateSizeKB > 1024) { // > 1MB
      warnings.push(`Large state detected: ${stateSizeKB.toFixed(2)}KB`);
    }

    // Check array sizes
    const arrayLimits = {
      uploadedImages: 100,
      analyses: 100,
      imageGroups: 50,
      generatedConcepts: 50,
      errors: 10
    };

    for (const [property, limit] of Object.entries(arrayLimits)) {
      if (state[property] && Array.isArray(state[property])) {
        if (state[property].length > limit) {
          warnings.push(`Large ${property} array: ${state[property].length} items (recommended max: ${limit})`);
        }
      }
    }

    // Check nested object depth
    const maxDepth = getObjectDepth(state);
    if (maxDepth > 10) {
      warnings.push(`Deep nesting detected: ${maxDepth} levels (may impact performance)`);
    }

  } catch (error) {
    warnings.push('Performance validation error');
  }

  return { isValid: true, errors: [], warnings, checkedProperties: [] };
}

/**
 * Get maximum object depth for performance monitoring
 */
function getObjectDepth(obj: any, depth = 0): number {
  if (!obj || typeof obj !== 'object' || depth > 20) {
    return depth;
  }

  let maxDepth = depth;
  
  try {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const childDepth = getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
  } catch (error) {
    // Handle potential issues with property access
  }

  return maxDepth;
}

/**
 * Validate specific state operation before execution
 */
export function validateStateOperation(
  currentState: any,
  operation: string,
  payload: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Operation-specific validation
    switch (operation) {
      case 'ADD_IMAGE':
        if (!payload || !payload.id) {
          errors.push('ADD_IMAGE requires payload with id');
        }
        break;
        
      case 'SET_SELECTED_IMAGE':
        if (payload !== null && typeof payload !== 'string') {
          errors.push('SET_SELECTED_IMAGE requires string ID or null');
        }
        break;
        
      case 'ADD_ANALYSIS':
        if (!payload || !payload.id || !payload.imageId) {
          errors.push('ADD_ANALYSIS requires payload with id and imageId');
        }
        break;
        
      case 'DELETE_IMAGE':
        if (!payload || typeof payload !== 'string') {
          errors.push('DELETE_IMAGE requires string imageId');
        }
        break;
        
      default:
        warnings.push(`Unknown operation: ${operation}`);
    }

    // Check if operation would create conflicts
    if (currentState && operation === 'ADD_IMAGE' && payload?.id) {
      const exists = currentState.uploadedImages?.some((img: any) => img.id === payload.id);
      if (exists) {
        errors.push(`Image with ID ${payload.id} already exists`);
      }
    }

  } catch (error) {
    errors.push(`Operation validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { isValid: errors.length === 0, errors, warnings, checkedProperties: [] };
}

/**
 * Create emergency fallback state (only when absolutely necessary)
 */
export function createEmergencyState(): any {
  console.warn('[StateValidation] Creating emergency fallback state - this should not happen in normal operation');
  
  return {
    uploadedImages: [],
    selectedImageId: null,
    analyses: [],
    imageGroups: [],
    generatedConcepts: [],
    isLoading: false,
    isSyncing: false,
    errors: ['Emergency state recovery triggered'],
    lastError: 'State validation failed completely',
    annotationsVisible: true,
    galleryTool: 'select',
    groupDisplayMode: 'grid'
  };
}