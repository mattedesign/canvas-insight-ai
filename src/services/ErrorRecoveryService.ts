/**
 * Phase 3A: Error Recovery System
 * Circuit breakers, retry mechanisms, and pipeline health monitoring
 */

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  recoveryTimeout: number;
  monitorWindow: number;
  halfOpenRetryLimit: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface HealthCheckConfig {
  endpoint: string;
  timeout: number;
  interval: number;
  failureThreshold: number;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateChanges: Array<{
    from: CircuitBreakerState;
    to: CircuitBreakerState;
    timestamp: number;
    reason: string;
  }>;
}

export interface PipelineHealthStatus {
  isHealthy: boolean;
  services: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    lastCheck: number;
    error?: string;
  }>;
  overallLatency: number;
  errorRate: number;
  uptime: number;
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private metrics: CircuitBreakerMetrics;
  private lastStateChange: number = Date.now();
  private halfOpenAttempts: number = 0;

  constructor(
    private config: CircuitBreakerConfig,
    private onStateChange?: (state: CircuitBreakerState, metrics: CircuitBreakerMetrics) => void
  ) {
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successfulRequests: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      stateChanges: []
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastStateChange < this.config.recoveryTimeout) {
        throw new Error(`Circuit breaker ${this.config.name} is OPEN`);
      }
      this.changeState('HALF_OPEN', 'Recovery timeout reached');
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.config.halfOpenRetryLimit) {
      throw new Error(`Circuit breaker ${this.config.name} half-open retry limit exceeded`);
    }

    this.metrics.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenRetryLimit) {
        this.changeState('CLOSED', 'Half-open recovery successful');
        this.halfOpenAttempts = 0;
      }
    } else if (this.state === 'OPEN') {
      this.changeState('CLOSED', 'Operation successful after being open');
    }
  }

  private onFailure(): void {
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.changeState('OPEN', 'Failure during half-open state');
      this.halfOpenAttempts = 0;
    } else if (this.state === 'CLOSED') {
      const failureRate = this.getRecentFailureRate();
      if (failureRate >= this.config.failureThreshold) {
        this.changeState('OPEN', `Failure rate ${failureRate} exceeded threshold ${this.config.failureThreshold}`);
      }
    }
  }

  private getRecentFailureRate(): number {
    const windowStart = Date.now() - this.config.monitorWindow;
    const recentRequests = this.metrics.totalRequests; // Simplified - in production, track windowed metrics
    const recentFailures = this.metrics.failedRequests;
    
    return recentRequests > 0 ? recentFailures / recentRequests : 0;
  }

  private changeState(newState: CircuitBreakerState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: this.lastStateChange,
      reason
    });

    console.log(`Circuit Breaker ${this.config.name}: ${oldState} -> ${newState} (${reason})`);
    this.onStateChange?.(newState, this.metrics);
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successfulRequests: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      stateChanges: []
    };
    this.halfOpenAttempts = 0;
    this.lastStateChange = Date.now();
  }
}

/**
 * Retry Mechanism with Exponential Backoff
 */
export class RetryMechanism {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    predicate?: (error: any) => boolean
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (predicate && !predicate(error)) {
          throw error; // Don't retry if predicate says not to
        }
        
        if (attempt === this.config.maxAttempts) {
          throw error; // Last attempt failed
        }
        
        const delay = this.calculateDelay(attempt);
        console.log(`Retry attempt ${attempt}/${this.config.maxAttempts} after ${delay}ms delay`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const delay = Math.min(exponentialDelay, this.config.maxDelay);
    
    if (this.config.jitter) {
      // Add random jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(0, delay + jitter);
    }
    
    return delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Pipeline Health Monitor
 */
export class PipelineHealthMonitor {
  private healthStatus: PipelineHealthStatus;
  private healthChecks: Map<string, HealthCheckConfig> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private startTime: number = Date.now();

  constructor() {
    this.healthStatus = {
      isHealthy: true,
      services: {},
      overallLatency: 0,
      errorRate: 0,
      uptime: 0
    };
  }

  registerHealthCheck(
    serviceName: string,
    config: HealthCheckConfig,
    healthCheckFn: () => Promise<{ latency: number; status: 'healthy' | 'degraded' | 'unhealthy'; error?: string }>
  ): void {
    this.healthChecks.set(serviceName, config);

    // Initialize service status
    this.healthStatus.services[serviceName] = {
      status: 'healthy',
      latency: 0,
      lastCheck: Date.now()
    };

    // Start periodic health checks
    const interval = setInterval(async () => {
      const checkStartTime = Date.now();
      
      try {
        const result = await Promise.race([
          healthCheckFn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), config.timeout)
          )
        ]);

        this.healthStatus.services[serviceName] = {
          status: result.status,
          latency: result.latency,
          lastCheck: Date.now(),
          error: result.error
        };

      } catch (error) {
        this.healthStatus.services[serviceName] = {
          status: 'unhealthy',
          latency: Date.now() - checkStartTime,
          lastCheck: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      this.updateOverallHealth();
    }, config.interval);

    this.checkIntervals.set(serviceName, interval);
  }

  unregisterHealthCheck(serviceName: string): void {
    const interval = this.checkIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(serviceName);
    }
    
    this.healthChecks.delete(serviceName);
    delete this.healthStatus.services[serviceName];
    this.updateOverallHealth();
  }

  private updateOverallHealth(): void {
    const services = Object.values(this.healthStatus.services);
    
    if (services.length === 0) {
      this.healthStatus.isHealthy = true;
      this.healthStatus.overallLatency = 0;
      this.healthStatus.errorRate = 0;
    } else {
      const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
      this.healthStatus.isHealthy = unhealthyCount === 0;
      this.healthStatus.errorRate = unhealthyCount / services.length;
      this.healthStatus.overallLatency = services.reduce((sum, s) => sum + s.latency, 0) / services.length;
    }
    
    this.healthStatus.uptime = Date.now() - this.startTime;
  }

  getHealthStatus(): PipelineHealthStatus {
    this.updateOverallHealth();
    return { ...this.healthStatus };
  }

  isHealthy(): boolean {
    return this.healthStatus.isHealthy;
  }

  getServiceHealth(serviceName: string) {
    return this.healthStatus.services[serviceName];
  }

  shutdown(): void {
    for (const interval of this.checkIntervals.values()) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();
  }
}

/**
 * Combined Error Recovery Service
 */
export class ErrorRecoveryService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryMechanism: RetryMechanism;
  private healthMonitor: PipelineHealthMonitor;

  constructor(
    retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true
    }
  ) {
    this.retryMechanism = new RetryMechanism(retryConfig);
    this.healthMonitor = new PipelineHealthMonitor();
  }

  createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(config, (state, metrics) => {
      console.log(`Circuit Breaker ${config.name} state changed to ${state}`, metrics);
    });
    
    this.circuitBreakers.set(config.name, circuitBreaker);
    return circuitBreaker;
  }

  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  async executeWithRecovery<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      useCircuitBreaker?: boolean;
      useRetry?: boolean;
      retryPredicate?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const { useCircuitBreaker = true, useRetry = true, retryPredicate } = options;

    let finalOperation = operation;

    // Wrap with retry mechanism
    if (useRetry) {
      finalOperation = () => this.retryMechanism.execute(operation, retryPredicate);
    }

    // Wrap with circuit breaker
    if (useCircuitBreaker) {
      const circuitBreaker = this.circuitBreakers.get(operationName);
      if (circuitBreaker) {
        finalOperation = () => circuitBreaker.execute(finalOperation);
      }
    }

    return finalOperation();
  }

  registerHealthCheck(
    serviceName: string,
    config: HealthCheckConfig,
    healthCheckFn: () => Promise<{ latency: number; status: 'healthy' | 'degraded' | 'unhealthy'; error?: string }>
  ): void {
    this.healthMonitor.registerHealthCheck(serviceName, config, healthCheckFn);
  }

  getHealthStatus(): PipelineHealthStatus {
    return this.healthMonitor.getHealthStatus();
  }

  isSystemHealthy(): boolean {
    return this.healthMonitor.isHealthy();
  }

  shutdown(): void {
    this.healthMonitor.shutdown();
    this.circuitBreakers.clear();
  }
}

// Singleton instance
export const errorRecoveryService = new ErrorRecoveryService();