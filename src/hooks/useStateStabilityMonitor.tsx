/**
 * State Stability Monitor - Phase 5.1: Automated tests for state stability
 * Monitors state changes and detects potential stability issues
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from '@/context/AppStateTypes';

interface StateChangeInfo {
  timestamp: number;
  previousState: Record<string, any>;
  currentState: Record<string, any>;
  changedKeys: string[];
}

interface StabilityMetrics {
  totalStateChanges: number;
  frequentChanges: Record<string, number>;
  suspiciousPatterns: string[];
  lastChangeTime: number;
  changeFrequency: number; // changes per minute
}

class StateStabilityMonitor {
  private stateHistory: StateChangeInfo[] = [];
  private metrics: StabilityMetrics = {
    totalStateChanges: 0,
    frequentChanges: {},
    suspiciousPatterns: [],
    lastChangeTime: 0,
    changeFrequency: 0
  };
  private maxHistorySize = 100;
  private warningThresholds = {
    changeFrequency: 60, // more than 60 changes per minute
    repeatedChanges: 10, // same key changing more than 10 times
    rapidChanges: 5 // 5 changes within 1 second
  };

  recordStateChange(previousState: AppState, currentState: AppState) {
    const timestamp = Date.now();
    const changedKeys = this.findChangedKeys(previousState, currentState);
    
    if (changedKeys.length === 0) return;

    const changeInfo: StateChangeInfo = {
      timestamp,
      previousState: this.extractChangedValues(previousState, changedKeys),
      currentState: this.extractChangedValues(currentState, changedKeys),
      changedKeys
    };

    this.stateHistory.push(changeInfo);
    
    // Keep history size manageable
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    this.updateMetrics(changeInfo);
    this.detectSuspiciousPatterns();
  }

  private findChangedKeys(prev: AppState, current: AppState): string[] {
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(current)]);

    for (const key of allKeys) {
      if (this.hasChanged(prev[key as keyof AppState], current[key as keyof AppState])) {
        changed.push(key);
      }
    }

    return changed;
  }

  private hasChanged(prev: any, current: any): boolean {
    if (prev === current) return false;
    
    // For arrays and objects, do a shallow comparison
    if (Array.isArray(prev) && Array.isArray(current)) {
      if (prev.length !== current.length) return true;
      return prev.some((item, index) => item !== current[index]);
    }
    
    if (typeof prev === 'object' && typeof current === 'object' && prev !== null && current !== null) {
      const prevKeys = Object.keys(prev);
      const currentKeys = Object.keys(current);
      
      if (prevKeys.length !== currentKeys.length) return true;
      
      return prevKeys.some(key => prev[key] !== current[key]);
    }
    
    return true;
  }

  private extractChangedValues(state: AppState, changedKeys: string[]): Record<string, any> {
    const extracted: Record<string, any> = {};
    changedKeys.forEach(key => {
      extracted[key] = (state as any)[key];
    });
    return extracted;
  }

  private updateMetrics(changeInfo: StateChangeInfo) {
    this.metrics.totalStateChanges++;
    this.metrics.lastChangeTime = changeInfo.timestamp;

    // Count frequency of changes for each key
    changeInfo.changedKeys.forEach(key => {
      this.metrics.frequentChanges[key] = (this.metrics.frequentChanges[key] || 0) + 1;
    });

    // Calculate change frequency (changes per minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentChanges = this.stateHistory.filter(change => change.timestamp > oneMinuteAgo);
    this.metrics.changeFrequency = recentChanges.length;
  }

  private detectSuspiciousPatterns() {
    const patterns: string[] = [];

    // Check for excessive change frequency
    if (this.metrics.changeFrequency > this.warningThresholds.changeFrequency) {
      patterns.push(`High frequency: ${this.metrics.changeFrequency} changes/minute`);
    }

    // Check for repeatedly changing keys
    Object.entries(this.metrics.frequentChanges).forEach(([key, count]) => {
      if (count > this.warningThresholds.repeatedChanges) {
        patterns.push(`Key \"${key}\" changed ${count} times`);
      }
    });

    // Check for rapid consecutive changes
    const oneSecondAgo = Date.now() - 1000;
    const rapidChanges = this.stateHistory.filter(change => change.timestamp > oneSecondAgo);
    if (rapidChanges.length > this.warningThresholds.rapidChanges) {
      patterns.push(`Rapid changes: ${rapidChanges.length} changes in 1 second`);
    }

    // Check for oscillating values (same key changing back and forth)
    this.detectOscillatingValues(patterns);

    this.metrics.suspiciousPatterns = patterns;

    // Log warnings for suspicious patterns
    if (patterns.length > 0) {
      console.warn('[StateStabilityMonitor] Suspicious patterns detected:', patterns);
    }
  }

  private detectOscillatingValues(patterns: string[]) {
    const keyGroups: Record<string, StateChangeInfo[]> = {};
    
    // Group recent changes by key
    const recentChanges = this.stateHistory.slice(-20); // Last 20 changes
    recentChanges.forEach(change => {
      change.changedKeys.forEach(key => {
        if (!keyGroups[key]) keyGroups[key] = [];
        keyGroups[key].push(change);
      });
    });

    // Look for oscillation (A -> B -> A -> B pattern)
    Object.entries(keyGroups).forEach(([key, changes]) => {
      if (changes.length >= 4) {
        const values = changes.map(change => JSON.stringify(change.currentState[key as keyof AppState]));
        
        // Check if values alternate between two states
        let oscillating = true;
        for (let i = 2; i < values.length; i++) {
          if (values[i] !== values[i - 2]) {
            oscillating = false;
            break;
          }
        }
        
        if (oscillating && values[0] !== values[1]) {
          patterns.push(`Oscillating key \"${key}\": ${values[0]} ↔ ${values[1]}`);
        }
      }
    });
  }

  getMetrics(): StabilityMetrics {
    return { ...this.metrics };
  }

  getRecentHistory(count: number = 10): StateChangeInfo[] {
    return this.stateHistory.slice(-count);
  }

  reset() {
    this.stateHistory = [];
    this.metrics = {
      totalStateChanges: 0,
      frequentChanges: {},
      suspiciousPatterns: [],
      lastChangeTime: 0,
      changeFrequency: 0
    };
  }
}

// Singleton instance
const stabilityMonitor = new StateStabilityMonitor();

/**
 * Hook to monitor state stability
 */
export function useStateStabilityMonitor(
  state: AppState,
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const previousState = useRef<AppState>();

  useEffect(() => {
    if (!enabled) return;

    if (previousState.current) {
      stabilityMonitor.recordStateChange(previousState.current, state);
    }

    previousState.current = { ...state };
  }, [state, enabled]);

  const getMetrics = useCallback(() => {
    return stabilityMonitor.getMetrics();
  }, []);

  const getHistory = useCallback((count?: number) => {
    return stabilityMonitor.getRecentHistory(count);
  }, []);

  const reset = useCallback(() => {
    stabilityMonitor.reset();
  }, []);

  return {
    getMetrics,
    getHistory,
    reset
  };
}
