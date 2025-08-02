/**
 * Phase 1: Enhanced ValidationService
 * Comprehensive validation system for UX analysis pipeline
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixedData?: any;
}

export interface ValidationError {
  type: 'critical' | 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
  value?: any;
  timestamp: Date;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  value?: any;
  suggestion?: string;
}

export interface DebugMetrics {
  validationTime: number;
  errorsFound: number;
  warningsFound: number;
  fixesApplied: number;
}

export class ValidationService {
  private static instance: ValidationService;
  private debugMode = process.env.NODE_ENV === 'development';
  private validationHistory: ValidationResult[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  /**
   * Phase 1: Core Analysis Result Validation
   */
  validateAnalysisResult(analysis: any): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fixedData = null;

    try {
      // Critical validations
      if (!analysis) {
        errors.push({
          type: 'critical',
          code: 'ANALYSIS_NULL',
          message: 'Analysis result is null or undefined',
          timestamp: new Date()
        });
        return this.createResult(false, errors, warnings, null, startTime);
      }

      if (typeof analysis !== 'object') {
        errors.push({
          type: 'critical',
          code: 'ANALYSIS_NOT_OBJECT',
          message: 'Analysis result must be an object',
          value: typeof analysis,
          timestamp: new Date()
        });
        return this.createResult(false, errors, warnings, null, startTime);
      }

      // Validate summary structure
      const summaryValidation = this.validateSummaryStructure(analysis.summary);
      errors.push(...summaryValidation.errors);
      warnings.push(...summaryValidation.warnings);

      // Validate annotations
      const annotationsValidation = this.validateAnnotations(analysis.annotations);
      errors.push(...annotationsValidation.errors);
      warnings.push(...annotationsValidation.warnings);

      // Validate suggestions
      const suggestionsValidation = this.validateSuggestions(analysis.suggestions);
      errors.push(...suggestionsValidation.errors);
      warnings.push(...suggestionsValidation.warnings);

      // Validate metadata
      const metadataValidation = this.validateMetadata(analysis.metadata);
      errors.push(...metadataValidation.errors);
      warnings.push(...metadataValidation.warnings);

      // Apply fixes if needed
      if (errors.length === 0 && warnings.length > 0) {
        fixedData = this.applyAnalysisResultFixes(analysis, warnings);
      }

      const result = this.createResult(
        errors.length === 0,
        errors,
        warnings,
        fixedData,
        startTime
      );

      this.addToHistory(result);
      return result;

    } catch (error) {
      errors.push({
        type: 'critical',
        code: 'VALIDATION_EXCEPTION',
        message: `Validation failed with exception: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      });
      
      return this.createResult(false, errors, warnings, null, startTime);
    }
  }

  /**
   * Phase 1: Safe Score Validation
   */
  validateScore(score: any, path = 'score'): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (score === null || score === undefined) {
      errors.push({
        type: 'error',
        code: 'SCORE_NULL',
        message: 'Score is null or undefined',
        path,
        timestamp: new Date()
      });
      return { isValid: false, errors, warnings };
    }

    if (typeof score !== 'number') {
      errors.push({
        type: 'error',
        code: 'SCORE_NOT_NUMBER',
        message: 'Score must be a number',
        path,
        value: score,
        timestamp: new Date()
      });
      return { isValid: false, errors, warnings };
    }

    if (isNaN(score)) {
      errors.push({
        type: 'error',
        code: 'SCORE_NAN',
        message: 'Score is NaN',
        path,
        timestamp: new Date()
      });
      return { isValid: false, errors, warnings };
    }

    if (!isFinite(score)) {
      errors.push({
        type: 'error',
        code: 'SCORE_INFINITE',
        message: 'Score is infinite',
        path,
        timestamp: new Date()
      });
      return { isValid: false, errors, warnings };
    }

    if (score < 0 || score > 100) {
      warnings.push({
        code: 'SCORE_OUT_OF_RANGE',
        message: 'Score should be between 0-100',
        path,
        value: score,
        suggestion: `Clamp score to valid range: ${Math.max(0, Math.min(100, score))}`
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Phase 1: Safe Array Validation
   */
  validateArray(arr: any, path = 'array'): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (arr === null || arr === undefined) {
      errors.push({
        type: 'error',
        code: 'ARRAY_NULL',
        message: 'Array is null or undefined',
        path,
        timestamp: new Date()
      });
      return { isValid: false, errors, warnings };
    }

    if (!Array.isArray(arr)) {
      errors.push({
        type: 'error',
        code: 'NOT_ARRAY',
        message: 'Expected array but got ' + typeof arr,
        path,
        value: arr,
        timestamp: new Date()
      });
      return { isValid: false, errors, warnings };
    }

    if (arr.length === 0) {
      warnings.push({
        code: 'EMPTY_ARRAY',
        message: 'Array is empty',
        path,
        suggestion: 'Consider providing default values or handling empty state'
      });
    }

    // Check for null/undefined elements
    const nullElements = arr
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item === null || item === undefined);

    if (nullElements.length > 0) {
      warnings.push({
        code: 'NULL_ELEMENTS',
        message: `Array contains ${nullElements.length} null/undefined elements`,
        path,
        value: nullElements.map(e => e.index),
        suggestion: 'Filter out null/undefined elements or provide defaults'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Phase 1: Safe Array Operations
   */
  safeArrayMap<T, R>(
    arr: any, 
    mapper: (item: T, index: number) => R,
    defaultValue: R[] = []
  ): R[] {
    const validation = this.validateArray(arr);
    if (!validation.isValid) {
      this.debugLog('safeArrayMap failed validation:', validation.errors);
      return defaultValue;
    }

    try {
      return arr
        .filter((item: any) => item !== null && item !== undefined)
        .map(mapper);
    } catch (error) {
      this.debugLog('safeArrayMap mapper error:', error);
      return defaultValue;
    }
  }

  safeArrayReduce<T, R>(
    arr: any,
    reducer: (acc: R, item: T, index: number) => R,
    initialValue: R
  ): R {
    const validation = this.validateArray(arr);
    if (!validation.isValid) {
      this.debugLog('safeArrayReduce failed validation:', validation.errors);
      return initialValue;
    }

    try {
      return arr
        .filter((item: any) => item !== null && item !== undefined)
        .reduce(reducer, initialValue);
    } catch (error) {
      this.debugLog('safeArrayReduce reducer error:', error);
      return initialValue;
    }
  }

  safeArrayFind<T>(
    arr: any,
    predicate: (item: T, index: number) => boolean,
    defaultValue: T | null = null
  ): T | null {
    const validation = this.validateArray(arr);
    if (!validation.isValid) {
      return defaultValue;
    }

    try {
      return arr.find(predicate) || defaultValue;
    } catch (error) {
      this.debugLog('safeArrayFind predicate error:', error);
      return defaultValue;
    }
  }

  /**
   * Phase 1: Safe Numeric Calculations
   */
  safeCalculateAverage(scores: any[], path = 'scores'): number {
    const validation = this.validateArray(scores, path);
    if (!validation.isValid) {
      return 0;
    }

    const validScores = scores.filter(score => {
      const scoreValidation = this.validateScore(score);
      return scoreValidation.isValid;
    });

    if (validScores.length === 0) {
      this.debugLog('safeCalculateAverage: no valid scores found');
      return 0;
    }

    const sum = validScores.reduce((acc, score) => acc + score, 0);
    return sum / validScores.length;
  }

  safeCalculateConfidence(results: any[]): number {
    if (!Array.isArray(results) || results.length === 0) {
      return 0;
    }

    const validResults = results.filter(result => 
      result && typeof result === 'object' && result.success
    );

    if (validResults.length === 0) {
      return 0;
    }

    const successRate = validResults.length / results.length;
    const averageConfidence = this.safeCalculateAverage(
      validResults.map(r => r.confidence || 0.5)
    );

    return Math.min(1, successRate * averageConfidence);
  }

  /**
   * Phase 1: Pre-storage Validation
   */
  validateBeforeStorage(data: any): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Validate JSON serializability
      const serialized = JSON.stringify(data);
      if (!serialized) {
        errors.push({
          type: 'critical',
          code: 'NOT_SERIALIZABLE',
          message: 'Data cannot be serialized to JSON',
          timestamp: new Date()
        });
      }

      // Validate size (max 1MB)
      if (serialized.length > 1024 * 1024) {
        warnings.push({
          code: 'LARGE_DATA',
          message: `Data size (${Math.round(serialized.length / 1024)}KB) is large`,
          suggestion: 'Consider compressing or splitting the data'
        });
      }

      // Validate required fields for analysis data
      if (data.summary) {
        const summaryValidation = this.validateAnalysisResult(data);
        errors.push(...summaryValidation.errors);
        warnings.push(...summaryValidation.warnings);
      }

      return this.createResult(errors.length === 0, errors, warnings, null, startTime);

    } catch (error) {
      errors.push({
        type: 'critical',
        code: 'STORAGE_VALIDATION_ERROR',
        message: `Storage validation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      });
      
      return this.createResult(false, errors, warnings, null, startTime);
    }
  }

  /**
   * Phase 2: Enhanced Summary Validation with Comprehensive Structure Fixes
   */
  private validateSummaryStructure(summary: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!summary) {
      errors.push({
        type: 'error',
        code: 'SUMMARY_MISSING',
        message: 'Summary is missing',
        path: 'summary',
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    if (typeof summary !== 'object') {
      errors.push({
        type: 'error',
        code: 'SUMMARY_NOT_OBJECT',
        message: 'Summary must be an object',
        path: 'summary',
        value: typeof summary,
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    // Phase 2: Enhanced overall score validation
    const overallScoreValidation = this.validateOverallScore(summary.overallScore);
    errors.push(...overallScoreValidation.errors);
    warnings.push(...overallScoreValidation.warnings);

    // Phase 2: Enhanced category scores validation
    const categoryScoresValidation = this.validateCategoryScores(summary.categoryScores);
    errors.push(...categoryScoresValidation.errors);
    warnings.push(...categoryScoresValidation.warnings);

    // Phase 2: Validate required array properties
    const arrayPropsValidation = this.validateSummaryArrays(summary);
    errors.push(...arrayPropsValidation.errors);
    warnings.push(...arrayPropsValidation.warnings);

    // Phase 2: Validate confidence score
    const confidenceValidation = this.validateConfidenceScore(summary.confidence);
    errors.push(...confidenceValidation.errors);
    warnings.push(...confidenceValidation.warnings);

    return { errors, warnings };
  }

  /**
   * Phase 2: Comprehensive Overall Score Validation
   */
  private validateOverallScore(overallScore: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (overallScore === null || overallScore === undefined) {
      errors.push({
        type: 'error',
        code: 'OVERALL_SCORE_MISSING',
        message: 'Overall score is missing',
        path: 'summary.overallScore',
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    if (typeof overallScore !== 'number') {
      errors.push({
        type: 'error',
        code: 'OVERALL_SCORE_NOT_NUMBER',
        message: 'Overall score must be a number',
        path: 'summary.overallScore',
        value: overallScore,
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    if (isNaN(overallScore)) {
      errors.push({
        type: 'error',
        code: 'OVERALL_SCORE_NAN',
        message: 'Overall score is NaN',
        path: 'summary.overallScore',
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    if (!isFinite(overallScore)) {
      errors.push({
        type: 'error',
        code: 'OVERALL_SCORE_INFINITE',
        message: 'Overall score is infinite',
        path: 'summary.overallScore',
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    // Phase 2: Range validation with context-aware suggestions
    if (overallScore < 0) {
      warnings.push({
        code: 'OVERALL_SCORE_NEGATIVE',
        message: 'Overall score is negative',
        path: 'summary.overallScore',
        value: overallScore,
        suggestion: 'Clamp to 0'
      });
    } else if (overallScore > 100) {
      warnings.push({
        code: 'OVERALL_SCORE_TOO_HIGH',
        message: 'Overall score exceeds 100',
        path: 'summary.overallScore',
        value: overallScore,
        suggestion: 'Clamp to 100'
      });
    }

    // Phase 2: Quality warnings for suspicious scores
    if (overallScore === 0) {
      warnings.push({
        code: 'OVERALL_SCORE_ZERO',
        message: 'Overall score is zero - may indicate calculation error',
        path: 'summary.overallScore',
        suggestion: 'Verify calculation logic'
      });
    }

    return { errors, warnings };
  }

  /**
   * Phase 2: Comprehensive Category Scores Validation
   */
  private validateCategoryScores(categoryScores: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const requiredCategories = ['usability', 'accessibility', 'visual', 'content'];

    if (!categoryScores) {
      errors.push({
        type: 'error',
        code: 'CATEGORY_SCORES_MISSING',
        message: 'Category scores object is missing',
        path: 'summary.categoryScores',
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    if (typeof categoryScores !== 'object') {
      errors.push({
        type: 'error',
        code: 'CATEGORY_SCORES_NOT_OBJECT',
        message: 'Category scores must be an object',
        path: 'summary.categoryScores',
        value: typeof categoryScores,
        timestamp: new Date()
      });
      return { errors, warnings };
    }

    // Phase 2: Validate each required category
    requiredCategories.forEach(category => {
      const score = categoryScores[category];
      const categoryPath = `summary.categoryScores.${category}`;

      if (score === null || score === undefined) {
        errors.push({
          type: 'error',
          code: 'CATEGORY_SCORE_MISSING',
          message: `Category score missing: ${category}`,
          path: categoryPath,
          timestamp: new Date()
        });
        return;
      }

      if (typeof score !== 'number') {
        errors.push({
          type: 'error',
          code: 'CATEGORY_SCORE_NOT_NUMBER',
          message: `Category score must be a number: ${category}`,
          path: categoryPath,
          value: score,
          timestamp: new Date()
        });
        return;
      }

      if (isNaN(score)) {
        errors.push({
          type: 'error',
          code: 'CATEGORY_SCORE_NAN',
          message: `Category score is NaN: ${category}`,
          path: categoryPath,
          timestamp: new Date()
        });
        return;
      }

      if (!isFinite(score)) {
        errors.push({
          type: 'error',
          code: 'CATEGORY_SCORE_INFINITE',
          message: `Category score is infinite: ${category}`,
          path: categoryPath,
          timestamp: new Date()
        });
        return;
      }

      // Range validation
      if (score < 0) {
        warnings.push({
          code: 'CATEGORY_SCORE_NEGATIVE',
          message: `Category score is negative: ${category}`,
          path: categoryPath,
          value: score,
          suggestion: 'Clamp to 0'
        });
      } else if (score > 100) {
        warnings.push({
          code: 'CATEGORY_SCORE_TOO_HIGH',
          message: `Category score exceeds 100: ${category}`,
          path: categoryPath,
          value: score,
          suggestion: 'Clamp to 100'
        });
      }
    });

    // Phase 2: Check for unexpected categories
    const extraCategories = Object.keys(categoryScores).filter(
      cat => !requiredCategories.includes(cat)
    );
    if (extraCategories.length > 0) {
      warnings.push({
        code: 'UNEXPECTED_CATEGORIES',
        message: `Unexpected category scores found: ${extraCategories.join(', ')}`,
        path: 'summary.categoryScores',
        value: extraCategories,
        suggestion: 'Consider removing or documenting these categories'
      });
    }

    return { errors, warnings };
  }

  /**
   * Phase 2: Summary Arrays Validation
   */
  private validateSummaryArrays(summary: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate keyIssues
    if (summary.keyIssues !== undefined) {
      const issuesValidation = this.validateArray(summary.keyIssues, 'summary.keyIssues');
      errors.push(...issuesValidation.errors);
      warnings.push(...issuesValidation.warnings);

      if (Array.isArray(summary.keyIssues)) {
        summary.keyIssues.forEach((issue, index) => {
          if (typeof issue !== 'string') {
            warnings.push({
              code: 'KEY_ISSUE_NOT_STRING',
              message: `Key issue at index ${index} is not a string`,
              path: `summary.keyIssues[${index}]`,
              value: issue,
              suggestion: 'Convert to string or remove invalid entry'
            });
          }
        });
      }
    }

    // Validate strengths
    if (summary.strengths !== undefined) {
      const strengthsValidation = this.validateArray(summary.strengths, 'summary.strengths');
      errors.push(...strengthsValidation.errors);
      warnings.push(...strengthsValidation.warnings);

      if (Array.isArray(summary.strengths)) {
        summary.strengths.forEach((strength, index) => {
          if (typeof strength !== 'string') {
            warnings.push({
              code: 'STRENGTH_NOT_STRING',
              message: `Strength at index ${index} is not a string`,
              path: `summary.strengths[${index}]`,
              value: strength,
              suggestion: 'Convert to string or remove invalid entry'
            });
          }
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Phase 2: Confidence Score Validation
   */
  private validateConfidenceScore(confidence: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (confidence === null || confidence === undefined) {
      warnings.push({
        code: 'CONFIDENCE_MISSING',
        message: 'Confidence score is missing',
        path: 'summary.confidence',
        suggestion: 'Provide default confidence value'
      });
      return { errors, warnings };
    }

    if (typeof confidence !== 'number') {
      warnings.push({
        code: 'CONFIDENCE_NOT_NUMBER',
        message: 'Confidence score must be a number',
        path: 'summary.confidence',
        value: confidence,
        suggestion: 'Convert to number or use default value'
      });
      return { errors, warnings };
    }

    if (isNaN(confidence)) {
      warnings.push({
        code: 'CONFIDENCE_NAN',
        message: 'Confidence score is NaN',
        path: 'summary.confidence',
        suggestion: 'Use default confidence value'
      });
      return { errors, warnings };
    }

    if (confidence < 0 || confidence > 1) {
      warnings.push({
        code: 'CONFIDENCE_OUT_OF_RANGE',
        message: 'Confidence score should be between 0-1',
        path: 'summary.confidence',
        value: confidence,
        suggestion: `Clamp to valid range: ${Math.max(0, Math.min(1, confidence))}`
      });
    }

    return { errors, warnings };
  }

  private validateAnnotations(annotations: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (annotations && !Array.isArray(annotations)) {
      errors.push({
        type: 'error',
        code: 'ANNOTATIONS_NOT_ARRAY',
        message: 'Annotations must be an array',
        path: 'annotations',
        timestamp: new Date()
      });
    }

    return { errors, warnings };
  }

  private validateSuggestions(suggestions: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (suggestions && !Array.isArray(suggestions)) {
      errors.push({
        type: 'error',
        code: 'SUGGESTIONS_NOT_ARRAY',
        message: 'Suggestions must be an array',
        path: 'suggestions',
        timestamp: new Date()
      });
    }

    return { errors, warnings };
  }

  private validateMetadata(metadata: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (metadata && typeof metadata !== 'object') {
      errors.push({
        type: 'error',
        code: 'METADATA_NOT_OBJECT',
        message: 'Metadata must be an object',
        path: 'metadata',
        timestamp: new Date()
      });
    }

    return { errors, warnings };
  }

  private applyAnalysisResultFixes(analysis: any, warnings: ValidationWarning[]): any {
    const fixed = { ...analysis };

    warnings.forEach(warning => {
      if (warning.code === 'SCORE_OUT_OF_RANGE' && warning.suggestion) {
        // Extract suggested value from warning
        const match = warning.suggestion.match(/Clamp score to valid range: (\d+(?:\.\d+)?)/);
        if (match && warning.path) {
          const value = parseFloat(match[1]);
          this.setNestedProperty(fixed, warning.path, value);
        }
      }
    });

    return fixed;
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private createResult(
    isValid: boolean,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixedData: any,
    startTime: number
  ): ValidationResult {
    return {
      isValid,
      errors,
      warnings,
      fixedData,
      ...(this.debugMode && {
        debugMetrics: {
          validationTime: Date.now() - startTime,
          errorsFound: errors.length,
          warningsFound: warnings.length,
          fixesApplied: fixedData ? 1 : 0
        }
      })
    };
  }

  private addToHistory(result: ValidationResult): void {
    this.validationHistory.push(result);
    if (this.validationHistory.length > this.maxHistorySize) {
      this.validationHistory = this.validationHistory.slice(-this.maxHistorySize);
    }
  }

  debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[ValidationService] ${message}`, data);
    }
  }

  /**
   * Public API for debugging and monitoring
   */
  getValidationHistory(): ValidationResult[] {
    return [...this.validationHistory];
  }

  getValidationStats(): {
    totalValidations: number;
    successRate: number;
    avgValidationTime: number;
    commonErrors: { code: string; count: number }[];
  } {
    const total = this.validationHistory.length;
    if (total === 0) {
      return {
        totalValidations: 0,
        successRate: 0,
        avgValidationTime: 0,
        commonErrors: []
      };
    }

    const successful = this.validationHistory.filter(r => r.isValid).length;
    const totalTime = this.validationHistory.reduce((sum, r) => 
      sum + ((r as any).debugMetrics?.validationTime || 0), 0);

    const errorCounts: Record<string, number> = {};
    this.validationHistory.forEach(result => {
      result.errors.forEach(error => {
        errorCounts[error.code] = (errorCounts[error.code] || 0) + 1;
      });
    });

    const commonErrors = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalValidations: total,
      successRate: successful / total,
      avgValidationTime: totalTime / total,
      commonErrors
    };
  }

  enableDebugMode(enabled = true): void {
    this.debugMode = enabled;
  }

  clearHistory(): void {
    this.validationHistory = [];
  }
}