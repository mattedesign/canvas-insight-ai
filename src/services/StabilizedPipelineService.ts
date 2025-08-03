/**
 * Integrated Pipeline Stabilization Service
 * Phase 3: Combines error recovery, circuit breakers, and type validation
 */

import { errorRecoveryService, CircuitBreakerConfig, RetryConfig, HealthCheckConfig } from './ErrorRecoveryService';
import { typeValidator, TypeValidationError } from './TypeValidationService';
import { supabase } from '@/integrations/supabase/client';

export interface PipelineOperation {
  name: string;
  category: 'upload' | 'analysis' | 'storage' | 'database' | 'ui';
  timeout: number;
  retryable: boolean;
  requiresValidation: boolean;
}

export interface PipelineExecutionContext {
  operationId: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

export interface PipelineResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  retryAttempts: number;
  validationPassed: boolean;
  circuitBreakerTriggered: boolean;
  context: PipelineExecutionContext;
}

/**
 * Stabilized Pipeline Service with comprehensive error recovery
 */
export class StabilizedPipelineService {
  private static instance: StabilizedPipelineService;
  private operationRegistry = new Map<string, PipelineOperation>();
  private executionMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageExecutionTime: 0,
    circuitBreakerActivations: 0
  };

  constructor() {
    this.initializeDefaultOperations();
    this.initializeCircuitBreakers();
    this.initializeHealthChecks();
  }

  static getInstance(): StabilizedPipelineService {
    if (!StabilizedPipelineService.instance) {
      StabilizedPipelineService.instance = new StabilizedPipelineService();
    }
    return StabilizedPipelineService.instance;
  }

  /**
   * Initialize default pipeline operations
   */
  private initializeDefaultOperations(): void {
    const defaultOperations: PipelineOperation[] = [
      {
        name: 'image_upload',
        category: 'upload',
        timeout: 30000,
        retryable: true,
        requiresValidation: true
      },
      {
        name: 'image_analysis',
        category: 'analysis',
        timeout: 60000,
        retryable: true,
        requiresValidation: true
      },
      {
        name: 'storage_operation',
        category: 'storage',
        timeout: 15000,
        retryable: true,
        requiresValidation: false
      },
      {
        name: 'database_query',
        category: 'database',
        timeout: 10000,
        retryable: true,
        requiresValidation: false
      },
      {
        name: 'ui_state_update',
        category: 'ui',
        timeout: 5000,
        retryable: false,
        requiresValidation: true
      }
    ];

    defaultOperations.forEach(op => {
      this.operationRegistry.set(op.name, op);
    });
  }

  /**
   * Initialize circuit breakers for critical operations
   */
  private initializeCircuitBreakers(): void {
    const circuitBreakerConfigs: CircuitBreakerConfig[] = [
      {
        name: 'image_upload',
        failureThreshold: 0.5, // 50% failure rate
        recoveryTimeout: 30000, // 30 seconds
        monitorWindow: 60000, // 1 minute
        halfOpenRetryLimit: 3
      },
      {
        name: 'image_analysis',
        failureThreshold: 0.3, // 30% failure rate
        recoveryTimeout: 60000, // 1 minute
        monitorWindow: 120000, // 2 minutes
        halfOpenRetryLimit: 2
      },
      {
        name: 'storage_operation',
        failureThreshold: 0.4, // 40% failure rate
        recoveryTimeout: 15000, // 15 seconds
        monitorWindow: 60000, // 1 minute
        halfOpenRetryLimit: 5
      },
      {
        name: 'database_query',
        failureThreshold: 0.2, // 20% failure rate
        recoveryTimeout: 10000, // 10 seconds
        monitorWindow: 30000, // 30 seconds
        halfOpenRetryLimit: 3
      }
    ];

    circuitBreakerConfigs.forEach(config => {
      errorRecoveryService.createCircuitBreaker(config);
    });
  }

  /**
   * Initialize health checks for system components
   */
  private initializeHealthChecks(): void {
    // Supabase Database Health Check
    errorRecoveryService.registerHealthCheck(
      'supabase_database',
      {
        endpoint: 'database',
        timeout: 5000,
        interval: 30000, // Check every 30 seconds
        failureThreshold: 3
      },
      async () => {
        const startTime = Date.now();
        try {
          const { error } = await supabase.from('projects').select('id').limit(1);
          const latency = Date.now() - startTime;
          
          if (error) {
            return {
              status: 'unhealthy',
              latency,
              error: error.message
            };
          }
          
          return {
            status: latency < 1000 ? 'healthy' : 'degraded',
            latency
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            latency: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );

    // Supabase Storage Health Check
    errorRecoveryService.registerHealthCheck(
      'supabase_storage',
      {
        endpoint: 'storage',
        timeout: 5000,
        interval: 60000, // Check every minute
        failureThreshold: 3
      },
      async () => {
        const startTime = Date.now();
        try {
          const { data, error } = await supabase.storage.from('images').list('', { limit: 1 });
          const latency = Date.now() - startTime;
          
          if (error) {
            return {
              status: 'unhealthy',
              latency,
              error: error.message
            };
          }
          
          return {
            status: latency < 2000 ? 'healthy' : 'degraded',
            latency
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            latency: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );
  }

  /**
   * Execute operation with full pipeline stabilization
   */
  async executeStabilizedOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: PipelineExecutionContext,
    validationSchema?: any
  ): Promise<PipelineResult<T>> {
    const startTime = Date.now();
    const operationConfig = this.operationRegistry.get(operationName);
    
    if (!operationConfig) {
      throw new Error(`Operation ${operationName} not registered`);
    }

    let retryAttempts = 0;
    let validationPassed = true;
    let circuitBreakerTriggered = false;

    try {
      this.executionMetrics.totalOperations++;

      // Execute with timeout, circuit breaker, and retry
      const result = await Promise.race([
        errorRecoveryService.executeWithRecovery(
          operationName,
          async () => {
            const data = await operation();
            
            // Validate result if schema provided
            if (operationConfig.requiresValidation && validationSchema) {
              const validation = typeValidator.validate(validationSchema, data, { throwOnError: true });
              if (!validation.isValid) {
                validationPassed = false;
                throw new TypeValidationError(
                  'Operation result validation failed',
                  'result',
                  'valid schema',
                  data
                );
              }
            }
            
            return data;
          },
          {
            useCircuitBreaker: true,
            useRetry: operationConfig.retryable,
            retryPredicate: (error: any) => {
              retryAttempts++;
              // Don't retry validation errors
              return !(error instanceof TypeValidationError);
            }
          }
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), operationConfig.timeout)
        )
      ]);

      this.executionMetrics.successfulOperations++;
      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: result,
        executionTime,
        retryAttempts,
        validationPassed,
        circuitBreakerTriggered,
        context
      };

    } catch (error) {
      this.executionMetrics.failedOperations++;
      const executionTime = Date.now() - startTime;
      
      // Check if circuit breaker was triggered
      const circuitBreaker = errorRecoveryService.getCircuitBreaker(operationName);
      if (circuitBreaker?.getState() === 'OPEN') {
        circuitBreakerTriggered = true;
        this.executionMetrics.circuitBreakerActivations++;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        retryAttempts,
        validationPassed,
        circuitBreakerTriggered,
        context
      };
    }
  }

  /**
   * Register a new pipeline operation
   */
  registerOperation(operation: PipelineOperation): void {
    this.operationRegistry.set(operation.name, operation);
  }

  /**
   * Get operation configuration
   */
  getOperation(name: string): PipelineOperation | undefined {
    return this.operationRegistry.get(name);
  }

  /**
   * Get all registered operations
   */
  getAllOperations(): PipelineOperation[] {
    return Array.from(this.operationRegistry.values());
  }

  /**
   * Get pipeline execution metrics
   */
  getExecutionMetrics() {
    return {
      ...this.executionMetrics,
      successRate: this.executionMetrics.totalOperations > 0 
        ? this.executionMetrics.successfulOperations / this.executionMetrics.totalOperations 
        : 0,
      failureRate: this.executionMetrics.totalOperations > 0
        ? this.executionMetrics.failedOperations / this.executionMetrics.totalOperations
        : 0
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    return errorRecoveryService.getHealthStatus();
  }

  /**
   * Get circuit breaker statuses
   */
  getCircuitBreakerStatuses() {
    const statuses: Record<string, any> = {};
    
    this.operationRegistry.forEach((_, operationName) => {
      const circuitBreaker = errorRecoveryService.getCircuitBreaker(operationName);
      if (circuitBreaker) {
        statuses[operationName] = {
          state: circuitBreaker.getState(),
          metrics: circuitBreaker.getMetrics()
        };
      }
    });
    
    return statuses;
  }

  /**
   * Reset pipeline metrics
   */
  resetMetrics(): void {
    this.executionMetrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageExecutionTime: 0,
      circuitBreakerActivations: 0
    };

    // Reset type validator metrics
    typeValidator.resetMetrics();
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(newTime: number): void {
    const total = this.executionMetrics.totalOperations;
    const current = this.executionMetrics.averageExecutionTime;
    this.executionMetrics.averageExecutionTime = (current * (total - 1) + newTime) / total;
  }

  /**
   * Shutdown pipeline service
   */
  shutdown(): void {
    errorRecoveryService.shutdown();
    this.operationRegistry.clear();
  }
}

// Export singleton instance
export const stabilizedPipeline = StabilizedPipelineService.getInstance();

// Export convenience functions for common operations
export const executeUploadOperation = <T>(
  operation: () => Promise<T>,
  context: PipelineExecutionContext,
  validationSchema?: any
) => stabilizedPipeline.executeStabilizedOperation('image_upload', operation, context, validationSchema);

export const executeAnalysisOperation = <T>(
  operation: () => Promise<T>,
  context: PipelineExecutionContext,
  validationSchema?: any
) => stabilizedPipeline.executeStabilizedOperation('image_analysis', operation, context, validationSchema);

export const executeStorageOperation = <T>(
  operation: () => Promise<T>,
  context: PipelineExecutionContext
) => stabilizedPipeline.executeStabilizedOperation('storage_operation', operation, context);

export const executeDatabaseOperation = <T>(
  operation: () => Promise<T>,
  context: PipelineExecutionContext
) => stabilizedPipeline.executeStabilizedOperation('database_query', operation, context);