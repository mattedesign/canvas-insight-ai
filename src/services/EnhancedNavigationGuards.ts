/**
 * Phase 4B: Enhanced Navigation Guards
 * Advanced navigation rules, cleanup, and state management
 */

import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRouterStateManager } from '@/services/RouterStateManager';
import { useAuth } from '@/context/AuthContext';
import { stabilizedPipeline } from '@/services/StabilizedPipelineService';
import { useProjectContext } from '@/context/ProjectContext';

export interface NavigationRule {
  id: string;
  description: string;
  from?: string | RegExp;
  to?: string | RegExp;
  condition: (context: NavigationContext) => boolean | Promise<boolean>;
  action?: 'block' | 'redirect' | 'cleanup' | 'warn';
  redirectTo?: string;
  priority: number;
}

export interface NavigationContext {
  fromPath: string;
  toPath: string;
  params: Record<string, string>;
  user: any;
  isAuthenticated: boolean;
  currentProject: any;
  systemHealth: any;
}

/**
 * Enhanced Navigation Guards Service
 */
export class EnhancedNavigationGuards {
  private static instance: EnhancedNavigationGuards;
  private rules: NavigationRule[] = [];
  private cleanupTasks: Map<string, (() => void | Promise<void>)[]> = new Map();
  private warningQueue: string[] = [];

  static getInstance(): EnhancedNavigationGuards {
    if (!EnhancedNavigationGuards.instance) {
      EnhancedNavigationGuards.instance = new EnhancedNavigationGuards();
    }
    return EnhancedNavigationGuards.instance;
  }

  /**
   * Register navigation rule
   */
  registerRule(rule: NavigationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
    console.log(`[NavigationGuards] Registered rule: ${rule.id} (priority: ${rule.priority})`);
  }

  /**
   * Unregister navigation rule
   */
  unregisterRule(id: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== id);
    const removed = this.rules.length < initialLength;
    
    if (removed) {
      console.log(`[NavigationGuards] Unregistered rule: ${id}`);
    }
    
    return removed;
  }

  /**
   * Register cleanup task for specific route
   */
  registerCleanupTask(route: string, task: () => void | Promise<void>): void {
    if (!this.cleanupTasks.has(route)) {
      this.cleanupTasks.set(route, []);
    }
    this.cleanupTasks.get(route)!.push(task);
    console.log(`[NavigationGuards] Registered cleanup task for route: ${route}`);
  }

  /**
   * Execute cleanup tasks for route
   */
  async executeCleanupTasks(route: string): Promise<void> {
    const tasks = this.cleanupTasks.get(route) || [];
    
    if (tasks.length === 0) return;
    
    console.log(`[NavigationGuards] Executing ${tasks.length} cleanup tasks for route: ${route}`);
    
    const cleanupPromises = tasks.map(async (task) => {
      try {
        await task();
      } catch (error) {
        console.error(`[NavigationGuards] Cleanup task failed for ${route}:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
    
    // Clear tasks after execution
    this.cleanupTasks.delete(route);
  }

  /**
   * Evaluate navigation rules
   */
  async evaluateRules(context: NavigationContext): Promise<{
    allowed: boolean;
    action?: string;
    redirectTo?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    for (const rule of this.rules) {
      try {
        // Check if rule applies to this navigation
        if (!this.ruleApplies(rule, context)) {
          continue;
        }
        
        // Evaluate rule condition
        const conditionMet = await rule.condition(context);
        
        if (conditionMet) {
          switch (rule.action) {
            case 'block':
              console.warn(`[NavigationGuards] Navigation blocked by rule: ${rule.id}`);
              return { allowed: false, action: 'block', warnings };
              
            case 'redirect':
              console.log(`[NavigationGuards] Navigation redirected by rule: ${rule.id}`);
              return { 
                allowed: false, 
                action: 'redirect', 
                redirectTo: rule.redirectTo,
                warnings 
              };
              
            case 'cleanup':
              await this.executeCleanupTasks(context.fromPath);
              break;
              
            case 'warn':
              warnings.push(`Warning from rule ${rule.id}: ${rule.description}`);
              break;
          }
        }
      } catch (error) {
        console.error(`[NavigationGuards] Rule ${rule.id} evaluation failed:`, error);
        warnings.push(`Rule evaluation error: ${rule.id}`);
      }
    }
    
    return { allowed: true, warnings };
  }

  /**
   * Check if rule applies to navigation
   */
  private ruleApplies(rule: NavigationRule, context: NavigationContext): boolean {
    if (rule.from) {
      if (rule.from instanceof RegExp) {
        if (!rule.from.test(context.fromPath)) return false;
      } else {
        if (context.fromPath !== rule.from) return false;
      }
    }
    
    if (rule.to) {
      if (rule.to instanceof RegExp) {
        if (!rule.to.test(context.toPath)) return false;
      } else {
        if (context.toPath !== rule.to) return false;
      }
    }
    
    return true;
  }

  /**
   * Get all registered rules
   */
  getAllRules(): NavigationRule[] {
    return [...this.rules];
  }

  /**
   * Clear all rules and cleanup tasks
   */
  clear(): void {
    this.rules = [];
    this.cleanupTasks.clear();
    this.warningQueue = [];
    console.log('[NavigationGuards] All rules and tasks cleared');
  }
}

/**
 * Default navigation rules
 */
export const DEFAULT_NAVIGATION_RULES: NavigationRule[] = [
  {
    id: 'auth-required',
    description: 'Require authentication for protected routes',
    to: /^\/(canvas|dashboard|analytics|projects)/,
    condition: (context) => !context.isAuthenticated,
    action: 'redirect',
    redirectTo: '/auth',
    priority: 1000
  },
  {
    id: 'auth-redirect',
    description: 'Redirect authenticated users away from auth pages',
    to: /^\/auth/,
    condition: (context) => context.isAuthenticated,
    action: 'redirect',
    redirectTo: '/dashboard',
    priority: 900
  },
  {
    id: 'system-health-check',
    description: 'Check system health before navigation to critical routes',
    to: /^\/(canvas|analytics)/,
    condition: async (context) => {
      const health = context.systemHealth;
      return !health?.isHealthy;
    },
    action: 'warn',
    priority: 800
  },
  {
    id: 'canvas-cleanup',
    description: 'Execute cleanup when leaving canvas routes',
    from: /^\/canvas/,
    condition: () => true,
    action: 'cleanup',
    priority: 700
  },
  {
    id: 'unsaved-changes-warning',
    description: 'Warn about unsaved changes',
    from: /^\/(canvas|projects)/,
    condition: (context) => {
      // Check for unsaved changes in project context
      return false; // Simplified for now
    },
    action: 'warn',
    priority: 600
  },
  {
    id: 'project-access-validation',
    description: 'Validate project access permissions',
    to: /^\/canvas\/([^\/]+)/,
    condition: async (context) => {
      const projectSlug = context.toPath.match(/^\/canvas\/([^\/]+)/)?.[1];
      if (!projectSlug || !context.currentProject) return false;
      
      // For now, just check if project exists
      return context.currentProject.error !== null;
    },
    action: 'block',
    priority: 500
  }
];

/**
 * Hook for enhanced navigation guards
 */
export const useEnhancedNavigationGuards = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentProject } = useProjectContext();
  const { addGuard, removeGuard } = useRouterStateManager();
  const guards = EnhancedNavigationGuards.getInstance();

  /**
   * Initialize default rules
   */
  useEffect(() => {
    // Register default navigation rules
    DEFAULT_NAVIGATION_RULES.forEach(rule => {
      guards.registerRule(rule);
    });

    return () => {
      // Cleanup on unmount
      DEFAULT_NAVIGATION_RULES.forEach(rule => {
        guards.unregisterRule(rule.id);
      });
    };
  }, [guards]);

  /**
   * Create master navigation guard
   */
  useEffect(() => {
    const masterGuard = {
      id: 'enhanced-navigation-master',
      priority: 10000, // Highest priority
      predicate: async (from: string, to: string, params: Record<string, string>) => {
        try {
          // Get system health
          const systemHealth = stabilizedPipeline.getSystemHealth();
          
          // Create navigation context
          const context: NavigationContext = {
            fromPath: from,
            toPath: to,
            params,
            user,
            isAuthenticated: !!user,
            currentProject,
            systemHealth
          };

          // Evaluate rules
          const result = await guards.evaluateRules(context);
          
          // Handle warnings
          if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
              console.warn('[NavigationGuards]', warning);
            });
          }
          
          // Handle redirect
          if (result.action === 'redirect' && result.redirectTo) {
            setTimeout(() => {
              navigate(result.redirectTo!, { replace: true });
            }, 0);
            return false;
          }
          
          return result.allowed;
        } catch (error) {
          console.error('[NavigationGuards] Master guard evaluation failed:', error);
          return true; // Allow navigation on error to prevent blocking
        }
      }
    };

    addGuard(masterGuard);

    return () => {
      removeGuard('enhanced-navigation-master');
    };
  }, [addGuard, removeGuard, navigate, user, currentProject, guards]);

  /**
   * Register cleanup task for current route
   */
  const registerCleanupTask = useCallback((task: () => void | Promise<void>) => {
    guards.registerCleanupTask(location.pathname, task);
  }, [guards, location.pathname]);

  /**
   * Register custom navigation rule
   */
  const registerRule = useCallback((rule: NavigationRule) => {
    guards.registerRule(rule);
  }, [guards]);

  /**
   * Unregister navigation rule
   */
  const unregisterRule = useCallback((id: string) => {
    return guards.unregisterRule(id);
  }, [guards]);

  return {
    registerCleanupTask,
    registerRule,
    unregisterRule,
    getAllRules: guards.getAllRules.bind(guards),
    executeCleanupTasks: guards.executeCleanupTasks.bind(guards)
  };
};

/**
 * Hook for route-specific cleanup
 */
export const useRouteCleanup = (cleanupFn: () => void | Promise<void>) => {
  const { registerCleanupTask } = useEnhancedNavigationGuards();
  
  useEffect(() => {
    registerCleanupTask(cleanupFn);
  }, [registerCleanupTask, cleanupFn]);
};

/**
 * Hook for navigation warnings
 */
export const useNavigationWarnings = () => {
  const [warnings, setWarnings] = useState<string[]>([]);

  const addWarning = useCallback((warning: string) => {
    setWarnings(prev => [...prev, warning]);
  }, []);

  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  const removeWarning = useCallback((index: number) => {
    setWarnings(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    warnings,
    addWarning,
    clearWarnings,
    removeWarning
  };
};

// Export singleton instance
export const navigationGuards = EnhancedNavigationGuards.getInstance();