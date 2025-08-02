// PHASE 3: Pipeline Performance Enhancement - Progress Persistence

interface PersistedProgress {
  requestId: string;
  imageUrl: string;
  userContext: string;
  stage: string;
  progress: number;
  timestamp: number;
  visionData?: any;
  analysisData?: any;
  isComplete: boolean;
  error?: string;
}

interface RequestResumption {
  canResume: boolean;
  lastStage: string;
  resumeData?: any;
  timeElapsed: number;
}

export class ProgressPersistenceService {
  private static instance: ProgressPersistenceService;
  private progressMap = new Map<string, PersistedProgress>();
  private readonly MAX_PERSISTENCE_TIME = 10 * 60 * 1000; // 10 minutes
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes

  static getInstance(): ProgressPersistenceService {
    if (!ProgressPersistenceService.instance) {
      ProgressPersistenceService.instance = new ProgressPersistenceService();
    }
    return ProgressPersistenceService.instance;
  }

  private constructor() {
    // Start cleanup timer
    setInterval(() => this.cleanupExpiredProgress(), this.CLEANUP_INTERVAL);
  }

  /**
   * Save progress for a request
   */
  saveProgress(
    requestId: string,
    imageUrl: string,
    userContext: string,
    stage: string,
    progress: number,
    data?: any
  ): void {
    const persistedProgress: PersistedProgress = {
      requestId,
      imageUrl,
      userContext,
      stage,
      progress,
      timestamp: Date.now(),
      isComplete: progress >= 100,
      ...(stage === 'vision' && data && { visionData: data }),
      ...(stage === 'analysis' && data && { analysisData: data })
    };

    this.progressMap.set(requestId, persistedProgress);
    
    console.log('[ProgressPersistence] Saved progress:', {
      requestId,
      stage,
      progress,
      hasData: !!data
    });
  }

  /**
   * Get persisted progress for a request
   */
  getProgress(requestId: string): PersistedProgress | null {
    const progress = this.progressMap.get(requestId);
    
    if (!progress) return null;
    
    // Check if expired
    const isExpired = Date.now() - progress.timestamp > this.MAX_PERSISTENCE_TIME;
    if (isExpired) {
      this.progressMap.delete(requestId);
      return null;
    }
    
    return progress;
  }

  /**
   * Check if a request can be resumed
   */
  checkResumption(requestId: string): RequestResumption {
    const progress = this.getProgress(requestId);
    
    if (!progress || progress.isComplete || progress.error) {
      return { canResume: false, lastStage: 'none', timeElapsed: 0 };
    }
    
    const timeElapsed = Date.now() - progress.timestamp;
    const canResume = timeElapsed < this.MAX_PERSISTENCE_TIME && progress.progress > 0;
    
    return {
      canResume,
      lastStage: progress.stage,
      resumeData: {
        visionData: progress.visionData,
        analysisData: progress.analysisData,
        progress: progress.progress
      },
      timeElapsed
    };
  }

  /**
   * Generate request ID from image and context
   */
  generateRequestId(imageUrl: string, userContext: string): string {
    const hash = this.simpleHash(`${imageUrl}:${userContext}`);
    return `req_${hash}_${Date.now()}`;
  }

  /**
   * Mark request as complete
   */
  completeRequest(requestId: string, finalData?: any): void {
    const progress = this.progressMap.get(requestId);
    if (progress) {
      progress.isComplete = true;
      progress.progress = 100;
      progress.timestamp = Date.now();
      if (finalData) {
        progress.analysisData = finalData;
      }
    }
  }

  /**
   * Mark request as failed
   */
  failRequest(requestId: string, error: string): void {
    const progress = this.progressMap.get(requestId);
    if (progress) {
      progress.error = error;
      progress.timestamp = Date.now();
    }
  }

  /**
   * Clean up expired progress entries
   */
  private cleanupExpiredProgress(): void {
    const now = Date.now();
    const expired = [];
    
    for (const [requestId, progress] of this.progressMap.entries()) {
      if (now - progress.timestamp > this.MAX_PERSISTENCE_TIME) {
        expired.push(requestId);
      }
    }
    
    expired.forEach(requestId => {
      this.progressMap.delete(requestId);
    });
    
    if (expired.length > 0) {
      console.log('[ProgressPersistence] Cleaned up expired entries:', expired.length);
    }
  }

  /**
   * Get all active requests
   */
  getActiveRequests(): PersistedProgress[] {
    const active = [];
    for (const progress of this.progressMap.values()) {
      if (!progress.isComplete && !progress.error) {
        active.push(progress);
      }
    }
    return active;
  }

  /**
   * Clear all progress (for testing/cleanup)
   */
  clearAll(): void {
    this.progressMap.clear();
  }

  /**
   * Simple hash function for generating request IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}