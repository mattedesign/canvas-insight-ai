export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public details: any,
    public isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export class ModelExecutionError extends PipelineError {
  constructor(
    model: string,
    stage: string,
    originalError: Error,
    public modelMetrics?: {
      latency?: number;
      tokensUsed?: number;
    }
  ) {
    super(
      `Model ${model} failed at ${stage}: ${originalError.message}`,
      stage,
      { model, originalError: originalError.message, stack: originalError.stack },
      true
    );
    this.name = 'ModelExecutionError';
  }
}