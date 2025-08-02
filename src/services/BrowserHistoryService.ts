/**
 * ✅ PHASE 4.2: ENHANCED BROWSER HISTORY SERVICE
 * Advanced history state management with state restoration
 */

import { RouterStateManager } from './RouterStateManager';
import { URLStateSyncService } from './URLStateSyncService';

interface HistoryState {
  routeState: any;
  urlSyncState: any;
  timestamp: number;
  scrollPosition?: { x: number; y: number };
  formData?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface NavigationEntry {
  url: string;
  state: HistoryState;
  index: number;
  timestamp: number;
}

interface HistoryConfig {
  saveScrollPosition: boolean;
  saveFormData: boolean;
  maxHistorySize: number;
  restoreOnReload: boolean;
  persistanceKey: string;
}

const DEFAULT_CONFIG: HistoryConfig = {
  saveScrollPosition: true,
  saveFormData: true,
  maxHistorySize: 50,
  restoreOnReload: true,
  persistanceKey: 'navigation_history'
};

export class BrowserHistoryService {
  private static instance: BrowserHistoryService | null = null;
  private routerManager: RouterStateManager;
  private urlSyncService: URLStateSyncService;
  private config: HistoryConfig;
  private navigationStack: NavigationEntry[] = [];
  private currentIndex: number = -1;
  private isHandlingPopState: boolean = false;
  private listeners: Array<(entry: NavigationEntry) => void> = [];

  private constructor(config: Partial<HistoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.routerManager = RouterStateManager.getInstance();
    this.urlSyncService = URLStateSyncService.getInstance();
    
    this.initializeHistoryHandling();
    this.restoreFromPersistence();
    
    console.log('[BrowserHistoryService] Initialized');
  }

  static getInstance(config?: Partial<HistoryConfig>): BrowserHistoryService {
    if (!this.instance) {
      this.instance = new BrowserHistoryService(config);
    }
    return this.instance;
  }

  /**
   * ✅ PHASE 4.2: Initialize browser history event handling
   */
  private initializeHistoryHandling(): void {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Handle page unload for persistence
    window.addEventListener('beforeunload', this.persistToStorage.bind(this));
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle scroll position saving
    if (this.config.saveScrollPosition) {
      window.addEventListener('scroll', this.debounce(this.saveScrollPosition.bind(this), 100));
    }
  }

  /**
   * ✅ PHASE 4.2: Handle browser back/forward navigation
   */
  private async handlePopState(event: PopStateEvent): Promise<void> {
    if (this.isHandlingPopState) return;
    
    this.isHandlingPopState = true;
    console.log('[BrowserHistoryService] Handling popstate event');

    try {
      const state = event.state as HistoryState | null;
      
      if (state) {
        // Restore application state
        await this.restoreState(state);
        
        // Update navigation stack
        this.updateStackFromHistory();
        
        // Notify listeners
        this.notifyListeners();
      } else {
        // No state found, this might be initial load
        await this.captureCurrentState();
      }
    } catch (error) {
      console.error('[BrowserHistoryService] Error handling popstate:', error);
    } finally {
      this.isHandlingPopState = false;
    }
  }

  /**
   * ✅ PHASE 4.2: Capture current application state
   */
  async captureCurrentState(metadata?: Record<string, any>): Promise<HistoryState> {
    const state: HistoryState = {
      routeState: this.routerManager.getState(),
      urlSyncState: this.urlSyncService.getState(),
      timestamp: Date.now(),
      metadata: metadata || {}
    };

    // Capture scroll position
    if (this.config.saveScrollPosition) {
      state.scrollPosition = {
        x: window.scrollX,
        y: window.scrollY
      };
    }

    // Capture form data
    if (this.config.saveFormData) {
      state.formData = this.captureFormData();
    }

    return state;
  }

  /**
   * ✅ PHASE 4.2: Push new state to history
   */
  async pushState(url: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const state = await this.captureCurrentState(metadata);
      
      // Add to browser history
      window.history.pushState(state, '', url);
      
      // Update navigation stack
      const entry: NavigationEntry = {
        url,
        state,
        index: window.history.length - 1,
        timestamp: Date.now()
      };
      
      this.addToStack(entry);
      this.persistToStorage();
      
      console.log(`[BrowserHistoryService] Pushed state: ${url}`);
    } catch (error) {
      console.error('[BrowserHistoryService] Error pushing state:', error);
    }
  }

  /**
   * ✅ PHASE 4.2: Replace current state in history
   */
  async replaceState(url: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const state = await this.captureCurrentState(metadata);
      
      // Replace in browser history
      window.history.replaceState(state, '', url);
      
      // Update current entry in stack
      if (this.currentIndex >= 0 && this.currentIndex < this.navigationStack.length) {
        this.navigationStack[this.currentIndex] = {
          url,
          state,
          index: this.currentIndex,
          timestamp: Date.now()
        };
      }
      
      this.persistToStorage();
      console.log(`[BrowserHistoryService] Replaced state: ${url}`);
    } catch (error) {
      console.error('[BrowserHistoryService] Error replacing state:', error);
    }
  }

  /**
   * ✅ PHASE 4.2: Navigate back in history
   */
  async goBack(steps: number = 1): Promise<boolean> {
    if (this.canGoBack(steps)) {
      window.history.go(-steps);
      return true;
    }
    return false;
  }

  /**
   * ✅ PHASE 4.2: Navigate forward in history
   */
  async goForward(steps: number = 1): Promise<boolean> {
    if (this.canGoForward(steps)) {
      window.history.go(steps);
      return true;
    }
    return false;
  }

  /**
   * ✅ PHASE 4.2: Check if can go back
   */
  canGoBack(steps: number = 1): boolean {
    return this.currentIndex >= steps;
  }

  /**
   * ✅ PHASE 4.2: Check if can go forward
   */
  canGoForward(steps: number = 1): boolean {
    return this.currentIndex + steps < this.navigationStack.length;
  }

  /**
   * ✅ PHASE 4.2: Restore state from history entry
   */
  private async restoreState(state: HistoryState): Promise<void> {
    try {
      // Restore scroll position
      if (state.scrollPosition && this.config.saveScrollPosition) {
        window.scrollTo(state.scrollPosition.x, state.scrollPosition.y);
      }

      // Restore form data
      if (state.formData && this.config.saveFormData) {
        this.restoreFormData(state.formData);
      }

      // Restore URL sync state
      if (state.urlSyncState) {
        Object.entries(state.urlSyncState).forEach(([key, value]) => {
          this.urlSyncService.updateState(key, value);
        });
      }

      console.log('[BrowserHistoryService] State restored from history');
    } catch (error) {
      console.error('[BrowserHistoryService] Error restoring state:', error);
    }
  }

  /**
   * ✅ PHASE 4.2: Capture form data from current page
   */
  private captureFormData(): Record<string, any> {
    const formData: Record<string, any> = {};
    
    try {
      const forms = document.querySelectorAll('form');
      forms.forEach((form, index) => {
        const formDataObj = new FormData(form);
        const formValues: Record<string, any> = {};
        
        for (const [key, value] of formDataObj.entries()) {
          formValues[key] = value;
        }
        
        if (Object.keys(formValues).length > 0) {
          formData[`form_${index}`] = formValues;
        }
      });

      // Also capture input values not in forms
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input, index) => {
        const element = input as HTMLInputElement;
        if (element.id && element.value) {
          formData[`input_${element.id}`] = element.value;
        }
      });
    } catch (error) {
      console.warn('[BrowserHistoryService] Error capturing form data:', error);
    }
    
    return formData;
  }

  /**
   * ✅ PHASE 4.2: Restore form data to current page
   */
  private restoreFormData(formData: Record<string, any>): void {
    try {
      Object.entries(formData).forEach(([key, value]) => {
        if (key.startsWith('form_')) {
          // Restore form data
          const formIndex = parseInt(key.split('_')[1]);
          const forms = document.querySelectorAll('form');
          const form = forms[formIndex];
          
          if (form && typeof value === 'object') {
            Object.entries(value).forEach(([fieldName, fieldValue]) => {
              const field = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
              if (field) {
                field.value = String(fieldValue);
              }
            });
          }
        } else if (key.startsWith('input_')) {
          // Restore individual input
          const inputId = key.split('_')[1];
          const input = document.getElementById(inputId) as HTMLInputElement;
          if (input) {
            input.value = String(value);
          }
        }
      });
    } catch (error) {
      console.warn('[BrowserHistoryService] Error restoring form data:', error);
    }
  }

  /**
   * ✅ PHASE 4.2: Save current scroll position
   */
  private saveScrollPosition(): void {
    if (this.currentIndex >= 0 && this.currentIndex < this.navigationStack.length) {
      this.navigationStack[this.currentIndex].state.scrollPosition = {
        x: window.scrollX,
        y: window.scrollY
      };
    }
  }

  /**
   * ✅ PHASE 4.2: Handle page visibility changes
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.persistToStorage();
    }
  }

  /**
   * ✅ PHASE 4.2: Add entry to navigation stack
   */
  private addToStack(entry: NavigationEntry): void {
    // Remove any entries after current index (if user navigated back then forward)
    this.navigationStack = this.navigationStack.slice(0, this.currentIndex + 1);
    
    // Add new entry
    this.navigationStack.push(entry);
    this.currentIndex = this.navigationStack.length - 1;
    
    // Limit stack size
    if (this.navigationStack.length > this.config.maxHistorySize) {
      this.navigationStack = this.navigationStack.slice(-this.config.maxHistorySize);
      this.currentIndex = this.navigationStack.length - 1;
    }
  }

  /**
   * ✅ PHASE 4.2: Update stack from browser history
   */
  private updateStackFromHistory(): void {
    // This is called when handling popstate
    // Update currentIndex based on current URL
    const currentUrl = window.location.href;
    const foundIndex = this.navigationStack.findIndex(entry => entry.url === currentUrl);
    
    if (foundIndex >= 0) {
      this.currentIndex = foundIndex;
    }
  }

  /**
   * ✅ PHASE 4.2: Add listener for navigation events
   */
  addListener(listener: (entry: NavigationEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * ✅ PHASE 4.2: Notify all listeners
   */
  private notifyListeners(): void {
    const currentEntry = this.getCurrentEntry();
    if (currentEntry) {
      this.listeners.forEach(listener => {
        try {
          listener(currentEntry);
        } catch (error) {
          console.error('[BrowserHistoryService] Error in listener:', error);
        }
      });
    }
  }

  /**
   * ✅ PHASE 4.2: Get current navigation entry
   */
  getCurrentEntry(): NavigationEntry | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.navigationStack.length) {
      return this.navigationStack[this.currentIndex];
    }
    return null;
  }

  /**
   * ✅ PHASE 4.2: Get navigation stack
   */
  getNavigationStack(): NavigationEntry[] {
    return [...this.navigationStack];
  }

  /**
   * ✅ PHASE 4.2: Persist navigation stack to storage
   */
  private persistToStorage(): void {
    if (!this.config.restoreOnReload) return;
    
    try {
      const data = {
        stack: this.navigationStack,
        currentIndex: this.currentIndex,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(this.config.persistanceKey, JSON.stringify(data));
    } catch (error) {
      console.warn('[BrowserHistoryService] Error persisting to storage:', error);
    }
  }

  /**
   * ✅ PHASE 4.2: Restore navigation stack from storage
   */
  private restoreFromPersistence(): void {
    if (!this.config.restoreOnReload) return;
    
    try {
      const stored = sessionStorage.getItem(this.config.persistanceKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.navigationStack = data.stack || [];
        this.currentIndex = data.currentIndex || -1;
        
        console.log('[BrowserHistoryService] Restored from persistence');
      }
    } catch (error) {
      console.warn('[BrowserHistoryService] Error restoring from persistence:', error);
    }
  }

  /**
   * ✅ PHASE 4.2: Debounce utility
   */
  private debounce(func: Function, delay: number): (...args: any[]) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * ✅ PHASE 4.2: Clear history and storage
   */
  clearHistory(): void {
    this.navigationStack = [];
    this.currentIndex = -1;
    sessionStorage.removeItem(this.config.persistanceKey);
    console.log('[BrowserHistoryService] History cleared');
  }

  /**
   * ✅ PHASE 4.2: Destroy service
   */
  destroy(): void {
    window.removeEventListener('popstate', this.handlePopState.bind(this));
    window.removeEventListener('beforeunload', this.persistToStorage.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('scroll', this.saveScrollPosition.bind(this));
    
    this.clearHistory();
    this.listeners = [];
    BrowserHistoryService.instance = null;
    
    console.log('[BrowserHistoryService] Destroyed');
  }
}