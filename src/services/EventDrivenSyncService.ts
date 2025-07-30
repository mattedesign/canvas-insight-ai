/**
 * ✅ PHASE 3.2: EVENT-DRIVEN UPDATE SERVICE
 * Handles subsequent data changes using events instead of re-renders
 * Separates initialization from ongoing synchronization
 */

interface SyncEvent {
  type: 'image_added' | 'image_updated' | 'image_deleted' | 
        'group_created' | 'group_updated' | 'group_deleted' |
        'analysis_completed' | 'analysis_updated' | 'analysis_deleted' |
        'data_invalidated' | 'project_changed';
  payload: any;
  timestamp: Date;
  source: 'local' | 'remote' | 'user';
}

class EventDrivenSyncService {
  private eventQueue: SyncEvent[] = [];
  private isProcessing = false;
  private listeners = new Map<string, ((event: SyncEvent) => void)[]>();

  /**
   * ✅ PHASE 3.2: Register event listener
   */
  addEventListener(eventType: string, listener: (event: SyncEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType)!.push(listener);

    // Return cleanup function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * ✅ PHASE 3.2: Emit sync event
   */
  emitSyncEvent(event: Omit<SyncEvent, 'timestamp'>): void {
    const fullEvent: SyncEvent = {
      ...event,
      timestamp: new Date(),
    };

    console.log('[EventDrivenSync] Emitting event:', fullEvent);

    // Add to queue for processing
    this.eventQueue.push(fullEvent);

    // Notify listeners immediately
    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(fullEvent);
      } catch (error) {
        console.error('[EventDrivenSync] Listener error:', error);
      }
    });

    // Process queue if not already processing
    this.processEventQueue();
  }

  /**
   * ✅ PHASE 3.2: Process event queue with debouncing
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process events in batches to avoid overwhelming the system
      const batchSize = 5;
      const batch = this.eventQueue.splice(0, batchSize);

      for (const event of batch) {
        await this.processEvent(event);
      }

      // If there are more events, schedule next batch
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processEventQueue(), 100);
      }
    } catch (error) {
      console.error('[EventDrivenSync] Event processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * ✅ PHASE 3.2: Process individual event
   */
  private async processEvent(event: SyncEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'image_added':
        case 'image_updated':
        case 'image_deleted':
          await this.handleImageEvent(event);
          break;
        
        case 'group_created':
        case 'group_updated':
        case 'group_deleted':
          await this.handleGroupEvent(event);
          break;
        
        case 'analysis_completed':
        case 'analysis_updated':
        case 'analysis_deleted':
          await this.handleAnalysisEvent(event);
          break;
        
        case 'data_invalidated':
          await this.handleDataInvalidation(event);
          break;
        
        case 'project_changed':
          await this.handleProjectChange(event);
          break;
        
        default:
          console.warn('[EventDrivenSync] Unknown event type:', event.type);
      }
    } catch (error) {
      console.error('[EventDrivenSync] Event processing failed:', error);
      
      // Fire error event for monitoring
      window.dispatchEvent(new CustomEvent('syncEventError', {
        detail: { event, error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  }

  /**
   * ✅ PHASE 3.2: Handle image-related events
   */
  private async handleImageEvent(event: SyncEvent): Promise<void> {
    console.log('[EventDrivenSync] Processing image event:', event);
    
    // Sync to database if needed
    if (event.source === 'local') {
      const { ImageMigrationService } = await import('@/services/DataMigrationService');
      await ImageMigrationService.migrateImageToDatabase(event.payload);
    }

    // Fire custom DOM event for UI updates
    window.dispatchEvent(new CustomEvent(`image${event.type.split('_')[1]}`, {
      detail: event.payload
    }));
  }

  /**
   * ✅ PHASE 3.2: Handle group-related events
   */
  private async handleGroupEvent(event: SyncEvent): Promise<void> {
    console.log('[EventDrivenSync] Processing group event:', event);
    
    // Sync to database if needed
    if (event.source === 'local') {
      const { GroupMigrationService } = await import('@/services/DataMigrationService');
      await GroupMigrationService.migrateGroupToDatabase(event.payload);
    }

    // Fire custom DOM event for UI updates
    window.dispatchEvent(new CustomEvent(`group${event.type.split('_')[1]}`, {
      detail: event.payload
    }));
  }

  /**
   * ✅ PHASE 3.2: Handle analysis-related events
   */
  private async handleAnalysisEvent(event: SyncEvent): Promise<void> {
    console.log('[EventDrivenSync] Processing analysis event:', event);
    
    // Sync to database if needed
    if (event.source === 'local') {
      const { AnalysisMigrationService } = await import('@/services/DataMigrationService');
      await AnalysisMigrationService.migrateAnalysisToDatabase(event.payload);
    }

    // Fire custom DOM event for UI updates
    window.dispatchEvent(new CustomEvent(`analysis${event.type.split('_')[1]}`, {
      detail: event.payload
    }));
  }

  /**
   * ✅ PHASE 3.2: Handle data invalidation
   */
  private async handleDataInvalidation(event: SyncEvent): Promise<void> {
    console.log('[EventDrivenSync] Processing data invalidation:', event);
    
    // Fire invalidation event
    window.dispatchEvent(new CustomEvent('dataInvalidated', {
      detail: event.payload
    }));
  }

  /**
   * ✅ PHASE 3.2: Handle project changes
   */
  private async handleProjectChange(event: SyncEvent): Promise<void> {
    console.log('[EventDrivenSync] Processing project change:', event);
    
    // Fire project change event
    window.dispatchEvent(new CustomEvent('projectChanged', {
      detail: event.payload
    }));
  }

  /**
   * ✅ PHASE 3.2: Clear all events and listeners
   */
  reset(): void {
    this.eventQueue = [];
    this.listeners.clear();
    this.isProcessing = false;
    console.log('[EventDrivenSync] Service reset');
  }

  /**
   * ✅ PHASE 3.2: Get queue status for debugging
   */
  getStatus() {
    return {
      queueLength: this.eventQueue.length,
      isProcessing: this.isProcessing,
      listenerCount: Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
    };
  }
}

// ✅ PHASE 3.2: Export singleton instance
export const eventDrivenSyncService = new EventDrivenSyncService();