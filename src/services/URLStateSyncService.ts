/**
 * ✅ PHASE 4.2: URL STATE SYNCHRONIZATION SERVICE
 * Bidirectional sync between application state and URL parameters
 */

import { RouterStateManager } from './RouterStateManager';

interface SyncConfig {
  key: string;
  serialize: (value: any) => string;
  deserialize: (value: string) => any;
  validate?: (value: any) => boolean;
  debounceMs?: number;
}

interface URLSyncState {
  [key: string]: any;
}

export class URLStateSyncService {
  private static instance: URLStateSyncService | null = null;
  private configs: Map<string, SyncConfig> = new Map();
  private currentState: URLSyncState = {};
  private updateQueue: Map<string, any> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private routerManager: RouterStateManager;

  private constructor() {
    this.routerManager = RouterStateManager.getInstance();
    this.initializeFromURL();
    console.log('[URLStateSyncService] Initialized');
  }

  static getInstance(): URLStateSyncService {
    if (!this.instance) {
      this.instance = new URLStateSyncService();
    }
    return this.instance;
  }

  /**
   * ✅ PHASE 4.2: Register a state property for URL synchronization
   */
  registerSync(config: SyncConfig): void {
    this.configs.set(config.key, config);
    
    // Initialize from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const urlValue = urlParams.get(config.key);
    
    if (urlValue !== null) {
      try {
        const deserializedValue = config.deserialize(urlValue);
        if (!config.validate || config.validate(deserializedValue)) {
          this.currentState[config.key] = deserializedValue;
        }
      } catch (error) {
        console.warn(`[URLStateSyncService] Failed to deserialize ${config.key}:`, error);
      }
    }
    
    console.log(`[URLStateSyncService] Registered sync for: ${config.key}`);
  }

  /**
   * ✅ PHASE 4.2: Update state and sync to URL
   */
  updateState(key: string, value: any): void {
    const config = this.configs.get(key);
    if (!config) {
      console.warn(`[URLStateSyncService] No config found for key: ${key}`);
      return;
    }

    // Validate value if validator exists
    if (config.validate && !config.validate(value)) {
      console.warn(`[URLStateSyncService] Invalid value for ${key}:`, value);
      return;
    }

    // Update internal state
    this.currentState[key] = value;

    // Queue URL update (with debouncing if configured)
    this.queueURLUpdate(key, value, config);
  }

  /**
   * ✅ PHASE 4.2: Get current synchronized state
   */
  getState(): URLSyncState {
    return { ...this.currentState };
  }

  /**
   * ✅ PHASE 4.2: Get specific state value
   */
  getValue(key: string): any {
    return this.currentState[key];
  }

  /**
   * ✅ PHASE 4.2: Sync state from URL (useful for back/forward navigation)
   */
  syncFromURL(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const updates: URLSyncState = {};

    this.configs.forEach((config, key) => {
      const urlValue = urlParams.get(key);
      if (urlValue !== null) {
        try {
          const deserializedValue = config.deserialize(urlValue);
          if (!config.validate || config.validate(deserializedValue)) {
            updates[key] = deserializedValue;
          }
        } catch (error) {
          console.warn(`[URLStateSyncService] Failed to sync ${key} from URL:`, error);
        }
      } else if (this.currentState[key] !== undefined) {
        // Remove from state if not in URL
        updates[key] = undefined;
      }
    });

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) {
        delete this.currentState[key];
      } else {
        this.currentState[key] = value;
      }
    });

    console.log('[URLStateSyncService] Synced from URL:', updates);
  }

  /**
   * ✅ PHASE 4.2: Clear specific state key
   */
  clearState(key: string): void {
    delete this.currentState[key];
    this.removeFromURL(key);
  }

  /**
   * ✅ PHASE 4.2: Clear all synchronized state
   */
  clearAllState(): void {
    this.currentState = {};
    this.updateURL();
  }

  /**
   * ✅ PHASE 4.2: Generate URL with current state
   */
  generateURL(baseURL?: string): string {
    const url = new URL(baseURL || window.location.href);
    
    // Clear existing params that we manage
    this.configs.forEach((_, key) => {
      url.searchParams.delete(key);
    });

    // Add current state
    Object.entries(this.currentState).forEach(([key, value]) => {
      const config = this.configs.get(key);
      if (config && value !== undefined) {
        try {
          const serializedValue = config.serialize(value);
          url.searchParams.set(key, serializedValue);
        } catch (error) {
          console.warn(`[URLStateSyncService] Failed to serialize ${key}:`, error);
        }
      }
    });

    return url.toString();
  }

  /**
   * ✅ PHASE 4.2: Get URL parameters as object
   */
  getURLParameters(): Record<string, string> {
    const params: Record<string, string> = {};
    const urlParams = new URLSearchParams(window.location.search);
    
    this.configs.forEach((_, key) => {
      const value = urlParams.get(key);
      if (value !== null) {
        params[key] = value;
      }
    });

    return params;
  }

  /**
   * ✅ PHASE 4.2: Initialize state from current URL
   */
  private initializeFromURL(): void {
    this.syncFromURL();
  }

  /**
   * ✅ PHASE 4.2: Queue URL update with debouncing
   */
  private queueURLUpdate(key: string, value: any, config: SyncConfig): void {
    this.updateQueue.set(key, value);

    // Clear existing timer for this key
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const delay = config.debounceMs || 100;
    const timer = setTimeout(() => {
      this.flushURLUpdates();
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * ✅ PHASE 4.2: Flush queued URL updates
   */
  private flushURLUpdates(): void {
    if (this.updateQueue.size === 0) return;

    this.updateURL();
    this.updateQueue.clear();
    this.debounceTimers.clear();
  }

  /**
   * ✅ PHASE 4.2: Update browser URL with current state
   */
  private updateURL(): void {
    const newURL = this.generateURL();
    
    // Only update if URL actually changed
    if (newURL !== window.location.href) {
      window.history.replaceState(
        { ...window.history.state, urlSyncState: this.currentState },
        '',
        newURL
      );
      console.log('[URLStateSyncService] URL updated');
    }
  }

  /**
   * ✅ PHASE 4.2: Remove parameter from URL
   */
  private removeFromURL(key: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    
    window.history.replaceState(
      { ...window.history.state, urlSyncState: this.currentState },
      '',
      url.toString()
    );
  }

  /**
   * ✅ PHASE 4.2: Cleanup and destroy
   */
  destroy(): void {
    this.configs.clear();
    this.currentState = {};
    this.updateQueue.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    URLStateSyncService.instance = null;
    console.log('[URLStateSyncService] Destroyed');
  }
}