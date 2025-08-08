/**
 * Enhanced Retry Service with Exponential Backoff
 * Handles failed operations with intelligent retry logic
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
}

export interface RetryAttempt {
  attempt: number;
  timestamp: string;
  error?: string;
  duration?: number;
}

export interface RetryState {
  attempts: RetryAttempt[];
  isRetrying: boolean;
  canRetry: boolean;
  nextRetryIn?: number;
  config: RetryConfig;
}

export class RetryService {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBase: 2,
    jitter: true
  };

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onProgress?: (state: RetryState) => void
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const attempts: RetryAttempt[] = [];
    
    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
      const startTime = Date.now();
      
      // Update progress
      if (onProgress) {
        onProgress({
          attempts,
          isRetrying: attempt > 1,
          canRetry: attempt < finalConfig.maxRetries,
          config: finalConfig
        });
      }

      try {
        const result = await operation();
        
        // Success - record attempt and return
        attempts.push({
          attempt,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        });

        if (onProgress) {
          onProgress({
            attempts,
            isRetrying: false,
            canRetry: false,
            config: finalConfig
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        attempts.push({
          attempt,
          timestamp: new Date().toISOString(),
          duration,
          error: errorMessage
        });

        // If error is non-retryable, abort immediately
        if (!this.isRetryableError(error)) {
          if (onProgress) {
            onProgress({
              attempts,
              isRetrying: false,
              canRetry: false,
              config: finalConfig
            });
          }
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === finalConfig.maxRetries) {
          if (onProgress) {
            onProgress({
              attempts,
              isRetrying: false,
              canRetry: false,
              config: finalConfig
            });
          }
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, finalConfig);
        
        if (onProgress) {
          onProgress({
            attempts,
            isRetrying: false,
            canRetry: true,
            nextRetryIn: delay,
            config: finalConfig
          });
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
    
    if (config.jitter) {
      // Add random jitter (±25%)
      const jitterRange = cappedDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, cappedDelay + jitter);
    }
    
    return cappedDelay;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry wrapper for analysis operations
   */
  createAnalysisRetryWrapper() {
    return {
      retryAnalysis: async <T>(
        analysisOperation: () => Promise<T>,
        onRetryProgress?: (state: RetryState) => void
      ): Promise<T> => {
        return this.executeWithRetry(
          analysisOperation,
          {
            maxRetries: 3,
            baseDelay: 2000,
            maxDelay: 15000
          },
          onRetryProgress
        );
      },

      retryConceptGeneration: async <T>(
        conceptOperation: () => Promise<T>,
        onRetryProgress?: (state: RetryState) => void
      ): Promise<T> => {
        return this.executeWithRetry(
          conceptOperation,
          {
            maxRetries: 2,
            baseDelay: 3000,
            maxDelay: 10000
          },
          onRetryProgress
        );
      },

      retryImageUpload: async <T>(
        uploadOperation: () => Promise<T>,
        onRetryProgress?: (state: RetryState) => void
      ): Promise<T> => {
        return this.executeWithRetry(
          uploadOperation,
          {
            maxRetries: 4,
            baseDelay: 1000,
            maxDelay: 8000
          },
          onRetryProgress
        );
      }
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: any): boolean {
    if (!(error instanceof Error)) return true;
    
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'network error',
      'timeout',
      'rate limit',
      'server error',
      'internal error',
      'service unavailable',
      'too many requests',
      'temporary failure'
    ];

    const nonRetryablePatterns = [
      'unauthorized',
      'forbidden',
      'not found',
      'invalid api key',
      'authentication failed',
      'malformed request',
      'invalid input'
    ];

    // Check for non-retryable errors first
    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    // Check for explicitly retryable errors
    if (retryablePatterns.some(pattern => message.includes(pattern))) {
      return true;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Format retry state for display
   */
  formatRetryState(state: RetryState): string {
    if (!state.isRetrying && state.attempts.length === 0) {
      return 'Ready';
    }

    if (state.isRetrying) {
      return `Retrying... (${state.attempts.length}/${state.config.maxRetries})`;
    }

    if (state.nextRetryIn) {
      const seconds = Math.ceil(state.nextRetryIn / 1000);
      return `Retry in ${seconds}s`;
    }

    const lastAttempt = state.attempts[state.attempts.length - 1];
    if (lastAttempt?.error) {
      return state.canRetry ? 'Failed - retry available' : 'Failed - no more retries';
    }

    return 'Completed';
  }
}

export const retryService = new RetryService();