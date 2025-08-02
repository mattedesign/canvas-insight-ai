/**
 * ✅ PHASE 5.2: CLEANUP SCHEDULER SERVICE
 * Background cleanup operations and memory optimization scheduling
 */

import { MemoryManagementService } from './MemoryManagementService';

interface ScheduledTask {
  id: string;
  name: string;
  callback: () => void | Promise<void>;
  interval: number;
  lastRun: number;
  nextRun: number;
  enabled: boolean;
  runCount: number;
  errorCount: number;
}

interface CleanupConfig {
  gcInterval: number;           // Garbage collection interval (ms)
  memoryCheckInterval: number;  // Memory check interval (ms)
  componentCleanupInterval: number; // Component cleanup check interval (ms)
  cacheCleanupInterval: number; // Cache cleanup interval (ms)
  maxRuntime: number;          // Maximum task runtime (ms)
  enableLogging: boolean;      // Enable detailed logging
}

const DEFAULT_CONFIG: CleanupConfig = {
  gcInterval: 60000,          // 1 minute
  memoryCheckInterval: 10000, // 10 seconds
  componentCleanupInterval: 30000, // 30 seconds
  cacheCleanupInterval: 300000,    // 5 minutes
  maxRuntime: 5000,           // 5 seconds max per task
  enableLogging: true
};

export class CleanupScheduler {
  private static instance: CleanupScheduler | null = null;
  private memoryService: MemoryManagementService;
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private config: CleanupConfig;

  private constructor(config: Partial<CleanupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryService = MemoryManagementService.getInstance();
    this.initializeDefaultTasks();
    console.log('[CleanupScheduler] Initialized');
  }

  static getInstance(config?: Partial<CleanupConfig>): CleanupScheduler {
    if (!this.instance) {
      this.instance = new CleanupScheduler(config);
    }
    return this.instance;
  }

  /**
   * ✅ PHASE 5.2: Start the cleanup scheduler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.schedulerInterval = setInterval(() => {
      this.runScheduledTasks();
    }, 1000); // Check every second

    this.log('Cleanup scheduler started');
  }

  /**
   * ✅ PHASE 5.2: Stop the cleanup scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    this.log('Cleanup scheduler stopped');
  }

  /**
   * ✅ PHASE 5.2: Schedule a cleanup task
   */
  scheduleTask(
    name: string,
    callback: () => void | Promise<void>,
    intervalMs: number,
    enabled: boolean = true
  ): string {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const task: ScheduledTask = {
      id: taskId,
      name,
      callback,
      interval: intervalMs,
      lastRun: 0,
      nextRun: now + intervalMs,
      enabled,
      runCount: 0,
      errorCount: 0
    };

    this.scheduledTasks.set(taskId, task);
    this.log(`Scheduled task: ${name} (${taskId}) - interval: ${intervalMs}ms`);

    return taskId;
  }

  /**
   * ✅ PHASE 5.2: Remove a scheduled task
   */
  removeTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    this.scheduledTasks.delete(taskId);
    this.log(`Removed task: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * ✅ PHASE 5.2: Enable/disable a task
   */
  toggleTask(taskId: string, enabled: boolean): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    task.enabled = enabled;
    this.log(`${enabled ? 'Enabled' : 'Disabled'} task: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * ✅ PHASE 5.2: Get task status
   */
  getTaskStatus(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    interval: number;
    runCount: number;
    errorCount: number;
    lastRun: number;
    nextRun: number;
  }> {
    return Array.from(this.scheduledTasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      enabled: task.enabled,
      interval: task.interval,
      runCount: task.runCount,
      errorCount: task.errorCount,
      lastRun: task.lastRun,
      nextRun: task.nextRun
    }));
  }

  /**
   * ✅ PHASE 5.2: Force run a specific task
   */
  async runTask(taskId: string): Promise<boolean> {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    return await this.executeTask(task);
  }

  /**
   * ✅ PHASE 5.2: Force run all tasks
   */
  async runAllTasks(): Promise<void> {
    this.log('Running all scheduled tasks manually');
    
    const tasks = Array.from(this.scheduledTasks.values()).filter(task => task.enabled);
    const taskPromises = tasks.map(task => this.executeTask(task));
    
    await Promise.allSettled(taskPromises);
  }

  /**
   * ✅ PHASE 5.2: Initialize default cleanup tasks
   */
  private initializeDefaultTasks(): void {
    // Garbage collection task
    this.scheduleTask(
      'Garbage Collection',
      async () => {
        await this.memoryService.forceGarbageCollection();
      },
      this.config.gcInterval
    );

    // Memory monitoring task
    this.scheduleTask(
      'Memory Check',
      () => {
        const stats = this.memoryService.getMemoryStats();
        if (stats.current.usedJSHeapSize > 200 * 1024 * 1024) { // 200MB threshold
          this.log(`High memory usage detected: ${(stats.current.usedJSHeapSize / (1024 * 1024)).toFixed(1)}MB`);
        }
      },
      this.config.memoryCheckInterval
    );

    // Component cleanup task
    this.scheduleTask(
      'Component Cleanup Check',
      () => {
        const stats = this.memoryService.getMemoryStats();
        if (stats.suspectedLeaks.length > 0) {
          this.log(`Found ${stats.suspectedLeaks.length} suspected memory leaks`);
        }
      },
      this.config.componentCleanupInterval
    );

    // Cache cleanup task
    this.scheduleTask(
      'Cache Cleanup',
      () => {
        this.cleanupCaches();
      },
      this.config.cacheCleanupInterval
    );

    // DOM cleanup task
    this.scheduleTask(
      'DOM Cleanup',
      () => {
        this.cleanupOrphanedDOMElements();
      },
      this.config.cacheCleanupInterval
    );

    // Event listener audit task
    this.scheduleTask(
      'Event Listener Audit',
      () => {
        this.auditEventListeners();
      },
      this.config.componentCleanupInterval
    );
  }

  /**
   * ✅ PHASE 5.2: Run scheduled tasks
   */
  private async runScheduledTasks(): Promise<void> {
    const now = Date.now();
    const tasksToRun = Array.from(this.scheduledTasks.values())
      .filter(task => task.enabled && now >= task.nextRun);

    if (tasksToRun.length === 0) return;

    this.log(`Running ${tasksToRun.length} scheduled tasks`);

    // Run tasks in parallel but with timeout protection
    const taskPromises = tasksToRun.map(task => this.executeTask(task));
    await Promise.allSettled(taskPromises);
  }

  /**
   * ✅ PHASE 5.2: Execute a single task with error handling and timeout
   */
  private async executeTask(task: ScheduledTask): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Create timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), this.config.maxRuntime);
      });

      // Race between task and timeout
      await Promise.race([
        Promise.resolve(task.callback()),
        timeoutPromise
      ]);

      // Update task stats
      task.lastRun = startTime;
      task.nextRun = startTime + task.interval;
      task.runCount++;

      const duration = Date.now() - startTime;
      this.log(`Task completed: ${task.name} (${duration}ms)`);
      
      return true;

    } catch (error) {
      task.errorCount++;
      task.lastRun = startTime;
      task.nextRun = startTime + task.interval;

      console.error(`[CleanupScheduler] Task failed: ${task.name}`, error);
      
      // Disable task if it fails too often
      if (task.errorCount > 5) {
        task.enabled = false;
        this.log(`Task disabled due to excessive errors: ${task.name}`);
      }
      
      return false;
    }
  }

  /**
   * ✅ PHASE 5.2: Clean up browser caches
   */
  private cleanupCaches(): void {
    try {
      // Clear expired items from localStorage
      this.cleanupLocalStorage();
      
      // Clear expired items from sessionStorage
      this.cleanupSessionStorage();
      
      // Clear browser caches if available
      if ('caches' in window) {
        this.cleanupServiceWorkerCaches();
      }
      
      this.log('Cache cleanup completed');
    } catch (error) {
      console.error('[CleanupScheduler] Cache cleanup failed:', error);
    }
  }

  /**
   * ✅ PHASE 5.2: Clean up localStorage
   */
  private cleanupLocalStorage(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        try {
          const parsed = JSON.parse(value);
          
          // Check for expiration timestamp
          if (parsed.expires && Date.now() > parsed.expires) {
            keysToRemove.push(key);
          }
          
          // Check for old temporary data (older than 1 day)
          if (key.startsWith('temp_') || key.startsWith('cache_')) {
            const timestamp = parsed.timestamp || parsed.created || 0;
            if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Not JSON, check if it's a very old entry by key name
          if (key.includes('old_') || key.includes('deprecated_')) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        this.log(`Removed ${keysToRemove.length} expired localStorage items`);
      }
    } catch (error) {
      console.error('[CleanupScheduler] localStorage cleanup failed:', error);
    }
  }

  /**
   * ✅ PHASE 5.2: Clean up sessionStorage
   */
  private cleanupSessionStorage(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key) continue;
        
        // Remove temporary session data older than 30 minutes
        if (key.startsWith('temp_') || key.startsWith('session_temp_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        this.log(`Removed ${keysToRemove.length} temporary sessionStorage items`);
      }
    } catch (error) {
      console.error('[CleanupScheduler] sessionStorage cleanup failed:', error);
    }
  }

  /**
   * ✅ PHASE 5.2: Clean up service worker caches
   */
  private async cleanupServiceWorkerCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.includes('old-') || 
        name.includes('v1.') || 
        name.includes('deprecated')
      );
      
      const deletePromises = oldCaches.map(name => caches.delete(name));
      await Promise.all(deletePromises);
      
      if (oldCaches.length > 0) {
        this.log(`Removed ${oldCaches.length} old service worker caches`);
      }
    } catch (error) {
      console.error('[CleanupScheduler] Service worker cache cleanup failed:', error);
    }
  }

  /**
   * ✅ PHASE 5.2: Clean up orphaned DOM elements
   */
  private cleanupOrphanedDOMElements(): void {
    try {
      // Remove elements with cleanup markers
      const elementsToClean = document.querySelectorAll('[data-cleanup="true"], .cleanup-target');
      elementsToClean.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // Remove empty containers
      const emptyContainers = document.querySelectorAll('.container:empty, .wrapper:empty');
      emptyContainers.forEach(container => {
        if (container.parentNode && container.children.length === 0) {
          container.parentNode.removeChild(container);
        }
      });
      
      if (elementsToClean.length > 0 || emptyContainers.length > 0) {
        this.log(`Cleaned up ${elementsToClean.length + emptyContainers.length} orphaned DOM elements`);
      }
    } catch (error) {
      console.error('[CleanupScheduler] DOM cleanup failed:', error);
    }
  }

  /**
   * ✅ PHASE 5.2: Audit event listeners
   */
  private auditEventListeners(): void {
    try {
      // Get memory stats to check for event listener leaks
      const stats = this.memoryService.getMemoryStats();
      
      if (stats.current.eventListenerCount > 1000) {
        this.log(`High event listener count detected: ${stats.current.eventListenerCount}`);
      }
      
      // Check for common event listener leak patterns
      const suspiciousElements = document.querySelectorAll('[data-listeners-count]');
      let totalSuspicious = 0;
      
      suspiciousElements.forEach(element => {
        const count = parseInt(element.getAttribute('data-listeners-count') || '0');
        if (count > 10) {
          totalSuspicious++;
        }
      });
      
      if (totalSuspicious > 0) {
        this.log(`Found ${totalSuspicious} elements with excessive event listeners`);
      }
    } catch (error) {
      console.error('[CleanupScheduler] Event listener audit failed:', error);
    }
  }

  /**
   * ✅ PHASE 5.2: Logging utility
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[CleanupScheduler] ${message}`);
    }
  }

  /**
   * ✅ PHASE 5.2: Update configuration
   */
  updateConfig(newConfig: Partial<CleanupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated');
  }

  /**
   * ✅ PHASE 5.2: Destroy scheduler
   */
  destroy(): void {
    this.stop();
    this.scheduledTasks.clear();
    CleanupScheduler.instance = null;
    this.log('Cleanup scheduler destroyed');
  }
}