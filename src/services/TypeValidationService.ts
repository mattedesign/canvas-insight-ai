/**
 * Phase 3B: TypeScript Strictness Enforcement
 * Runtime type validation, strict mode enforcement, and type safety utilities
 */

import { z } from 'zod';

// ===== RUNTIME TYPE VALIDATION SCHEMAS =====

// Enhanced Image Dimensions Schema
export const ImageDimensionsSchema = z.object({
  width: z.number().positive().int(),
  height: z.number().positive().int(),
  aspectRatio: z.number().positive()
});

// Uploaded Image Schema
export const UploadedImageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  url: z.string().url(),
  file: z.instanceof(File),
  dimensions: ImageDimensionsSchema.optional(),
  status: z.enum(['uploading', 'uploaded', 'syncing', 'processing', 'analyzing', 'completed', 'error']).optional(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  storagePath: z.string().optional(),
  uploadProgress: z.number().min(0).max(100).optional()
});

// Annotation Point Schema
export const AnnotationPointSchema = z.object({
  id: z.string().uuid(),
  x: z.number().min(0),
  y: z.number().min(0),
  type: z.enum(['issue', 'suggestion', 'success']),
  title: z.string().min(1),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high'])
});

// Suggestion Schema
export const SuggestionSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(['usability', 'accessibility', 'visual', 'content', 'performance']),
  title: z.string().min(1),
  description: z.string(),
  impact: z.enum(['low', 'medium', 'high']),
  effort: z.enum(['low', 'medium', 'high']),
  actionItems: z.array(z.string()),
  relatedAnnotations: z.array(z.string().uuid())
});

// Analysis Summary Schema
export const AnalysisSummarySchema = z.object({
  overallScore: z.number().min(0).max(100),
  categoryScores: z.object({
    usability: z.number().min(0).max(100),
    accessibility: z.number().min(0).max(100),
    visual: z.number().min(0).max(100),
    content: z.number().min(0).max(100)
  }),
  keyIssues: z.array(z.string()),
  strengths: z.array(z.string())
});

// Vision Metadata Schema
export const VisionMetadataSchema = z.object({
  objects: z.array(z.object({
    name: z.string(),
    confidence: z.number().min(0).max(1),
    boundingBox: z.object({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().positive(),
      height: z.number().positive()
    })
  })),
  text: z.array(z.string()),
  colors: z.array(z.object({
    color: z.string(),
    percentage: z.number().min(0).max(100)
  })),
  faces: z.number().min(0).int()
});

// UX Analysis Schema
export const UXAnalysisSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
  imageName: z.string(),
  imageUrl: z.string().url(),
  userContext: z.string(),
  visualAnnotations: z.array(AnnotationPointSchema),
  suggestions: z.array(SuggestionSchema),
  summary: AnalysisSummarySchema,
  metadata: VisionMetadataSchema,
  createdAt: z.date(),
  modelUsed: z.string().optional(),
  status: z.enum(['processing', 'analyzing', 'completed', 'error']).optional(),
  analysisProgress: z.number().min(0).max(100).optional(),
  contextualData: z.object({
    interfaceType: z.string().optional(),
    userRole: z.string().optional(),
    businessContext: z.string().optional()
  }).optional()
});

// Image Group Schema
export const ImageGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  imageIds: z.array(z.string().uuid()),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  color: z.string(),
  createdAt: z.date(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }).optional(),
  isCollapsed: z.boolean().optional(),
  displayMode: z.enum(['standard', 'stacked']).optional()
});

// Generated Concept Schema
export const GeneratedConceptSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  imageId: z.string().uuid(),
  analysisId: z.string().uuid(),
  imageUrl: z.string().url(),
  title: z.string().min(1),
  description: z.string(),
  improvements: z.array(z.string()),
  metadata: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
  conceptImageUrl: z.string().url().optional(),
  generationProgress: z.number().min(0).max(100).optional(),
  conceptType: z.enum(['improvement', 'variation', 'alternative']).optional()
});

// Canvas Position Schema
export const CanvasPositionSchema = z.object({
  x: z.number(),
  y: z.number()
});

// Canvas Viewport Schema
export const CanvasViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive()
});

// App State Schema
export const AppStateSchema = z.object({
  uploadedImages: z.array(UploadedImageSchema),
  analyses: z.array(UXAnalysisSchema),
  selectedImageId: z.string().uuid().nullable(),
  imageGroups: z.array(ImageGroupSchema),
  generatedConcepts: z.array(GeneratedConceptSchema),
  canvasViewport: CanvasViewportSchema,
  selectedNodes: z.array(z.string()),
  nodePositions: z.record(z.string(), CanvasPositionSchema),
  showAnnotations: z.boolean(),
  galleryTool: z.enum(['cursor', 'draw']),
  groupDisplayModes: z.record(z.string(), z.enum(['standard', 'stacked'])),
  isLoading: z.boolean(),
  isSyncing: z.boolean(),
  isUploading: z.boolean(),
  isGeneratingConcept: z.boolean(),
  error: z.string().nullable(),
  pendingBackgroundSync: z.set(z.string()),
  lastSyncTimestamp: z.date().nullable(),
  version: z.number().min(0).int()
});

// ===== TYPE VALIDATION UTILITIES =====

export class TypeValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldPath: string,
    public readonly expectedType: string,
    public readonly receivedValue: unknown
  ) {
    super(message);
    this.name = 'TypeValidationError';
  }
}

export class RuntimeTypeValidator {
  private static instance: RuntimeTypeValidator;
  private validationCache = new Map<string, boolean>();
  private validationMetrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    cacheHits: 0
  };

  static getInstance(): RuntimeTypeValidator {
    if (!RuntimeTypeValidator.instance) {
      RuntimeTypeValidator.instance = new RuntimeTypeValidator();
    }
    return RuntimeTypeValidator.instance;
  }

  /**
   * Validate data against a Zod schema with caching
   */
  validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: {
      throwOnError?: boolean;
      enableCache?: boolean;
      cacheKey?: string;
    } = {}
  ): { isValid: boolean; data?: T; errors?: z.ZodError } {
    const { throwOnError = false, enableCache = false, cacheKey } = options;
    
    this.validationMetrics.totalValidations++;

    // Check cache if enabled
    if (enableCache && cacheKey) {
      const cached = this.validationCache.get(cacheKey);
      if (cached !== undefined) {
        this.validationMetrics.cacheHits++;
        return { isValid: cached, data: cached ? data as T : undefined };
      }
    }

    try {
      const result = schema.parse(data);
      this.validationMetrics.successfulValidations++;
      
      // Cache successful validation
      if (enableCache && cacheKey) {
        this.validationCache.set(cacheKey, true);
      }
      
      return { isValid: true, data: result };
    } catch (error) {
      this.validationMetrics.failedValidations++;
      
      // Cache failed validation
      if (enableCache && cacheKey) {
        this.validationCache.set(cacheKey, false);
      }
      
      if (error instanceof z.ZodError) {
        if (throwOnError) {
          const firstError = error.errors[0];
          throw new TypeValidationError(
            `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            firstError?.path?.join('.') || 'root',
            firstError?.code || 'unknown',
            'received' in firstError ? firstError.received : 'unknown'
          );
        }
        return { isValid: false, errors: error };
      }
      
      throw error;
    }
  }

  /**
   * Validate uploaded image with strict type checking
   */
  validateUploadedImage(data: unknown, throwOnError = false) {
    return this.validate(UploadedImageSchema, data, { 
      throwOnError,
      enableCache: true,
      cacheKey: `image_${JSON.stringify(data)?.slice(0, 50)}` 
    });
  }

  /**
   * Validate UX analysis with strict type checking
   */
  validateUXAnalysis(data: unknown, throwOnError = false) {
    return this.validate(UXAnalysisSchema, data, { 
      throwOnError,
      enableCache: true,
      cacheKey: `analysis_${(data as any)?.id}` 
    });
  }

  /**
   * Validate image group with strict type checking
   */
  validateImageGroup(data: unknown, throwOnError = false) {
    return this.validate(ImageGroupSchema, data, { 
      throwOnError,
      enableCache: true,
      cacheKey: `group_${(data as any)?.id}` 
    });
  }

  /**
   * Validate app state with strict type checking
   */
  validateAppState(data: unknown, throwOnError = false) {
    return this.validate(AppStateSchema, data, { throwOnError });
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get validation metrics
   */
  getMetrics() {
    return { ...this.validationMetrics };
  }

  /**
   * Reset validation metrics
   */
  resetMetrics(): void {
    this.validationMetrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0
    };
  }
}

// ===== TYPE GUARDS =====

export const isUploadedImage = (obj: unknown): obj is z.infer<typeof UploadedImageSchema> => {
  return UploadedImageSchema.safeParse(obj).success;
};

export const isUXAnalysis = (obj: unknown): obj is z.infer<typeof UXAnalysisSchema> => {
  return UXAnalysisSchema.safeParse(obj).success;
};

export const isImageGroup = (obj: unknown): obj is z.infer<typeof ImageGroupSchema> => {
  return ImageGroupSchema.safeParse(obj).success;
};

export const isGeneratedConcept = (obj: unknown): obj is z.infer<typeof GeneratedConceptSchema> => {
  return GeneratedConceptSchema.safeParse(obj).success;
};

export const isImageDimensions = (obj: unknown): obj is z.infer<typeof ImageDimensionsSchema> => {
  return ImageDimensionsSchema.safeParse(obj).success;
};

// ===== STRICT TYPE UTILITIES =====

/**
 * Safely access nested object properties with type validation
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue?: T,
  validator?: (value: unknown) => value is T
): T | undefined {
  try {
    const keys = path.split('.');
    let current: any = obj;
    
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    
    if (validator && !validator(current)) {
      return defaultValue;
    }
    
    return current as T ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Ensure value is of expected type or throw error
 */
export function assertType<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  errorMessage?: string
): asserts value is T {
  if (!typeGuard(value)) {
    throw new TypeValidationError(
      errorMessage || 'Type assertion failed',
      'root',
      'expected type',
      value
    );
  }
}

/**
 * Convert unknown value to expected type safely
 */
export function coerceType<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  fallback: T
): T {
  try {
    return schema.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Deep readonly type utility for immutable state
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Make object deeply readonly at runtime
 */
export function deepFreeze<T extends object>(obj: T): DeepReadonly<T> {
  Object.freeze(obj);
  
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as any)[prop];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  });
  
  return obj as DeepReadonly<T>;
}

/**
 * Strict JSON parsing with validation
 */
export function parseJSONStrict<T>(
  json: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    const result = schema.safeParse(parsed);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { 
        success: false, 
        error: `Validation failed: ${result.error.errors.map(e => e.message).join(', ')}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'JSON parsing failed' 
    };
  }
}

// ===== EXPORTED TYPES AND VALIDATOR INSTANCE =====

export type ValidatedUploadedImage = z.infer<typeof UploadedImageSchema>;
export type ValidatedUXAnalysis = z.infer<typeof UXAnalysisSchema>;
export type ValidatedImageGroup = z.infer<typeof ImageGroupSchema>;
export type ValidatedGeneratedConcept = z.infer<typeof GeneratedConceptSchema>;
export type ValidatedAppState = z.infer<typeof AppStateSchema>;

// Singleton validator instance
export const typeValidator = RuntimeTypeValidator.getInstance();