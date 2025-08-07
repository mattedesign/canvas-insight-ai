/**
 * ✅ PHASE 4.1: ROUTER STATE MANAGER
 * Enhanced routing architecture with navigation state management and conflict resolution
 */

import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCallback, useRef, useEffect, useState } from 'react';
import { AtomicStateManager } from './AtomicStateManager';

interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  routeParams: Record<string, string>;
  navigationHistory: NavigationHistoryEntry[];
  isNavigating: boolean;
  pendingNavigation: PendingNavigation | null;
  routeMetadata: Record<string, any>;
}

interface NavigationHistoryEntry {
  route: string;
  timestamp: number;
  params: Record<string, string>;
  duration?: number;
}

interface PendingNavigation {
  target: string;
  params?: Record<string, string>;
  timestamp: number;
  reason: string;
}

interface RouteTransition {
  from: string;
  to: string;
  timestamp: number;
  cleanup?: () => void | Promise<void>;
  validate?: () => boolean | Promise<boolean>;
}

interface NavigationGuard {
  id: string;
  predicate: (from: string, to: string, params: Record<string, string>) => boolean | Promise<boolean>;
  priority: number;
}

export class RouterStateManager {
  private static instance: RouterStateManager | null = null;
  private state: NavigationState;
  private stateManager: AtomicStateManager;
  private guards: NavigationGuard[] = [];
  private activeTransition: RouteTransition | null = null;
  private navigationLock = false;
  private cleanup: (() => void)[] = [];
  private metrics: {
    totalNavigations: number;
    averageTransitionTime: number;
    failedNavigations: number;
    guardsTriggered: number;
  } = {
    totalNavigations: 0,
    averageTransitionTime: 0,
    failedNavigations: 0,
    guardsTriggered: 0
  };
  private subscribers: Set<() => void> = new Set();

  private constructor() {
    this.state = {
      currentRoute: '/',
      previousRoute: null,
      routeParams: {},
      navigationHistory: [],
      isNavigating: false,
      pendingNavigation: null,
      routeMetadata: {}
    };
    
    this.stateManager = new AtomicStateManager();
    console.log('[RouterStateManager] Initialized');
  }

  /**
   * ✅ PHASE 4.1: Singleton instance management
   */
  static getInstance(): RouterStateManager {
    if (!this.instance) {
      this.instance = new RouterStateManager();
    }
    return this.instance;
  }

  /**
   * ✅ PHASE 4.1: Initialize router state with current location
   */
  initialize(currentPath: string, params: Record<string, string> = {}): void {
    console.log(`[RouterStateManager] Initializing with path: ${currentPath}`);
    
    this.updateState({
      currentRoute: currentPath,
      routeParams: params,
      navigationHistory: [{
        route: currentPath,
        timestamp: Date.now(),
        params
      }]
    });
  }

  /**
   * ✅ PHASE 4.1: Navigate to a new route with conflict resolution
   */
  async navigate(
    path: string,
    params: Record<string, string> = {},
    options: {
      replace?: boolean;
      validateTransition?: boolean;
      skipGuards?: boolean;
      cleanup?: () => void | Promise<void>;
    } = {}
  ): Promise<boolean> {
    const {
      replace = false,
      validateTransition = true,
      skipGuards = false,
      cleanup
    } = options;

    console.log(`[RouterStateManager] Navigate request: ${this.state.currentRoute} -> ${path}`);

    // Check if navigation is locked
    if (this.navigationLock) {
      console.warn('[RouterStateManager] Navigation blocked - navigation in progress');
      this.updateState({
        pendingNavigation: {
          target: path,
          params,
          timestamp: Date.now(),
          reason: 'navigation_locked'
        }
      });
      return false;
    }

    // Check navigation guards
    if (!skipGuards) {
      const guardResult = await this.checkNavigationGuards(this.state.currentRoute, path, params);
      if (!guardResult) {
        console.warn('[RouterStateManager] Navigation blocked by guards');
        this.metrics.guardsTriggered++;
        return false;
      }
    }

    try {
      // Lock navigation to prevent conflicts
      this.navigationLock = true;
      this.updateState({ isNavigating: true });

      // Create transition
      const transition: RouteTransition = {
        from: this.state.currentRoute,
        to: path,
        timestamp: Date.now(),
        cleanup
      };

      this.activeTransition = transition;

      // Validate transition if requested
      if (validateTransition && transition.validate) {
        const isValid = await transition.validate();
        if (!isValid) {
          console.warn('[RouterStateManager] Transition validation failed');
          this.metrics.failedNavigations++;
          return false;
        }
      }

      // Execute cleanup for current route
      await this.executeRouteCleanup();

      // Update navigation state
      const previousRoute = this.state.currentRoute;
      this.updateState({
        previousRoute,
        currentRoute: path,
        routeParams: params,
        pendingNavigation: null
      });

      // Add to navigation history
      this.addToHistory(path, params, transition.timestamp);

      // Update metrics
      this.updateNavigationMetrics(Date.now() - transition.timestamp);

      console.log(`[RouterStateManager] Navigation completed: ${previousRoute} -> ${path}`);
      return true;

    } catch (error) {
      console.error('[RouterStateManager] Navigation failed:', error);
      this.metrics.failedNavigations++;
      return false;

    } finally {
      // Always unlock navigation and clear active transition
      this.navigationLock = false;
      this.activeTransition = null;
      this.updateState({ isNavigating: false });

      // Process pending navigation if exists
      await this.processPendingNavigation();
    }
  }

  /**
   * ✅ PHASE 4.1: Add navigation guard
   */
  addNavigationGuard(guard: NavigationGuard): void {
    this.guards.push(guard);
    this.guards.sort((a, b) => b.priority - a.priority);
    console.log(`[RouterStateManager] Added navigation guard: ${guard.id}`);
  }

  /**
   * ✅ PHASE 4.1: Remove navigation guard
   */
  removeNavigationGuard(id: string): boolean {
    const initialLength = this.guards.length;
    this.guards = this.guards.filter(guard => guard.id !== id);
    const removed = this.guards.length < initialLength;
    
    if (removed) {
      console.log(`[RouterStateManager] Removed navigation guard: ${id}`);
    }
    
    return removed;
  }

  /**
   * ✅ PHASE 4.1: Set route metadata
   */
  setRouteMetadata(route: string, metadata: any): void {
    this.updateState({
      routeMetadata: {
        ...this.state.routeMetadata,
        [route]: metadata
      }
    });
  }

  /**
   * ✅ PHASE 4.1: Get route metadata
   */
  getRouteMetadata(route?: string): any {
    const targetRoute = route || this.state.currentRoute;
    return this.state.routeMetadata[targetRoute];
  }

  /**
   * ✅ PHASE 4.1: Get current navigation state
   */
  getState(): NavigationState {
    return { ...this.state };
  }

  /**
   * ✅ PHASE 4.1: Get navigation history
   */
  getNavigationHistory(): NavigationHistoryEntry[] {
    return [...this.state.navigationHistory];
  }

  /**
   * ✅ PHASE 4.1: Get navigation metrics
   */
  getMetrics(): typeof this.metrics & {
    currentRoute: string;
    navigationHistorySize: number;
    activeGuards: number;
    isNavigating: boolean;
  } {
    return {
      ...this.metrics,
      currentRoute: this.state.currentRoute,
      navigationHistorySize: this.state.navigationHistory.length,
      activeGuards: this.guards.length,
      isNavigating: this.state.isNavigating
    };
  }

  /**
   * ✅ PHASE 4.1: Check if can navigate to route
   */
  async canNavigateTo(path: string, params: Record<string, string> = {}): Promise<boolean> {
    if (this.navigationLock) {
      return false;
    }

    return await this.checkNavigationGuards(this.state.currentRoute, path, params);
  }

  /**
   * ✅ PHASE 4.1: Register route cleanup function
   */
  registerRouteCleanup(route: string, cleanup: () => void | Promise<void>): void {
    const cleanupWrapper = () => {
      if (this.state.currentRoute === route) {
        return cleanup();
      }
    };
    
    this.cleanup.push(cleanupWrapper);
    console.log(`[RouterStateManager] Registered cleanup for route: ${route}`);
  }

  /**
   * Apply external navigation changes (e.g., browser back/forward, Link clicks)
   */
  applyExternalNavigation(path: string, params: Record<string, string> = {}): void {
    if (this.state.currentRoute === path) {
      // Already in sync; update params if changed
      if (JSON.stringify(this.state.routeParams) !== JSON.stringify(params)) {
        this.updateState({ routeParams: params });
      }
      return;
    }

    const previousRoute = this.state.currentRoute;
    this.updateState({
      previousRoute,
      currentRoute: path,
      routeParams: params,
      pendingNavigation: null
    });

    // Record in history with zero-duration as it already happened externally
    this.addToHistory(path, params, Date.now());
  }

  /**
   * ✅ PHASE 4.1: Clear navigation history
   */
  clearHistory(): void {
    this.updateState({
      navigationHistory: [this.state.navigationHistory[this.state.navigationHistory.length - 1] || {
        route: this.state.currentRoute,
        timestamp: Date.now(),
        params: this.state.routeParams
      }]
    });
    console.log('[RouterStateManager] Navigation history cleared');
  }

  /**
   * ✅ PHASE 4.1: Update state atomically
   */
  private updateState(updates: Partial<NavigationState>): void {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers() {
    for (const listener of this.subscribers) {
      try {
        listener();
      } catch (err) {
        console.error('[RouterStateManager] Subscriber error:', err);
      }
    }
  }

  /**
   * ✅ PHASE 4.1: Check navigation guards
   */
  private async checkNavigationGuards(
    from: string,
    to: string,
    params: Record<string, string>
  ): Promise<boolean> {
    for (const guard of this.guards) {
      try {
        const result = await guard.predicate(from, to, params);
        if (!result) {
          console.warn(`[RouterStateManager] Navigation blocked by guard: ${guard.id}`);
          return false;
        }
      } catch (error) {
        console.error(`[RouterStateManager] Guard ${guard.id} threw error:`, error);
        return false;
      }
    }
    return true;
  }

  /**
   * ✅ PHASE 4.1: Execute route cleanup
   */
  private async executeRouteCleanup(): Promise<void> {
    const cleanupPromises = this.cleanup.map(async (cleanup) => {
      try {
        await cleanup();
      } catch (error) {
        console.error('[RouterStateManager] Cleanup error:', error);
      }
    });

    await Promise.allSettled(cleanupPromises);
    
    // Execute active transition cleanup
    if (this.activeTransition?.cleanup) {
      try {
        await this.activeTransition.cleanup();
      } catch (error) {
        console.error('[RouterStateManager] Transition cleanup error:', error);
      }
    }
  }

  /**
   * ✅ PHASE 4.1: Add navigation to history
   */
  private addToHistory(path: string, params: Record<string, string>, startTime: number): void {
    const entry: NavigationHistoryEntry = {
      route: path,
      timestamp: Date.now(),
      params,
      duration: Date.now() - startTime
    };

    const history = [...this.state.navigationHistory, entry];
    
    // Keep history size manageable (last 50 entries)
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    this.updateState({ navigationHistory: history });
  }

  /**
   * ✅ PHASE 4.1: Update navigation metrics
   */
  private updateNavigationMetrics(duration: number): void {
    this.metrics.totalNavigations++;
    
    // Update average transition time
    const total = this.metrics.averageTransitionTime * (this.metrics.totalNavigations - 1) + duration;
    this.metrics.averageTransitionTime = total / this.metrics.totalNavigations;
  }

  /**
   * ✅ PHASE 4.1: Process pending navigation
   */
  private async processPendingNavigation(): Promise<void> {
    if (this.state.pendingNavigation && !this.navigationLock) {
      const pending = this.state.pendingNavigation;
      console.log(`[RouterStateManager] Processing pending navigation: ${pending.target}`);
      
      // Clear pending before attempting navigation to avoid infinite loops
      this.updateState({ pendingNavigation: null });
      
      await this.navigate(pending.target, pending.params, { skipGuards: false });
    }
  }

  /**
   * ✅ PHASE 4.1: Cleanup and destroy
   */
  destroy(): void {
    this.cleanup = [];
    this.guards = [];
    this.activeTransition = null;
    this.navigationLock = false;
    RouterStateManager.instance = null;
    console.log('[RouterStateManager] Destroyed');
  }
}

/**
 * ✅ PHASE 4.1: React hook for router state management
 */
export function useRouterStateManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const router = RouterStateManager.getInstance();
  const [state, setState] = useState(router.getState());
  
  // Initialize router state
  useEffect(() => {
    router.initialize(location.pathname, params);
  }, []);

  // Subscribe to router state changes
  useEffect(() => {
    const unsubscribe = router.subscribe(() => {
      setState(router.getState());
    });
    return unsubscribe;
  }, [router]);

  // Sync router state when React Router location changes
  useEffect(() => {
    router.applyExternalNavigation(location.pathname, params as any);
  }, [location.pathname, params, router]);

  // Enhanced navigate function
  const enhancedNavigate = useCallback(async (
    path: string,
    options: Parameters<typeof router.navigate>[2] = {}
  ) => {
    const success = await router.navigate(path, params, options);
    if (success) {
      navigate(path, { replace: options.replace });
    }
    return success;
  }, [navigate, params, router]);

  return {
    state,
    navigate: enhancedNavigate,
    canNavigateTo: router.canNavigateTo.bind(router),
    addGuard: router.addNavigationGuard.bind(router),
    removeGuard: router.removeNavigationGuard.bind(router),
    setMetadata: router.setRouteMetadata.bind(router),
    getMetadata: router.getRouteMetadata.bind(router),
    getMetrics: router.getMetrics.bind(router),
    clearHistory: router.clearHistory.bind(router)
  };
}
